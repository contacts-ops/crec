import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Site } from "@/lib/models/Site"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"
import { normalizeDeliveryOptions } from "@/_sharedServices/utils/deliveryShipping"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"


export async function GET(request: NextRequest) {
  try {
    let siteId = extractSiteId(request)
    console.log("siteId, from GET: ", siteId)
    const { searchParams } = new URL(request.url)
    if (!siteId && searchParams.get("siteId")) {
      siteId = searchParams.get("siteId")
    }

    if (!siteId) {
      return NextResponse.json({ success: false, error: "siteId est requis" }, { status: 400 })
    }

    await connectToDatabase()

    const site = await Site.findOne({ siteId }).lean()
    if (!site) {
      return NextResponse.json({ success: false, error: "Site non trouvé" }, { status: 404 })
    }

    const raw = (site as any).ecommerce?.delivery
    const delivery = normalizeDeliveryOptions(raw ? (raw as Record<string, unknown>) : undefined)
    const ecommerce = (site as any).ecommerce || {}
    const priceMode = ecommerce.priceMode === "TTC" ? "TTC" : "HT"
    const vatRate = typeof ecommerce.vatRate === "number" ? ecommerce.vatRate : 0.2

    return NextResponse.json({
      success: true,
      priceMode,
      vatRate,
      delivery: {
        standardBase: delivery.standardBase,
        standardPerItem: delivery.standardPerItem,
        expressBase: delivery.expressBase,
        expressPerItem: delivery.expressPerItem,
        pickupCost: delivery.pickupCost,
        deliveryOptionsTitle: delivery.deliveryOptionsTitle ?? undefined,
        standardDelivery: delivery.standardDelivery ?? undefined,
        standardPrice: delivery.standardPrice ?? undefined,
        standardDelay: delivery.standardDelay ?? undefined,
        expressDelivery: delivery.expressDelivery ?? undefined,
        expressPrice: delivery.expressPrice ?? undefined,
        expressDelay: delivery.expressDelay ?? undefined,
        pickupLabel: delivery.pickupLabel ?? undefined,
        pickupDelay: delivery.pickupDelay ?? undefined,
      },
    })
  } catch (error: any) {
    console.error("[ecommerce/settings/delivery] GET error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erreur lors de la récupération des options de livraison" },
      { status: 500 }
    )
  }
}
