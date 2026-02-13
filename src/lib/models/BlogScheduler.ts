import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBlogScheduler extends Document {
  siteId: string;
  isActive: boolean;
  frequency: 'daily' | 'weekly';
  time: string; // HH:mm
  dayOfWeek?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  keywords: string;
  tone: 'professional' | 'casual' | 'formal';
  length: 'short' | 'medium' | 'long';
  nextExecution?: Date;
  lastExecution?: Date;
  totalExecutions: number;
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchedulerSchema = new Schema<IBlogScheduler>(
  {
    siteId: { type: String, required: true, index: true, unique: true },
    isActive: { type: Boolean, required: true, default: false },
    frequency: { type: String, enum: ['daily', 'weekly'], required: true, default: 'daily' },
    time: { type: String, required: true, default: '09:00' },
    dayOfWeek: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], default: 'monday' },
    keywords: { type: String, required: true, default: '' },
    tone: { type: String, enum: ['professional', 'casual', 'formal'], required: true, default: 'professional' },
    length: { type: String, enum: ['short', 'medium', 'long'], required: true, default: 'medium' },
    nextExecution: { type: Date },
    lastExecution: { type: Date },
    totalExecutions: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export const BlogScheduler: Model<IBlogScheduler> = mongoose.models.BlogScheduler || mongoose.model<IBlogScheduler>('BlogScheduler', BlogSchedulerSchema);


