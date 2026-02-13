import { type NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"

// GET /api/services/ecommerce/categories/[id] - Get single category (public)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    let siteId = extractSiteId(request)

    if (!siteId) {
      const { searchParams } = new URL(request.url)
      siteId = searchParams.get("siteId") || null
    }

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 })
    }

    const result = await sharedServices.ecommerce.getCategory(siteId, params.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("[ecommerce] Error getting category:", error)
    return NextResponse.json({ error: "Failed to get category" }, { status: 500 })
  }
}
