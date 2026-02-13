import { type NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"


// POST /api/services/ecommerce/products/admin/[id]/sync-stripe - Sync product to Stripe (admin)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await sharedServices._internal._nlVerify(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }
        
    

    let siteId = extractSiteId(request)
    if (!siteId) {
      siteId = authResult.siteId
    }

    const { id } = await params

    const result = await sharedServices.ecommerce.syncProductToStripe(siteId, id)
    console.log(id)

    if (!result.success) {

      console.log(result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("[ecommerce] Error syncing product to Stripe:", error)
    return NextResponse.json({ error: "Failed to sync product to Stripe" }, { status: 500 })
  }
}
