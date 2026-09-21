import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * The single ledger for all company money — income, expenses, and internal
 * wallet transfers. Every amount keeps its original currency/amount AND a
 * converted EUR "base" amount using the exchange rate captured at the time
 * of recording (see '@/lib/exchangeRate') — old transactions are never
 * retroactively recalculated when the default rate changes.
 *
 * INCOME:   walletId is the destination.
 * EXPENSE:  walletId is the source.
 * TRANSFER: fromWalletId/toWalletId are used instead; transfers never count
 *           as income or expense (see computeFinanceSummary in '@/lib/finance').
 *
 * `sourcePaymentId` links a transaction back to the ClientPayment that
 * generated it automatically on verification — the unique sparse index
 * guarantees a payment can never be synced into Finance more than once,
 * even under a concurrent/retried request.
 */
export interface IFinanceEditHistoryEntryDoc {
  editedAt: Date;
  editedBy: mongoose.Types.ObjectId;
  changes: Record<string, { from: unknown; to: unknown }>;
}

const FinanceEditHistorySchema = new Schema<IFinanceEditHistoryEntryDoc>(
  {
    editedAt: { type: Date, required: true },
    editedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changes: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

export interface IFinanceTransactionDoc extends Document {
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  status: 'ACTIVE' | 'VOIDED';
  category?: string;
  description?: string;
  clientId?: mongoose.Types.ObjectId;
  reference?: string;
  notes?: string;

  originalAmountMinor: number;
  originalCurrency: string;
  exchangeRate: number;
  baseAmountMinor: number;

  walletId?: mongoose.Types.ObjectId;
  fromWalletId?: mongoose.Types.ObjectId;
  toWalletId?: mongoose.Types.ObjectId;

  transactionDate: Date;
  createdBy: mongoose.Types.ObjectId;
  sourcePaymentId?: mongoose.Types.ObjectId;

  voidedAt?: Date;
  voidedBy?: mongoose.Types.ObjectId;
  voidReason?: string;

  editHistory: IFinanceEditHistoryEntryDoc[];
  createdAt: Date;
  updatedAt: Date;
}

const FinanceTransactionSchema = new Schema<IFinanceTransactionDoc>(
  {
    type: { type: String, enum: ['INCOME', 'EXPENSE', 'TRANSFER'], required: true },
    status: { type: String, enum: ['ACTIVE', 'VOIDED'], default: 'ACTIVE' },
    category: { type: String },
    description: { type: String },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    reference: { type: String },
    notes: { type: String },

    originalAmountMinor: { type: Number, required: true, min: 1 },
    originalCurrency: { type: String, required: true, default: 'EUR' },
    exchangeRate: { type: Number, required: true, default: 1 },
    baseAmountMinor: { type: Number, required: true, min: 0 },

    walletId: { type: Schema.Types.ObjectId, ref: 'Wallet' },
    fromWalletId: { type: Schema.Types.ObjectId, ref: 'Wallet' },
    toWalletId: { type: Schema.Types.ObjectId, ref: 'Wallet' },

    transactionDate: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sourcePaymentId: { type: Schema.Types.ObjectId, ref: 'ClientPayment' },

    voidedAt: { type: Date },
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    voidReason: { type: String },

    editHistory: { type: [FinanceEditHistorySchema], default: [] },
  },
  { timestamps: true }
);

FinanceTransactionSchema.index({ sourcePaymentId: 1 }, { unique: true, sparse: true });
FinanceTransactionSchema.index({ transactionDate: -1 });
FinanceTransactionSchema.index({ type: 1, status: 1 });
FinanceTransactionSchema.index({ walletId: 1 });
FinanceTransactionSchema.index({ fromWalletId: 1 });
FinanceTransactionSchema.index({ toWalletId: 1 });

const FinanceTransaction: Model<IFinanceTransactionDoc> =
  mongoose.models.FinanceTransaction ?? mongoose.model<IFinanceTransactionDoc>('FinanceTransaction', FinanceTransactionSchema);
export default FinanceTransaction;
