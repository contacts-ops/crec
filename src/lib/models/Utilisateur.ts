import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Interface pour un paiement échoué
export interface IFailedPayment {
  invoiceId: string;
  amount: number;
  currency: string;
  failedAt: Date;
  reason?: string;
  attemptCount: number;
}

export interface IUtilisateur extends Document {
  _id: Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  siteId: string;
  phone?: string;
  avatar?: string;
  lastLogin?: Date;
  permissions: string[];
  stripeCustomerId?: string; // ID client Stripe pour les paiements
  failedPayments?: IFailedPayment[]; // Historique des paiements échoués
  resetToken?: string;
  resetExpires?: Date;
}

const FailedPaymentSchema = new Schema<IFailedPayment>({
  invoiceId: { 
    type: String, 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    required: true,
    default: 'eur'
  },
  failedAt: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  reason: { 
    type: String 
  },
  attemptCount: { 
    type: Number, 
    required: true,
    default: 1
  }
});

const UtilisateurSchema = new Schema<IUtilisateur>(
  {
    email: { 
      type: String, 
      required: true, 
      validate: {
        validator: function(email: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: 'Format d\'email invalide'
      }
    },
    firstName: { 
      type: String, 
      required: true, 
      minlength: [2, 'Le prénom doit contenir au moins 2 caractères'],
      maxlength: [50, 'Le prénom ne doit pas dépasser 50 caractères']
    },
    lastName: { 
      type: String, 
      required: true, 
      minlength: [2, 'Le nom doit contenir au moins 2 caractères'],
      maxlength: [50, 'Le nom ne doit pas dépasser 50 caractères']
    },
    password: { 
      type: String, 
      required: true,
      minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères']
    },
    role: { 
      type: String, 
      required: true, 
      enum: ['admin', 'user'],
      default: 'user'
    },
    status: { 
      type: String, 
      required: true, 
      enum: ['active', 'inactive'],
      default: 'active'
    },
    siteId: { 
      type: String, 
      required: true,
      index: true
    },
    phone: { 
      type: String,
      validate: {
        validator: function(phone: string) {
          if (!phone) return true; // Optionnel
          return /^[\+]?[0-9\s\-\(\)]{10,}$/.test(phone);
        },
        message: 'Format de téléphone invalide'
      }
    },
    avatar: { 
      type: String,
      validate: {
        validator: function(avatar: string) {
          if (!avatar) return true; // Optionnel
          return /^https?:\/\/.+/.test(avatar);
        },
        message: 'L\'avatar doit être une URL valide'
      }
    },
    lastLogin: { 
      type: Date 
    },
    permissions: { 
      type: [String], 
      default: function() {
        // Définir les permissions par défaut selon le rôle
        const role = this.role;
        switch (role) {
          case 'admin':
            return ['read', 'write', 'delete', 'manage_users', 'manage_site'];
          case 'user':
            return ['read'];
          default:
            return ['read'];
        }
      }
    },
    stripeCustomerId: {
      type: String,
      index: true, // Index pour les recherches rapides par ID client Stripe
      validate: {
        validator: function(stripeCustomerId: string) {
          if (!stripeCustomerId) return true; // Optionnel
          return /^cus_[a-zA-Z0-9]+$/.test(stripeCustomerId);
        },
        message: 'Format d\'ID client Stripe invalide'
      }
    },
    failedPayments: {
      type: [FailedPaymentSchema],
      default: []
    },
    resetToken: {
      type: String,
      index: true
    },
    resetExpires: {
      type: Date
    }
  },
  { 
    timestamps: true,
    collection: 'utilisateurs' // Spécifier le nom de la collection
  }
);

// Index composé pour éviter les doublons email par site
UtilisateurSchema.index({ email: 1, siteId: 1 }, { unique: true });

// Middleware pour mettre à jour les permissions quand le rôle change
UtilisateurSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    switch (this.role) {
      case 'admin':
        this.permissions = ['read', 'write', 'delete', 'manage_users', 'manage_site'];
        break;
      case 'user':
        this.permissions = ['read'];
        break;
      default:
        this.permissions = ['read'];
    }
  }
  next();
});

export const Utilisateur: Model<IUtilisateur> = mongoose.models.Utilisateur || mongoose.model<IUtilisateur>('Utilisateur', UtilisateurSchema); 