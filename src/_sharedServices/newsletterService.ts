import { type NextRequest, NextResponse } from "next/server"
import Newsletter from "@/lib/models/Newsletter"
import NewsletterCampaign from "@/lib/models/NewsletterCampaign"
import { connectToDatabase } from "@/lib/db"
import { emailService } from "./emailService"
import { validationService } from "./validationService"
import { handleApiError } from "@/_sharedServices/utils/errorHandler"
import { extractSiteId, generateNewsletterFromAddress } from "@/_sharedServices/utils/siteExtractor"
import { validateObjectId } from "@/_sharedServices/utils/validation"
import { Buffer } from "buffer"

class NewsletterService {
  // Email open tracking
  async trackEmailOpen(request: NextRequest) {
    try {
      await connectToDatabase()

      const url = new URL(request.url)
      const campaignId = url.searchParams.get("c")
      const email = url.searchParams.get("e")

      console.log("[DEBUG] Tracking pixel request:", {
        campaignId,
        email,
        userAgent: request.headers.get("user-agent"),
        referer: request.headers.get("referer"),
      })

      if (campaignId && email) {
        const campaign = await NewsletterCampaign.findById(campaignId)
        if (campaign) {
          console.log("[DEBUG] Found campaign:", campaign.title, "Current opens:", campaign.analytics?.opens || 0)

          const alreadyOpened = campaign.tracking?.openedEmails?.some((open: any) => open.email === email)

          if (!alreadyOpened) {
            // First time opening - increment both opens and unique opens
            const updateResult = await NewsletterCampaign.findByIdAndUpdate(
              campaignId,
              {
                $inc: {
                  "analytics.opens": 1,
                  "analytics.uniqueOpens": 1,
                },
                $push: {
                  "tracking.openedEmails": {
                    email,
                    timestamp: new Date(),
                    userAgent: request.headers.get("user-agent") || "unknown",
                    trackingMethod: "single-pixel",
                  },
                },
              },
              { new: true },
            )

            // Update subscriber analytics
            await Newsletter.findOneAndUpdate(
              { email, siteId: campaign.siteId },
              {
                $inc: { "analytics.totalOpens": 1 },
                $set: { "analytics.lastOpenedAt": new Date() },
              },
            )

            console.log(
              "[DEBUG] Successfully tracked FIRST email open for:",
              email,
              "New opens count:",
              updateResult?.analytics?.opens,
            )
          } else {
            console.log("[DEBUG] Email already opened by:", email, "- not counting again")
          }

          // Update open rate
          const updatedCampaign = await NewsletterCampaign.findById(campaignId)
          if (updatedCampaign && updatedCampaign.analytics.totalRecipients > 0) {
            const openRate = (updatedCampaign.analytics.uniqueOpens / updatedCampaign.analytics.totalRecipients) * 100
            await NewsletterCampaign.findByIdAndUpdate(campaignId, {
              $set: { "analytics.openRate": openRate },
            })
            console.log("[DEBUG] Updated open rate to:", openRate.toFixed(2) + "%")
          }
        } else {
          console.log("[DEBUG] Campagne introuvable:", campaignId)
        }
      } else {
        console.log("[DEBUG] Missing campaignId or email in tracking request")
      }

      // Create Gmail-compatible tracking pixel
      const pixel = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "base64",
      )

      // Enhanced headers for Gmail compatibility
      const headers = {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate, private",
        Pragma: "no-cache",
        Expires: "0",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "X-Robots-Tag": "noindex, nofollow",
        "Content-Length": pixel.length.toString(),
      }

      return new NextResponse(pixel, { headers })
    } catch (error) {
      console.error("[DEBUG] Error in tracking pixel:", error)
      const pixel = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "base64",
      )
      return new NextResponse(pixel, {
        headers: { "Content-Type": "image/png" },
      })
    }
  }

  // Email click tracking
  async trackEmailClick(request: NextRequest) {
    try {
      await connectToDatabase()

      const url = new URL(request.url)
      const campaignId = url.searchParams.get("c")
      const email = url.searchParams.get("e")
      const targetUrl = url.searchParams.get("url")

      if (campaignId && email && targetUrl) {
        const campaign = await NewsletterCampaign.findById(campaignId)
        if (campaign) {
          const alreadyClicked = campaign.tracking?.clickedLinks?.some(
            (click: any) => click.email === email && click.url === targetUrl,
          )

          if (!alreadyClicked) {
            await NewsletterCampaign.findByIdAndUpdate(campaignId, {
              $inc: {
                "analytics.clicks": 1,
                "analytics.uniqueClicks": 1,
              },
              $push: {
                "tracking.clickedLinks": {
                  email,
                  url: targetUrl,
                  timestamp: new Date(),
                },
              },
            })

            await Newsletter.findOneAndUpdate(
              { email, siteId: campaign.siteId },
              {
                $inc: { "analytics.totalClicks": 1 },
                $set: { "analytics.lastClickedAt": new Date() },
              },
            )
          } else {
            await NewsletterCampaign.findByIdAndUpdate(campaignId, {
              $inc: { "analytics.clicks": 1 },
            })
          }

          const updatedCampaign = await NewsletterCampaign.findById(campaignId)
          if (updatedCampaign && updatedCampaign.analytics.uniqueOpens > 0) {
            const clickRate = (updatedCampaign.analytics.uniqueClicks / updatedCampaign.analytics.uniqueOpens) * 100
            await NewsletterCampaign.findByIdAndUpdate(campaignId, {
              $set: { "analytics.clickRate": clickRate },
            })
            console.log("[DEBUG] Updated click rate to:", clickRate.toFixed(2) + "%")
          }
        }
      }

      if (targetUrl) {
        return NextResponse.redirect(decodeURIComponent(targetUrl))
      }

      return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 })
    } catch (error) {
      const url = new URL(request.url)
      const targetUrl = url.searchParams.get("url")
      if (targetUrl) {
        return NextResponse.redirect(decodeURIComponent(targetUrl))
      }
      return NextResponse.json({ success: false, error: "Failed to track click" }, { status: 500 })
    }
  }

  // Get analytics data
  async getAnalytics(request: NextRequest) {
    try {
      await connectToDatabase()

      const siteId = request.headers.get("x-site-id")
      if (!siteId) {
        return NextResponse.json({ success: false, error: "ID du site est requis" }, { status: 400 })
      }

      const url = new URL(request.url)
      const timeRange = url.searchParams.get("timeRange") || "30d"

      const now = new Date()
      const daysBack = timeRange === "7d" ? 7 : timeRange === "90d" ? 90 : 30
      const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

      const campaigns = await NewsletterCampaign.find({
        siteId,
        createdAt: { $gte: startDate },
      }).sort({ createdAt: -1 })

      const sentCampaigns = campaigns.filter((c) => c.status === "sent")

      const analytics = {
        totalCampaigns: campaigns.length,
        totalSent: sentCampaigns.length,
        totalOpens: sentCampaigns.reduce((sum, c) => sum + (c.analytics?.opens || 0), 0),
        totalClicks: sentCampaigns.reduce((sum, c) => sum + (c.analytics?.clicks || 0), 0),
        totalRecipients: sentCampaigns.reduce((sum, c) => sum + (c.analytics?.totalRecipients || 0), 0),
        averageOpenRate: 0,
        averageClickRate: 0,
        recentActivity: sentCampaigns.slice(0, 10).map((c) => ({
          id: c._id,
          type: "sent",
          campaignTitle: c.title,
          timestamp: c.sentAt || c.createdAt,
          count: c.analytics?.totalRecipients || 0,
        })),
        campaignPerformance: sentCampaigns.map((c) => ({
          id: c._id,
          title: c.title,
          openRate: c.analytics?.openRate || 0,
          clickRate: c.analytics?.clickRate || 0,
          totalRecipients: c.analytics?.totalRecipients || 0,
          opens: c.analytics?.opens || 0,
          clicks: c.analytics?.clicks || 0,
        })),
      }

      if (analytics.totalRecipients > 0) {
        analytics.averageOpenRate = (analytics.totalOpens / analytics.totalRecipients) * 100
      }
      if (analytics.totalOpens > 0) {
        analytics.averageClickRate = (analytics.totalClicks / analytics.totalOpens) * 100
      }

      return NextResponse.json({
        success: true,
        message: "Analyse récupérée avec succès",
        data: analytics,
      })
    } catch (error) {
      console.error("Error getting analytics:", error)
      return NextResponse.json({ success: false, error: "Échec de la récupération des analytiques" }, { status: 500 })
    }
  }

  async getFromAddress(request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url)
      const siteId = searchParams.get("siteId")
      //console.log("test: "+siteId)

      const fromAddress = await generateNewsletterFromAddress(siteId)
      return NextResponse.json({ fromAddress })
    } catch (error) {
      return NextResponse.json({ error: "Failed to generate from address" }, { status: 500 })
    }
  }
  // Subscriber management
  async subscribe(request: NextRequest) {
    try {
      await connectToDatabase()

      const rawData = await request.json()
      const sanitizedData = validationService.sanitizeObject(rawData)

      const siteId = extractSiteId(request) || sanitizedData.siteId
      if (!siteId) {
        return NextResponse.json(
          {
            success: false,
            error: "ID du site est requis",
          },
          { status: 400 },
        )
      }

      sanitizedData.siteId = siteId

      const { error, value } = validationService.newsletterValidation.validate(sanitizedData)
      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: error.details[0].message,
          },
          { status: 400 },
        )
      }

      const normalizedData = normalizeNames(value)

      const existingSubscriber = await Newsletter.findOne({
        email: value.email,
        siteId: siteId,
      })

      if (existingSubscriber) {
        if (existingSubscriber.isActive) {
          return NextResponse.json(
            {
              success: false,
              error: "Cette adresse e-mail est déjà inscrite à notre newsletter.",
            },
            { status: 400 },
          )
        } else {
          existingSubscriber.isActive = true
          existingSubscriber.fullName = normalizedData.fullName || existingSubscriber.fullName
          existingSubscriber.firstName = normalizedData.firstName || existingSubscriber.firstName
          existingSubscriber.lastName = normalizedData.lastName || existingSubscriber.lastName
          existingSubscriber.interests = normalizedData.interests || existingSubscriber.interests
          existingSubscriber.source = normalizedData.source || existingSubscriber.source
          await existingSubscriber.save()

          await emailService.sendNewsletterWelcome({
            email: existingSubscriber.email,
            fullName: existingSubscriber.fullName,
            unsubscribeToken: existingSubscriber.unsubscribeToken,
            siteId: normalizedData.siteId,
          })

          return NextResponse.json({
            success: true,
            message: "Abonnement à la newsletter réactivé avec succès",
            data: {
              subscriber: {
                email: existingSubscriber.email,
                fullName: existingSubscriber.fullName,
                firstName: existingSubscriber.firstName,
                lastName: existingSubscriber.lastName,
              },
            },
          })
        }
      }

      const subscriber = new Newsletter(normalizedData)
      await subscriber.save()

      await emailService.sendNewsletterWelcome({
        email: subscriber.email,
        fullName: subscriber.fullName,
        unsubscribeToken: subscriber.unsubscribeToken,
        siteId: normalizedData.siteId,
      })

      return NextResponse.json(
        {
          success: true,
          message: "Abonnement à la newsletter réussi ! Veuillez vérifier votre e-mail pour confirmation.",
          data: {
            subscriber: {
              email: subscriber.email,
              fullName: subscriber.fullName,
              firstName: subscriber.firstName,
              lastName: subscriber.lastName,
            },
          },
        },
        { status: 201 },
      )
    } catch (error) {
      const { error: errorMessage, statusCode } = handleApiError(error)
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: statusCode },
      )
    }
  }

  async unsubscribe(request: NextRequest) {
    try {
      await connectToDatabase()

      const { searchParams } = new URL(request.url)
      const email = searchParams.get("email")
      const token = searchParams.get("token")
      const siteId = extractSiteId(request) || searchParams.get("siteId")

      if (!email || !token) {
        return NextResponse.json(
          {
            success: false,
            error: "L'email et le token sont requis pour la désinscription",
          },
          { status: 400 },
        )
      }

      const query: any = { email, unsubscribeToken: token }
      /* if (siteId) {
        query.siteId = siteId;
      } */

      const subscriber = await Newsletter.findOne(query)
      if (!subscriber) {
        return NextResponse.json(
          {
            success: false,
            error: "Lien de désabonnement invalide",
          },
          { status: 400 },
        )
      }

      subscriber.isActive = false
      await subscriber.save()

      // Get the base URL from the request
      const baseUrl = new URL(request.url).origin

      // Redirect to index page with subscriber ID
      return NextResponse.redirect(`${process.env.FRONTEND_URL}`)
    } catch (error) {
      const { error: errorMessage, statusCode } = handleApiError(error)
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: statusCode },
      )
    }
  }

  async listSubscribers(request: NextRequest) {
    try {
      await connectToDatabase()

      const siteId = extractSiteId(request)
     
      if (!siteId) {
        return {
          success: false,
          error: "ID du site est requis",
          statusCode: 400,
        }
      }

      const { searchParams } = new URL(request.url)
      const page = Number.parseInt(searchParams.get("page") || "1")
      const limit = Number.parseInt(searchParams.get("limit") || "20")
      const search = searchParams.get("search")
      const interest = searchParams.get("interest")
      const status = searchParams.get("status") || "active"

      const filter: any = { siteId }

      if (status === "active") {
        filter.isActive = true
      } else if (status === "inactive") {
        filter.isActive = false
      }

      if (search) {
        filter.$or = [
          { email: { $regex: search, $options: "i" } },
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { fullName: { $regex: search, $options: "i" } },
        ]
      }

      if (interest) {
        filter.interests = interest
      }

      const skip = (page - 1) * limit

      const subscribers = await Newsletter.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      const total = await Newsletter.countDocuments(filter)

      const stats = await Newsletter.aggregate([
        { $match: { siteId } },
        {
          $group: {
            _id: null,
            totalSubscribers: { $sum: 1 },
            activeSubscribers: {
              $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
            },
            inactiveSubscribers: {
              $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] },
            },
          },
        },
      ])

      return {
        success: true,
        message: "Abonnés récupérés avec succès",
        data: {
          subscribers,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
          statistics: stats[0] || {
            totalSubscribers: 0,
            activeSubscribers: 0,
            inactiveSubscribers: 0,
          },
        },
      }
    } catch (error) {
      const { error: errorMessage, statusCode } = handleApiError(error)
      return {
        success: false,
        error: errorMessage,
        statusCode,
      }
    }
  }

  async getSubscriberById(id: string, request?: NextRequest) {
    try {
      const validationError = validateObjectId(id)
      if (validationError) return validationError

      await connectToDatabase()

      const filter: any = { _id: id }

      if (request) {
        const siteId = extractSiteId(request)
        if (siteId) {
          filter.siteId = siteId
        }
      }

      const subscriber = await Newsletter.findOne(filter)

      if (!subscriber) {
        return NextResponse.json(
          {
            success: false,
            error: "Abonné introuvable",
          },
          { status: 404 },
        )
      }

      return NextResponse.json({
        success: true,
        message: "Abonné récupéré avec succès",
        data: { subscriber },
      })
    } catch (error) {
      const { error: errorMessage, statusCode } = handleApiError(error)
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: statusCode },
      )
    }
  }

  async updateSubscriber(id: string, request: NextRequest) {
    try {
      console.log("[DEBUG] Received request for update subscriber")
      const validationError = validateObjectId(id)
      if (validationError) return validationError

      await connectToDatabase()

      const siteId = extractSiteId(request)
      if (!siteId) {
        return {
          success: false,
          error: "ID du site est requis",
          statusCode: 400,
        }
      }

      const rawData = await request.json()
      const updateData = validationService.sanitizeObject(rawData)

      const subscriber = await Newsletter.findOneAndUpdate({ _id: id, siteId }, updateData, {
        new: true,
        runValidators: true,
      })

      if (!subscriber) {
        return {
          success: false,
          error: "Abonné introuvable",
          statusCode: 404,
        }
      }

      return {
        success: true,
        message: "Abonné mis à jour avec succès",
        data: { subscriber },
      }
    } catch (error) {
      const { error: errorMessage, statusCode } = handleApiError(error)
      return {
        success: false,
        error: errorMessage,
        statusCode,
      }
    }
  }

  async deleteSubscriber(id: string, request?: NextRequest) {
    try {
      const validationError = validateObjectId(id)
      if (validationError) return validationError

      await connectToDatabase()

      const filter: any = { _id: id }
      let siteId: string | null = null

      if (request) {
        siteId = extractSiteId(request)
        if (siteId) {
          filter.siteId = siteId
        }
      }

      const subscriber = await Newsletter.findOneAndDelete(filter)

      if (!subscriber) {
        return {
          success: false,
          error: "Abonné introuvable",
          statusCode: 404,
        }
      }

      return {
        success: true,
        message: "Abonné supprimé avec succès",
      }
    } catch (error) {
      const { error: errorMessage, statusCode } = handleApiError(error)
      return {
        success: false,
        error: errorMessage,
        statusCode,
      }
    }
  }

  async deleteSubscribers(request: NextRequest) {
    try {
      await connectToDatabase()

      const siteId = extractSiteId(request)
      if (!siteId) {
        return {
          success: false,
          error: "ID du site est requis",
          statusCode: 400,
        }
      }

      const { subscriberIds } = await request.json()

      if (!subscriberIds || !Array.isArray(subscriberIds)) {
        return {
          success: false,
          error: "Subscriber IDs array is required",
          statusCode: 400,
        }
      }

      const result = await Newsletter.deleteMany({
        _id: { $in: subscriberIds },
        siteId,
      })

      return {
        success: true,
        message: `${result.deletedCount} abonnés supprimés avec succès`,
        data: {
          deletedCount: result.deletedCount,
        },
      }
    } catch (error) {
      const { error: errorMessage, statusCode } = handleApiError(error)
      return {
        success: false,
        error: errorMessage,
        statusCode,
      }
    }
  }

  // Campaign management
  async createCampaign(request: NextRequest) {
    try {
      await connectToDatabase()

      const siteId = extractSiteId(request)
      if (!siteId) {
        return NextResponse.json(
          {
            success: false,
            error: "ID du site est requis",
          },
          { status: 400 },
        )
      }

      const rawData = await request.json()

      const campaignData = {
        title: rawData.title || "Untitled Campaign",
        subject: rawData.subject || "",
        htmlContent: rawData.htmlContent || "",
        textContent: rawData.textContent || rawData.title || "Newsletter content", // Fix: provide default textContent
        siteId: siteId,
        status: rawData.status || "draft",
        targetAudience: rawData.targetAudience || {
          allSubscribers: true,
          interests: [],
          segments: [],
        },
        templateData: rawData.templateData || null,
        analytics: {
          totalRecipients: 0,
          opens: 0,
          clicks: 0,
          uniqueOpens: 0,
          uniqueClicks: 0,
          successfulSends: 0,
          failedSends: 0,
          openRate: 0,
          clickRate: 0,
          errors: [],
        },
        tracking: {
          openedEmails: [],
          clickedLinks: [],
        },
      }

      const campaign = new NewsletterCampaign(campaignData)
      await campaign.save()

      return NextResponse.json(
        {
          success: true,
          message: "Campagne créée avec succès",
          data: { campaign },
        },
        { status: 201 },
      )
    } catch (error) {
      console.error("Campaign creation error:", error)
      const { error: errorMessage, statusCode } = handleApiError(error)
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: statusCode },
      )
    }
  }

  async listCampaigns(request: NextRequest) {
    try {
      await connectToDatabase()

      const siteId = extractSiteId(request)
      if (!siteId) {
        return NextResponse.json(
          {
            success: false,
            error: "ID du site est requis",
          },
          { status: 400 },
        )
      }

      const { searchParams } = new URL(request.url)
      const page = Number.parseInt(searchParams.get("page") || "1")
      const limit = Number.parseInt(searchParams.get("limit") || "10")
      const status = searchParams.get("status")

      const filter: any = { siteId }
      if (status) filter.status = status

      const skip = (page - 1) * limit

      const campaigns = await NewsletterCampaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      const total = await NewsletterCampaign.countDocuments(filter)

      return NextResponse.json({
        success: true,
        message: "Campagnes récupérées avec succès",
        data: {
          campaigns,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      })
    } catch (error) {
      console.error("Error listing campaigns:", error)
      return NextResponse.json({ success: false, error: "Échec de la liste des campagnes" }, { status: 500 })
    }
  }

  async getCampaignById(id: string, request?: NextRequest) {
    try {
      const validationError = validateObjectId(id)
      if (validationError) return validationError

      await connectToDatabase()

      const filter: any = { _id: id }

      if (request) {
        const siteId = extractSiteId(request)
        if (siteId) {
          filter.siteId = siteId
        }
      }

      const campaign = await NewsletterCampaign.findOne(filter)

      if (!campaign) {
        return NextResponse.json(
          {
            success: false,
            error: "Campagne introuvable",
          },
          { status: 404 },
        )
      }

      return NextResponse.json({
        success: true,
        message: "Campagne récupérée avec succès",
        data: { campaign },
      })
    } catch (error) {
      const { error: errorMessage, statusCode } = handleApiError(error)
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: statusCode },
      )
    }
  }

  async updateCampaign(id: string, request: NextRequest) {
    try {
      const validationError = validateObjectId(id)
      if (validationError) return validationError

      await connectToDatabase()

      const siteId = extractSiteId(request)
      if (!siteId) {
        return NextResponse.json(
          {
            success: false,
            error: "ID du site est requis",
          },
          { status: 400 },
        )
      }

      const rawData = await request.json()
      const updateData = validationService.sanitizeObject(rawData)

      const campaign = await NewsletterCampaign.findOneAndUpdate({ _id: id, siteId }, updateData, {
        new: true,
        runValidators: true,
      })

      if (!campaign) {
        return NextResponse.json(
          {
            success: false,
            error: "Campagne introuvable",
          },
          { status: 404 },
        )
      }

      return NextResponse.json({
        success: true,
        message: "Campagne mise à jour avec succès",
        data: { campaign },
      })
    } catch (error) {
      const { error: errorMessage, statusCode } = handleApiError(error)
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: statusCode },
      )
    }
  }

  async deleteCampaign(id: string, request?: NextRequest) {
    try {
      const validationError = validateObjectId(id)
      if (validationError) return validationError

      await connectToDatabase()

      const filter: any = { _id: id }
      let siteId: string | null = null

      if (request) {
        siteId = extractSiteId(request)
        if (siteId) {
          filter.siteId = siteId
        }
      }

      const campaign = await NewsletterCampaign.findOneAndDelete(filter)

      if (!campaign) {
        return NextResponse.json(
          {
            success: false,
            error: "Campagne introuvable",
          },
          { status: 404 },
        )
      }

      return NextResponse.json({
        success: true,
        message: "Campagne supprimée avec succès",
      })
    } catch (error) {
      const { error: errorMessage, statusCode } = handleApiError(error)
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: statusCode },
      )
    }
  }

  // Helper method to add tracking to links in HTML content
  private addClickTrackingToContent(htmlContent: string, campaignId: string): string {
    console.log("[DEBUG] Adding click tracking for campaign:", campaignId)

    // Replace all href attributes with tracking URLs
    return htmlContent.replace(/<a\s+([^>]*href=["']([^"']+)["'][^>]*)>/gi, (match, attributes, url) => {
      // Skip if it's already a tracking URL, mailto, or anchor link
      if (
        url.includes("/track/") ||
        url.startsWith("mailto:") ||
        url.startsWith("#") ||
        url.includes("unsubscribe") ||
        url.includes("{{")
      ) {
        return match
      }

      const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000"
      const trackingUrl = `${baseUrl}/api/services/newsletter/track/click?c=${encodeURIComponent(campaignId)}&url=${encodeURIComponent(url)}`

      console.log("[DEBUG] Converting link:", url, "->", trackingUrl)

      return `<a ${attributes.replace(/href=["'][^"']+["']/, `href="${trackingUrl}"`)}>`
    })
  }

  async sendCampaign(id: string, request?: NextRequest) {
    try {
      const validationError = validateObjectId(id)
      if (validationError) return validationError

      await connectToDatabase()

      const filter: any = { _id: id }
      let siteId: string | null = null

      if (request) {
        siteId = extractSiteId(request)
        if (siteId) {
          filter.siteId = siteId
        }
      }

      const campaign = await NewsletterCampaign.findOne(filter)

      if (!campaign) {
        return NextResponse.json(
          {
            success: false,
            error: "Campagne introuvable",
          },
          { status: 404 },
        )
      }

      if (campaign.status === "sent") {
        return NextResponse.json(
          {
            success: false,
            error: "La campagne a déjà été envoyée",
          },
          { status: 400 },
        )
      }

      campaign.status = "sending"
      await campaign.save()

      // Determine effective target audience, allowing runtime override from request body
      let requestOverride: any = null
      if (request) {
        try {
          const parsed = await request.json()
          if (parsed && parsed.targetAudience) {
            requestOverride = parsed.targetAudience
          }
        } catch (e) {
          // ignore body parse errors; fallback to campaign's stored audience
        }
      }

      // Normalize possible client keys
      if (requestOverride && !requestOverride.specificEmails && Array.isArray(requestOverride.selectedSubscribers)) {
        requestOverride.specificEmails = requestOverride.selectedSubscribers
      }

      const effectiveAudience = {
        allSubscribers: campaign.targetAudience?.allSubscribers ?? true,
        interests: Array.isArray(campaign.targetAudience?.interests) ? campaign.targetAudience.interests : [],
        specificEmails: Array.isArray(campaign.targetAudience?.specificEmails)
          ? campaign.targetAudience.specificEmails
          : [],
        ...(requestOverride || {}),
      } as any

      const subscribersQuery: any = {
        isActive: true,
        siteId: campaign.siteId,
      }

      // If specific recipients are provided, restrict to them (by _id or email)
      if (Array.isArray(effectiveAudience.specificEmails) && effectiveAudience.specificEmails.length > 0) {
        const list = effectiveAudience.specificEmails
        const containsEmails = list.some((v: string) => typeof v === "string" && v.includes("@"))
        if (containsEmails) {
          subscribersQuery.email = { $in: list }
        } else {
          subscribersQuery._id = { $in: list }
        }
      } else if (!effectiveAudience.allSubscribers && Array.isArray(effectiveAudience.interests) && effectiveAudience.interests.length > 0) {
        subscribersQuery.interests = { $in: effectiveAudience.interests }
      }

      const subscribers = await Newsletter.find(subscribersQuery)

      if (subscribers.length === 0) {
        campaign.status = "failed"
        if (!campaign.analytics.errors) {
          campaign.analytics.errors = []
        }
        campaign.analytics.errors.push({
          email: "system",
          error: "Aucun abonné actif trouvé",
          timestamp: new Date(),
        })
        await campaign.save()

        return NextResponse.json(
          {
            success: false,
            error: "Aucun abonné actif trouvé pour cette campagne",
          },
          { status: 400 },
        )
      }

      console.log("[DEBUG] Sending campaign with ID:", campaign._id.toString())

      let campaignDataForEmail = undefined
      if (campaign.templateData) {
        // Check if it's a Newsletter Builder campaign (has blocks) or Envoi Rapide (only has textContent)
        if (
          campaign.templateData.blocks &&
          Array.isArray(campaign.templateData.blocks) &&
          campaign.templateData.blocks.length > 0
        ) {
          console.log("[DEBUG] Newsletter Builder campaign detected with", campaign.templateData.blocks.length, "blocks")
          console.log("[DEBUG] Template dimensions:", {
            width: campaign.templateData.globalStyles?.contentWidth,
            height: campaign.templateData.globalStyles?.contentHeight
          })
          console.log("[DEBUG] Block positions:", campaign.templateData.blocks.map((b: any) => ({
            type: b.type,
            x: b.position?.x,
            y: b.position?.y,
            width: b.position?.width,
            height: b.position?.height
          })))
          
          // Use Direct Email Renderer for Newsletter Builder campaigns
          try {
            const { renderNewsletterToEmailHTML } = await import('./utils/direct-email-renderer')
            const directEmailHTML = await renderNewsletterToEmailHTML(campaign.templateData)
            console.log("[DEBUG] Direct Email HTML generated successfully, length:", directEmailHTML.length)
            
            // Add click tracking to Direct Email HTML
            const htmlWithTracking = this.addClickTrackingToContent(directEmailHTML, campaign._id.toString())
            campaignDataForEmail = { htmlContent: htmlWithTracking }
          } catch (error) {
            console.error("[DEBUG] Direct Email generation failed, falling back to template data:", error)
            campaignDataForEmail = { templateData: campaign.templateData }
          }
        } else {
          console.log("[DEBUG] Envoi Rapide campaign detected - using HTML content directly")
          // For Envoi Rapide campaigns, add click tracking to the HTML content
          const htmlContentWithTracking = this.addClickTrackingToContent(campaign.htmlContent, campaign._id.toString())
          console.log("[DEBUG] HTML content has tracking:", htmlContentWithTracking.includes("/track/"))
          campaignDataForEmail = { htmlContent: htmlContentWithTracking }
        }
      }

      const result = await emailService.sendNewsletterCampaign(
        subscribers,
        campaign.subject,
        campaign.htmlContent, // Pass original HTML content
        campaign._id.toString(),
        campaign.siteId,
        campaignDataForEmail, // Pass the properly detected campaign data
      )

      campaign.status = result.success ? "sent" : "failed"
      campaign.sentAt = new Date()
      campaign.analytics.totalRecipients = subscribers.length
      campaign.analytics.successfulSends = result.successCount
      campaign.analytics.failedSends = result.failedCount

      if (result.errors) {
        campaign.analytics.errors = result.errors
      }

      await campaign.save()

      return NextResponse.json({
        success: true,
        message: "Campagne envoyée avec succès",
        data: {
          totalRecipients: subscribers.length,
          successfulSends: result.successCount,
          failedSends: result.failedCount,
          campaign,
        },
      })
    } catch (error) {
      const { error: errorMessage, statusCode } = handleApiError(error)
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: statusCode },
      )
    }
  }
}

export const newsletterService = new NewsletterService()

function normalizeNames(data: any) {
  if (data.fullName && (!data.firstName || !data.lastName)) {
    const nameParts = data.fullName.trim().split(" ")
    data.firstName = data.firstName || nameParts[0]
    data.lastName = data.lastName || nameParts.slice(1).join(" ")
  }

  if (!data.fullName && data.firstName && data.lastName) {
    data.fullName = `${data.firstName} ${data.lastName}`.trim()
  }

  if (!data.fullName && !data.firstName && !data.lastName) {
    data.firstName = ""
    data.lastName = ""
    data.fullName = ""
  }

  return data
}

// REMOVED: trackCustomEvent - not needed
// REMOVED: trackAnalyticsEvent - not needed
// REMOVED: generateTrackingPixel - not needed (handled in emailService)
// REMOVED: generateClickTrackingUrl - not needed (handled in emailService)
