import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICourrier extends Document {
  _id: Types.ObjectId;
  titre: string;
  description?: string;
  // Nouveau: prise en charge multi-fichiers (max 5 côté front)
  fichiers?: {
    nom: string;
    url: string;
    type: 'pdf' | 'image';
    taille: number;
  }[];
  // Legacy: compat pour anciens enregistrements/API
  fichier?: {
    nom: string;
    url: string;
    type: 'pdf' | 'image';
    taille: number;
  };
  siteId: string;
  utilisateurId: string;
  statut: 'nouveau' | 'lu' | 'traite' | 'archive';
  dateCreation: Date;
  dateModification?: Date;
}

const CourrierSchema = new Schema<ICourrier>(
  {
    titre: { 
      type: String, 
      required: [true, 'Le titre est requis'], 
      minlength: [3, 'Le titre doit contenir au moins 3 caractères'], 
      maxlength: [200, 'Le titre ne doit pas dépasser 200 caractères'] 
    },
    description: { 
      type: String, 
      maxlength: [1000, 'La description ne doit pas dépasser 1000 caractères'] 
    },
    fichiers: [{
      nom: { 
        type: String
      },
      url: { 
        type: String
      },
      type: { 
        type: String,
        enum: {
          values: ['pdf', 'image'],
          message: 'Le type de fichier doit être pdf ou image'
        }
      },
      taille: { 
        type: Number,
        min: [1, 'La taille du fichier doit être supérieure à 0']
      }
    }],
    // Champ legacy conservé pour compat
    fichier: {
      nom: { 
        type: String, 
        required: false 
      },
      url: { 
        type: String, 
        required: false 
      },
      type: { 
        type: String, 
        required: false, 
        enum: {
          values: ['pdf', 'image'],
          message: 'Le type de fichier doit être pdf ou image'
        }
      },
      taille: { 
        type: Number, 
        required: false,
        min: [1, 'La taille du fichier doit être supérieure à 0']
      }
    },
    siteId: { 
      type: String, 
      required: [true, 'Le siteId est requis'],
      index: true
    },
    utilisateurId: { 
      type: String, 
      required: [true, 'L\'utilisateurId est requis'],
      index: true
    },
    statut: { 
      type: String, 
      required: [true, 'Le statut est requis'], 
      enum: {
        values: ['nouveau', 'lu', 'traite', 'archive'],
        message: 'Le statut doit être nouveau, lu, traite ou archive'
      },
      default: 'nouveau'
    },
    dateCreation: { 
      type: Date, 
      default: Date.now,
      index: true
    },
    dateModification: { 
      type: Date 
    }
  },
  { 
    timestamps: false // On gère manuellement dateCreation et dateModification
  }
);

// Index composé pour optimiser les requêtes
CourrierSchema.index({ siteId: 1, statut: 1 });
CourrierSchema.index({ siteId: 1, utilisateurId: 1 });
CourrierSchema.index({ siteId: 1, dateCreation: -1 });

// Middleware pour mettre à jour dateModification
CourrierSchema.pre('findOneAndUpdate', function() {
  this.set({ dateModification: new Date() });
});

CourrierSchema.pre('updateOne', function() {
  this.set({ dateModification: new Date() });
});

CourrierSchema.pre('updateMany', function() {
  this.set({ dateModification: new Date() });
});

export const Courrier: Model<ICourrier> = mongoose.models.Courrier || mongoose.model<ICourrier>('Courrier', CourrierSchema); 