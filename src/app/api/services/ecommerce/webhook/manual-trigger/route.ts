import { type NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"
import Stripe from "stripe"

// POST /api/services/ecommerce/webhook/manual-trigger - Manually trigger webhook processing for a checkout session
// This is useful if the webhook didn't fire or failed
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, orderId } = body

    if (!sessionId && !orderId) {
      return NextResponse.json(
        { error: "sessionId or orderId is required" },
        { status: 400 }
      )
    }

    let siteId = extractSiteId(request)
    const { searchParams } = new URL(request.url)
    if (!siteId && searchParams.get("siteId")) {
      siteId = searchParams.get("siteId")
    }

    if (!siteId) {
      return NextResponse.json(
        { error: "siteId is required" },
        { status: 400 }
      )
    }

    // Get site-specific Stripe keys
    const stripeKeys = await sharedServices.ecommerce.getEcommerceStripeKeys(siteId)
    if (!stripeKeys.stripeSecretKey) {
      return NextResponse.json(
        { error: "Stripe keys not configured for this site" },
        { status: 400 }
      )
    }

    const siteStripe = new Stripe(stripeKeys.stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    })

    // Retrieve the checkout session
    let session: Stripe.Checkout.Session
    if (sessionId) {
      session = await siteStripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent']
      })
    } else {
      // If only orderId provided, we need to find the session
      // This is more complex - for now, require sessionId
      return NextResponse.json(
        { error: "sessionId is required when orderId is not provided" },
        { status: 400 }
      )
    }

    // Check if payment was successful
    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: `Payment status is ${session.payment_status}, not paid` },
        { status: 400 }
      )
    }

    // Manually trigger the checkout.completed handler
    console.log(`[ecommerce/webhook/manual-trigger] Manually processing session: ${session.id}`)
    await (sharedServices.ecommerce as any).handleCheckoutCompleted(session, siteId)

    return NextResponse.json({
      success: true,
      message: "Checkout session processed successfully",
      sessionId: session.id,
      orderId: session.metadata?.orderId,
    })
  } catch (error: any) {
    console.error("[ecommerce/webhook/manual-trigger] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to process checkout session",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

