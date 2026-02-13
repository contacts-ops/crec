import mongoose from "mongoose"

const newsletterSchema = new mongoose.Schema(
  {
    siteId: {
      type: String,
      required: [true, "Site ID is required"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Adresse e-mail requise"],
      lowercase: true,
      validate: {
        validator: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "Veuillez saisir une adresse e-mail valide",
      },
    },
    fullName: {
      type: String,
      trim: true,
      maxLength: [100, "Full name cannot exceed 100 characters"],
    },
    firstName: {
      type: String,
      trim: true,
      maxLength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      trim: true,
      maxLength: [50, "Last name cannot exceed 50 characters"],
    },
    interests: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    unsubscribeToken: {
      type: String,
      default: () => require("crypto").randomBytes(32).toString("hex"),
    },
    source: {
      type: String,
      enum: {
        values: ["website", "manual", "social", "other"],
        message: "La source spécifiée est invalide",
      },
      default: "website",
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
    // analytics 
    analytics: {
      totalEmailsReceived: {
        type: Number,
        default: 0,
      },
      totalOpens: {
        type: Number,
        default: 0,
      },
      totalClicks: {
        type: Number,
        default: 0,
      },
      lastOpenedAt: {
        type: Date,
      },
      lastClickedAt: {
        type: Date,
      },
    },
  },
  { timestamps: true },
)

// Compound index for siteId + email uniqueness
newsletterSchema.index({ siteId: 1, email: 1 }, { unique: true })

export default mongoose.models.Newsletter || mongoose.model("Newsletter", newsletterSchema)
