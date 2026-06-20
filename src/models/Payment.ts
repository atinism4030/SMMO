import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPaymentDoc extends Document {
  clientId: mongoose.Types.ObjectId;
  month: number;
  year: number;
  amount: number;
  currency: string;
  status: 'PAID' | 'UNPAID' | 'PARTIAL' | 'LATE';
  dueDate?: Date;
  paidDate?: Date;
  paymentMethod?: string;
  invoiceUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPaymentDoc>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: ['PAID', 'UNPAID', 'PARTIAL', 'LATE'], default: 'UNPAID' },
    dueDate: { type: Date },
    paidDate: { type: Date },
    paymentMethod: { type: String, enum: ['CASH', 'BANK', 'CARD', 'OTHER'] },
    invoiceUrl: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

const Payment: Model<IPaymentDoc> = mongoose.models.Payment ?? mongoose.model<IPaymentDoc>('Payment', PaymentSchema);
export default Payment;
