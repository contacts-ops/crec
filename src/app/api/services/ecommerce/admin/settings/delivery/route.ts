import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Site } from "@/lib/models/Site"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"
import { sharedServices } from "@/_sharedServices"
import { normalizeDeliveryOptions } from "@/_sharedServices/utils/deliveryShipping"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/services/ecommerce/admin/settings/delivery - Get delivery options (admin)
export async function GET(request: NextRequest) {
  try {
    const authResult = await sharedServices._internal._nlVerify(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }

    let siteId = extractSiteId(request)
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

    return NextResponse.json({
      success: true,
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
    console.error("[ecommerce/admin/settings/delivery] GET error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erreur lors de la récupération des options de livraison" },
      { status: 500 }
    )
  }
}

// POST /api/services/ecommerce/admin/settings/delivery - Save delivery options (admin)
export async function POST(request: NextRequest) {
  try {
    const authResult = await sharedServices._internal._nlVerify(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }

    let siteId = extractSiteId(request)
    const body = await request.json().catch(() => ({}))
    if (!siteId && body.siteId) {
      siteId = body.siteId
    }

    if (!siteId) {
      return NextResponse.json({ success: false, error: "siteId est requis" }, { status: 400 })
    }

    const {
      standardBase,
      standardPerItem,
      expressBase,
      expressPerItem,
      pickupCost,
      deliveryOptionsTitle,
      standardDelivery,
      standardPrice,
      standardDelay,
      expressDelivery,
      expressPrice,
      expressDelay,
      pickupLabel,
      pickupDelay,
    } = body

    // Validate numeric fields
    const num = (v: unknown, defaultVal: number): number =>
      typeof v === "number" && !Number.isNaN(v) && v >= 0 ? v : defaultVal

    const delivery = {
      standardBase: num(standardBase, 160),
      standardPerItem: num(standardPerItem, 80),
      expressBase: num(expressBase, 300),
      expressPerItem: num(expressPerItem, 160),
      pickupCost: num(pickupCost, 0),
      deliveryOptionsTitle: typeof deliveryOptionsTitle === "string" ? deliveryOptionsTitle : undefined,
      standardDelivery: typeof standardDelivery === "string" ? standardDelivery : undefined,
      standardPrice: typeof standardPrice === "string" ? standardPrice : undefined,
      standardDelay: typeof standardDelay === "string" ? standardDelay : undefined,
      expressDelivery: typeof expressDelivery === "string" ? expressDelivery : undefined,
      expressPrice: typeof expressPrice === "string" ? expressPrice : undefined,
      expressDelay: typeof expressDelay === "string" ? expressDelay : undefined,
      pickupLabel: typeof pickupLabel === "string" ? pickupLabel : undefined,
      pickupDelay: typeof pickupDelay === "string" ? pickupDelay : undefined,
    }

    await connectToDatabase()

    const site = await Site.findOne({ siteId })
    if (!site) {
      return NextResponse.json({ success: false, error: "Site non trouvé" }, { status: 404 })
    }

    const existingEcommerce = (site.ecommerce || {}) as Record<string, unknown>
    const updatedEcommerce = {
      ...existingEcommerce,
      delivery,
    }

    await Site.findOneAndUpdate(
      { siteId },
      { $set: { ecommerce: updatedEcommerce, lastUpdated: new Date() } },
      { new: true }
    )

    return NextResponse.json({
      success: true,
      message: "Options de livraison enregistrées",
      delivery,
    })
  } catch (error: any) {
    console.error("[ecommerce/admin/settings/delivery] POST error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erreur lors de l'enregistrement des options de livraison" },
      { status: 500 }
    )
  }
}
