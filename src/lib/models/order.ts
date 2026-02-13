import mongoose, { Schema, type Document, type Model, type Types } from "mongoose"

export interface IShippingAddress {
  nom: string
  prenom: string
  address: string
  city: string
  zipCode: string
  country?: string
  phone?: string
}

export interface IOrderItem {
  productId: Types.ObjectId
  variantId?: string
  quantity: number
  price: number
  title: string
}

export type OrderStatus = "Pending" | "Processing" | "Packed" | "Shipped" | "Delivered" | "Prêt à être livré" | "Prêt à être retiré" | "CancellationRequested" | "Cancelled" | "Refunded"
export type PaymentStatus = "Pending" | "Completed" | "Failed" | "Refunded"
export type DeliveryMethod = "standard" | "express" | "pickup"

export interface IOrder extends Document {
  _id: Types.ObjectId
  siteId: string
  userId?: Types.ObjectId
  email: string
  items: IOrderItem[]
  total: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  deliveryMethod: DeliveryMethod
  shippingAddress: IShippingAddress
  billingAddress: IShippingAddress
  shippingCost?: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const ShippingAddressSchema = new Schema<IShippingAddress>(
  {
    nom: {
      type: String,
      required: [true, "Nom is required"],
      trim: true,
    },
    prenom: {
      type: String,
      required: [true, "Prenom is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
    },
    zipCode: {
      type: String,
      required: [true, "ZIP code is required"],
    },
    country: {
      type: String,
      default: "FR",
    },
    phone: {
      type: String,
    },
  },
  { _id: false },
)

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
    },
    variantId: {
      type: String,
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
    title: {
      type: String,
      required: [true, "Product title is required"],
    },
  },
  { _id: false },
)

const OrderSchema = new Schema<IOrder>(
  {
    siteId: {
      type: String,
      required: [true, "Site ID is required"],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
    },
    items: {
      type: [OrderItemSchema],
      required: [true, "Order items are required"],
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: "Order must have at least one item",
      },
    },
    total: {
      type: Number,
      required: [true, "Total is required"],
      min: [0, "Total cannot be negative"],
    },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Packed", "Shipped", "Delivered", "Prêt à être livré", "Prêt à être retiré", "CancellationRequested", "Cancelled", "Refunded"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Completed", "Failed", "Refunded"],
      default: "Pending",
    },
    deliveryMethod: {
      type: String,
      enum: ["standard", "express", "pickup"],
      required: [true, "Delivery method is required"],
    },
    shippingAddress: {
      type: ShippingAddressSchema,
      required: [true, "Shipping address is required"],
    },
    billingAddress: {
      type: ShippingAddressSchema,
      required: [true, "Billing address is required"],
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "orders",
  },
)

// Indexes
OrderSchema.index({ siteId: 1, createdAt: -1 })
OrderSchema.index({ siteId: 1, userId: 1 })
OrderSchema.index({ siteId: 1, status: 1 })

// En dev, supprimer le modèle en cache pour que les changements d'enum (ex. nouveaux statuts) soient pris en compte
if (process.env.NODE_ENV === "development" && mongoose.models.Order) {
  delete mongoose.models.Order
}
export const Order: Model<IOrder> = mongoose.models.Order ?? mongoose.model<IOrder>("Order", OrderSchema)
