import mongoose, { Schema, type Document, type Model, type Types } from "mongoose"

interface ICartItem {
  productId: Types.ObjectId
  quantity: number
  price: number
  variantId?: string // Optional variant ID for product variants
}

export interface ICart extends Document {
  _id: Types.ObjectId
  userId?: Types.ObjectId
  sessionId?: string
  items: ICartItem[]
  total: number
}

const CartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    variantId: {
      type: String,
      required: false,
    },
  },
  { _id: false },
)

const CartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    sessionId: {
      type: String,
    },
    items: {
      type: [CartItemSchema],
      default: [],
    },
    total: {
      type: Number,
      default: 0,
      min: [0, "Total cannot be negative"],
    },
  },
  {
    timestamps: true,
    collection: "carts",
  },
)

// Ensure either userId or sessionId is present
CartSchema.pre("save", function (next) {
  if (!this.userId && !this.sessionId) {
    next(new Error("Either userId or sessionId must be provided"))
  } else {
    next()
  }
})

// Indexes (removed duplicate - already defined in schema fields)
CartSchema.index({ userId: 1 })
CartSchema.index({ sessionId: 1 })

export const Cart: Model<ICart> = mongoose.models.Cart || mongoose.model<ICart>("Cart", CartSchema)
