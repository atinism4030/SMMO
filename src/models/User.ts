import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserDoc extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'CEO' | 'WORKER';
  avatarUrl?: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['CEO', 'WORKER'], default: 'WORKER' },
    avatarUrl: { type: String },
    phone: { type: String },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

const User: Model<IUserDoc> = mongoose.models.User ?? mongoose.model<IUserDoc>('User', UserSchema);
export default User;
