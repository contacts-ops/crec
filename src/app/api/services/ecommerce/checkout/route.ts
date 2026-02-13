import { type NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"

// POST /api/services/ecommerce/checkout - Create Stripe checkout session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    let siteId = extractSiteId(request)
    if (!siteId && body.siteId) {
      siteId = body.siteId
    }

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 })
    }

    const { items, metadata } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 })
    }

    const result = await sharedServices.ecommerce.createCheckoutSession(siteId, items, metadata)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("[ecommerce] Error creating checkout session:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
