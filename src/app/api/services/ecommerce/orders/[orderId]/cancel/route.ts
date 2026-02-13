import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Order } from "@/lib/models/order"
import { verifyUserAuthentication } from "@/_sharedServices/utils/newsletterAuth"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"
import { getStripeKeysFromDatabase } from "@/lib/utils/stripeKeys"
import Stripe from "stripe"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// POST /api/services/ecommerce/orders/[orderId]/cancel - Cancel order and process refund
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
        { success: false, error: "Vous n'êtes pas autorisé à annuler cette commande" },
        { status: 403 }
      )
    }

    // Check if order can be cancelled (not already cancelled/refunded, and not shipped/delivered)
    if (order.status === "Cancelled" || order.status === "Refunded") {
      return NextResponse.json(
        { success: false, error: "Cette commande est déjà annulée" },
        { status: 400 }
      )
    }

    if (order.status === "Shipped" || order.status === "Delivered") {
      return NextResponse.json(
        { success: false, error: "Impossible d'annuler une commande déjà expédiée ou livrée" },
        { status: 400 }
      )
    }

    // Check if payment was completed (need to refund)
    const needsRefund = order.paymentStatus === "Completed"
    
    let refundResult = null
    if (needsRefund) {
      try {
        // Get Stripe keys for this site
        const stripeKeys = await getStripeKeysFromDatabase(siteId)
        if (!stripeKeys.stripeSecretKey) {
          return NextResponse.json(
            { success: false, error: "Configuration Stripe non trouvée" },
            { status: 500 }
          )
        }

        const stripe = new Stripe(stripeKeys.stripeSecretKey, {
          apiVersion: "2024-11-20.acacia",
        })

        // Find the Stripe checkout session for this order
        // Search by metadata.orderId - use pagination to find all sessions
        let paymentIntentId: string | null = null
        let sessionId: string | null = null
        let hasMore = true
        let startingAfter: string | undefined = undefined

        // Search through all sessions (with pagination)
        while (hasMore && !paymentIntentId) {
          const sessions = await stripe.checkout.sessions.list({
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          })

          // Find session with matching orderId in metadata
          for (const session of sessions.data) {
            if (session.metadata?.orderId === orderId && session.payment_status === "paid") {
              sessionId = session.id
              // Get payment intent from session
              if (session.payment_intent) {
                paymentIntentId = typeof session.payment_intent === "string" 
                  ? session.payment_intent 
                  : session.payment_intent.id
              } else {
                // If no payment_intent, try to retrieve the full session with expanded payment_intent
                try {
                  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
                    expand: ['payment_intent'],
                  })
                  if (fullSession.payment_intent) {
                    paymentIntentId = typeof fullSession.payment_intent === "string"
                      ? fullSession.payment_intent
                      : (fullSession.payment_intent as Stripe.PaymentIntent).id
                  }
                } catch (error) {
                  console.error("Error retrieving full session:", error)
                }
              }
              break
            }
          }

          hasMore = sessions.has_more
          if (sessions.data.length > 0) {
            startingAfter = sessions.data[sessions.data.length - 1].id
          } else {
            hasMore = false
          }
        }

        // If no session found, try to find by charge ID (if stored in order)
        if (!paymentIntentId && (order as any).stripeChargeId) {
          try {
            const charge = await stripe.charges.retrieve((order as any).stripeChargeId)
            paymentIntentId = charge.payment_intent as string
          } catch (error) {
            console.error("Error retrieving charge:", error)
          }
        }

        if (paymentIntentId) {
          // Create refund via payment intent
          const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: Math.round(order.total * 100), // Convert to cents
            reason: "requested_by_customer",
          })

          refundResult = {
            refundId: refund.id,
            amount: refund.amount / 100, // Convert back to euros
            status: refund.status,
          }

          console.log(`[ecommerce] Refund created for order ${orderId}: ${refund.id}`)
        } else {
          // If we can't find payment intent, still cancel the order but log warning
          console.warn(`[ecommerce] Could not find Stripe payment intent for order ${orderId}. Order cancelled but refund may need manual processing.`)
        }
      } catch (refundError: any) {
        console.error("[ecommerce] Error processing refund:", refundError)
        // Still cancel the order even if refund fails (admin can handle manually)
        // But return error so user knows refund failed
        return NextResponse.json(
          { 
            success: false, 
            error: "Erreur lors du remboursement. Veuillez contacter le support.",
            details: refundError.message 
          },
          { status: 500 }
        )
      }
    }

    // Update order status
    const updateData: any = {
      status: "Cancelled",
    }

    if (needsRefund && refundResult) {
      updateData.paymentStatus = "Refunded"
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

    return NextResponse.json({
      success: true,
      message: needsRefund && refundResult 
        ? "Commande annulée et remboursement en cours" 
        : "Commande annulée",
      data: {
        order: updatedOrder,
        refund: refundResult,
      },
    })
  } catch (error: any) {
    console.error("[ecommerce] Error cancelling order:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erreur lors de l'annulation de la commande" },
      { status: 500 }
    )
  }
}

