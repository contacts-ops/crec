import { type NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"


// GET /api/services/ecommerce/products/[id] - Get single product (public)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    let siteId = searchParams.get("siteId")
    if (!siteId){
      siteId = extractSiteId(request)
      console.log(siteId)
    } 

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 })
    }

    const result = await sharedServices.ecommerce.getProduct(siteId, params.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("[ecommerce] Error getting product:", error)
    return NextResponse.json({ error: "Failed to get product" }, { status: 500 })
  }
}
