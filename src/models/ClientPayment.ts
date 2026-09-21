import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * A real-world payment recorded by an admin against one or more BillingPeriods.
 *
 * This is distinct from the legacy `Payment` model (a simple one-row-per-month
 * status tracker still used by the /payments page). ClientPayment supports the
 * full verification workflow: an admin-recorded payment starts as
 * PENDING_CONFIRMATION and only counts toward a client's confirmed balance
 * once the connected CLIENT user verifies it. See '@/lib/billingService' for
 * all state transitions — never mutate `verificationStatus` or `allocations`
 * directly outside that module, since BillingPeriod caches must be
 * recomputed in lockstep.
 */
export interface IPaymentAllocationDoc {
  billingPeriodId: mongoose.Types.ObjectId;
  amountMinor: number;
}

const PaymentAllocationSchema = new Schema<IPaymentAllocationDoc>(
  {
    billingPeriodId: { type: Schema.Types.ObjectId, ref: 'BillingPeriod', required: true },
    amountMinor: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

export interface IPaymentEditHistoryEntryDoc {
  editedAt: Date;
  editedBy: mongoose.Types.ObjectId;
  changes: Record<string, { from: unknown; to: unknown }>;
}

const PaymentEditHistorySchema = new Schema<IPaymentEditHistoryEntryDoc>(
  {
    editedAt: { type: Date, required: true },
    editedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changes: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

export interface IPaymentDisputeResolutionDoc {
  resolvedAt: Date;
  resolvedBy: mongoose.Types.ObjectId;
  action: 'EDITED' | 'CANCELLED' | 'RESENT' | 'DISMISSED';
  note?: string;
}

const DisputeResolutionSchema = new Schema<IPaymentDisputeResolutionDoc>(
  {
    resolvedAt: { type: Date, required: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['EDITED', 'CANCELLED', 'RESENT', 'DISMISSED'], required: true },
    note: { type: String },
  },
  { _id: false }
);

export interface IClientPaymentDoc extends Document {
  clientId: mongoose.Types.ObjectId;
  amountMinor: number;
  currency: string;
  paymentDate: Date;
  paymentMethod: 'CASH' | 'BANK' | 'CARD' | 'OTHER';
  reference?: string;
  notes?: string;
  allocations: IPaymentAllocationDoc[];
  creditAmountMinor: number;
  verificationStatus: 'PENDING_CONFIRMATION' | 'VERIFIED' | 'DISPUTED' | 'CANCELLED';
  /** Which company wallet this money lands in once verified (e.g. Company Bank). */
  destinationWalletId?: mongoose.Types.ObjectId;
  /** Set once this payment is synced into Finance as income — see '@/lib/financeService'. */
  linkedFinanceTransactionId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  disputedAt?: Date;
  disputeReason?: 'WRONG_AMOUNT' | 'WRONG_DATE' | 'NOT_MADE' | 'DUPLICATE' | 'OTHER';
  disputeMessage?: string;
  disputedBy?: mongoose.Types.ObjectId;
  disputeResolution?: IPaymentDisputeResolutionDoc;
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  editHistory: IPaymentEditHistoryEntryDoc[];
  createdAt: Date;
  updatedAt: Date;
}

const ClientPaymentSchema = new Schema<IClientPaymentDoc>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, default: 'EUR' },
    paymentDate: { type: Date, required: true },
    paymentMethod: { type: String, enum: ['CASH', 'BANK', 'CARD', 'OTHER'], required: true },
    reference: { type: String },
    notes: { type: String },
    allocations: { type: [PaymentAllocationSchema], default: [] },
    creditAmountMinor: { type: Number, default: 0, min: 0 },
    verificationStatus: {
      type: String,
      enum: ['PENDING_CONFIRMATION', 'VERIFIED', 'DISPUTED', 'CANCELLED'],
      default: 'PENDING_CONFIRMATION',
    },
    destinationWalletId: { type: Schema.Types.ObjectId, ref: 'Wallet' },
    linkedFinanceTransactionId: { type: Schema.Types.ObjectId, ref: 'FinanceTransaction' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    disputedAt: { type: Date },
    disputeReason: { type: String, enum: ['WRONG_AMOUNT', 'WRONG_DATE', 'NOT_MADE', 'DUPLICATE', 'OTHER'] },
    disputeMessage: { type: String },
    disputedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    disputeResolution: { type: DisputeResolutionSchema },
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    editHistory: { type: [PaymentEditHistorySchema], default: [] },
  },
  { timestamps: true }
);

ClientPaymentSchema.index({ clientId: 1, verificationStatus: 1 });
ClientPaymentSchema.index({ paymentDate: -1 });

const ClientPayment: Model<IClientPaymentDoc> =
  mongoose.models.ClientPayment ?? mongoose.model<IClientPaymentDoc>('ClientPayment', ClientPaymentSchema);
export default ClientPayment;
