import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * A client's request for a shoot slot, and Horizonte's response to it. This
 * is the ONE scheduling system in SMMO — there is deliberately no separate
 * "shoot day" execution tool anymore.
 *
 * `date` is always normalized to UTC midnight (see normalizeDateOnly in
 * '@/lib/booking'); `startTime`/`endTime` are separate "HH:MM" strings so
 * overlap checks never depend on timezone interpretation of a combined
 * datetime.
 */
export interface IBookingDoc extends Document {
  clientId: mongoose.Types.ObjectId;
  date: Date;
  startTime: string;
  endTime: string;
  shootType: 'PHOTO_SHOOT' | 'VIDEO_SHOOT' | 'PHOTO_VIDEO' | 'CONTENT_SESSION' | 'OTHER';
  notes?: string;
  status: 'PENDING' | 'SUGGESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

  requestedBy: mongoose.Types.ObjectId;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;

  suggestedDate?: Date;
  suggestedStartTime?: string;
  suggestedEndTime?: string;

  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBookingDoc>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    shootType: { type: String, enum: ['PHOTO_SHOOT', 'VIDEO_SHOOT', 'PHOTO_VIDEO', 'CONTENT_SESSION', 'OTHER'], default: 'PHOTO_SHOOT' },
    notes: { type: String },
    status: { type: String, enum: ['PENDING', 'SUGGESTED', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },

    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },

    suggestedDate: { type: Date },
    suggestedStartTime: { type: String },
    suggestedEndTime: { type: String },
  },
  { timestamps: true }
);

BookingSchema.index({ date: 1, status: 1 });
BookingSchema.index({ clientId: 1, status: 1 });

const Booking: Model<IBookingDoc> = mongoose.models.Booking ?? mongoose.model<IBookingDoc>('Booking', BookingSchema);
export default Booking;
