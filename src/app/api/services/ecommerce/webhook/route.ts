import { type NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"

// Disable body parsing - we need the raw body for Stripe signature verification
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// POST /api/services/ecommerce/webhook - Handle Stripe webhooks
export async function POST(request: NextRequest) {
  try {
    console.log("[ecommerce/webhook] Webhook received")
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      console.error("[ecommerce/webhook] Missing stripe-signature header")
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
    }

    
    const rawBody = await request.text()
    
    if (!rawBody || rawBody.length === 0) {
      console.error("[ecommerce/webhook] Empty request body")
      return NextResponse.json({ error: "Empty request body" }, { status: 400 })
    }

    // Try to extract siteId from request headers or query params
    const siteId = request.headers.get("x-site-id") || new URL(request.url).searchParams.get("siteId")
    console.log(`[ecommerce/webhook] Processing webhook for siteId: ${siteId || "not provided"}`)
    
    const result = await sharedServices.ecommerce.handleStripeWebhook(rawBody, signature, siteId || undefined)

    if (!result.success) {
      console.error(`[ecommerce/webhook] Webhook handling failed: ${result.error}`)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    console.log("[ecommerce/webhook] Webhook processed successfully")
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[ecommerce/webhook] Error handling webhook:", error)
    console.error("[ecommerce/webhook] Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json({ 
      error: "Webhook handler failed",
      details: error?.message || "Unknown error"
    }, { status: 500 })
  }
}
