import mongoose, { Schema, Document, Model } from 'mongoose';
import type { DocLang } from '@/types';

export interface IGeneratedDocumentDoc extends Document {
  clientId: mongoose.Types.ObjectId;
  documentType: 'offer' | 'agreement';
  language: DocLang;
  title: string;
  generatedBy: mongoose.Types.ObjectId;
  documentData: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const GeneratedDocumentSchema = new Schema<IGeneratedDocumentDoc>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    documentType: { type: String, enum: ['offer', 'agreement'], required: true },
    language: { type: String, enum: ['en', 'sq', 'mk'], required: true },
    title: { type: String, required: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    documentData: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const GeneratedDocument: Model<IGeneratedDocumentDoc> =
  mongoose.models.GeneratedDocument ??
  mongoose.model<IGeneratedDocumentDoc>('GeneratedDocument', GeneratedDocumentSchema);

export default GeneratedDocument;
