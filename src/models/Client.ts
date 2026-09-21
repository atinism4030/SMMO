import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClientBillingDoc {
  monthlyFeeMinor: number;
  currency: string;
  billingStartDate?: Date;
  billingDay: number;
  paymentTerms?: string;
  billingEnabled: boolean;
  notes?: string;
}

const ClientBillingSchema = new Schema<IClientBillingDoc>(
  {
    monthlyFeeMinor: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'EUR' },
    billingStartDate: { type: Date },
    billingDay: { type: Number, default: 1, min: 1, max: 28 },
    paymentTerms: { type: String },
    billingEnabled: { type: Boolean, default: false },
    notes: { type: String },
  },
  { _id: false }
);

export interface IClientDoc extends Document {
  name: string;
  businessType?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  websiteUrl?: string;
  address?: string;
  packageName?: string;
  monthlyPrice?: number;
  currency?: string;
  status: 'LEAD' | 'OFFER_SENT' | 'WAITING_RESPONSE' | 'ACCEPTED' | 'ACTIVE' | 'INACTIVE' | 'REJECTED' | 'PAUSED' | 'CLOSED';
  startDate?: Date;
  notes?: string;
  brandColors?: string[];
  logoUrl?: string;
  driveFolderUrl?: string;
  isDemo: boolean;
  billing?: IClientBillingDoc;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClientDoc>(
  {
    name: { type: String, required: true, trim: true },
    businessType: { type: String },
    contactPerson: { type: String },
    phone: { type: String },
    email: { type: String },
    instagramUrl: { type: String },
    facebookUrl: { type: String },
    tiktokUrl: { type: String },
    websiteUrl: { type: String },
    address: { type: String },
    packageName: { type: String },
    monthlyPrice: { type: Number },
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: ['LEAD', 'OFFER_SENT', 'WAITING_RESPONSE', 'ACCEPTED', 'ACTIVE', 'INACTIVE', 'REJECTED', 'PAUSED', 'CLOSED'], default: 'LEAD' },
    startDate: { type: Date },
    notes: { type: String },
    brandColors: [{ type: String }],
    logoUrl: { type: String },
    driveFolderUrl: { type: String },
    isDemo: { type: Boolean, default: false },
    billing: { type: ClientBillingSchema },
  },
  { timestamps: true }
);

const Client: Model<IClientDoc> = mongoose.models.Client ?? mongoose.model<IClientDoc>('Client', ClientSchema);
export default Client;
