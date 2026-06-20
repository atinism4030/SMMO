import mongoose, { Schema, Document } from 'mongoose';

export type PhotoshootStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ShotCategory =
  | 'Food' | 'Product' | 'Interior' | 'Exterior' | 'Staff'
  | 'Behind the Scenes' | 'Detail Shot' | 'Lifestyle'
  | 'Video' | 'Reel' | 'Story' | 'Drone' | 'Other';

export interface IShotItemDoc {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: ShotCategory;
  required: boolean;
  completed: boolean;
  completedBy?: mongoose.Types.ObjectId;
  completedAt?: Date;
  notes?: string;
  sampleImageUrl?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  order: number;
}

export interface IPhotoshootSessionDoc extends Document {
  clientId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  shootDate: Date;
  startTime: string;
  endTime?: string;
  location: string;
  address?: string;
  assignedWorkers: mongoose.Types.ObjectId[];
  status: PhotoshootStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  notes?: string;
  equipmentNeeded: string[];
  clientContactName?: string;
  clientContactPhone?: string;
  shotList: IShotItemDoc[];
  createdBy: mongoose.Types.ObjectId;
  isDemo?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SHOT_CATEGORIES: ShotCategory[] = [
  'Food', 'Product', 'Interior', 'Exterior', 'Staff',
  'Behind the Scenes', 'Detail Shot', 'Lifestyle',
  'Video', 'Reel', 'Story', 'Drone', 'Other',
];

const ShotItemSchema = new Schema<IShotItemDoc>(
  {
    title:         { type: String, required: true },
    description:   { type: String },
    category:      { type: String, enum: SHOT_CATEGORIES, default: 'Other' },
    required:      { type: Boolean, default: false },
    completed:     { type: Boolean, default: false },
    completedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
    completedAt:   { type: Date },
    notes:         { type: String },
    sampleImageUrl:{ type: String },
    priority:      { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
    order:         { type: Number, default: 0 },
  },
  { _id: true }
);

const PhotoshootSessionSchema = new Schema<IPhotoshootSessionDoc>(
  {
    clientId:           { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    title:              { type: String, required: true },
    description:        { type: String },
    shootDate:          { type: Date, required: true },
    startTime:          { type: String, required: true },
    endTime:            { type: String },
    location:           { type: String, required: true },
    address:            { type: String },
    assignedWorkers:    [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status:             { type: String, enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], default: 'PLANNED' },
    priority:           { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
    notes:              { type: String },
    equipmentNeeded:    [{ type: String }],
    clientContactName:  { type: String },
    clientContactPhone: { type: String },
    shotList:           [ShotItemSchema],
    createdBy:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isDemo:             { type: Boolean, default: false },
  },
  { timestamps: true }
);

const PhotoshootSession: mongoose.Model<IPhotoshootSessionDoc> =
  mongoose.models.PhotoshootSession ||
  mongoose.model<IPhotoshootSessionDoc>('PhotoshootSession', PhotoshootSessionSchema);

export default PhotoshootSession;
