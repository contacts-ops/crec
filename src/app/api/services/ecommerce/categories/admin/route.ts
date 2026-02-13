import { type NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"

// GET /api/services/ecommerce/categories/admin - List all categories (admin)
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
    const parentId = searchParams.get("parentId") ?? searchParams.get("parent") ?? undefined
    const topLevelOnly = searchParams.get("topLevelOnly") === "true"
    const filters = {
      parentId,
      topLevelOnly: topLevelOnly || undefined,
      search: searchParams.get("search") || undefined,
    }

    const result = await sharedServices.ecommerce.listCategories(siteId, filters)

    return NextResponse.json({ data: result.data })
  } catch (error: any) {
    console.error("[ecommerce] Error listing categories:", error)
    return NextResponse.json({ error: "Failed to list categories" }, { status: 500 })
  }
}

// POST /api/services/ecommerce/categories/admin - Create category (admin)
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

    console.log("this is the body: ", body)

    const result = await sharedServices.ecommerce.createCategory(siteId, body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error: any) {
    console.error("[ecommerce] Error creating category:", error)

    const statusCode = error.statusCode || 500
    const message = error.message || "Failed to create category"

    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
