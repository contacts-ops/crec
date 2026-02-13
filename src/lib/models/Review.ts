import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  siteId: string;
  reviewId: string; // ID unique de l'avis (pour éviter les doublons)
  testimonial: string;
  author: string;
  authorImage: string;
  rating: number;
  date: string;
  source: 'google' | 'trustpilot' | 'other';
  placeId?: string; // ID du lieu Google si applicable
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>({
  siteId: { 
    type: String, 
    required: [true, 'Le siteId est requis'],
    index: true 
  },
  reviewId: { 
    type: String, 
    required: [true, 'L\'ID de l\'avis est requis'],
    index: true 
  },
  testimonial: { 
    type: String, 
    required: [true, 'Le témoignage est requis'] 
  },
  author: { 
    type: String, 
    required: [true, 'L\'auteur est requis'],
    default: 'Anonyme'
  },
  authorImage: { 
    type: String, 
    required: [true, 'L\'image de l\'auteur est requise'],
    default: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  },
  rating: { 
    type: Number, 
    required: [true, 'La note est requise'],
    min: 1,
    max: 5
  },
  date: { 
    type: String, 
    required: [true, 'La date est requise'] 
  },
  source: { 
    type: String, 
    required: [true, 'La source est requise'],
    enum: ['google', 'trustpilot', 'other']
  },
  placeId: { 
    type: String 
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now,
    index: true 
  }
}, { 
  timestamps: true 
});

// Index composé pour éviter les doublons par siteId et reviewId
ReviewSchema.index({ siteId: 1, reviewId: 1 }, { unique: true });

// Index pour optimiser les requêtes par siteId et date de mise à jour
ReviewSchema.index({ siteId: 1, lastUpdated: -1 });

export const Review = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
