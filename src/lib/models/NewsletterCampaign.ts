import mongoose from "mongoose"

const newsletterCampaignSchema = new mongoose.Schema(
  {
    siteId: {
      type: String,
      required: [true, "Site ID is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Campaign title is required"],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, "Email subject is required"],
      trim: true,
    },
    htmlContent: {
      type: String,
      required: [true, "HTML content is required"],
    },
    textContent: {
      type: String,
      required: [true, "Text content is required"],
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sending", "sent", "failed"],
      default: "draft",
    },
    scheduledAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
    },
    targetAudience: {
      allSubscribers: {
        type: Boolean,
        default: true,
      },
      interests: [String],
      segments: [String],
    },
    templateData: {
      type: mongoose.Schema.Types.Mixed,
    },
    // analytics
    analytics: {
      totalRecipients: {
        type: Number,
        default: 0,
      },
      successfulSends: {
        type: Number,
        default: 0,
      },
      failedSends: {
        type: Number,
        default: 0,
      },
      opens: {
        type: Number,
        default: 0,
      },
      uniqueOpens: {
        type: Number,
        default: 0,
      },
      clicks: {
        type: Number,
        default: 0,
      },
      uniqueClicks: {
        type: Number,
        default: 0,
      },
      unsubscribes: {
        type: Number,
        default: 0,
      },
      openRate: {
        type: Number,
        default: 0,
      },
      clickRate: {
        type: Number,
        default: 0,
      },
      errors: [
        {
          email: String,
          error: String,
          timestamp: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    // Simple tracking - no user agent or IP addresses
    tracking: {
      openedEmails: [
        {
          email: String,
          timestamp: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      clickedLinks: [
        {
          email: String,
          url: String,
          timestamp: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
  },
  { timestamps: true },
)

// Indexes for better performance
newsletterCampaignSchema.index({ siteId: 1, status: 1 })
newsletterCampaignSchema.index({ siteId: 1, createdAt: -1 })

export default mongoose.models.NewsletterCampaign || mongoose.model("NewsletterCampaign", newsletterCampaignSchema)
