import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReportDoc extends Document {
  clientId: mongoose.Types.ObjectId;
  contentItemId?: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  reportDate: Date;
  daysAfterPosting?: number;
  views?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
  engagementRate?: number;
  notes?: string;
  screenshotUrl?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReportDoc>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem' },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    reportDate: { type: Date, required: true },
    daysAfterPosting: { type: Number, default: 3 },
    views: { type: Number },
    reach: { type: Number },
    likes: { type: Number },
    comments: { type: Number },
    shares: { type: Number },
    saves: { type: Number },
    clicks: { type: Number },
    engagementRate: { type: Number },
    notes: { type: String },
    screenshotUrl: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const Report: Model<IReportDoc> = mongoose.models.Report ?? mongoose.model<IReportDoc>('Report', ReportSchema);
export default Report;
