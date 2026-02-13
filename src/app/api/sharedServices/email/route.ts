import { NextRequest, NextResponse } from "next/server"
import { emailService } from "../../../../_sharedServices/emailService"
import { connectToDatabase } from "@/lib/db"
import { Site } from "@/lib/models/Site"

export async function POST(request: NextRequest) {
  try {
    console.log('DEBUG: Email API route called');
    const body = await request.json()
    console.log('DEBUG: Request body:', body);
    const { to, subject, htmlContent, fromName, fromEmail, replyTo, siteId, attachments } = body

    // Validation des champs requis
    if (!to || !subject || !htmlContent) {
      console.log('DEBUG: Missing required fields:', { to, subject, htmlContent });
      return NextResponse.json(
        { error: "Les champs 'to', 'subject' et 'htmlContent' sont requis" },
        { status: 400 }
      )
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: "Format d'email invalide" },
        { status: 400 }
      )
    }

    // Envoi de l'email transactionnel avec ou sans pièces jointes
    console.log('DEBUG: About to send email. Has attachments:', attachments && attachments.length > 0);
    let success: boolean
    if (attachments && attachments.length > 0) {
      console.log('DEBUG: Sending email with attachments');
      success = await emailService.sendTransactionalEmailWithAttachment({
        to,
        subject,
        htmlContent,
        fromName,
        fromEmail,
        replyTo,
        siteId,
        attachments
      })
    } else {
      console.log('DEBUG: Sending email without attachments');
      success = await emailService.sendTransactionalEmail({
        to,
        subject,
        htmlContent,
        fromName,
        fromEmail,
        replyTo,
        siteId
      })
    }
    console.log('DEBUG: Email service result:', success);

    if (success) {
      return NextResponse.json(
        { 
          success: true, 
          message: "Email envoyé avec succès",
          recipient: to,
          hasAttachments: attachments && attachments.length > 0
        },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        { error: "Échec de l'envoi de l'email" },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error)
    return NextResponse.json(
      { 
        error: "Erreur interne du serveur",
        details: error instanceof Error ? error.message : "Erreur inconnue"
      },
      { status: 500 }
    )
  }
}

// Méthode GET pour tester l'endpoint
export async function GET() {
  return NextResponse.json(
    { 
      message: "API Email Service - Utilisez POST pour envoyer un email",
      availableMethods: ["POST"]
    },
    { status: 200 }
  )
}
