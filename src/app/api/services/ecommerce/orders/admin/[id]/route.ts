import { type NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"

// GET /api/services/ecommerce/orders/admin/[id] - Get single order
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const result = await sharedServices.ecommerce.getOrder(siteId, params.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("[ecommerce] Error fetching order:", error)
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}

// PUT /api/services/ecommerce/orders/admin/[id] - Update order
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await sharedServices._internal._nlVerify(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const body = await request.json()

    let siteId = extractSiteId(request)
    if (!siteId) {
      siteId = authResult.siteId
    }

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 })
    }

    const result = await sharedServices.ecommerce.updateOrder(siteId, params.id, body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("[ecommerce] Error updating order:", error)
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}

// DELETE /api/services/ecommerce/orders/admin/[id] - Delete order
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    const result = await sharedServices.ecommerce.deleteOrder(siteId, params.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ecommerce] Error deleting order:", error)
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 })
  }
}
