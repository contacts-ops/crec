import { type NextRequest, NextResponse } from "next/server"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"
import { sharedServices } from "@/_sharedServices"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let siteId = extractSiteId(request)

    if (!siteId && body.siteId) {
      siteId = body.siteId
    }

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 })
    }

    const { orderId, amount, stripeToken, email } = body

    if (!orderId || !amount || !stripeToken) {
      return NextResponse.json({ error: "orderId, amount, and stripeToken are required" }, { status: 400 })
    }

    // Validate amount is in cents and at least $0.50
    if (amount < 50) {
      return NextResponse.json({ error: "Amount must be at least $0.50" }, { status: 400 })
    }

    if (typeof stripeToken !== "string" || !stripeToken.startsWith("tok_")) {
      return NextResponse.json({ error: "Invalid stripe token format" }, { status: 400 })
    }

    console.log("[ecommerce] Payment request - orderId:", orderId, "siteId:", siteId)

    // Get site-specific Stripe keys from database
    const stripeKeys = await sharedServices.ecommerce.getEcommerceStripeKeys(siteId)
    
    if (!stripeKeys.stripeSecretKey) {
      return NextResponse.json(
        { error: "Veuillez configurer votre environnement Stripe dans la section Configuration de l'admin e-commerce" },
        { status: 400 }
      )
    }

    // Create Stripe instance with site-specific key
    const siteStripe = new Stripe(stripeKeys.stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    })

    // Get order to verify it exists and payment is pending
    const orderResult = await sharedServices.ecommerce.getOrder(siteId, orderId)
    console.log("[ecommerce] getOrder result:", orderResult)

    if (!orderResult.success || !orderResult.data) {
      return NextResponse.json({ error: "Order not found", details: orderResult.error }, { status: 404 })
    }

    const order = orderResult.data
    if (order.paymentStatus === "Paid") {
      return NextResponse.json({ error: "Order already paid" }, { status: 400 })
    }

    if (order.total * 100 !== amount) {
      console.error(`[ecommerce] Amount mismatch: order total ${order.total * 100} !== request amount ${amount}`)
      return NextResponse.json({ error: "Amount does not match order total" }, { status: 400 })
    }

    // Create Stripe charge
    const charge = await siteStripe.charges.create({
      amount: amount, // Amount in cents
      currency: "eur",
      source: stripeToken,
      description: `Order ${orderId} for ${email}`,
      metadata: {
        orderId: orderId,
        siteId: siteId,
        email: email,
      },
    })

    if (charge.status !== "succeeded") {
      return NextResponse.json({ error: "Payment failed", chargeId: charge.id }, { status: 400 })
    }

    // Update order with payment info
    const updateResult = await sharedServices.ecommerce.updateOrder(siteId, orderId, {
      paymentStatus: "Paid",
      status: "Processing",
      stripeChargeId: charge.id,
      paidAt: new Date(),
    })

    if (!updateResult.success) {
      return NextResponse.json(
        { error: "Payment succeeded but order update failed", chargeId: charge.id },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Payment successful",
      orderId: orderId,
      chargeId: charge.id,
      order: updateResult.data,
    })
  } catch (error: any) {
    console.error("[ecommerce] Payment error:", error)

    // Check if it's a Stripe error
    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json({ error: `Stripe error: ${error.message}` }, { status: 400 })
    }

    return NextResponse.json({ error: error.message || "Payment processing failed" }, { status: 500 })
  }
}
