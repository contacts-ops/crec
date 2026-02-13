import { type NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"
import { error } from "console"

// GET /api/services/ecommerce/products/admin/[id] - Get single product (admin)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await sharedServices._internal._nlVerify(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { id } = await params

    let siteId = extractSiteId(request)
    if (!siteId) {
      siteId = authResult.siteId
    }

    const result = await sharedServices.ecommerce.getProduct(siteId, id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("[ecommerce] Error getting product:", error)
    return NextResponse.json({ error: "Failed to get product" }, { status: 500 })
  }
}

// PUT /api/services/ecommerce/products/admin/[id] - Update product (admin)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await sharedServices._internal._nlVerify(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { id } = await params

    let siteId = extractSiteId(request)

    console.log("stiteiddddddd", siteId)
    if (!siteId) {
      siteId = authResult.siteId
    }

    const body = await request.json()
    const result = await sharedServices.ecommerce.updateProduct(siteId, id, body)

    if (!result.success) {
      console.log("this is the error:", result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("[ecommerce] Error updating product:", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

// DELETE /api/services/ecommerce/products/admin/[id] - Delete product (admin)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await sharedServices._internal._nlVerify(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { id } = await params

    let siteId = extractSiteId(request)
    if (!siteId) {
      siteId = authResult.siteId
    }

    const result = await sharedServices.ecommerce.deleteProduct(siteId, id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ecommerce] Error deleting product:", error)
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}
