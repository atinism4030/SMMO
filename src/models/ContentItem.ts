import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContentItemDoc extends Document {
  clientId: mongoose.Types.ObjectId;
  boardId?: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  title: string;
  contentType: string;
  caption?: string;
  platforms?: string[];
  scheduledDate?: Date;
  postedDate?: Date;
  status: string;
  mediaUrl?: string;
  designUrl?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ContentItemSchema = new Schema<IContentItemDoc>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    boardId: { type: Schema.Types.ObjectId, ref: 'Board' },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    title: { type: String, required: true },
    contentType: {
      type: String,
      enum: ['POST', 'REEL', 'STORY', 'CAROUSEL', 'VIDEO', 'PHOTO', 'AD'],
      default: 'POST',
    },
    caption: { type: String },
    platforms: [{ type: String }],
    scheduledDate: { type: Date },
    postedDate: { type: Date },
    status: {
      type: String,
      enum: ['IDEA', 'IN_PRODUCTION', 'EDITING', 'WAITING_APPROVAL', 'APPROVED', 'SCHEDULED', 'POSTED', 'REPORTED'],
      default: 'IDEA',
    },
    mediaUrl: { type: String },
    designUrl: { type: String },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const ContentItem: Model<IContentItemDoc> = mongoose.models.ContentItem ?? mongoose.model<IContentItemDoc>('ContentItem', ContentItemSchema);
export default ContentItem;
