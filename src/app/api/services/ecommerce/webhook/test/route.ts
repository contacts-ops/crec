import { type NextRequest, NextResponse } from "next/server"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"
import { connectToDatabase } from "@/lib/db"
import { Site } from "@/lib/models/Site"

// GET /api/services/ecommerce/webhook/test - Test webhook endpoint accessibility
export async function GET(request: NextRequest) {
  try {
    let siteId = extractSiteId(request)
    const { searchParams } = new URL(request.url)
    if (!siteId && searchParams.get("siteId")) {
      siteId = searchParams.get("siteId")
    }

    let webhookSecretStatus = "Not configured"
    let webhookUrl = ""
    let environment = ""
    let hasTestWebhook = false
    let hasLiveWebhook = false
    let debugInfo: any = {}
    let baseUrl = ""
    
    if (siteId) {
      await connectToDatabase()
      const site = await Site.findOne({ siteId }).lean() as any
      
      if (site?.ecommerce) {
        environment = site.ecommerce.environment || "development"
        const ecommerce = site.ecommerce
        
        // Debug info
        debugInfo = {
          environment,
          hasTestWebhookSecret: !!ecommerce.testWebhookSecret,
          hasLiveWebhookSecret: !!ecommerce.liveWebhookSecret,
          hasLegacyWebhookSecret: !!ecommerce.webhookSecret,
          testWebhookSecretLength: ecommerce.testWebhookSecret?.length || 0,
          liveWebhookSecretLength: ecommerce.liveWebhookSecret?.length || 0,
          legacyWebhookSecretLength: ecommerce.webhookSecret?.length || 0,
        }
        
        hasTestWebhook = !!(ecommerce.testWebhookSecret || (ecommerce.webhookSecret && environment === "development"))
        hasLiveWebhook = !!(ecommerce.liveWebhookSecret || (ecommerce.webhookSecret && environment === "production"))
        
        if (hasTestWebhook || hasLiveWebhook) {
          webhookSecretStatus = environment === "development" 
            ? (hasTestWebhook ? "Configured (test)" : "Not configured (test)")
            : (hasLiveWebhook ? "Configured (live)" : "Not configured (live)")
        }
        
        // Construct webhook URL - use actual request domain, not env variable
        // Only use FRONTEND_URL if ecommerce config is in production mode
        const isProduction = environment === "production"
        
        if (isProduction && (process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL)) {
          // Use FRONTEND_URL only for production ecommerce configs
          baseUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || ""
        } else {
          // Use actual request domain for development - get from headers
          const host = request.headers.get("host") || request.headers.get("x-forwarded-host")
          const protocol = request.headers.get("x-forwarded-proto") || (request.url.startsWith("https") ? "https" : "http")
          
          if (host) {
            baseUrl = `${protocol}://${host}`
          } else {
            // Fallback to parsing URL
            const url = new URL(request.url)
            baseUrl = `${url.protocol}//${url.host}`
          }
        }
      } else {
        // No ecommerce config - use request domain from headers
        const host = request.headers.get("host") || request.headers.get("x-forwarded-host")
        const protocol = request.headers.get("x-forwarded-proto") || (request.url.startsWith("https") ? "https" : "http")
        
        if (host) {
          baseUrl = `${protocol}://${host}`
        } else {
          try {
            const url = new URL(request.url)
            baseUrl = `${url.protocol}//${url.host}`
          } catch {
            baseUrl = "https://your-domain.com"
          }
        }
      }
    } else {
      // Fallback to request domain if no siteId - get from headers
      const host = request.headers.get("host") || request.headers.get("x-forwarded-host")
      const protocol = request.headers.get("x-forwarded-proto") || (request.url.startsWith("https") ? "https" : "http")
      
      if (host) {
        baseUrl = `${protocol}://${host}`
      } else {
        // Fallback to parsing URL
        const url = new URL(request.url)
        baseUrl = `${url.protocol}//${url.host}`
      }
    }
    
    webhookUrl = `${baseUrl}/api/services/ecommerce/webhook${siteId ? `?siteId=${siteId}` : ""}`

    return NextResponse.json({ 
      success: true, 
      message: "Webhook endpoint is accessible",
      timestamp: new Date().toISOString(),
      webhookSecret: webhookSecretStatus,
      webhookUrl: webhookUrl,
      environment: environment || "Not configured",
      siteId: siteId || "Not provided",
      debug: debugInfo,
      instructions: "Configure this URL in your Stripe Dashboard: Settings > Webhooks > Add endpoint"
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      message: "Webhook endpoint is accessible",
      timestamp: new Date().toISOString(),
      webhookSecret: "Error checking configuration",
      error: error.message
    })
  }
}

