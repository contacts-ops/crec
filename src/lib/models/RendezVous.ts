import mongoose, { Schema, Document } from 'mongoose';

export interface IRendezVous extends Document {
  siteId: string;
  hostName: string;
  eventName: string;
  callDuration: string;
  location: string;
  timeZone: string;
  userName: string;
  userEmail: string;
  userPhone?: string; // Numéro de téléphone de l'utilisateur
  hostEmail: string;
  selectedDate: Date;
  selectedTime: string;
  additionalNotes: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  // Champs Google Calendar
  googleEventId?: string;
  googleEventLink?: string;
  hangoutLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RendezVousSchema = new Schema<IRendezVous>({
  siteId: {
    type: String,
    required: true,
    index: true
  },
  hostName: {
    type: String,
    required: true
  },
  eventName: {
    type: String,
    required: true
  },

  callDuration: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  timeZone: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  userPhone: {
    type: String,
    required: false
  },
  hostEmail: {
    type: String,
    required: false
  },
  selectedDate: {
    type: Date,
    required: true,
    index: true
  },
  selectedTime: {
    type: String,
    required: true
  },
  additionalNotes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Champs Google Calendar
  googleEventId: {
    type: String,
    required: false
  },
  googleEventLink: {
    type: String,
    required: false
  },
  hangoutLink: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Index composé pour éviter les doublons
RendezVousSchema.index({ 
  siteId: 1, 
  userEmail: 1, 
  selectedDate: 1, 
  selectedTime: 1 
}, { unique: true });

// Index pour les requêtes de recherche
RendezVousSchema.index({ siteId: 1, status: 1 });
RendezVousSchema.index({ selectedDate: 1, status: 1 });

export const RendezVous = mongoose.models.RendezVous || mongoose.model<IRendezVous>('RendezVous', RendezVousSchema); 