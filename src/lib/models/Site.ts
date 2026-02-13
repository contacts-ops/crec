import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ISite extends Document {
  siteId: string;
  name: string;
  description?: string;
  domain?: string;
  thumbnail?: string;
  status: "dev" | "prod";
  ownerId: mongoose.Types.ObjectId; // Propriétaire principal du site
  users: mongoose.Types.ObjectId[]; // Liste des utilisateurs ayant accès au site
  pages: mongoose.Types.ObjectId[]; // Liste des IDs des pages du site
  theme?: string;
  appearance?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    secondaryFontFamily?: string;
    scrollSnapping?: boolean; // Configuration du défilement par bloc
  };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string;
    // SEO International
    language?: string;
    country?: string;
    canonicalUrl?: string;
    alternateLanguages?: Array<{
      language: string;
      country: string;
      url: string;
    }>;
  };
  favicon?: string | null;

  // Configuration Chatbot (Crisp par défaut)
  chatbot?: {
    provider: "crisp";
    websiteId: string; // ID du site Crisp (CRISP_WEBSITE_ID)
    isEnabled: boolean;
    themeColor?: string;
  };

  // Configuration Stripe (fusionnée depuis SiteConfig)
  stripe?: {
    publicKey: string; // Chiffrée en base64
    secretKey: string; // Hashée avec bcrypt
    webhookSecret?: string; // Hashée avec bcrypt
    isTestMode: boolean;
    isConfigured: boolean;
  };

  // Configuration Google Calendar (fusionnée depuis SiteConfig)
  googleCalendar?: {
    clientId: string; // Chiffrée en base64
    clientSecret: string; // Hashée avec bcrypt
    refreshToken?: string; // Hashée avec bcrypt
    isConfigured: boolean;
    accessToken?: string;
    scope?: string;
    tokenType?: string;
    expiryDate?: Date;
    user?: Record<string, unknown>;
    emailGoogle?: string;
  };

  // Configuration Email (SMTP) (fusionnée depuis SiteConfig)
  email?: {
    host: string; // Chiffré en base64
    port: number;
    username: string; // Chiffré en base64
    password: string; // Hashée avec bcrypt
    isConfigured: boolean;
  };

  // Configuration générale (fusionnée depuis SiteConfig)
  general?: {
    siteName?: string;
    contactEmail?: string;
    phoneNumber?: string;
    address?: string;
  };

  // Configuration sender (Newsletter)
  sender?: {
    desiredFromName?: string;
    desiredFromEmail?: string;
    replyToEmail?: string;
    lastSenderStatus?: "verified" | "fallback" | "invalid";
    lastSenderCheckAt?: Date;
  };

  // Configuration des horaires de disponibilité
  availabilityConfig?: {
    monday: { enabled: boolean; start: string; end: string; pauseStart?: string; pauseEnd?: string };
    tuesday: { enabled: boolean; start: string; end: string; pauseStart?: string; pauseEnd?: string };
    wednesday: { enabled: boolean; start: string; end: string; pauseStart?: string; pauseEnd?: string };
    thursday: { enabled: boolean; start: string; end: string; pauseStart?: string; pauseEnd?: string };
    friday: { enabled: boolean; start: string; end: string; pauseStart?: string; pauseEnd?: string };
    saturday: { enabled: boolean; start: string; end: string; pauseStart?: string; pauseEnd?: string };
    sunday: { enabled: boolean; start: string; end: string; pauseStart?: string; pauseEnd?: string };
  };

  // Analytics
  analytics?: {
    posthog?: {
      projectId?: string; // team_id dans PostHog (unique pour tous les sites)
      publicKey?: string; // project_api_key (clé publique)
      isConfigured: boolean;
    };
  };

  // Configuration E-commerce Stripe (séparée de la config Stripe partagée)
  ecommerce?: {
    // Mode des prix : HT (hors taxes, défaut) ou TTC (toutes taxes comprises)
    priceMode?: "HT" | "TTC";
    // Taux de TVA (ex: 0.2 = 20%), utilisé uniquement en mode HT
    vatRate?: number;
    // Clés Stripe pour le module e-commerce uniquement
    testPublicKey?: string;
    testSecretKey?: string;
    livePublicKey?: string;
    liveSecretKey?: string;
    webhookSecret?: string; // Legacy - Pour les webhooks Stripe e-commerce
    testWebhookSecret?: string; // Webhook secret pour l'environnement de test
    liveWebhookSecret?: string; // Webhook secret pour l'environnement de production
    environment?: "development" | "production"; // Environnement actuel
    isConfigured: boolean; // Indique si la configuration est complète
    // Options de livraison (admin-defined, server-side)
    delivery?: {
      standardBase: number;
      standardPerItem: number;
      expressBase: number;
      expressPerItem: number;
      pickupCost: number;
      // Labels optionnels (affichage frontend)
      deliveryOptionsTitle?: string;
      standardDelivery?: string;
      standardPrice?: string;
      standardDelay?: string;
      expressDelivery?: string;
      expressPrice?: string;
      expressDelay?: string;
      pickupLabel?: string;
      pickupDelay?: string;
    };
  };

  lastUpdated: Date;
  createdAt: Date;
}

