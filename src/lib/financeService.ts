/**
 * DB-backed finance orchestration. Pure calculations live in '@/lib/finance'
 * and '@/lib/exchangeRate'; this module is the single place that writes
 * Wallet/FinanceTransaction documents and the only place that links a
 * verified ClientPayment to its automatic income transaction.
 */
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Wallet, { type IWalletDoc } from '@/models/Wallet';
import FinanceTransaction, { type IFinanceTransactionDoc } from '@/models/FinanceTransaction';
import ActivityLog from '@/models/ActivityLog';
import { toMinorUnits, fromMinorUnits } from '@/lib/money';
import { toBaseEUR } from '@/lib/exchangeRate';
import {
  computeWalletBalanceMinor, computeFinanceSummary, SOURCE_PAYMENT_CATEGORY,
  type FinanceTransactionType,
} from '@/lib/finance';

export class FinanceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    this.name = 'FinanceError';
  }
}

async function log(userId: string, action: string, entityType: string, entityId: mongoose.Types.ObjectId | string, message: string) {
  await ActivityLog.create({ userId, action, entityType, entityId, message });
}

// ─── Wallets ────────────────────────────────────────────────────────────────

const DEFAULT_WALLETS: { name: string; type: 'PERSONAL' | 'COMPANY' | 'SAVINGS'; order: number }[] = [
  { name: 'Company Bank', type: 'COMPANY', order: 0 },
  { name: 'Altin Wallet', type: 'PERSONAL', order: 1 },
  { name: 'Ethnik Wallet', type: 'PERSONAL', order: 2 },
  { name: 'Savings Account', type: 'SAVINGS', order: 3 },
];

/** Idempotent: safe to call on every request. Never duplicates or overwrites existing wallets. */
export async function ensureDefaultWallets(): Promise<void> {
  await connectDB();
  await Promise.all(
    DEFAULT_WALLETS.map((w) => Wallet.updateOne({ name: w.name }, { $setOnInsert: w }, { upsert: true }))
  );
}

export async function createWallet(name: string, type: 'PERSONAL' | 'COMPANY' | 'SAVINGS', ownerUserId?: string) {
  await connectDB();
  if (!name?.trim()) throw new FinanceError('Wallet name is required');
  const order = await Wallet.countDocuments();
  return Wallet.create({ name: name.trim(), type, ownerUserId: ownerUserId || undefined, order });
}

export interface WalletWithBalance extends Omit<IWalletDoc, keyof mongoose.Document> {
  _id: mongoose.Types.ObjectId;
  balanceMinor: number;
}

export async function getWalletsWithBalances(): Promise<WalletWithBalance[]> {
  await connectDB();
  await ensureDefaultWallets();
  const [wallets, transactions] = await Promise.all([
    Wallet.find({ isActive: true }).sort({ order: 1, createdAt: 1 }),
    FinanceTransaction.find({ status: 'ACTIVE' }, 'type status baseAmountMinor walletId fromWalletId toWalletId'),
  ]);
  const entries = transactions.map((t) => ({
    type: t.type,
    status: t.status,
    baseAmountMinor: t.baseAmountMinor,
    walletId: t.walletId?.toString(),
    fromWalletId: t.fromWalletId?.toString(),
    toWalletId: t.toWalletId?.toString(),
  }));
  return wallets.map((w) => ({
    ...(w.toObject() as unknown as WalletWithBalance),
    balanceMinor: computeWalletBalanceMinor(w._id.toString(), entries),
  }));
}

// ─── Transaction creation ───────────────────────────────────────────────────

interface MoneyInput {
  amount: number; // major units, in `currency`
  currency: string;
  exchangeRateOverride?: number; // MKD-per-EUR override; ignored unless currency is MKD
}

function convert(input: MoneyInput) {
  const originalAmountMinor = toMinorUnits(input.amount);
  return toBaseEUR(originalAmountMinor, input.currency, input.exchangeRateOverride);
}

export interface CreateIncomeInput extends MoneyInput {
  category: string;
  description?: string;
  clientId?: string;
  reference?: string;
  notes?: string;
  walletId: string;
  transactionDate: string | Date;
  createdBy: string;
  /** Only set by the internal payment→finance sync path — never accept this from a request body. */
  sourcePaymentId?: string;
}

