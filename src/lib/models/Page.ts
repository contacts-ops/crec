import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPageSeo {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl?: string;
}

// Embedded components are deprecated in favor of Bande references.

export interface IPage extends Document {
  pageId: string | undefined;
  siteId: string; // Référence au site
  name: string;
  slug: string;
  title: string;
  description: string;
  isHome: boolean;
  isPublished: boolean;
  order: number;
  bandes: Schema.Types.ObjectId[]; // References to Bande documents
  seo?: IPageSeo;
  lastUpdated: Date;
  createdAt: Date;
}

// Removed ComponentSchema; using Bande references instead

const PageSchema = new Schema<IPage>({
  pageId: {
    type: String,
    required: false,
    unique: false,
  },
  siteId: {
    type: String,
    required: true,
    index: true, // Index pour les requêtes par siteId
  },
  name: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  isHome: {
    type: Boolean,
    default: false,
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  bandes: [
    {
      type: Schema.Types.ObjectId,
      ref: "Bande",
      required: false,
    }
  ],
  seo: {
    title: String,
    description: String,
    keywords: String,
    canonicalUrl: String
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Page: Model<IPage> =
  (mongoose.models.Page as Model<IPage> | undefined) ||
  mongoose.model<IPage>('Page', PageSchema);
