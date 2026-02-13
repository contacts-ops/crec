import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IMedia extends Document {
  _id: Types.ObjectId;
  siteId: string; // ID du site propriétaire
  pageId?: string; // ID de la page (optionnel)
  componentId: string; // ID du composant
  componentName: string; // Nom du composant
  componentType: string; // Type du composant (hero, section, etc.)
  pageName?: string; // Nom de la page (optionnel)
  
  // Informations sur le média
  mediaUrl: string; // URL du média sur S3
  mediaType: 'image' | 'video'; // Type de média
  fileName: string; // Nom original du fichier
  fileSize: number; // Taille en bytes
  mimeType: string; // Type MIME
  
  // Métadonnées
  title?: string; // Titre du média (optionnel)
  description?: string; // Description du média (optionnel)
  altText?: string; // Texte alternatif pour l'accessibilité
  
  // Informations de contexte
  fieldId: string; // ID du champ dans le composant (mediaUrl, mediaUrl2, etc.)
  isActive: boolean; // Si le média est toujours utilisé
  
  // Ordonnancement
  position?: number; // Position personnalisée pour l'ordre d'affichage
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>({
  siteId: { 
    type: String, 
    required: [true, 'Le siteId est requis'],
    index: true 
  },
  pageId: { 
    type: String,
    index: true 
  },
  componentId: { 
    type: String, 
    required: [true, 'Le componentId est requis'],
    index: true 
  },
  componentName: { 
    type: String, 
    required: [true, 'Le nom du composant est requis'] 
  },
  componentType: { 
    type: String, 
    required: [true, 'Le type du composant est requis'] 
  },
  pageName: { 
    type: String 
  },
  
  // Informations sur le média
  mediaUrl: { 
    type: String, 
    required: [true, 'L\'URL du média est requise'] 
  },
  mediaType: { 
    type: String, 
    required: [true, 'Le type de média est requis'],
    enum: {
      values: ['image', 'video'],
      message: 'Le type de média doit être image ou video'
    }
  },
  fileName: { 
    type: String, 
    required: [true, 'Le nom du fichier est requis'] 
  },
  fileSize: { 
    type: Number, 
    required: [true, 'La taille du fichier est requise'],
    min: [1, 'La taille du fichier doit être supérieure à 0']
  },
  mimeType: { 
    type: String, 
    required: [true, 'Le type MIME est requis'] 
  },
  
  // Métadonnées
  title: { 
    type: String 
  },
  description: { 
    type: String 
  },
  altText: { 
    type: String 
  },
  
  // Informations de contexte
  fieldId: { 
    type: String, 
    required: [true, 'L\'ID du champ est requis'] 
  },
  isActive: { 
    type: Boolean, 
    default: true,
    index: true 
  },
  
  // Ordonnancement
  position: {
    type: Number,
    index: true
  }
}, { 
  timestamps: true 
});

// Index composés pour optimiser les requêtes
MediaSchema.index({ siteId: 1, componentId: 1, fieldId: 1 });
MediaSchema.index({ siteId: 1, pageId: 1 });
MediaSchema.index({ siteId: 1, mediaType: 1 });
MediaSchema.index({ siteId: 1, isActive: 1 });

export const Media: Model<IMedia> = mongoose.models.Media || mongoose.model<IMedia>('Media', MediaSchema);
