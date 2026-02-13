import { type NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"

// GET /api/services/ecommerce/orders/admin - List all orders (admin)
export async function GET(request: NextRequest) {
  try {
    const authResult = await sharedServices._internal._nlVerify(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    let siteId = extractSiteId(request)
    if (!siteId) {
      siteId = authResult.siteId
    }

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      offset: searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined,
    }

    const result = await sharedServices.ecommerce.listOrders(siteId, filters)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("[ecommerce] Error listing orders:", error)
    return NextResponse.json({ error: "Failed to list orders" }, { status: 500 })
  }
}

// POST /api/services/ecommerce/orders/admin - Create order (admin)
export async function POST(request: NextRequest) {
  try {
    const authResult = await sharedServices._internal._nlVerify(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const body = await request.json()

    let siteId = extractSiteId(request)
    if (!siteId && body.siteId) {
      siteId = body.siteId
    }

    if (!siteId) {
      siteId = authResult.siteId
    }

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 })
    }

    const result = await sharedServices.ecommerce.createOrder(siteId, body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error("[ecommerce] Error creating order:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
