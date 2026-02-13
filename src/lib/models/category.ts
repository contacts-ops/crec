import mongoose, { Schema, type Document, type Model, type Types } from "mongoose"

export interface ICategory extends Document {
  _id: Types.ObjectId
  name: string
  slug: string
  description?: string
  siteId: string
  parent?: Types.ObjectId
  images?: string[]
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxLength: [100, "Name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      maxLength: [500, "Description cannot exceed 500 characters"],
    },
    siteId: {
      type: String,
      required: [true, "Site ID is required"],
      index: true,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (images: string[]) => images.length <= 1,
        message: "La catégorie peut avoir un maximum de 1 image",
      },
    },
  },
  {
    timestamps: true,
    collection: "categories",
  },
)

// Compound index for unique slug per site
CategorySchema.index({ siteId: 1, slug: 1 }, { unique: true })

export const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema)
