import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Order } from "@/lib/models/order"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"
import { sharedServices } from "@/_sharedServices"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// POST /api/services/ecommerce/orders/[orderId]/approve-cancellation - Admin approves cancellation and processes refund
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    
    // Verify admin authentication
    const authResult = await sharedServices._internal._nlVerify(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Non autorisé" },
        { status: authResult.statusCode || 401 }
      )
    }

    let siteId = extractSiteId(request)
    if (!siteId) {
      siteId = authResult.siteId
    }
    if (!siteId) {
      return NextResponse.json(
        { success: false, error: "Site ID requis" },
        { status: 400 }
      )
    }

    await connectToDatabase()

    // Find the order
    const order = await Order.findOne({ _id: orderId, siteId })
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Commande non trouvée" },
        { status: 404 }
      )
    }

    // Check if order has cancellation requested
    if (order.status !== "CancellationRequested") {
      return NextResponse.json(
        { success: false, error: "Cette commande n'a pas de demande d'annulation en attente" },
        { status: 400 }
      )
    }

    // Update order status to Cancelled (but keep paymentStatus unchanged - admin will handle refund manually)
    // This gives admin full control over refund processing
    const updateData: any = {
      status: "Cancelled",
      // Keep paymentStatus as is - admin will manually change it to "Refunded" after processing refund in Stripe
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      { new: true }
    )

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: "Erreur lors de la mise à jour de la commande" },
        { status: 500 }
      )
    }

    // Check if payment was completed (to show admin message)
    const needsRefund = updatedOrder.paymentStatus === "Completed"
    
    return NextResponse.json({
      success: true,
      message: needsRefund
        ? "Annulation approuvée. Veuillez traiter le remboursement manuellement dans Stripe, puis mettre à jour le statut de paiement à 'Remboursé'."
        : "Annulation approuvée",
      data: {
        order: updatedOrder,
        needsManualRefund: needsRefund,
      },
    })
  } catch (error: any) {
    console.error("[ecommerce] Error approving cancellation:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erreur lors de l'approbation de l'annulation" },
      { status: 500 }
    )
  }
}

