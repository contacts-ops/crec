import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  siteId?: string;
  name: string;
  firstName?: string;
  email: string;
  subject: string;
  message: string;
  submittedAt: Date;
  status: 'new' | 'read' | 'replied' | 'archived';
  adminNotes?: string;
  phone?: string;
  company?: string;
  source?: string;
  isDeleted?: boolean;
  deletedAt?: Date | null;
}

const ContactSchema = new Schema<IContact>({
  siteId: {
    type: String,
    index: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  firstName: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Format d\'email invalide']
  },
  subject: {
    type: String,
    required: [true, 'Le sujet est requis'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Le message est requis'],
    trim: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'archived'],
    default: 'new'
  },
  adminNotes: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    trim: true,
    default: 'form'
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null,
    index: true
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
ContactSchema.index({ email: 1, submittedAt: -1 });
ContactSchema.index({ status: 1, submittedAt: -1 });
ContactSchema.index({ siteId: 1, submittedAt: -1 });
ContactSchema.index({ isDeleted: 1, deletedAt: 1 });

// Forcer l'écrasement du modèle en dev pour refléter les changements de schéma
if (mongoose.models.Contact) {
  delete mongoose.models.Contact;
}

export const Contact = mongoose.model<IContact>('Contact', ContactSchema); 