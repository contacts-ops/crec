import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IEntreprise extends Document {
  _id: Types.ObjectId;
  siteId?: string;
  photo?: string;
  nom?: string;
  telephone?: string;
  email?: string;
  nomRepresentant?: string;
  dateCreation?: string;
  dateAgrement?: string;
  adresseCentreAffaires?: {
    adresse?: string;
    codePostal?: string;
    ville?: string;
    pays?: string;
  };
  siegeDifferent?: boolean;
  adresseSiege?: {
    adresse?: string;
    codePostal?: string;
    ville?: string;
    pays?: string;
  };
  description?: string;
  logo?: string;
  cachetSignature?: string;
  kbis?: string;
  agrementPrefectoral?: string;
  villeRcs?: string;
  siren?: string;
  arreteActivite?: string;
  tauxCommission?: number;
  tauxCommissionClientsExistants?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const EntrepriseSchema = new Schema<IEntreprise>(
  {
    siteId: { type: String },
    photo: { type: String },
    nom: { type: String },
    telephone: { type: String },
    email: { type: String },
    nomRepresentant: { type: String },
    dateCreation: { type: String },
    dateAgrement: { type: String },
    adresseCentreAffaires: {
      adresse: { type: String },
      codePostal: { type: String },
      ville: { type: String },
      pays: { type: String }
    },
    siegeDifferent: { type: Boolean },
    adresseSiege: {
      adresse: { type: String },
      codePostal: { type: String },
      ville: { type: String },
      pays: { type: String }
    },
    description: { type: String },
    logo: { type: String },
    cachetSignature: { type: String },
    kbis: { type: String },
    agrementPrefectoral: { type: String },
    villeRcs: { type: String },
    siren: { type: String },
    arreteActivite: { type: String },
    tauxCommission: { type: Number },
    tauxCommissionClientsExistants: { type: Number }
  },
  { timestamps: true }
);

export const Entreprise: Model<IEntreprise> = mongoose.models.Entreprise || mongoose.model<IEntreprise>('Entreprise', EntrepriseSchema); 