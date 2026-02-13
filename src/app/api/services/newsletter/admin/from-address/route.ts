import { NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"
import { generateNewsletterFromAddress } from "@/_sharedServices/utils/siteExtractor"

export async function GET(request: NextRequest) {
  try {
    const authResult = await sharedServices._internal._nlVerify(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode || 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get("siteId")

    if (!siteId || siteId !== authResult.user?.siteId) {
      return NextResponse.json({ success: false, error: "ID du site invalide" }, { status: 400 })
    }

    try {
      const fromAddress = await sharedServices.sendgrid.getFromAddress(siteId)
      const env = process.env.NODE_ENV
      const note = env === "production"
        ? "En production, SendGrid fonctionne uniquement si le domaine est stocké et vérifié pour ce site."
        : env === "development"
          ? "Mode développement: vérification en cache."
          : undefined

      return NextResponse.json({ 
        success: true, 
        fromAddress,
        note,
        message: "Adresse d'expédition récupérée avec succès"
      })
    } catch (error) {
      // Fallback: generate an address using siteExtractor helper
      const fallback = await generateNewsletterFromAddress(siteId)
      return NextResponse.json({ 
        success: false, 
        error: "Site non trouvé",
        fromAddress: fallback
      }, { status: 404 })
    }
  } catch (error) {
    console.error("Erreur lors de la récupération de l'adresse d'expédition:", error)
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get("siteId")
    const fallback = siteId ? await generateNewsletterFromAddress(siteId) : "newsletter@hub.majoli.io"
    return NextResponse.json({ 
      success: false, 
      error: "Erreur serveur",
      fromAddress: fallback
    }, { status: 500 })
  }
}