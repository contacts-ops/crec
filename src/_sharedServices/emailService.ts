import sgMail from "@sendgrid/mail"
import { generateNewsletterFromAddress, generateContactFromAddress, extractSiteName } from "./utils/siteExtractor"
import { sendgridConfigService } from "./sendgridConfigService"
import path from "path"
import { promises as fs } from "fs"
import { fileURLToPath } from "url"

interface NewsletterWelcomeData {
  email: string
  fullName?: string
  firstName?: string
  lastName?: string
  unsubscribeToken: string
  siteId?: string
}

interface NewsletterCampaignResult {
  success: boolean
  successCount: number
  failedCount: number
  errors?: Array<{
    email: string
    error: string
    timestamp: Date
  }>
}


// Interface pour les emails transactionnels
interface TransactionalEmailData {
  to: string
  subject: string
  htmlContent: string
  fromName?: string
  fromEmail?: string
  replyTo?: string
  siteId?: string
}

// Interface pour les emails avec pièce jointe
interface TransactionalEmailWithAttachmentData extends TransactionalEmailData {
  attachments?: Array<{
    content: string // Base64 encoded content
    filename: string
    type: string
    disposition: 'attachment' | 'inline'
  }>
}

class EmailService {
  private adminEmail: string
  private FRONTEND_URL: string
  private companyName: string

  constructor() {
    const sendGridApiKey = process.env.SENDGRID_API_KEY
    if (!sendGridApiKey) {
      throw new Error("SENDGRID_API_KEY environment variable is required")
    }
    // Debug: log masked API key
    const maskedKey = sendGridApiKey.substring(0, 10) + "..." + sendGridApiKey.substring(sendGridApiKey.length - 6)
    console.log(`[EmailService] Using SendGrid API Key: ${maskedKey} (length: ${sendGridApiKey.length})`)
    sgMail.setApiKey(sendGridApiKey)

    this.adminEmail = process.env.ADMIN_EMAIL || "contact@example.com"
    this.FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000"
    this.companyName = process.env.COMPANY_NAME || "Majoli"
  }

