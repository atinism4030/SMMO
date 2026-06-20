import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActivityLogDoc extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  entityType: string;
  entityId?: mongoose.Types.ObjectId;
  message: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLogDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId },
    message: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const ActivityLog: Model<IActivityLogDoc> = mongoose.models.ActivityLog ?? mongoose.model<IActivityLogDoc>('ActivityLog', ActivityLogSchema);
export default ActivityLog;
