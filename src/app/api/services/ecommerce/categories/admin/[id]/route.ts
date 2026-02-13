import { type NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"

// GET /api/services/ecommerce/categories/admin/[id] - Get single category (admin)
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

    const result = await sharedServices.ecommerce.getCategory(siteId, id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("[ecommerce] Error getting category:", error)
    return NextResponse.json({ error: "Failed to get category" }, { status: 500 })
  }
}

// PUT /api/services/ecommerce/categories/admin/[id] - Update category (admin)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await request.json()
    const result = await sharedServices.ecommerce.updateCategory(siteId, id, body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("[ecommerce] Error updating category:", error)
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

// DELETE /api/services/ecommerce/categories/admin/[id] - Delete category (admin)
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

    const result = await sharedServices.ecommerce.deleteCategory(siteId, id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ecommerce] Error deleting category:", error)
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}