  private formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Paris",
    }
    return new Date(date).toLocaleString("fr-FR", options)
  }

    private async readEmailTemplate(templateName: string): Promise<string> {
      try {
        const __filename = fileURLToPath(import.meta.url)
        const __dirname = path.dirname(__filename)
        const filePath = path.join(__dirname, "email-templates", templateName)
        return await fs.readFile(filePath, "utf-8")
      } catch (error) {
        throw new Error(`Error reading email template: ${templateName}`)
      }
    }
  

  private generateTrackingPixelUrl(campaignId: string, email: string): string {
    return `${this.FRONTEND_URL}/api/services/newsletter/track/open?c=${campaignId}&e=${encodeURIComponent(email)}`
  }

  private generateClickTrackingUrl(campaignId: string, email: string, originalUrl: string): string {
    return `${this.FRONTEND_URL}/api/services/newsletter/track/click?c=${campaignId}&e=${encodeURIComponent(email)}&url=${encodeURIComponent(originalUrl)}`
  }

  private addTrackingToHtmlContent(htmlContent: string, campaignId: string, email: string): string {
    console.log("[DEBUG] Adding single tracking pixel to email content for campaign:", campaignId, "email:", email)

    // Add click tracking to all links - this is more reliable than open tracking
    const trackedContent = htmlContent.replace(
      /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
      (match, beforeHref, url, afterHref) => {
        // Skip if it's already a tracking URL or unsubscribe link
        if (
          url.includes("/track/") ||
          url.includes("unsubscribe") ||
          url.includes("{{unsubscribeLink}}") ||
          url.includes("{{webVersionLink}}") ||
          url.startsWith("mailto:")
        ) {
          return match
        }

        const trackingUrl = this.generateClickTrackingUrl(campaignId, email, url)
        console.log("[DEBUG] Adding click tracking:", url, "->", trackingUrl)
        return `<a ${beforeHref}href="${trackingUrl}"${afterHref}>`
      },
    )

    const baseTrackingUrl = `${this.FRONTEND_URL}/api/services/newsletter/track/open?c=${campaignId}&e=${encodeURIComponent(email)}`

    // Single Gmail-compatible tracking pixel with multiple fallback styles
    const trackingPixel = `<img src="${baseTrackingUrl}" width="1" height="1" style="display:none !important;max-height:1px !important;max-width:1px !important;overflow:hidden !important;mso-hide:all;opacity:0.01;" alt="" />`

    let finalContent = trackedContent

    // Insert single tracking pixel
    if (finalContent.includes("</body>")) {
      finalContent = finalContent.replace("</body>", `${trackingPixel}</body>`)
      console.log("[DEBUG] Inserted single tracking pixel before </body>")
    } else if (finalContent.includes("</html>")) {
      finalContent = finalContent.replace("</html>", `${trackingPixel}</html>`)
      console.log("[DEBUG] Inserted single tracking pixel before </html>")
    } else {
      finalContent = finalContent + trackingPixel
      console.log("[DEBUG] Appended single tracking pixel at end")
    }

    return finalContent
  }

  async sendNewsletterWelcome(welcomeData: NewsletterWelcomeData): Promise<boolean> {
    const { email, fullName, unsubscribeToken, siteId } = welcomeData
    try {
      const siteName = await extractSiteName(siteId || null)
      const displayName = siteName.charAt(0).toUpperCase() + siteName.slice(1)

      const unsubscribeLink = `${this.FRONTEND_URL}/api/services/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubscribeToken}`

      // Simple welcome email template
      const welcomeContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bienvenue à la newsletter</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1>Bienvenue ${fullName || email}!</h1>
          <p>Merci de vous être abonné à la newsletter de ${displayName}.</p>
          <p>Vous recevrez bientôt nos dernières actualités et contenus exclusifs.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            <a href="${unsubscribeLink}" style="color: #007bff;">Se désabonner</a>
          </p>
        </body>
        </html>
      `

      // Use SendGrid configuration service for better domain handling
      const fromAddress = siteId 
        ? await sendgridConfigService.getFromAddress(siteId)
        : await generateNewsletterFromAddress(siteId || null)

      await sgMail.send({
        from: fromAddress,
        to: email,
        subject: `Bienvenue à la newsletter de ${displayName}`,
        html: welcomeContent,
      })
      return true
    } catch (error) {
      console.error("Error sending newsletter welcome email:", error)
      throw new Error("Error sending newsletter welcome email")
    }
  }

  async sendNewsletterCampaign(
    subscribers: any[],
    subject: string,
    htmlContent: string,
    campaignId?: string,
    siteId?: string,
    campaignData?: any,
  ): Promise<NewsletterCampaignResult> {
    try {
      let successCount = 0
      let failedCount = 0
      const errors: Array<{ email: string; error: string; timestamp: Date }> = []

      // Use SendGrid configuration service for better domain handling
      const fromAddress = siteId 
        ? await sendgridConfigService.getFromAddress(siteId)
        : await generateNewsletterFromAddress(siteId || null)

      let baseHtmlContent = htmlContent

      // Handle different campaign types
      if (campaignData?.templateData?.htmlContent) {
        // New react-email-editor system - use the pre-generated HTML
        console.log("[React Email Editor] Using pre-generated HTML from react-email-editor:", campaignId)
        console.log("[React Email Editor] HTML content length:", campaignData.templateData.htmlContent.length)
        baseHtmlContent = campaignData.templateData.htmlContent
      } else if (campaignData?.htmlContent) {
        // Envoi Rapide system - use the pre-processed HTML
        console.log("[Envoi Rapide] Using pre-processed HTML content:", campaignId)
        console.log("[Envoi Rapide] HTML content length:", campaignData.htmlContent.length)
        baseHtmlContent = campaignData.htmlContent
      } else {
        // Fallback to raw HTML content
        console.log("[Fallback] Using raw HTML content:", campaignId)
        console.log("[Fallback] HTML content length:", htmlContent.length)
        baseHtmlContent = htmlContent
      }

      if (campaignId) {
        console.log("[DEBUG] Campaign ID provided for Gmail-compatible tracking:", campaignId)
        console.log("[DEBUG] Total subscribers to process:", subscribers.length)
      } else {
        console.log("[DEBUG] No campaign ID provided - tracking will be skipped")
      }

      // Send emails in batches to avoid overwhelming SendGrid
      const batchSize = 10
      for (let i = 0; i < subscribers.length; i += batchSize) {
        const batch = subscribers.slice(i, i + batchSize)
        await Promise.all(
          batch.map(async (subscriber) => {
            try {
              const unsubscribeLink = `${this.FRONTEND_URL}/api/services/newsletter/unsubscribe?email=${encodeURIComponent(subscriber.email)}&token=${subscriber.unsubscribeToken}`
              
              let personalizedContent = baseHtmlContent
                .replace(/{{unsubscribeLink}}/g, unsubscribeLink)
                .replace(/{{fullName}}/g, subscriber.fullName || "")
                .replace(/{{firstName}}/g, subscriber.firstName || "")
                .replace(/{{lastName}}/g, subscriber.lastName || "")
                .replace(/{{companyName}}/g, siteId ? await extractSiteName(siteId) : this.companyName)

              // Add tracking for all campaigns - Add tracking pixel if campaign ID is provided
              if (campaignId) {
                console.log("[DEBUG] Adding Gmail-compatible tracking for subscriber:", subscriber.email)
                //personalizedContent = this.addTrackingToHtmlContent(personalizedContent, campaignId, subscriber.email)
              }

              await sgMail.send({
                from: fromAddress,
                to: subscriber.email,
                subject: subject,
                html: personalizedContent,
                headers: {
                  "X-Campaign-ID": campaignId || "no-campaign",
                  "X-Subscriber-Email": subscriber.email,
                  "List-Unsubscribe": `<${this.FRONTEND_URL}/api/services/newsletter/unsubscribe?email=${encodeURIComponent(subscriber.email)}&token=${subscriber.unsubscribeToken}>`,
                  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                  "X-Mailer": this.companyName,
                  "X-Priority": "3",
                  "X-MSMail-Priority": "Normal",
                },
              })
              successCount++
            } catch (emailError) {
              console.error(`Error sending newsletter to ${subscriber.email}:`, emailError)
              failedCount++
              errors.push({
                email: subscriber.email,
                error: emailError instanceof Error ? emailError.message : "Unknown error",
                timestamp: new Date(),
              })
            }
          }),
        )
        // Add delay between batches
        if (i + batchSize < subscribers.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      console.log("[DEBUG] Gmail-compatible campaign sending completed:", {
        campaignId,
        successCount,
        failedCount,
        totalSubscribers: subscribers.length,
      })

      return {
        success: failedCount === 0,
        successCount,
        failedCount,
        errors: errors.length > 0 ? errors : undefined,
      }
    } catch (error) {
      console.error("Error sending newsletter campaign:", error)
      throw new Error("Error sending newsletter campaign")
    }
  }



/**
   * Envoie un email transactionnel (réinitialisation mot de passe, contact, etc.)
   * Cette méthode est plus appropriée que sendNewsletterCampaign pour les emails transactionnels
   */
  async sendTransactionalEmail(emailData: TransactionalEmailData): Promise<boolean> {
    try {
      const { to, subject, htmlContent, fromName, fromEmail, replyTo, siteId } = emailData

      // Déterminer l'adresse d'expédition
      let fromAddress: string
      if (fromEmail) {
        fromAddress = fromName ? `${fromName} <${fromEmail}>` : fromEmail
      } else {
        // Utiliser l'adresse par défaut du site ou l'adresse admin
        const siteFromAddress = await generateContactFromAddress(siteId || null)
        fromAddress = fromName ? `${fromName} <${siteFromAddress}>` : siteFromAddress
      }

      // Préparer les headers appropriés pour un email transactionnel
      const headers: Record<string, string> = {
        "X-Mailer": this.companyName,
        "X-Priority": "3",
        "X-MSMail-Priority": "Normal",
      }

      // Ajouter le reply-to si spécifié
      if (replyTo) {
        headers["Reply-To"] = replyTo
      }

      // Ajouter des headers pour identifier le type d'email
      headers["X-Email-Type"] = "transactional"

      await sgMail.send({
        from: fromAddress,
        to: to,
        subject: subject,
        html: htmlContent,
        headers: headers,
      })

      console.log(`[EmailService] Email transactionnel envoyé avec succès à: ${to}`)
      return true
    } catch (error) {
      console.error("Error sending transactional email:", error)
      
      // Extraire les détails de l'erreur SendGrid
      let errorMessage = 'Erreur inconnue'
      const sendGridError = error as any
      
      if (sendGridError?.response?.body?.errors) {
        // Erreurs structurées SendGrid
        const sgErrors = sendGridError.response.body.errors
        console.error("[EmailService] Détails erreur SendGrid:", JSON.stringify(sgErrors, null, 2))
        errorMessage = sgErrors.map((e: any) => e.message || e.field || JSON.stringify(e)).join('; ')
      } else if (sendGridError?.response?.body) {
        // Corps de réponse brut
        console.error("[EmailService] Corps réponse SendGrid:", JSON.stringify(sendGridError.response.body, null, 2))
        errorMessage = typeof sendGridError.response.body === 'string' 
          ? sendGridError.response.body 
          : JSON.stringify(sendGridError.response.body)
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      // Ajouter le code de statut si disponible
      const statusCode = sendGridError?.code || sendGridError?.response?.statusCode
      if (statusCode) {
        errorMessage = `[${statusCode}] ${errorMessage}`
      }
      
      throw new Error(`Erreur lors de l'envoi de l'email transactionnel: ${errorMessage}`)
    }
  }

  /**
   * Envoie un email transactionnel avec pièce jointe
   * Méthode spécialisée pour les courriers avec fichiers attachés
   */
  async sendTransactionalEmailWithAttachment(emailData: TransactionalEmailWithAttachmentData): Promise<boolean> {
    try {
      const { to, subject, htmlContent, fromName, fromEmail, replyTo, siteId, attachments } = emailData

      // Déterminer l'adresse d'expédition
      let fromAddress: string
      if (fromEmail) {
        fromAddress = fromName ? `${fromName} <${fromEmail}>` : fromEmail
      } else {
        // Utiliser l'adresse par défaut du site ou l'adresse admin
        const siteFromAddress = await generateContactFromAddress(siteId || null)
        fromAddress = fromName ? `${fromName} <${siteFromAddress}>` : siteFromAddress
      }

      // Préparer les headers appropriés pour un email transactionnel
      const headers: Record<string, string> = {
        "X-Mailer": this.companyName,
        "X-Priority": "3",
        "X-MSMail-Priority": "Normal",
      }

      // Ajouter le reply-to si spécifié
      if (replyTo) {
        headers["Reply-To"] = replyTo
      }

      // Ajouter des headers pour identifier le type d'email
      headers["X-Email-Type"] = "transactional"

      // Préparer l'objet d'envoi avec ou sans pièces jointes
      const sendData: any = {
        from: fromAddress,
        to: to,
        subject: subject,
        html: htmlContent,
        headers: headers,
      }

      // Ajouter les pièces jointes si présentes
      if (attachments && attachments.length > 0) {
        sendData.attachments = attachments
      }

      await sgMail.send(sendData)

      console.log(`[EmailService] Email transactionnel avec pièce jointe envoyé avec succès à: ${to}`)
      return true
    } catch (error) {
      console.error("Error sending transactional email with attachment:", error)
      
      // Extraire les détails de l'erreur SendGrid
      let errorMessage = 'Erreur inconnue'
      const sendGridError = error as any
      
      if (sendGridError?.response?.body?.errors) {
        const sgErrors = sendGridError.response.body.errors
        console.error("[EmailService] Détails erreur SendGrid:", JSON.stringify(sgErrors, null, 2))
        errorMessage = sgErrors.map((e: any) => e.message || e.field || JSON.stringify(e)).join('; ')
      } else if (sendGridError?.response?.body) {
        console.error("[EmailService] Corps réponse SendGrid:", JSON.stringify(sendGridError.response.body, null, 2))
        errorMessage = typeof sendGridError.response.body === 'string' 
          ? sendGridError.response.body 
          : JSON.stringify(sendGridError.response.body)
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      const statusCode = sendGridError?.code || sendGridError?.response?.statusCode
      if (statusCode) {
        errorMessage = `[${statusCode}] ${errorMessage}`
      }
      
      throw new Error(`Erreur lors de l'envoi de l'email transactionnel avec pièce jointe: ${errorMessage}`)
    }
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   * Méthode spécialisée pour ce cas d'usage spécifique
   */
  async sendPasswordResetEmail(
    email: string,
    resetLink: string,
    firstName?: string,
    siteId?: string
  ): Promise<boolean> {
    const subject = "Réinitialisation de votre mot de passe"
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Réinitialisation de mot de passe</h2>
        
        <p>Bonjour ${firstName || ""},</p>
        
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        
        <p>Veuillez cliquer sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        
        <p><strong>Ce lien est valable pendant 1 heure.</strong></p>
        
        <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.</p>
        
        <p>Si le bouton ne fonctionne pas, vous pouvez copier et coller ce lien dans votre navigateur :</p>
        <p style="word-break: break-all; color: #666;">${resetLink}</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          Cet email a été envoyé automatiquement. Veuillez ne pas y répondre.
        </p>
      </div>
    `

    return this.sendTransactionalEmail({
      to: email,
      subject: subject,
      htmlContent: htmlContent,
      fromName: "Support",
      siteId: siteId
    })
  }

  /**
   * Envoie un email de confirmation de formulaire de contact
   */
  async sendContactFormEmail(
    to: string,
    formData: any,
    siteId?: string
  ): Promise<boolean> {
    const subject = "Confirmation de votre message"
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Confirmation de réception</h2>
        
        <p>Bonjour ${formData.firstName || formData.name || ""},</p>
        
        <p>Nous avons bien reçu votre message et nous vous remercions de nous avoir contacté.</p>
        
        <p>Voici un récapitulatif de votre demande :</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Nom :</strong> ${formData.firstName || formData.name || "Non renseigné"}</p>
          <p><strong>Email :</strong> ${formData.email || "Non renseigné"}</p>
          <p><strong>Téléphone :</strong> ${formData.phone || "Non renseigné"}</p>
          <p><strong>Message :</strong></p>
          <p style="white-space: pre-wrap;">${formData.message || formData.content || "Aucun message"}</p>
        </div>
        
        <p>Nous traiterons votre demande dans les plus brefs délais et nous vous répondrons très prochainement.</p>
        
        <p>Cordialement,<br>L'équipe de ${this.companyName}</p>
      </div>
    `

    return this.sendTransactionalEmail({
      to: to,
      subject: subject,
      htmlContent: htmlContent,
      fromName: "Contact",
      siteId: siteId
    })
  }

  /**
   * Envoie une notification à l'administrateur pour un nouveau formulaire de contact
   */
  async sendContactFormNotification(
    formData: any,
    siteId?: string
  ): Promise<boolean> {
    const subject = "Nouveau message de contact reçu"

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Nouveau message de contact</h2>

        <p>Un nouveau message de contact a été reçu :</p>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Nom :</strong> ${formData.firstName || formData.name || "Non renseigné"}</p>
          <p><strong>Email :</strong> ${formData.email || "Non renseigné"}</p>
          <p><strong>Téléphone :</strong> ${formData.phone || "Non renseigné"}</p>
          <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p>
          <p><strong>Message :</strong></p>
          <p style="white-space: pre-wrap;">${formData.message || formData.content || "Aucun message"}</p>
        </div>

        <p>Veuillez traiter cette demande dans les plus brefs délais.</p>
      </div>
    `

    return this.sendTransactionalEmail({
      to: this.adminEmail,
      subject: subject,
      htmlContent: htmlContent,
      fromName: "Système de contact",
      siteId: siteId
    })
  }

  /**
   * Envoie une notification de nouvelle demande de domiciliation signée aux admins
   */
  async sendDomiciliationAdminNotification(
    formData: any,
    siteId?: string
  ): Promise<boolean> {
    const subject = "Nouvelle demande de domiciliation signée"

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Nouvelle demande de domiciliation signée</h2>

        <p>Une nouvelle demande de domiciliation a été soumise et signée.</p>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="margin-top: 0; color: #856404;">Détails de la demande :</h3>
          <p><strong>Client :</strong> ${formData.firstName || ''} ${formData.lastName || ''}</p>
          <p><strong>Email :</strong> ${formData.email || 'Non renseigné'}</p>
          <p><strong>Téléphone :</strong> ${formData.phone || 'Non renseigné'}</p>
          <p><strong>Forme juridique :</strong> ${formData.legalForm || 'Non renseigné'}</p>
          <p><strong>Entreprise :</strong> ${formData.companyName || 'Non renseigné'}</p>
          <p><strong>Adresse :</strong> ${formData.street || ''} ${formData.suite || ''}, ${formData.postalCode || ''} ${formData.city || ''}</p>
          <p><strong>Type de domiciliation :</strong> ${formData.domiciliationType || 'Non renseigné'}</p>
        </div>

        <p>Les documents suivants sont joints à cet email :</p>
        <ul>
          <li>Contrat de domiciliation signé</li>
          <li>Attestation de domiciliation</li>
        </ul>

        <p>Cordialement,<br>L'équipe de l'Arche</p>
      </div>
    `

    // Récupérer l'email admin du site
    let adminEmail = this.adminEmail;
    try {
      const siteName = await extractSiteName(siteId || null);
      // Pour l'instant on garde l'email par défaut, mais on pourrait ajouter une logique pour récupérer l'email admin du site
    } catch (error) {
      console.warn('Impossible de récupérer les informations du site pour l\'email admin');
    }

    return this.sendTransactionalEmail({
      to: adminEmail,
      subject: subject,
      htmlContent: htmlContent,
      fromName: "Système de domiciliation",
      siteId: siteId
    })
  }

  /**
   * Envoie une confirmation de demande de domiciliation au client
   */
  async sendDomiciliationClientConfirmation(
    formData: any,
    siteId?: string
  ): Promise<boolean> {
    const subject = "Confirmation de votre demande de domiciliation"

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Confirmation de votre demande de domiciliation</h2>

        <p>Bonjour ${formData.firstName || ''} ${formData.lastName || ''},</p>

        <p>Nous avons bien reçu votre demande de domiciliation et elle a été traitée avec succès.</p>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="margin-top: 0; color: #155724;">Récapitulatif de votre demande :</h3>
          <p><strong>Forme juridique :</strong> ${formData.legalForm || 'Non renseigné'}</p>
          <p><strong>Entreprise :</strong> ${formData.companyName || 'Non renseigné'}</p>
          <p><strong>Adresse de domiciliation :</strong> ${formData.street || ''} ${formData.suite || ''}, ${formData.postalCode || ''} ${formData.city || ''}</p>
          <p><strong>Type de domiciliation :</strong> ${formData.domiciliationType || 'Non renseigné'}</p>
        </div>

        <p>Les documents suivants sont joints à cet email :</p>
        <ul>
          <li>Votre contrat de domiciliation signé</li>
          <li>Votre attestation de domiciliation</li>
        </ul>

        <p>Nous vous contacterons prochainement pour toute information complémentaire.</p>

        <p>Cordialement,<br>L'équipe de l'Arche</p>
      </div>
    `

    return this.sendTransactionalEmail({
      to: formData.email,
      subject: subject,
      htmlContent: htmlContent,
      fromName: "Arche Domiciliation",
      siteId: siteId
    })
  }

  /**
   * Envoie une alerte aux administrateurs lorsqu'un paiement échoue
   */
  async sendPaymentFailedAlert(
    userEmail: string,
    userName: string,
    invoiceId: string,
    amount: number,
    currency: string,
    reason: string,
    attemptCount: number,
    siteId?: string
  ): Promise<boolean> {
    try {
      const subject = "🚨 Alerte : Paiement échoué détecté"

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc3545;">Alerte : Paiement échoué</h2>

          <p>Un paiement a échoué et nécessite une attention immédiate.</p>

          <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h3 style="margin-top: 0; color: #721c24;">Détails du paiement échoué :</h3>
            <p><strong>Client :</strong> ${userName} (${userEmail})</p>
            <p><strong>ID Facture :</strong> ${invoiceId}</p>
            <p><strong>Montant :</strong> ${(amount / 100).toFixed(2)} ${currency.toUpperCase()}</p>
            <p><strong>Nombre de tentatives :</strong> ${attemptCount}</p>
            <p><strong>Raison de l'échec :</strong> ${reason}</p>
            <p><strong>Date :</strong> ${this.formatDate(new Date())}</p>
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h4 style="margin-top: 0; color: #856404;">Actions recommandées :</h4>
            <ul>
              <li>Vérifier les informations de paiement du client</li>
              <li>Contacter le client pour mettre à jour ses informations de paiement</li>
              <li>Vérifier l'état de l'abonnement si applicable</li>
            </ul>
          </div>

          <p>Cette alerte a été générée automatiquement par le système de paiement.</p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Système de surveillance des paiements - Majoli Hub
          </p>
        </div>
      `

      // Récupérer les emails des administrateurs du site
      const adminEmails = await this.getSiteAdminEmails(siteId);

      // Envoyer l'alerte à tous les administrateurs
      const results = await Promise.allSettled(
        adminEmails.map(email =>
          this.sendTransactionalEmail({
            to: email,
            subject: subject,
            htmlContent: htmlContent,
            fromName: "Système de Paiement",
            siteId: siteId
          })
        )
      );

      // Vérifier si au moins un email a été envoyé avec succès
      const successCount = results.filter(result =>
        result.status === 'fulfilled' && result.value === true
      ).length;

      if (successCount > 0) {
        console.log(`[EmailService] Alerte paiement échoué envoyée à ${successCount}/${adminEmails.length} administrateur(s)`);
        return true;
      } else {
        console.error('[EmailService] Échec de l\'envoi de toutes les alertes de paiement échoué');
        return false;
      }

    } catch (error) {
      console.error('Error sending payment failed alert:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      throw new Error(`Erreur lors de l'envoi de l'alerte de paiement échoué: ${errorMessage}`);
    }
  }

  /**
   * Récupère les emails des administrateurs d'un site
   */
  private async getSiteAdminEmails(siteId?: string): Promise<string[]> {
    try {
      const { connectToDatabase } = await import('@/lib/db');
      const { Utilisateur } = await import('@/lib/models/Utilisateur');

      await connectToDatabase();

      const admins = await Utilisateur.find({
        siteId: siteId || process.env.DEFAULT_SITE_ID || '',
        role: 'admin',
        status: 'active'
      }).select('email');

      const adminEmails = admins.map(admin => admin.email).filter(email => email);

      // Si aucun admin trouvé ou pas de siteId, utiliser l'email admin par défaut
      if (adminEmails.length === 0) {
        console.warn('[EmailService] Aucun administrateur trouvé, utilisation de l\'email par défaut');
        return [this.adminEmail];
      }

      return adminEmails;
    } catch (error) {
      console.error('Error retrieving admin emails:', error);
      // En cas d'erreur, retourner l'email admin par défaut
      return [this.adminEmail];
    }
  }

}

export const emailService = new EmailService()