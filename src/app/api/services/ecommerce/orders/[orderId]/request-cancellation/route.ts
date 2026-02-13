import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Order } from "@/lib/models/order"
import { verifyUserAuthentication } from "@/_sharedServices/utils/newsletterAuth"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// POST /api/services/ecommerce/orders/[orderId]/request-cancellation - Request order cancellation (requires admin approval)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    
    // Verify user authentication
    const authResult = await verifyUserAuthentication(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Non autorisé" },
        { status: authResult.statusCode || 401 }
      )
    }

    const siteId = extractSiteId(request)
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

    // Verify user owns this order (check by email or userId)
    const userEmail = authResult.user?.email?.toLowerCase()
    const userId = authResult.user?.userId
    
    if (order.email.toLowerCase() !== userEmail && order.userId?.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: "Vous n'êtes pas autorisé à demander l'annulation de cette commande" },
        { status: 403 }
      )
    }

    // Check if order can have cancellation requested
    if (order.status === "Cancelled" || order.status === "Refunded") {
      return NextResponse.json(
        { success: false, error: "Cette commande est déjà annulée" },
        { status: 400 }
      )
    }

    if (order.status === "Shipped" || order.status === "Delivered") {
      return NextResponse.json(
        { success: false, error: "Impossible de demander l'annulation d'une commande déjà expédiée ou livrée" },
        { status: 400 }
      )
    }

    if (order.status === "CancellationRequested") {
      return NextResponse.json(
        { success: false, error: "Une demande d'annulation est déjà en cours pour cette commande" },
        { status: 400 }
      )
    }

    // Get cancellation reason from request body (optional)
    const body = await request.json().catch(() => ({}))
    const cancellationReason = body.reason || ""

    // Update order status to CancellationRequested
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { 
        $set: { 
          status: "CancellationRequested",
          notes: cancellationReason 
            ? `${order.notes || ""}\n\n[Demande d'annulation] ${cancellationReason}`.trim()
            : `${order.notes || ""}\n\n[Demande d'annulation soumise]`.trim()
        }
      },
      { new: true }
    )

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: "Erreur lors de la mise à jour de la commande" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Demande d'annulation soumise. Un administrateur va examiner votre demande et vous contactera sous peu.",
      data: {
        order: updatedOrder,
      },
    })
  } catch (error: any) {
    console.error("[ecommerce] Error requesting cancellation:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erreur lors de la demande d'annulation" },
      { status: 500 }
    )
  }
}

