import mongoose, { Schema, type Document, type Model } from "mongoose";

const Category = ["Magasinage - de 3H/j", "Magasinage intensif", "Chariots 3 roues", "Chariots électriques", "Chariots diesel et gaz"];
const MediaTypes = ["image", "video"] as const;

export type ProductMediaType = typeof MediaTypes[number];

export interface ProductMediaItem {
  url: string;
  type: ProductMediaType;
}

export interface IProductsShowcase extends Document {
  title: string;
  siteId: string;
  description: string;
  category: typeof Category[number];
  blockId: string;
  imageUrl?: string;
  /**
   * Galerie d'images associée au produit.
   * On conserve imageUrl pour compatibilité tout en privilégiant imageUrls.
   */
  imageUrls?: string[];
  /**
   * Contenu média (images et/ou vidéos) attaché au produit.
   */
  mediaGallery?: ProductMediaItem[];
  caracteristics: string[];
  dataSheetUrl?: string;
  altCtaText?: string;
  altCtaLink?: string;
  /**
   * Ordre d'affichage du produit dans la liste.
   * Les produits sans ordre sont affichés en dernier.
   */
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductsShowcaseSchema = new Schema<IProductsShowcase>(
  {
    title: { type: String, required: true },
    siteId: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true, enum: Category },
    blockId: { type: String, required: true },
    imageUrl: { type: String, required: false },
    imageUrls: {
      type: [String],
      required: false,
      default: [],
    },
    mediaGallery: {
      type: [
        {
          url: { type: String, required: true },
          type: { type: String, enum: MediaTypes, default: "image" },
        },
      ],
      required: false,
      default: [],
    },
    caracteristics: { type: [String], required: true },
    dataSheetUrl: { type: String, required: false },
    altCtaText: { type: String, required: false },
    altCtaLink: { type: String, required: false },
    order: { type: Number, required: false },
  },
  { timestamps: true, collection: "products_showcase" }
);

export const ProductsShowcase: Model<IProductsShowcase> = mongoose.models.ProductsShowcase || mongoose.model<IProductsShowcase>('ProductsShowcase', ProductsShowcaseSchema);