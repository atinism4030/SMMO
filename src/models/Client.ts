import mongoose, { Schema, Document, Model } from 'mongoose';

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
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED';
  startDate?: Date;
  notes?: string;
  brandColors?: string[];
  logoUrl?: string;
  driveFolderUrl?: string;
  isDemo: boolean;
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
    status: { type: String, enum: ['ACTIVE', 'PAUSED', 'CLOSED'], default: 'ACTIVE' },
    startDate: { type: Date },
    notes: { type: String },
    brandColors: [{ type: String }],
    logoUrl: { type: String },
    driveFolderUrl: { type: String },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Client: Model<IClientDoc> = mongoose.models.Client ?? mongoose.model<IClientDoc>('Client', ClientSchema);
export default Client;
