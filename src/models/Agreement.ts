import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAgreementDoc extends Document {
  clientId: mongoose.Types.ObjectId;
  title: string;
  fileUrl?: string;
  fileName?: string;
  agreementType: 'OFFER' | 'CONTRACT' | 'INVOICE' | 'OTHER';
  startDate?: Date;
  endDate?: Date;
  notes?: string;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AgreementSchema = new Schema<IAgreementDoc>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    title: { type: String, required: true },
    fileUrl: { type: String },
    fileName: { type: String },
    agreementType: { type: String, enum: ['OFFER', 'CONTRACT', 'INVOICE', 'OTHER'], default: 'CONTRACT' },
    startDate: { type: Date },
    endDate: { type: Date },
    notes: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const Agreement: Model<IAgreementDoc> = mongoose.models.Agreement ?? mongoose.model<IAgreementDoc>('Agreement', AgreementSchema);
export default Agreement;
