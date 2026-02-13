import type { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Site } from "@/lib/models/Site"

export function extractSiteId(request: NextRequest): string | null {
  // Try to get siteId from different sources

  // 1. From URL path (for routes like /sites/{siteId}/...)
  try {
    const url = new URL(request.url)
    const pathSegments = url.pathname.split("/")
    const siteIndex = pathSegments.indexOf("sites")
    if (siteIndex !== -1 && pathSegments[siteIndex + 1]) {
      return pathSegments[siteIndex + 1]
    }
  } catch (error) {
    // Continue to next method
  }

  // 2. From query parameters
  try {
    const url = new URL(request.url)
    const siteIdFromQuery = url.searchParams.get("siteId")
    if (siteIdFromQuery) return siteIdFromQuery
  } catch (error) {
    // Continue to next method
  }

  // 3. From headers (currently used with newsletter service)
  const siteIdFromHeader = request.headers.get("x-site-id")
  if (siteIdFromHeader) return siteIdFromHeader

  // 4. From subdomain (if using subdomain-based multi-tenancy)
  const host = request.headers.get("host")
  if (host) {
    const subdomain = host.split(".")[0]
    if (subdomain && subdomain !== "www" && subdomain !== "localhost") {
      return subdomain
    }
  }

  return null
}

export async function extractSiteName(siteId: string | null): Promise<string> {
  if (!siteId) {
    return "default"
  }

  try {
    await connectToDatabase()
    const site = await Site.findOne({ siteId: siteId })

    if (!site || !site.name) {
      // Fallback to siteId if site not found or no name
      return siteId
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 50)
    }

    // Convert site name to a clean, email-friendly format
    return site.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-") // Replace non-alphanumeric chars with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
      .substring(0, 50) // Limit length for email compatibility
  } catch (error) {
    console.error("Error fetching site name:", error)
    // Fallback to siteId formatting on error
    return siteId
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50)
  }
}

export async function generateNewsletterFromAddress(siteId: string | null): Promise<string> {
  const siteName = await extractSiteName(siteId)
  const domain = process.env.MAIL_FROM_DOMAIN || "hub.majoli.io"
  return `${siteName}-newsletter@${domain}`
}

export async function generateContactFromAddress(siteId: string | null): Promise<string> {
  const siteName = await extractSiteName(siteId)
  const domain = process.env.MAIL_FROM_DOMAIN || "hub.majoli.io"
  return `contact@${domain}`
}
