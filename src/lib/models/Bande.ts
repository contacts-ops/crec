import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export interface IBandeValues {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  secondaryFontFamily?: string;
  [key: string]: unknown;
}

export interface IBande extends Document {
  abstractBandeId: Types.ObjectId | string;
  siteId?: Types.ObjectId | string;
  global?: boolean;
  values?: IBandeValues;
  service?: string;
  isValid?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const BandeSchema = new Schema<IBande>(
  {
    abstractBandeId: {
      type: Schema.Types.ObjectId,
      ref: "AbstractBande",
      required: true,
      index: true,
    },
    siteId: {
      type: Schema.Types.ObjectId,
      ref: "Site",
      required: false,
      index: true,
    },
    global: {
      type: Boolean,
      default: false,
      index: true,
    },
    values: {
      type: Schema.Types.Mixed,
      default: {},
    },
    service: {
      type: String,
      required: false,
    },
    isValid: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true, collection: "bandes" }
);

BandeSchema.index({ siteId: 1, global: 1 });
BandeSchema.index({ abstractBandeId: 1, isValid: 1 });

export const Bande: Model<IBande> =
  (mongoose.models.Bande as Model<IBande>) ||
  mongoose.model<IBande>("Bande", BandeSchema);


