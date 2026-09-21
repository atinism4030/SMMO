import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * One calendar month of billing for one client.
 *
 * `expectedAmountMinor` is a snapshot of the client's monthly fee at the time
 * the period was generated — it must NEVER be recalculated retroactively when
 * the client's current fee changes, so historical months keep their original
 * price. `verifiedPaidAmountMinor` is a cache derived from the sum of
 * allocations on VERIFIED ClientPayments and is recomputed by
 * recomputeBillingPeriod() in '@/lib/billingService' whenever a payment's
 * verification state or allocations change — never write it directly outside
 * that function.
 */
export interface IBillingPeriodDoc extends Document {
  clientId: mongoose.Types.ObjectId;
  year: number;
  month: number;
  expectedAmountMinor: number;
  currency: string;
  verifiedPaidAmountMinor: number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERPAID';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BillingPeriodSchema = new Schema<IBillingPeriodDoc>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    expectedAmountMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'EUR' },
    verifiedPaidAmountMinor: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERPAID'], default: 'UNPAID' },
    notes: { type: String },
  },
  { timestamps: true }
);

// A client can have at most one billing period per calendar month — this is
// what makes billing-period generation idempotent (see ensureBillingPeriods
// in '@/lib/billingService', which upserts on this exact key).
BillingPeriodSchema.index({ clientId: 1, year: 1, month: 1 }, { unique: true });

const BillingPeriod: Model<IBillingPeriodDoc> =
  mongoose.models.BillingPeriod ?? mongoose.model<IBillingPeriodDoc>('BillingPeriod', BillingPeriodSchema);
export default BillingPeriod;