export async function createIncome(input: CreateIncomeInput): Promise<IFinanceTransactionDoc> {
  await connectDB();
  if (!input.amount || input.amount <= 0) throw new FinanceError('Amount must be greater than zero');
  const wallet = await Wallet.findById(input.walletId);
  if (!wallet) throw new FinanceError('Destination wallet not found', 404);
  const date = new Date(input.transactionDate);
  if (isNaN(date.getTime())) throw new FinanceError('Invalid transaction date');
  const converted = convert(input);

  const txn = await FinanceTransaction.create({
    type: 'INCOME',
    status: 'ACTIVE',
    category: input.category,
    description: input.description?.trim() || undefined,
    clientId: input.clientId || undefined,
    reference: input.reference?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    originalAmountMinor: converted.originalAmountMinor,
    originalCurrency: converted.originalCurrency,
    exchangeRate: converted.exchangeRate,
    baseAmountMinor: converted.baseAmountMinor,
    walletId: wallet._id,
    transactionDate: date,
    createdBy: input.createdBy,
    sourcePaymentId: input.sourcePaymentId || undefined,
    editHistory: [],
  });

  await log(input.createdBy, 'CREATE', 'FinanceTransaction', txn._id, `Recorded income of €${(converted.baseAmountMinor / 100).toFixed(2)} (${input.category}) into ${wallet.name}`);
  return txn;
}

export interface CreateExpenseInput extends MoneyInput {
  category: string;
  description?: string;
  reference?: string;
  notes?: string;
  walletId: string;
  transactionDate: string | Date;
  createdBy: string;
}

export async function createExpense(input: CreateExpenseInput): Promise<IFinanceTransactionDoc> {
  await connectDB();
  if (!input.amount || input.amount <= 0) throw new FinanceError('Amount must be greater than zero');
  const wallet = await Wallet.findById(input.walletId);
  if (!wallet) throw new FinanceError('Source wallet not found', 404);
  const date = new Date(input.transactionDate);
  if (isNaN(date.getTime())) throw new FinanceError('Invalid transaction date');
  const converted = convert(input);

  const txn = await FinanceTransaction.create({
    type: 'EXPENSE',
    status: 'ACTIVE',
    category: input.category,
    description: input.description?.trim() || undefined,
    reference: input.reference?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    originalAmountMinor: converted.originalAmountMinor,
    originalCurrency: converted.originalCurrency,
    exchangeRate: converted.exchangeRate,
    baseAmountMinor: converted.baseAmountMinor,
    walletId: wallet._id,
    transactionDate: date,
    createdBy: input.createdBy,
    editHistory: [],
  });

  await log(input.createdBy, 'CREATE', 'FinanceTransaction', txn._id, `Recorded expense of €${(converted.baseAmountMinor / 100).toFixed(2)} (${input.category}) from ${wallet.name}`);
  return txn;
}

export interface CreateTransferInput extends MoneyInput {
  fromWalletId: string;
  toWalletId: string;
  description?: string;
  transactionDate: string | Date;
  createdBy: string;
}

/** Transfers never affect income/expense/net — see computeFinanceSummary. */
export async function createTransfer(input: CreateTransferInput): Promise<IFinanceTransactionDoc> {
  await connectDB();
  if (input.fromWalletId === input.toWalletId) throw new FinanceError('Source and destination wallets must be different');
  if (!input.amount || input.amount <= 0) throw new FinanceError('Amount must be greater than zero');
  const [fromWallet, toWallet] = await Promise.all([Wallet.findById(input.fromWalletId), Wallet.findById(input.toWalletId)]);
  if (!fromWallet || !toWallet) throw new FinanceError('Wallet not found', 404);
  const date = new Date(input.transactionDate);
  if (isNaN(date.getTime())) throw new FinanceError('Invalid transaction date');
  const converted = convert(input);

  const txn = await FinanceTransaction.create({
    type: 'TRANSFER',
    status: 'ACTIVE',
    description: input.description?.trim() || undefined,
    originalAmountMinor: converted.originalAmountMinor,
    originalCurrency: converted.originalCurrency,
    exchangeRate: converted.exchangeRate,
    baseAmountMinor: converted.baseAmountMinor,
    fromWalletId: fromWallet._id,
    toWalletId: toWallet._id,
    transactionDate: date,
    createdBy: input.createdBy,
    editHistory: [],
  });

  await log(input.createdBy, 'TRANSFER', 'FinanceTransaction', txn._id, `Transferred €${(converted.baseAmountMinor / 100).toFixed(2)} from ${fromWallet.name} to ${toWallet.name}`);
  return txn;
}

export async function voidTransaction(transactionId: string, actorUserId: string, reason?: string): Promise<IFinanceTransactionDoc> {
  await connectDB();
  const txn = await FinanceTransaction.findOneAndUpdate(
    { _id: transactionId, status: { $ne: 'VOIDED' } },
    { $set: { status: 'VOIDED', voidedAt: new Date(), voidedBy: actorUserId, voidReason: reason } },
    { new: true }
  );
  if (!txn) throw new FinanceError('Transaction not found or already voided', 409);
  await log(actorUserId, 'VOID', 'FinanceTransaction', txn._id, `Voided ${txn.type.toLowerCase()} transaction${reason ? `: ${reason}` : ''}`);
  return txn;
}

