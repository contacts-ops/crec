import { type NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"
import { verifyUserAuthentication } from "@/_sharedServices/utils/newsletterAuth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/services/ecommerce/invoices/me - List invoices for authenticated customer
// Uses e-commerce module authentication and site-specific Stripe keys
export async function GET(request: NextRequest) {
  try {
    // Verify user authentication using e-commerce auth
    const authResult = await verifyUserAuthentication(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Non authentifié" },
        { status: authResult.statusCode || 401 }
      )
    }

    const userEmail = authResult.user?.email
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: "Email utilisateur introuvable" },
        { status: 400 }
      )
    }

    // Extract siteId from header or query param
    let siteId = extractSiteId(request)
    const { searchParams } = new URL(request.url)
    if (!siteId && searchParams.get("siteId")) {
      siteId = searchParams.get("siteId")
    }

    if (!siteId) {
      return NextResponse.json(
        { success: false, error: "siteId is required" },
        { status: 400 }
      )
    }

    // Get invoices using e-commerce service
    const invoiceResult = await sharedServices.ecommerce.getCustomerInvoices(siteId, userEmail)

    if (!invoiceResult.success) {
      return NextResponse.json(
        { success: false, error: invoiceResult.error || "Erreur lors de la récupération des factures" },
        { status: 500 }
      )
    }

    // Calculate statistics
    const invoices = invoiceResult.data || []
    const stats = {
      total: invoices.length,
      totalAmount: invoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0),
      paid: invoices.filter((inv: any) => inv.status === "paid").length,
      pending: invoices.filter((inv: any) => inv.status === "pending").length,
      overdue: invoices.filter((inv: any) => inv.status === "overdue").length,
    }

    return NextResponse.json({
      success: true,
      invoices: invoices,
      stats: stats,
    })
  } catch (error: any) {
    console.error("[ecommerce] Error listing customer invoices:", error)
    console.error("[ecommerce] Error details:", error.message, error.stack)
    return NextResponse.json(
      { success: false, error: error.message || "Erreur lors de la récupération des factures" },
      { status: 500 }
    )
  }
}

