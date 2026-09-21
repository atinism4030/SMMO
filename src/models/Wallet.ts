import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * A company money "account" — personal (Altin/Ethnik), company bank, or
 * savings. Wallets always report their balance in EUR (the company's base
 * reporting currency); balance is derived from FinanceTransaction ledger
 * entries (see computeWalletBalances in '@/lib/finance'), never stored
 * directly, so it can never drift out of sync with transaction history.
 */
export interface IWalletDoc extends Document {
  name: string;
  type: 'PERSONAL' | 'COMPANY' | 'SAVINGS';
  ownerUserId?: mongoose.Types.ObjectId;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWalletDoc>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['PERSONAL', 'COMPANY', 'SAVINGS'], default: 'COMPANY' },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Wallet: Model<IWalletDoc> = mongoose.models.Wallet ?? mongoose.model<IWalletDoc>('Wallet', WalletSchema);
export default Wallet;