const SiteSchema = new Schema<ISite>({
  siteId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  domain: {
    type: String,
  },
  thumbnail: {
    type: String,
  },
  status: {
    type: String,
    enum: ["dev", "prod"],
    default: "dev",
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  users: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  pages: [
    {
      type: Schema.Types.ObjectId,
      ref: "Page",
    },
  ],
  theme: {
    type: String,
  },
  appearance: {
    primaryColor: String,
    secondaryColor: String,
    fontFamily: String,
    secondaryFontFamily: String,
    scrollSnapping: { type: Boolean, default: false }, // Défilement par bloc désactivé par défaut
  },
  seo: {
    title: String,
    description: String,
    keywords: String,
    // SEO International
    language: String,
    country: String,
    canonicalUrl: String,
    alternateLanguages: [
      {
        language: { type: String, required: true },
        country: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
  },
  favicon: {
    type: String,
  },

  // Configuration Chatbot (Crisp par défaut)
  chatbot: {
    provider: { type: String, default: "crisp" },
    websiteId: { type: String, default: "" },
    isEnabled: { type: Boolean, default: false },
    themeColor: { type: String, default: "" },
  },

  // Configuration Stripe (fusionnée depuis SiteConfig)
  stripe: {
    // Ancienne structure (legacy)
    publicKey: { type: String },
    secretKey: { type: String },
    webhookSecret: { type: String },
    // Nouvelle structure séparant test et live
    testPublicKey: { type: String },
    testSecretKey: { type: String },
    livePublicKey: { type: String },
    liveSecretKey: { type: String },
    isTestMode: { type: Boolean, default: true },
    isConfigured: { type: Boolean, default: false },
  },

  // Configuration Google Calendar (fusionnée depuis SiteConfig)
  googleCalendar: {
    clientId: { type: String },
    clientSecret: { type: String },
    refreshToken: { type: String },
    isConfigured: { type: Boolean, default: false },
    accessToken: { type: String },
    scope: { type: String },
    tokenType: { type: String },
    expiryDate: { type: Date },
    user: { type: Schema.Types.Mixed },
    emailGoogle: { type: String },
  },

  // Configuration Email (SMTP) (fusionnée depuis SiteConfig)
  email: {
    host: { type: String },
    port: { type: Number },
    username: { type: String },
    password: { type: String },
    isConfigured: { type: Boolean, default: false },
  },

  // Configuration générale (fusionnée depuis SiteConfig)
  general: {
    siteName: { type: String },
    contactEmail: { type: String },
    phoneNumber: { type: String },
    address: { type: String },
  },

  sender: {
    desiredFromName: { type: String },
    desiredFromEmail: { type: String },
    replyToEmail: { type: String },
    lastSenderStatus: {
      type: String,
      enum: ["verified", "fallback", "invalid"],
      default: undefined,
    },
    lastSenderCheckAt: { type: Date },
  },

  // Configuration des horaires de disponibilité
  availabilityConfig: {
    monday: {
      enabled: { type: Boolean, default: true },
      start: { type: String, default: "09:00" },
      end: { type: String, default: "17:00" },
      pauseStart: { type: String, default: "12:00" },
      pauseEnd: { type: String, default: "13:00" },
    },
    tuesday: {
      enabled: { type: Boolean, default: true },
      start: { type: String, default: "09:00" },
      end: { type: String, default: "17:00" },
      pauseStart: { type: String, default: "12:00" },
      pauseEnd: { type: String, default: "13:00" },
    },
    wednesday: {
      enabled: { type: Boolean, default: true },
      start: { type: String, default: "09:00" },
      end: { type: String, default: "17:00" },
      pauseStart: { type: String, default: "12:00" },
      pauseEnd: { type: String, default: "13:00" },
    },
    thursday: {
      enabled: { type: Boolean, default: true },
      start: { type: String, default: "09:00" },
      end: { type: String, default: "17:00" },
      pauseStart: { type: String, default: "12:00" },
      pauseEnd: { type: String, default: "13:00" },
    },
    friday: {
      enabled: { type: Boolean, default: true },
      start: { type: String, default: "09:00" },
      end: { type: String, default: "17:00" },
      pauseStart: { type: String, default: "12:00" },
      pauseEnd: { type: String, default: "13:00" },
    },
    saturday: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: "09:00" },
      end: { type: String, default: "17:00" },
      pauseStart: { type: String, default: "12:00" },
      pauseEnd: { type: String, default: "13:00" },
    },
    sunday: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: "09:00" },
      end: { type: String, default: "17:00" },
      pauseStart: { type: String, default: "12:00" },
      pauseEnd: { type: String, default: "13:00" },
    },
  },

  // Analytics
  analytics: {
    posthog: {
      projectId: { type: String },
      publicKey: { type: String },
      isConfigured: { type: Boolean, default: false },
    },
  },

  // Configuration E-commerce Stripe (séparée de la config Stripe partagée)
  ecommerce: {
    priceMode: { type: String, enum: ["HT", "TTC"], default: "HT" },
    vatRate: { type: Number, default: 0.2 },
    // Clés Stripe pour le module e-commerce uniquement
    testPublicKey: { type: String },
    testSecretKey: { type: String },
    livePublicKey: { type: String },
    liveSecretKey: { type: String },
    webhookSecret: { type: String }, // Legacy support
    testWebhookSecret: { type: String }, // Webhook secret pour l'environnement de test
    liveWebhookSecret: { type: String }, // Webhook secret pour l'environnement de production
    environment: { type: String, enum: ["development", "production"], default: "development" },
    isConfigured: { type: Boolean, default: false },
    // Options de livraison (admin-defined)
    delivery: {
      standardBase: { type: Number, default: 160 },
      standardPerItem: { type: Number, default: 80 },
      expressBase: { type: Number, default: 300 },
      expressPerItem: { type: Number, default: 160 },
      pickupCost: { type: Number, default: 0 },
      deliveryOptionsTitle: { type: String },
      standardDelivery: { type: String },
      standardPrice: { type: String },
      standardDelay: { type: String },
      expressDelivery: { type: String },
      expressPrice: { type: String },
      expressDelay: { type: String },
      pickupLabel: { type: String },
      pickupDelay: { type: String },
    },
  },

  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export const Site: Model<ISite> =
  (mongoose.models.Site as Model<ISite> | undefined) ||
  mongoose.model<ISite>("Site", SiteSchema);