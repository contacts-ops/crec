import sgMail from "@sendgrid/mail"
import { connectToDatabase } from "@/lib/db"
import { Site } from "@/lib/models/Site"
import { FRENCH_ERROR_MESSAGES } from "./utils/errorHandler"

interface SendGridConfig {
  apiKey: string
  fromDomain: string
  isVerified: boolean
  senderConfig?: {
    desiredFromEmail?: string
  }
}

interface DomainVerificationResult {
  verified: boolean
  domain: string
  error?: string
}

class SendGridConfigService {
  private mainApiKey: string
  private verifiedDomains: Set<string> = new Set()
  private lastDomainCheck: number = 0
  private readonly DOMAIN_CACHE_TTL = 15 * 60 * 1000 // 15 minutes

  constructor() {
    this.mainApiKey = process.env.SENDGRID_API_KEY || ""
    if (!this.mainApiKey) {
      throw new Error("SENDGRID_API_KEY environment variable is required")
    }
    sgMail.setApiKey(this.mainApiKey)
  }

  /**
   * Get SendGrid configuration for a specific site
   */
  async getSiteConfig(siteId: string): Promise<SendGridConfig> {
    await connectToDatabase()
    
    const site = await Site.findOne({ siteId })
    if (!site) {
      throw new Error("Site not found")
    }

    // Get sender configuration from site
    const senderConfig = site.sender || {}
    
    // Determine from domain
    let fromDomain = process.env.MAIL_FROM_DOMAIN || "hub.majoli.io"
    let isDomainVerifiedForSite = false
    
    // If site has a custom domain, try to use it
    if (site.domain) {
      const customDomain = this.extractDomain(site.domain)
      if (customDomain && await this.isDomainVerified(customDomain)) {
        fromDomain = customDomain
        isDomainVerifiedForSite = true
      }
    }

    // If site has a desired from email, extract domain from it
    if (senderConfig.desiredFromEmail) {
      const emailDomain = this.extractDomain(senderConfig.desiredFromEmail)
      if (emailDomain && await this.isDomainVerified(emailDomain)) {
        fromDomain = emailDomain
        isDomainVerifiedForSite = true
      }
    }

    return {
      apiKey: this.mainApiKey,
      fromDomain,
      isVerified: isDomainVerifiedForSite,
      senderConfig,
    }
  }

  /**
   * Verify if a domain is authenticated in SendGrid
   */
  async verifyDomain(domain: string): Promise<DomainVerificationResult> {
    try {
      // Check cache first
      if (this.isDomainCached(domain)) {
        return {
          verified: this.verifiedDomains.has(domain),
          domain,
        }
      }

      // Fetch from SendGrid API
      const response = await fetch(`https://api.sendgrid.com/v3/whitelabel/domains`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.mainApiKey}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`SendGrid API error: ${response.status}`)
      }

      const domains = await response.json()
      
      // Update cache
      this.verifiedDomains.clear()
      domains.forEach((domainInfo: any) => {
        if (domainInfo.valid === true || domainInfo.valid === "true") {
          this.verifiedDomains.add(domainInfo.domain.toLowerCase())
        }
      })
      
      this.lastDomainCheck = Date.now()

