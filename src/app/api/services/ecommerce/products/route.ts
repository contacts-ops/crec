import { type NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"

// GET /api/services/ecommerce/products - List products (public)
export async function GET(request: NextRequest) {
  try {
    let siteId = extractSiteId(request) 

    if (!siteId)  {
      const { searchParams } = new URL(request.url)
      siteId = searchParams.get("siteId") || null
    }

    if (!siteId) {
      return NextResponse.json({ error: "siteId est requis" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      category: searchParams.get("category") || undefined,
      tag: searchParams.get("tag") || undefined,
      minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
      maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
      inStock: searchParams.get("inStock") === "true" ? true : undefined,
      search: searchParams.get("search") || undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      offset: searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined,
    }

    const result = await sharedServices.ecommerce.listProducts(siteId, filters)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("[ecommerce] Error listing products:", error)
    return NextResponse.json({ error: "Failed to list products" }, { status: 500 })
  }
}
