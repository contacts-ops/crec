import { type NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"
import { error } from "console"

// GET /api/services/ecommerce/categories - List categories (public)
export async function GET(request: NextRequest) {
  try {
    let siteId = extractSiteId(request)
    console.log("this is the siteid", siteId)

    if (!siteId) {
      const { searchParams } = new URL(request.url)
      siteId = searchParams.get("siteId") || null
    }

    if (!siteId) {
      console.log("this is the error ", error)
      return NextResponse.json({ error: "siteId is required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get("parentId") ?? undefined
    const topLevelOnly = searchParams.get("topLevelOnly") === "true"
    const filters = {
      parentId,
      topLevelOnly: topLevelOnly || undefined,
      search: searchParams.get("search") || undefined,
    }

    const result = await sharedServices.ecommerce.listCategories(siteId, filters)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("[ecommerce] Error listing categories:", error)
    return NextResponse.json({ error: "Failed to list categories" }, { status: 500 })
  }
}