      return {
        verified: this.verifiedDomains.has(domain.toLowerCase()),
        domain,
      }
    } catch (error) {
      console.error("Error verifying domain:", error)
      return {
        verified: false,
        domain,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Check if domain is verified (with caching)
   */
  async isDomainVerified(domain: string): Promise<boolean> {
    if (!domain) return false
    
    // Check cache first
    if (this.isDomainCached(domain)) {
      return this.verifiedDomains.has(domain.toLowerCase())
    }

    // Verify domain and update cache
    const result = await this.verifyDomain(domain)
    return result.verified
  }

  /**
   * Get the best available from address for a site
   */
  async getFromAddress(siteId: string): Promise<string> {
    const config = await this.getSiteConfig(siteId)
    
    // If site has a verified domain and desired from email, use it
    if (config.isVerified && config.senderConfig?.desiredFromEmail) {
      return config.senderConfig.desiredFromEmail
    }

    // If site has a verified domain, use site name + domain
    if (config.isVerified) {
      const site = await Site.findOne({ siteId })
      const siteName = site?.name || "newsletter"
      const cleanSiteName = siteName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 30)
      
      return `${cleanSiteName}@${config.fromDomain}`
    }

    // Fallback to main domain
    return `newsletter@${config.fromDomain}`
  }

  /**
   * Get the ecommerce from address for a site (always uses "ecommerce@" prefix)
   * Similar to getFromAddress but always uses "ecommerce@" instead of configurable prefix
   */
  async getEcommerceFromAddress(siteId: string): Promise<string> {
    const config = await this.getSiteConfig(siteId)
    
    // If site has a verified domain, use ecommerce@verifieddomain
    if (config.isVerified) {
      return `ecommerce@${config.fromDomain}`
    }

    // Fallback to main domain with ecommerce prefix
    return `ecommerce@${config.fromDomain}`
  }

  /**
   * Update sender configuration for a site
   */
  async updateSenderConfig(siteId: string, config: {
    desiredFromEmail: string
  }): Promise<void> {
    await connectToDatabase()
    
    const site = await Site.findOne({ siteId })
    if (!site) {
      throw new Error("Site not found")
    }

    // Update sender configuration - only desiredFromEmail
    site.sender = {
      ...site.sender,
      desiredFromEmail: config.desiredFromEmail,
      lastSenderCheckAt: new Date(),
    }

    // Check if desired from email domain is verified
    if (config.desiredFromEmail) {
      const domain = this.extractDomain(config.desiredFromEmail)
      if (domain) {
        const isVerified = await this.isDomainVerified(domain)
        site.sender.lastSenderStatus = isVerified ? "verified" : "unverified"
      }
    }

    await site.save()
  }

  /**
   * Send email using site-specific configuration
   */
  async sendEmail(siteId: string, emailData: {
    to: string
    subject: string
    html: string
    text?: string
  }): Promise<boolean> {
    try {
      const config = await this.getSiteConfig(siteId)
      const fromAddress = await this.getFromAddress(siteId)

      const msg = {
        to: emailData.to,
        from: fromAddress,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      }

      await sgMail.send(msg)
      return true
    } catch (error) {
      console.error("SendGrid email error:", error)
      return false
    }
  }

  /**
   * Extract domain from email or URL
   */
  private extractDomain(input: string): string | null {
    if (!input) return null
    
    // Handle email addresses
    if (input.includes("@")) {
      const parts = input.split("@")
      return parts.length === 2 ? parts[1].toLowerCase() : null
    }
    
    // Handle URLs
    try {
      const url = new URL(input.startsWith("http") ? input : `https://${input}`)
      return url.hostname.toLowerCase()
    } catch {
      // If it's just a domain name
      return input.toLowerCase()
    }
  }

  /**
   * Check if domain cache is still valid
   */
  private isDomainCached(domain: string): boolean {
    return Date.now() - this.lastDomainCheck < this.DOMAIN_CACHE_TTL
  }

  /**
   * Check if user can verify a specific domain (domain isolation)
   */
  async canUserVerifyDomain(userSiteId: string, domainToVerify: string): Promise<boolean> {
    const isDev = process.env.NODE_ENV === "development"
    
    // In development, allow more flexible testing
    if (isDev) {
      return true
    }
    
    // In production, check if domain matches user's site domain
    await connectToDatabase()
    const site = await Site.findOne({ siteId: userSiteId })
    
    if (!site || !site.domain) {
      return false
    }
    
    const siteDomain = this.extractDomain(site.domain)
    const verifyDomain = this.extractDomain(domainToVerify)
    
    return siteDomain === verifyDomain
  }
}

export const sendgridConfigService = new SendGridConfigService()
