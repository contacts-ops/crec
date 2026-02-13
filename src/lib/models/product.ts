import mongoose, { Schema, type Document, type Model, type Types } from "mongoose"

// Interface for SEO
export interface ISEO {
  title: string
  meta_description: string
  keywords: string[]
}

// File size constants for media validation
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB

export interface IMedia {
  url: string
  type: "image" | "video"
}

export interface IVariant {
  id?: string
  color?: string
  taille?: string
  height?: string
  width?: string
  capacity?: string
  weight?: string
  price?: number
  stockQuantity?: number
  media?: IMedia[] // Each variant can have up to 6 media items
}

export interface IProduct extends Document {
  _id: Types.ObjectId
  title: string
  siteId: string
  description_short: string
  description_long: string
  price: number
  media: IMedia[] // Unified 6-media system (images + videos combined)
  color?: string // Optional color field on main product
  taille?: string // Size (note: consider if height/width should replace this)
  height?: string
  width?: string
  capacity?: string
  weight?: string
  categories: Types.ObjectId[]
  tags: string[]
  stock_quantity: number
  low_stock_threshold: number
  variants?: IVariant[]
  stripeProductId?: string
  /** Optional per-product delivery cost (€ per unit). If set, used instead of site per-item rate for shipping. */
  deliveryCostOverride?: number
}

const SEOSchema = new Schema<ISEO>({
  title: {
    type: String,
    required: true,
    maxLength: [60, "Le titre SEO ne peut pas dépasser 60 caractères"],
  },
  meta_description: {
    type: String,
    required: true,
    maxLength: [160, "La méta description ne peut pas dépasser 160 caractères"],
  },
  keywords: {
    type: [String],
    default: [],
  },
})

const MediaSchema = new Schema<IMedia>(
  {
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
  },
  { _id: false },
)

const VariantSchema = new Schema<IVariant>(
  {
    color: {
      type: String,
      default: "",
    },
    taille: {
      type: String,
      default: "",
    },
    height: {
      type: String,
      default: "",
    },
    width: {
      type: String,
      default: "",
    },
    capacity: {
      type: String,
      default: "",
    },
    weight: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      default: 0,
    },
    stockQuantity: {
      type: Number,
      default: 0,
      min: [0, "Stock quantity cannot be negative"],
    },
    media: {
      type: [MediaSchema],
      default: [],
      validate: {
        validator: (media: IMedia[]) => media.length <= 6,
        message: "Each variant can have a maximum of 6 media items",
      },
    },
  },
  { _id: true },
)

const ProductSchema = new Schema<IProduct>(
  {
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
      maxLength: [200, "Title cannot exceed 200 characters"],
    },
    siteId: {
      type: String,
      required: [true, "Site ID is required"],
      index: true,
    },
    description_short: {
      type: String,
      required: [true, "Short description is required"],
      maxLength: [500, "Short description cannot exceed 500 characters"],
    },
    description_long: {
      type: String,
      required: [true, "Long description is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    media: {
      type: [MediaSchema],
      default: [],
      validate: {
        validator: (media: IMedia[]) => media.length <= 6,
        message: "Product can have a maximum of 6 media items",
      },
    },
    color: {
      type: String,
      default: "",
    },
    taille: {
      type: String,
      default: "",
    },
    height: {
      type: String,
      default: "",
    },
    width: {
      type: String,
      default: "",
    },
    capacity: {
      type: String,
      default: "",
    },
    weight: {
      type: String,
      default: "",
    },
    categories: {
      type: [Schema.Types.ObjectId],
      ref: "Category",
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    stock_quantity: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock quantity cannot be negative"],
      default: 0,
    },
    low_stock_threshold: {
      type: Number,
      default: 10,
      min: [0, "Low stock threshold cannot be negative"],
    },
    variants: {
      type: [VariantSchema],
      default: [],
      validate: {
        validator: (variants: IVariant[]) => variants.length <= 4,
        message: "Each product can have a maximum of 4 variants",
      },
    },
    stripeProductId: {
      type: String,
      index: true,
      validate: {
        validator: (stripeProductId: string) => {
          if (!stripeProductId) return true
          return /^prod_[a-zA-Z0-9]+$/.test(stripeProductId)
        },
        message: "Invalid Stripe product ID format",
      },
    },
    deliveryCostOverride: {
      type: Number,
      default: undefined,
      min: [0, "Delivery cost cannot be negative"],
    },
  },
  {
    timestamps: true,
    collection: "products",
  },
)

// Indexes
ProductSchema.index({ siteId: 1, title: 1 })
ProductSchema.index({ siteId: 1, categories: 1 })
ProductSchema.index({ siteId: 1, tags: 1 })

export const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema)
