import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAbonnement extends Document {
  _id: Types.ObjectId;
  siteId?: string;
  nom: string;
  description?: string;
  prix?: number;
  duree?: string; // mensuel, annuel, etc.
  type: 'domiciliation' | 'location_bureaux';
  actif?: boolean;
  caracteristiques?: string[];
  stripeProductId?: string;
  stripePriceId?: string;
  // Nouveaux IDs séparés par mode
  stripeProductIdTest?: string;
  stripePriceIdTest?: string;
  stripeProductIdLive?: string;
  stripePriceIdLive?: string;
  // Indique dans quel mode le dernier produit Stripe a été créé/mis à jour
  stripeMode?: 'test' | 'live';
  createdAt?: Date;
  updatedAt?: Date;
}

const AbonnementSchema = new Schema<IAbonnement>(
  {
    siteId: { type: String },
    nom: { type: String, required: true },
    description: { type: String },
    prix: { type: Number },
    duree: { type: String },
    type: { type: String, required: true, enum: ['domiciliation', 'location_bureaux'] },
    actif: { type: Boolean, default: true },
    caracteristiques: [{ type: String }],
    stripeProductId: { type: String },
    stripePriceId: { type: String },
    stripeProductIdTest: { type: String },
    stripePriceIdTest: { type: String },
    stripeProductIdLive: { type: String },
    stripePriceIdLive: { type: String }
    ,
    stripeMode: { type: String, enum: ['test', 'live'], default: undefined }
  },
  { timestamps: true }
);

export const Abonnement: Model<IAbonnement> = mongoose.models.Abonnement || mongoose.model<IAbonnement>('Abonnement', AbonnementSchema); 