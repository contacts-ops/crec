import mongoose, { Schema, Document } from 'mongoose';

export interface IPhoneLead extends Document {
  siteId?: string;
  name: string;
  phone: string;
  submittedAt: Date;
}

const PhoneLeadSchema = new Schema<IPhoneLead>({
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
  phone: {
    type: String,
    required: [true, 'Le numéro de téléphone est requis'],
    trim: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

PhoneLeadSchema.index({ siteId: 1, submittedAt: -1 });

if (mongoose.models.PhoneLead) {
  delete mongoose.models.PhoneLead;
}

export const PhoneLead = mongoose.model<IPhoneLead>('PhoneLead', PhoneLeadSchema);
