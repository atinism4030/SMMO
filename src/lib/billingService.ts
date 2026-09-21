/**
 * DB-backed billing orchestration. Pure calculations live in '@/lib/billing';
 * this module is the single place that reads/writes BillingPeriod and
 * ClientPayment documents so the two collections never drift out of sync.
 *
 * Golden rule: BillingPeriod.verifiedPaidAmountMinor/status are a derived
 * cache. They are only ever written by recomputeBillingPeriod() /
 * recomputePeriodsByIds() in this file — never set them directly elsewhere.
 */
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';
import BillingPeriod, { type IBillingPeriodDoc } from '@/models/BillingPeriod';
import ClientPayment, { type IClientPaymentDoc } from '@/models/ClientPayment';
import ActivityLog from '@/models/ActivityLog';
import { syncVerifiedPaymentToFinance, voidLinkedFinanceTransaction } from '@/lib/financeService';
import {
  computePeriodStatus,
  suggestAllocation,
  monthsBetweenInclusive,
  computePaidThroughMonth,
  computeOutstandingMinor,
  type AllocationTarget,
  type MonthKey,
} from '@/lib/billing';

export class BillingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    this.name = 'BillingError';
  }
}

function monthKeyOf(now = new Date()): MonthKey {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

async function log(
  userId: string,
  action: string,
  entityType: string,
  entityId: mongoose.Types.ObjectId | string,
  message: string
) {
  await ActivityLog.create({ userId, action, entityType, entityId, message });
}

// ─── Billing period generation ─────────────────────────────────────────────

/**
 * Idempotently creates any missing BillingPeriod documents for a client, from
 * its billingStartDate through the current month. Existing periods are never
 * touched (their expectedAmountMinor is a historical snapshot), and running
 * this twice creates no duplicates — it upserts on the unique
 * (clientId, year, month) index with $setOnInsert.
 */
export async function ensureBillingPeriods(clientId: string, through: MonthKey = monthKeyOf()): Promise<void> {
  await connectDB();
  const client = await Client.findById(clientId);
  if (!client) throw new BillingError('Client not found', 404);
  const billing = client.billing;
  if (!billing || !billing.billingEnabled || !billing.billingStartDate) return;

  const start: MonthKey = {
    year: billing.billingStartDate.getFullYear(),
    month: billing.billingStartDate.getMonth() + 1,
  };
  if (start.year > through.year || (start.year === through.year && start.month > through.month)) return;

  const months = monthsBetweenInclusive(start, through);
  const ops = months.map((m) => ({
    updateOne: {
      filter: { clientId: client._id, year: m.year, month: m.month },
      update: {
        $setOnInsert: {
          clientId: client._id,
          year: m.year,
          month: m.month,
          expectedAmountMinor: billing.monthlyFeeMinor,
          currency: billing.currency,
          verifiedPaidAmountMinor: 0,
          status: 'UNPAID' as const,
        },
      },
      upsert: true,
    },
  }));
  if (ops.length > 0) await BillingPeriod.bulkWrite(ops, { ordered: false });
}

export async function updateClientBillingSettings(
  clientId: string,
  patch: {
    monthlyFeeMinor?: number;
    currency?: string;
    billingStartDate?: string | Date | null;
    billingDay?: number;
    paymentTerms?: string;
    billingEnabled?: boolean;
    notes?: string;
  },
  actorUserId: string
) {
  await connectDB();
  const client = await Client.findById(clientId);
  if (!client) throw new BillingError('Client not found', 404);

  if (patch.monthlyFeeMinor !== undefined && (!Number.isFinite(patch.monthlyFeeMinor) || patch.monthlyFeeMinor < 0)) {
    throw new BillingError('Monthly fee must be a non-negative amount');
  }
  if (patch.billingDay !== undefined && (patch.billingDay < 1 || patch.billingDay > 28)) {
    throw new BillingError('Billing day must be between 1 and 28');
  }

  const existing = client.billing ?? {
    monthlyFeeMinor: 0,
    currency: 'EUR',
    billingDay: 1,
    billingEnabled: false,
  };

  client.billing = {
    monthlyFeeMinor: patch.monthlyFeeMinor ?? existing.monthlyFeeMinor,
    currency: patch.currency ?? existing.currency,
    billingStartDate:
      patch.billingStartDate !== undefined
        ? (patch.billingStartDate ? new Date(patch.billingStartDate) : undefined)
        : existing.billingStartDate,
    billingDay: patch.billingDay ?? existing.billingDay,
    paymentTerms: patch.paymentTerms !== undefined ? patch.paymentTerms : existing.paymentTerms,
    billingEnabled: patch.billingEnabled ?? existing.billingEnabled,
    notes: patch.notes !== undefined ? patch.notes : existing.notes,
  };
  await client.save();

  await log(actorUserId, 'UPDATE', 'ClientBilling', client._id, `Updated billing settings for "${client.name}"`);

  if (client.billing.billingEnabled && client.billing.billingStartDate) {
    await ensureBillingPeriods(clientId);
  }

  return client;
}

// ─── Period cache recomputation ────────────────────────────────────────────

/** Recomputes one BillingPeriod's verified-paid cache from VERIFIED payment allocations. */
export async function recomputeBillingPeriod(billingPeriodId: mongoose.Types.ObjectId | string): Promise<void> {
  await connectDB();
  const period = await BillingPeriod.findById(billingPeriodId);
  if (!period) return;

  const [agg] = await ClientPayment.aggregate([
    { $match: { verificationStatus: 'VERIFIED', 'allocations.billingPeriodId': new mongoose.Types.ObjectId(period._id) } },
    { $unwind: '$allocations' },
    { $match: { 'allocations.billingPeriodId': new mongoose.Types.ObjectId(period._id) } },
    { $group: { _id: null, total: { $sum: '$allocations.amountMinor' } } },
  ]);

  const verifiedPaidAmountMinor = agg?.total ?? 0;
  period.verifiedPaidAmountMinor = verifiedPaidAmountMinor;
  period.status = computePeriodStatus(period.expectedAmountMinor, verifiedPaidAmountMinor);
  await period.save();
}

async function recomputePeriodsByIds(ids: (mongoose.Types.ObjectId | string)[]): Promise<void> {
  const unique = Array.from(new Set(ids.map((id) => id.toString())));
  await Promise.all(unique.map((id) => recomputeBillingPeriod(id)));
}

// ─── Allocation ─────────────────────────────────────────────────────────────

/** Fetches this client's billing periods as FIFO allocation targets (oldest first). */
export async function getAllocationTargets(clientId: string): Promise<AllocationTarget[]> {
  await connectDB();
  await ensureBillingPeriods(clientId);
  const periods = await BillingPeriod.find({ clientId }).sort({ year: 1, month: 1 });
  return periods.map((p) => ({
    id: p._id.toString(),
    remainingMinor: Math.max(p.expectedAmountMinor - p.verifiedPaidAmountMinor, 0),
  }));
}

export async function previewAllocation(clientId: string, amountMinor: number) {
  const targets = await getAllocationTargets(clientId);
  return suggestAllocation(amountMinor, targets);
}

// ─── Payment lifecycle ──────────────────────────────────────────────────────

export interface CreatePaymentInput {
  clientId: string;
  amountMinor: number;
  currency: string;
  paymentDate: string | Date;
  paymentMethod: 'CASH' | 'BANK' | 'CARD' | 'OTHER';
  reference?: string;
  notes?: string;
  /** Manual allocation override; when omitted, FIFO suggestion is used. */
  allocations?: { billingPeriodId: string; amountMinor: number }[];
  /** Which company wallet this money lands in once verified; defaults to Company Bank if omitted. */
  destinationWalletId?: string;
  createdBy: string;
}

export async function createPayment(input: CreatePaymentInput): Promise<IClientPaymentDoc> {
  await connectDB();

  if (!Number.isFinite(input.amountMinor) || input.amountMinor <= 0) {
    throw new BillingError('Amount must be greater than zero');
  }
  const client = await Client.findById(input.clientId);
  if (!client) throw new BillingError('Client not found', 404);
  const paymentDate = new Date(input.paymentDate);
  if (isNaN(paymentDate.getTime())) throw new BillingError('Invalid payment date');

  let allocations: { billingPeriodId: string; amountMinor: number }[];
  let creditAmountMinor: number;

  if (input.allocations && input.allocations.length > 0) {
    const periodIds = input.allocations.map((a) => a.billingPeriodId);
    const periods = await BillingPeriod.find({ _id: { $in: periodIds }, clientId: client._id });
    if (periods.length !== new Set(periodIds).size) {
      throw new BillingError('One or more billing periods are invalid for this client');
    }
    const allocatedTotal = input.allocations.reduce((s, a) => s + a.amountMinor, 0);
    if (allocatedTotal > input.amountMinor) {
      throw new BillingError('Allocation total cannot exceed the payment amount');
    }
    if (input.allocations.some((a) => a.amountMinor <= 0)) {
      throw new BillingError('Each allocation must be a positive amount');
    }
    allocations = input.allocations;
    creditAmountMinor = input.amountMinor - allocatedTotal;
  } else {
    const targets = await getAllocationTargets(input.clientId);
    const result = suggestAllocation(input.amountMinor, targets);
    allocations = result.allocations;
    creditAmountMinor = result.creditAmountMinor;
  }

  const payment = await ClientPayment.create({
    clientId: client._id,
    amountMinor: input.amountMinor,
    currency: input.currency || client.billing?.currency || 'EUR',
    paymentDate,
    paymentMethod: input.paymentMethod,
    reference: input.reference?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    allocations: allocations.map((a) => ({ billingPeriodId: a.billingPeriodId, amountMinor: a.amountMinor })),
    creditAmountMinor,
    verificationStatus: 'PENDING_CONFIRMATION',
    destinationWalletId: input.destinationWalletId || undefined,
    createdBy: input.createdBy,
    editHistory: [],
  });

  await log(
    input.createdBy,
    'CREATE',
    'ClientPayment',
    payment._id,
    `Recorded payment of ${(input.amountMinor / 100).toFixed(2)} ${payment.currency} for "${client.name}" — awaiting confirmation`
  );

  return payment;
}

async function loadPaymentOr404(paymentId: string): Promise<IClientPaymentDoc> {
  const payment = await ClientPayment.findById(paymentId);
  if (!payment) throw new BillingError('Payment not found', 404);
  return payment;
}

/** Ownership guard: throws 403 unless the payment belongs to the given client. Pass undefined to skip (CEO). */
export function assertPaymentOwnership(payment: IClientPaymentDoc, requiredClientId?: string) {
  if (requiredClientId && payment.clientId.toString() !== requiredClientId) {
    throw new BillingError('Forbidden', 403);
  }
}

/**
 * The status flip itself is an atomic conditional update (matched on the
 * current status, not just the id) so two near-simultaneous confirm/dispute
 * requests for the same payment can't both succeed — the second finds no
 * matching document and reports 409 instead of double-processing.
 */
export async function verifyPayment(paymentId: string, verifiedByUserId: string, requiredClientId?: string) {
  await connectDB();
  const existing = await loadPaymentOr404(paymentId);
  assertPaymentOwnership(existing, requiredClientId);

  const payment = await ClientPayment.findOneAndUpdate(
    { _id: paymentId, verificationStatus: 'PENDING_CONFIRMATION' },
    { $set: { verificationStatus: 'VERIFIED', verifiedAt: new Date(), verifiedBy: verifiedByUserId } },
    { new: true }
  );
  if (!payment) throw new BillingError('Only payments awaiting confirmation can be verified', 409);

  await recomputePeriodsByIds(payment.allocations.map((a) => a.billingPeriodId));
  await log(verifiedByUserId, 'CONFIRM', 'ClientPayment', payment._id, `Client confirmed payment of ${(payment.amountMinor / 100).toFixed(2)} ${payment.currency}`);

  // A verified client payment is real company income — sync it into Finance
  // exactly once (see syncVerifiedPaymentToFinance's idempotency guards).
  // Attributed to whoever originally recorded the payment (the CEO), not the
  // client who just confirmed it.
  await syncVerifiedPaymentToFinance({
    paymentId: payment._id.toString(),
    clientId: payment.clientId.toString(),
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    destinationWalletId: payment.destinationWalletId?.toString(),
    transactionDate: payment.paymentDate,
    createdBy: payment.createdBy.toString(),
  });

  return payment;
}

export async function disputePayment(
  paymentId: string,
  disputedByUserId: string,
  reason: 'WRONG_AMOUNT' | 'WRONG_DATE' | 'NOT_MADE' | 'DUPLICATE' | 'OTHER',
  message: string | undefined,
  requiredClientId?: string
) {
  await connectDB();
  const existing = await loadPaymentOr404(paymentId);
  assertPaymentOwnership(existing, requiredClientId);

  const payment = await ClientPayment.findOneAndUpdate(
    { _id: paymentId, verificationStatus: 'PENDING_CONFIRMATION' },
    {
      $set: {
        verificationStatus: 'DISPUTED',
        disputedAt: new Date(),
        disputeReason: reason,
        disputeMessage: message?.trim() || undefined,
        disputedBy: disputedByUserId,
      },
    },
    { new: true }
  );
  if (!payment) throw new BillingError('Only payments awaiting confirmation can be disputed', 409);

  await log(disputedByUserId, 'DISPUTE', 'ClientPayment', payment._id, `Client disputed payment: ${reason}`);

  return payment;
}

export async function cancelPayment(paymentId: string, cancelledByUserId: string) {
  await connectDB();
  const before = await loadPaymentOr404(paymentId);
  const wasVerified = before.verificationStatus === 'VERIFIED';
  const affectedPeriods = before.allocations.map((a) => a.billingPeriodId);

  const payment = await ClientPayment.findOneAndUpdate(
    { _id: paymentId, verificationStatus: { $ne: 'CANCELLED' } },
    { $set: { verificationStatus: 'CANCELLED', cancelledAt: new Date(), cancelledBy: cancelledByUserId } },
    { new: true }
  );
  if (!payment) throw new BillingError('Payment is already cancelled', 409);

  if (wasVerified) {
    await recomputePeriodsByIds(affectedPeriods);
    // Keep Finance consistent: a cancelled payment can no longer be real income.
    await voidLinkedFinanceTransaction(payment._id.toString(), cancelledByUserId, 'Source client payment was cancelled');
  }
  await log(cancelledByUserId, 'CANCEL', 'ClientPayment', payment._id, `Cancelled payment of ${(payment.amountMinor / 100).toFixed(2)} ${payment.currency}`);

  return payment;
}

export interface EditPaymentPatch {
  amountMinor?: number;
  currency?: string;
  paymentDate?: string | Date;
  paymentMethod?: 'CASH' | 'BANK' | 'CARD' | 'OTHER';
  reference?: string;
  notes?: string;
  allocations?: { billingPeriodId: string; amountMinor: number }[];
}

/**
 * Admin correction of a payment. Never silently overwrites verified financial
 * history: editing the amount or allocations of a VERIFIED payment reverts it
 * to PENDING_CONFIRMATION so the client re-confirms the corrected figures.
 * Every change is appended to editHistory.
 */
export async function editPayment(paymentId: string, editedByUserId: string, patch: EditPaymentPatch) {
  await connectDB();
  const payment = await loadPaymentOr404(paymentId);
  if (payment.verificationStatus === 'CANCELLED') {
    throw new BillingError('Cancelled payments cannot be edited — record a new payment instead', 409);
  }

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  const affectedPeriods = new Set<string>(payment.allocations.map((a) => a.billingPeriodId.toString()));
  let financialFieldsChanged = false;

  if (patch.amountMinor !== undefined && patch.amountMinor !== payment.amountMinor) {
    if (patch.amountMinor <= 0) throw new BillingError('Amount must be greater than zero');
    changes.amountMinor = { from: payment.amountMinor, to: patch.amountMinor };
    payment.amountMinor = patch.amountMinor;
    financialFieldsChanged = true;
  }
  if (patch.currency && patch.currency !== payment.currency) {
    changes.currency = { from: payment.currency, to: patch.currency };
    payment.currency = patch.currency;
  }
  if (patch.paymentDate) {
    const d = new Date(patch.paymentDate);
    if (isNaN(d.getTime())) throw new BillingError('Invalid payment date');
    if (d.getTime() !== payment.paymentDate.getTime()) {
      changes.paymentDate = { from: payment.paymentDate, to: d };
      payment.paymentDate = d;
    }
  }
  if (patch.paymentMethod && patch.paymentMethod !== payment.paymentMethod) {
    changes.paymentMethod = { from: payment.paymentMethod, to: patch.paymentMethod };
    payment.paymentMethod = patch.paymentMethod;
  }
  if (patch.reference !== undefined && patch.reference !== payment.reference) {
    changes.reference = { from: payment.reference, to: patch.reference };
    payment.reference = patch.reference || undefined;
  }
  if (patch.notes !== undefined && patch.notes !== payment.notes) {
    changes.notes = { from: payment.notes, to: patch.notes };
    payment.notes = patch.notes || undefined;
  }
  if (patch.allocations) {
    const total = patch.allocations.reduce((s, a) => s + a.amountMinor, 0);
    if (total > payment.amountMinor) throw new BillingError('Allocation total cannot exceed the payment amount');
    if (patch.allocations.some((a) => a.amountMinor <= 0)) throw new BillingError('Each allocation must be a positive amount');
    const periodIds = patch.allocations.map((a) => a.billingPeriodId);
    const periods = await BillingPeriod.find({ _id: { $in: periodIds }, clientId: payment.clientId });
    if (periods.length !== new Set(periodIds).size) throw new BillingError('One or more billing periods are invalid for this client');

    changes.allocations = { from: payment.allocations, to: patch.allocations };
    patch.allocations.forEach((a) => affectedPeriods.add(a.billingPeriodId.toString()));
    payment.allocations = patch.allocations.map((a) => ({
      billingPeriodId: new mongoose.Types.ObjectId(a.billingPeriodId),
      amountMinor: a.amountMinor,
    }));
    payment.creditAmountMinor = payment.amountMinor - total;
    financialFieldsChanged = true;
  } else if (changes.amountMinor) {
    // Amount changed but allocations weren't resupplied — keep allocations valid by
    // capping credit; existing allocations remain, credit absorbs the difference.
    const allocatedTotal = payment.allocations.reduce((s, a) => s + a.amountMinor, 0);
    payment.creditAmountMinor = Math.max(payment.amountMinor - allocatedTotal, 0);
  }

  if (Object.keys(changes).length === 0) return payment;

  const wasVerified = payment.verificationStatus === 'VERIFIED';
  if (wasVerified && financialFieldsChanged) {
    payment.verificationStatus = 'PENDING_CONFIRMATION';
    payment.verifiedAt = undefined;
    payment.verifiedBy = undefined;
    changes.verificationStatus = { from: 'VERIFIED', to: 'PENDING_CONFIRMATION' };
  }

  payment.editHistory.push({ editedAt: new Date(), editedBy: new mongoose.Types.ObjectId(editedByUserId), changes });
  await payment.save();

  if (wasVerified && financialFieldsChanged) {
    await recomputePeriodsByIds(Array.from(affectedPeriods));
    // The old verified figures are no longer trustworthy — void the income
    // transaction they generated. Re-confirmation (verifyPayment) will sync a
    // fresh, correct one once the client accepts the corrected amount.
    await voidLinkedFinanceTransaction(payment._id.toString(), editedByUserId, 'Source client payment was corrected');
  }

  await log(editedByUserId, 'UPDATE', 'ClientPayment', payment._id, `Edited payment (${Object.keys(changes).join(', ')})`);

  return payment;
}

export type DisputeResolutionAction = 'EDITED' | 'CANCELLED' | 'RESENT' | 'DISMISSED';

export async function resolveDispute(
  paymentId: string,
  resolvedByUserId: string,
  action: DisputeResolutionAction,
  note: string | undefined,
  edits?: EditPaymentPatch
) {
  await connectDB();
  const payment = await loadPaymentOr404(paymentId);
  if (payment.verificationStatus !== 'DISPUTED') {
    throw new BillingError('Only disputed payments can be resolved this way', 409);
  }

  if (action === 'CANCELLED') {
    const cancelled = await cancelPayment(paymentId, resolvedByUserId);
    cancelled.disputeResolution = { resolvedAt: new Date(), resolvedBy: new mongoose.Types.ObjectId(resolvedByUserId), action, note };
    await cancelled.save();
    return cancelled;
  }

  if (action === 'EDITED' && edits) {
    payment.verificationStatus = 'PENDING_CONFIRMATION';
    await payment.save();
    const edited = await editPayment(paymentId, resolvedByUserId, edits);
    edited.verificationStatus = 'PENDING_CONFIRMATION';
    edited.disputeResolution = { resolvedAt: new Date(), resolvedBy: new mongoose.Types.ObjectId(resolvedByUserId), action, note };
    await edited.save();
    return edited;
  }

  if (action === 'DISMISSED') {
    payment.verificationStatus = 'VERIFIED';
    payment.verifiedAt = new Date();
    payment.verifiedBy = new mongoose.Types.ObjectId(resolvedByUserId);
    payment.disputeResolution = { resolvedAt: new Date(), resolvedBy: new mongoose.Types.ObjectId(resolvedByUserId), action, note };
    await payment.save();
    await recomputePeriodsByIds(payment.allocations.map((a) => a.billingPeriodId));
    await syncVerifiedPaymentToFinance({
      paymentId: payment._id.toString(),
      clientId: payment.clientId.toString(),
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      destinationWalletId: payment.destinationWalletId?.toString(),
      transactionDate: payment.paymentDate,
      createdBy: payment.createdBy.toString(),
    });
    await log(resolvedByUserId, 'RESOLVE_DISPUTE', 'ClientPayment', payment._id, 'Dispute dismissed — payment marked verified');
    return payment;
  }

  // RESENT — send back to the client for confirmation without changes.
  payment.verificationStatus = 'PENDING_CONFIRMATION';
  payment.disputeResolution = { resolvedAt: new Date(), resolvedBy: new mongoose.Types.ObjectId(resolvedByUserId), action, note };
  await payment.save();
  await log(resolvedByUserId, 'RESOLVE_DISPUTE', 'ClientPayment', payment._id, 'Dispute resolved — payment resent for confirmation');
  return payment;
}

// ─── Summaries ──────────────────────────────────────────────────────────────

export interface ClientBillingSummary {
  totalExpectedMinor: number;
  totalVerifiedPaidMinor: number;
  outstandingMinor: number;
  pendingConfirmationMinor: number;
  pendingConfirmationCount: number;
  disputedCount: number;
  totalCreditMinor: number;
  paidThroughMonth: MonthKey | null;
  nextDuePeriod: IBillingPeriodDoc | null;
  unpaidMonthsCount: number;
  lastVerifiedPayment: IClientPaymentDoc | null;
}

export async function getClientBillingSummary(clientId: string): Promise<ClientBillingSummary> {
  await connectDB();
  await ensureBillingPeriods(clientId);

  const [periods, pendingAgg, disputedCount, creditAgg, lastVerifiedPayment] = await Promise.all([
    BillingPeriod.find({ clientId }).sort({ year: 1, month: 1 }),
    ClientPayment.aggregate([
      { $match: { clientId: new mongoose.Types.ObjectId(clientId), verificationStatus: 'PENDING_CONFIRMATION' } },
      { $group: { _id: null, total: { $sum: '$amountMinor' }, count: { $sum: 1 } } },
    ]),
    ClientPayment.countDocuments({ clientId, verificationStatus: 'DISPUTED' }),
    ClientPayment.aggregate([
      { $match: { clientId: new mongoose.Types.ObjectId(clientId), verificationStatus: 'VERIFIED' } },
      { $group: { _id: null, total: { $sum: '$creditAmountMinor' } } },
    ]),
    ClientPayment.findOne({ clientId, verificationStatus: 'VERIFIED' }).sort({ verifiedAt: -1 }),
  ]);

  const totalExpectedMinor = periods.reduce((s, p) => s + p.expectedAmountMinor, 0);
  const totalVerifiedPaidMinor = periods.reduce((s, p) => s + p.verifiedPaidAmountMinor, 0);
  const outstandingMinor = computeOutstandingMinor(periods);
  const paidThroughMonth = computePaidThroughMonth(periods.map((p) => ({ year: p.year, month: p.month, status: p.status })));
  const nextDuePeriod = periods.find((p) => p.status === 'UNPAID' || p.status === 'PARTIALLY_PAID') ?? null;
  const unpaidMonthsCount = periods.filter((p) => p.status === 'UNPAID' || p.status === 'PARTIALLY_PAID').length;

  return {
    totalExpectedMinor,
    totalVerifiedPaidMinor,
    outstandingMinor,
    pendingConfirmationMinor: pendingAgg[0]?.total ?? 0,
    pendingConfirmationCount: pendingAgg[0]?.count ?? 0,
    disputedCount,
    totalCreditMinor: creditAgg[0]?.total ?? 0,
    paidThroughMonth,
    nextDuePeriod,
    unpaidMonthsCount,
    lastVerifiedPayment,
  };
}

export interface AgencyBillingSummary {
  monthlyExpectedRevenueMinor: number;
  verifiedThisMonthMinor: number;
  pendingConfirmationMinor: number;
  pendingConfirmationCount: number;
  outstandingBalanceMinor: number;
  overdueClientCount: number;
  disputedCount: number;
}

export async function getAgencyBillingSummary(): Promise<AgencyBillingSummary> {
  await connectDB();
  const now = monthKeyOf();

  const [expectedAgg, verifiedAgg, pendingAgg, allPeriods, disputedCount] = await Promise.all([
    BillingPeriod.aggregate([
      { $match: { year: now.year, month: now.month } },
      { $group: { _id: null, total: { $sum: '$expectedAmountMinor' } } },
    ]),
    ClientPayment.aggregate([
      {
        $match: {
          verificationStatus: 'VERIFIED',
          paymentDate: { $gte: new Date(now.year, now.month - 1, 1), $lt: new Date(now.year, now.month, 1) },
        },
      },
      { $group: { _id: null, total: { $sum: '$amountMinor' } } },
    ]),
    ClientPayment.aggregate([
      { $match: { verificationStatus: 'PENDING_CONFIRMATION' } },
      { $group: { _id: null, total: { $sum: '$amountMinor' }, count: { $sum: 1 } } },
    ]),
    BillingPeriod.find({}, 'clientId year month expectedAmountMinor verifiedPaidAmountMinor status'),
    ClientPayment.countDocuments({ verificationStatus: 'DISPUTED' }),
  ]);

  const outstandingBalanceMinor = computeOutstandingMinor(allPeriods);
  const overdueClientIds = new Set(
    allPeriods
      .filter((p) => {
        const isPast = p.year < now.year || (p.year === now.year && p.month < now.month);
        return isPast && (p.status === 'UNPAID' || p.status === 'PARTIALLY_PAID');
      })
      .map((p) => p.clientId.toString())
  );

  return {
    monthlyExpectedRevenueMinor: expectedAgg[0]?.total ?? 0,
    verifiedThisMonthMinor: verifiedAgg[0]?.total ?? 0,
    pendingConfirmationMinor: pendingAgg[0]?.total ?? 0,
    pendingConfirmationCount: pendingAgg[0]?.count ?? 0,
    outstandingBalanceMinor,
    overdueClientCount: overdueClientIds.size,
    disputedCount,
  };
}

// ─── Social Media Management tracker ───────────────────────────────────────
//
// A lightweight, CEO-only way to mark a client's monthly retainer as paid
// with one click, entirely separate from the client-confirmation workflow
// above and from Finance. It reuses BillingPeriod/ClientPayment (so
// verifiedPaidAmountMinor/status stay correctly derived — see the "golden
// rule" at the top of this file) by creating a ClientPayment that is already
// VERIFIED at creation time (never PENDING_CONFIRMATION, so the client is
// never involved), and it deliberately never calls
// syncVerifiedPaymentToFinance — this money is tracked here only, not in the
// company ledger/wallets.

export interface RecordManualPaymentInput {
  clientId: string;
  billingPeriodId: string;
  amountMinor: number;
  createdBy: string;
}

/** Marks one billing period as paid directly, bypassing client confirmation and Finance entirely. */
export async function recordManualPayment(input: RecordManualPaymentInput): Promise<IClientPaymentDoc> {
  await connectDB();
  if (!Number.isFinite(input.amountMinor) || input.amountMinor <= 0) {
    throw new BillingError('Amount must be greater than zero');
  }
  const client = await Client.findById(input.clientId);
  if (!client) throw new BillingError('Client not found', 404);
  const period = await BillingPeriod.findOne({ _id: input.billingPeriodId, clientId: client._id });
  if (!period) throw new BillingError('Billing period not found for this client', 404);

  const payment = await ClientPayment.create({
    clientId: client._id,
    amountMinor: input.amountMinor,
    currency: period.currency,
    paymentDate: new Date(),
    paymentMethod: 'OTHER',
    notes: 'Marked paid manually via the Social Media Management tracker',
    allocations: [{ billingPeriodId: period._id, amountMinor: input.amountMinor }],
    creditAmountMinor: 0,
    verificationStatus: 'VERIFIED',
    verifiedAt: new Date(),
    verifiedBy: input.createdBy,
    createdBy: input.createdBy,
    editHistory: [],
  });

  await recomputePeriodsByIds([period._id]);
  await log(
    input.createdBy,
    'MANUAL_MARK_PAID',
    'ClientPayment',
    payment._id,
    `Manually marked ${(input.amountMinor / 100).toFixed(2)} ${payment.currency} as paid for "${client.name}" — ${period.month}/${period.year} (Social Media Management tracker, not synced to Finance)`
  );

  return payment;
}

export interface SmmTrackerPeriod {
  _id: string;
  year: number;
  month: number;
  expectedAmountMinor: number;
  verifiedPaidAmountMinor: number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERPAID';
  /** Present only when exactly one active VERIFIED payment funds this period — the only case the "undo" action supports. */
  singlePaymentId?: string;
}

export interface SmmTrackerClient {
  clientId: string;
  clientName: string;
  currency: string;
  monthlyFeeMinor: number;
  billingDay: number;
  periods: SmmTrackerPeriod[];
  outstandingMinor: number;
  unpaidMonthsCount: number;
}

export interface SmmTrackerOverview {
  clients: SmmTrackerClient[];
  totalCollectedMinor: number;
  totalExpectedMinor: number;
}

/** Per-client, per-month retainer view for the Social Media Management tracker — CEO-only, entirely separate from Finance. */
export async function getSmmTrackerOverview(): Promise<SmmTrackerOverview> {
  await connectDB();
  const clients = await Client.find({ 'billing.billingEnabled': true, status: 'ACTIVE' }).sort({ name: 1 });

  await Promise.all(clients.map((c) => ensureBillingPeriods(c._id.toString())));

  const clientIds = clients.map((c) => c._id);
  const [periods, payments] = await Promise.all([
    BillingPeriod.find({ clientId: { $in: clientIds } }).sort({ year: 1, month: 1 }),
    ClientPayment.find(
      { clientId: { $in: clientIds }, verificationStatus: 'VERIFIED' },
      'clientId amountMinor allocations'
    ),
  ]);

  // Map each billing period to the list of active verified payments funding it.
  const paymentsByPeriod = new Map<string, { _id: string }[]>();
  for (const payment of payments) {
    for (const alloc of payment.allocations) {
      const key = alloc.billingPeriodId.toString();
      const list = paymentsByPeriod.get(key) ?? [];
      list.push({ _id: payment._id.toString() });
      paymentsByPeriod.set(key, list);
    }
  }

  const periodsByClient = new Map<string, typeof periods>();
  for (const p of periods) {
    const key = p.clientId.toString();
    const list = periodsByClient.get(key) ?? [];
    list.push(p);
    periodsByClient.set(key, list);
  }

  let totalCollectedMinor = 0;
  let totalExpectedMinor = 0;

  const result: SmmTrackerClient[] = clients.map((c) => {
    const clientPeriods = periodsByClient.get(c._id.toString()) ?? [];
    const mapped: SmmTrackerPeriod[] = clientPeriods.map((p) => {
      const fundingPayments = paymentsByPeriod.get(p._id.toString()) ?? [];
      totalCollectedMinor += p.verifiedPaidAmountMinor;
      totalExpectedMinor += p.expectedAmountMinor;
      return {
        _id: p._id.toString(),
        year: p.year,
        month: p.month,
        expectedAmountMinor: p.expectedAmountMinor,
        verifiedPaidAmountMinor: p.verifiedPaidAmountMinor,
        status: p.status,
        singlePaymentId: fundingPayments.length === 1 ? fundingPayments[0]._id : undefined,
      };
    });
    return {
      clientId: c._id.toString(),
      clientName: c.name,
      currency: c.billing?.currency ?? 'EUR',
      monthlyFeeMinor: c.billing?.monthlyFeeMinor ?? 0,
      billingDay: c.billing?.billingDay ?? 1,
      periods: mapped,
      outstandingMinor: computeOutstandingMinor(clientPeriods),
      unpaidMonthsCount: clientPeriods.filter((p) => p.status === 'UNPAID' || p.status === 'PARTIALLY_PAID').length,
    };
  });

  return { clients: result, totalCollectedMinor, totalExpectedMinor };
}
