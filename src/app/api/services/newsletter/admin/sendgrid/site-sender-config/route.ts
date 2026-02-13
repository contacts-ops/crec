import { NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"
import { Site } from "@/lib/models/Site"

export async function GET(request: NextRequest) {
  try {
    const authResult = await sharedServices._internal._nlVerify(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode || 401 }
      )
    }

    if (authResult.user?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Accès interdit" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get("siteId")

    if (!siteId || siteId !== authResult.user.siteId) {
      return NextResponse.json({ success: false, error: "ID du site invalide" }, { status: 400 })
    }

    try {
      const config = await sharedServices.sendgrid.getSiteConfig(siteId)
      
      return NextResponse.json({
        success: true,
        senderConfig: {
          desiredFromEmail: config.senderConfig?.desiredFromEmail || "",
          domainStatus: config.isVerified ? "verified" : "unverified",
        },
      })
    } catch (error) {
      console.error("Error loading site config:", error)
      return NextResponse.json({ 
        success: false, 
        error: "Erreur lors du chargement de la configuration. Vérifiez que le site existe." 
      }, { status: 404 })
    }
  } catch (error) {
    console.error("Error fetching site sender config:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await sharedServices._internal._nlVerify(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode || 401 }
      )
    }

    if (authResult.user?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Accès interdit" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get("siteId")
    const body = await request.json()

    if (!siteId || siteId !== authResult.user.siteId) {
      return NextResponse.json({ success: false, error: "ID du site invalide" }, { status: 400 })
    }

    const { desiredFromEmail } = body

    if (!desiredFromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(desiredFromEmail)) {
      return NextResponse.json({ success: false, error: "Format d'email invalide" }, { status: 400 })
    }

    // Check domain ownership in production
    const isDev = process.env.NODE_ENV === "development"
    if (!isDev) {
      await (await import("@/lib/db")).connectToDatabase()
      const site = await Site.findOne({ siteId }).lean()
      
      if (!site || !site.domain) {
        return NextResponse.json({ 
          success: false, 
          error: "Votre site n'a pas de domaine configuré. Contactez l'administrateur." 
        }, { status: 400 })
      }
      
      const emailDomain = desiredFromEmail.split("@")[1]?.toLowerCase()
      const siteDomain = site.domain.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "")
      
      if (emailDomain !== siteDomain) {
        return NextResponse.json({ 
          success: false, 
          error: `Vous ne pouvez configurer que des adresses email de votre propre domaine (${siteDomain}). L'adresse ${desiredFromEmail} n'est pas autorisée.` 
        }, { status: 403 })
      }
    }

    try {
      await sharedServices.sendgrid.updateSenderConfig(siteId, {
        desiredFromEmail,
      })

      return NextResponse.json({ 
        success: true, 
        message: "Adresse d'expédition configurée avec succès" 
      })
    } catch (error) {
      console.error("Error updating sender config:", error)
      return NextResponse.json({ success: false, error: "Erreur lors de la sauvegarde" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error updating site sender config:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
