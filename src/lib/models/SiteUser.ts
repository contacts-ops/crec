import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteUserWithIsOwner extends ISiteUser {
  isOwner?: boolean;
}

export interface ISiteUser extends Document {
  siteId: string;
  userId: mongoose.Types.ObjectId | IUser;
  email: string;
  permission: 'read' | 'write' | 'admin';
  invitedBy: mongoose.Types.ObjectId;
  status: 'pending' | 'active' | 'revoked';
  invitedAt: Date;
  acceptedAt?: Date;
  lastAccessed?: Date;
}

const SiteUserSchema = new Schema<ISiteUser>({
  siteId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  permission: {
    type: String,
    enum: ['read', 'write', 'admin'],
    default: 'read',
    required: true,
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'revoked'],
    default: 'pending',
  },
  invitedAt: {
    type: Date,
    default: Date.now,
  },
  acceptedAt: {
    type: Date,
  },
  lastAccessed: {
    type: Date,
  },
});

// Index composé pour éviter les doublons
SiteUserSchema.index({ siteId: 1, userId: 1 }, { unique: true });

export const SiteUser = mongoose.models.SiteUser || mongoose.model<ISiteUser>('SiteUser', SiteUserSchema);
