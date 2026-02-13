import { type NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"

// GET /api/services/ecommerce/products/admin - List all products (admin)
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

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error("[ecommerce] Error listing products:", error)
    return NextResponse.json({ error: "Failed to list products" }, { status: 500 })
  }
}

// POST /api/services/ecommerce/products/admin - Create product (admin)
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
    console.log(siteId)
    if (!siteId) {
      siteId = authResult.siteId
    }

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 })
    }

    const result = await sharedServices.ecommerce.createProduct(siteId, body)
    console.log("this is the result", result)
    console.log("this is the body", body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    console.log("this is the result data: ", result.data)

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error("[ecommerce] Error creating product:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
