import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReviewStats extends Document {
  siteId: string;
  placeId: string;
  title?: string;
  address?: string;
  averageRating: number;
  totalReviews: number;
  type?: string;
  source: 'google' | 'serpapi' | 'other';
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewStatsSchema = new Schema<IReviewStats>(
  {
    siteId: {
      type: String,
      required: [true, 'Le siteId est requis'],
      index: true,
    },
    placeId: {
      type: String,
      required: [true, 'Le placeId est requis'],
      index: true,
    },
    title: {
      type: String,
    },
    address: {
      type: String,
    },
    averageRating: {
      type: Number,
      required: [true, 'La note moyenne est requise'],
      default: 0,
    },
    totalReviews: {
      type: Number,
      required: [true, 'Le nombre total d’avis est requis'],
      default: 0,
    },
    type: {
      type: String,
    },
    source: {
      type: String,
      required: [true, 'La source est requise'],
      enum: ['google', 'serpapi', 'other'],
      default: 'serpapi',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

// Index composé pour un enregistrement unique par siteId + placeId
ReviewStatsSchema.index({ siteId: 1, placeId: 1 }, { unique: true });

export const ReviewStats: Model<IReviewStats> =
  mongoose.models.ReviewStats || mongoose.model<IReviewStats>('ReviewStats', ReviewStatsSchema);