// ─── Client payment ↔ Finance sync ──────────────────────────────────────────

/**
 * Called by billingService.verifyPayment() the moment a client payment
 * becomes VERIFIED. Creates exactly one linked income transaction — the
 * unique sparse index on FinanceTransaction.sourcePaymentId plus the
 * `linkedFinanceTransactionId` guard on the payment itself make this safe
 * to call more than once for the same payment (e.g. a retried request).
 */
export async function syncVerifiedPaymentToFinance(params: {
  paymentId: string;
  clientId: string;
  amountMinor: number;
  currency: string;
  destinationWalletId?: string;
  transactionDate: Date;
  createdBy: string;
}): Promise<void> {
  await connectDB();
  await ensureDefaultWallets();

  const ClientPayment = (await import('@/models/ClientPayment')).default;
  const payment = await ClientPayment.findById(params.paymentId);
  if (!payment || payment.linkedFinanceTransactionId) return;

  let walletId = params.destinationWalletId;
  if (!walletId) {
    const bank = await Wallet.findOne({ name: 'Company Bank' });
    walletId = bank?._id?.toString();
  }
  if (!walletId) return; // ensureDefaultWallets() guarantees this exists in practice

  try {
    const txn = await createIncome({
      category: SOURCE_PAYMENT_CATEGORY,
      description: 'Client billing payment',
      clientId: params.clientId,
      amount: fromMinorUnits(params.amountMinor),
      currency: params.currency,
      walletId,
      transactionDate: params.transactionDate,
      createdBy: params.createdBy,
      sourcePaymentId: params.paymentId,
    });
    await ClientPayment.findOneAndUpdate(
      { _id: params.paymentId, linkedFinanceTransactionId: { $exists: false } },
      { $set: { linkedFinanceTransactionId: txn._id, destinationWalletId: walletId } }
    );
  } catch (err: unknown) {
    // A duplicate-key error on sourcePaymentId means a concurrent/retried call
    // already synced this exact payment — that's the guard working, not a bug.
    const isDuplicateKey = err instanceof Error && 'code' in err && (err as unknown as { code: number }).code === 11000;
    if (!isDuplicateKey) throw err;
  }
}

/**
 * Called by billingService when a payment that already generated a finance
 * transaction is cancelled or corrected (edited back to PENDING_CONFIRMATION).
 * Voids the linked transaction rather than deleting it, preserving the audit
 * trail, and clears the link so a future re-verification creates a fresh one.
 */
export async function voidLinkedFinanceTransaction(paymentId: string, actorUserId: string, reason: string): Promise<void> {
  await connectDB();
  const ClientPayment = (await import('@/models/ClientPayment')).default;
  const payment = await ClientPayment.findById(paymentId);
  if (!payment?.linkedFinanceTransactionId) return;

  const txn = await FinanceTransaction.findById(payment.linkedFinanceTransactionId);
  if (txn && txn.status !== 'VOIDED') {
    await voidTransaction(txn._id.toString(), actorUserId, reason);
  }
  await ClientPayment.findByIdAndUpdate(paymentId, { $unset: { linkedFinanceTransactionId: 1 } });
}

// ─── Summary ────────────────────────────────────────────────────────────────

export interface FinanceDashboardSummary {
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  netMinor: number;
  wallets: WalletWithBalance[];
}

export async function getFinanceDashboardSummary(range?: { from?: Date; to?: Date }): Promise<FinanceDashboardSummary> {
  await connectDB();
  const dateQuery: Record<string, Date> = {};
  if (range?.from) dateQuery.$gte = range.from;
  if (range?.to) dateQuery.$lte = range.to;

  const [entries, wallets] = await Promise.all([
    FinanceTransaction.find(
      { status: 'ACTIVE', ...(Object.keys(dateQuery).length ? { transactionDate: dateQuery } : {}) },
      'type status baseAmountMinor'
    ),
    getWalletsWithBalances(),
  ]);

  const { totalIncomeMinor, totalExpenseMinor, netMinor } = computeFinanceSummary(
    entries.map((e) => ({ type: e.type as FinanceTransactionType, status: 'ACTIVE', baseAmountMinor: e.baseAmountMinor }))
  );

  return { totalIncomeMinor, totalExpenseMinor, netMinor, wallets };
}
