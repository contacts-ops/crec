import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Cart } from "@/lib/models/cart"
import { Site } from "@/lib/models/Site"
import { sharedServices } from "@/_sharedServices"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"
import { verifyUserAuthentication } from "@/_sharedServices/utils/newsletterAuth"
import { computeShippingCost, normalizeDeliveryOptions } from "@/_sharedServices/utils/deliveryShipping"

// POST /api/services/ecommerce/checkout/create-order - Create order from cart
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyUserAuthentication(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode || 401 })
    }

    const body = await request.json()
    const { shippingAddress, billingAddress, deliveryMethod, email, notes } = body

    let siteId = extractSiteId(request)
    if (!siteId && body.siteId) {
      siteId = body.siteId
    }

    if (!siteId) {
      return NextResponse.json({ success: false, error: "siteId is required" }, { status: 400 })
    }

    // Get email from auth or body
    const userEmail = authResult.user?.email || email

    // Validate required fields
    if (!shippingAddress || !billingAddress || !deliveryMethod || !userEmail) {
      return NextResponse.json(
        { success: false, error: "Adresse de livraison, adresse de facturation, méthode de livraison et email sont requis" },
        { status: 400 }
      )
    }

    if (
      !shippingAddress.nom ||
      !shippingAddress.prenom ||
      !shippingAddress.address ||
      !shippingAddress.city ||
      !shippingAddress.zipCode
    ) {
      return NextResponse.json(
        { success: false, error: "Adresse de livraison incomplète" },
        { status: 400 }
      )
    }

    if (
      !billingAddress.nom ||
      !billingAddress.prenom ||
      !billingAddress.address ||
      !billingAddress.city ||
      !billingAddress.zipCode
    ) {
      return NextResponse.json(
        { success: false, error: "Adresse de facturation incomplète" },
        { status: 400 }
      )
    }

    await connectToDatabase()

    // Get user's cart - try userId first, then sessionId (for cart migration)
    let cart = await Cart.findOne({ userId: authResult.user?.userId }).populate("items.productId")

    // If no cart found with userId, try to find guest cart by sessionId and migrate it
    if (!cart) {
      const sessionId = request.cookies.get("guest_session_id")?.value
      if (sessionId) {
        cart = await Cart.findOne({ sessionId }).populate("items.productId")
        // Migrate guest cart to user cart
        if (cart && authResult.user?.userId) {
          cart.userId = authResult.user.userId as any
          cart.sessionId = undefined
          await cart.save()
        }
      }
    }

    if (!cart) {
      return NextResponse.json({ success: false, error: "Le panier est vide ou introuvable" }, { status: 400 })
    }

    if (!cart.items || cart.items.length === 0) {
      return NextResponse.json({ success: false, error: "Le panier est vide" }, { status: 400 })
    }

    if (!cart._id) {
      return NextResponse.json({ success: false, error: "Erreur: Panier invalide" }, { status: 400 })
    }

    // Create order using ecommerceService (shipping cost is calculated inside)
    const checkoutResult = await sharedServices.ecommerce.checkout({
      cartId: cart._id.toString(),
      siteId,
      shippingAddress,
      billingAddress,
      deliveryMethod,
      email: userEmail,
      userId: authResult.user?.userId,
    })

    if (!checkoutResult.success) {
      return NextResponse.json({ success: false, error: checkoutResult.error }, { status: 400 })
    }

    const order = checkoutResult.data

    // Update order with notes if provided
    if (notes) {
      const updateResult = await sharedServices.ecommerce.updateOrder(siteId, order.id, {
        notes: notes,
      })

      if (!updateResult.success) {
        console.error("Failed to update order with notes:", updateResult.error)
      }
    }

    // Compute shipping cost from site delivery options (server-side, tamper-proof)
    const site = await Site.findOne({ siteId }).lean()
    const deliveryOptions = site?.ecommerce?.delivery
      ? normalizeDeliveryOptions((site as any).ecommerce.delivery)
      : null
    const itemCount = cart.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
    const shippingCost = computeShippingCost(deliveryOptions, deliveryMethod, itemCount)

    // Calculate totals for Stripe
    const subtotal = cart.total
    const tax = (subtotal + shippingCost) * 0.2 // 20% VAT
    const total = subtotal + shippingCost + tax

    // Create Stripe checkout session for payment
    // Include product items with exact prices from cart (to prevent price tampering)
    const checkoutItems = cart.items.map((item: any) => ({
      productId: item.productId._id.toString(),
      quantity: item.quantity,
      price: item.price, // Use exact price from cart, not from product
      variantId: item.variantId || undefined,
    }))

    // Get origin from request to construct proper URLs
    // Check if the request came from a URL with /sites/{siteId}/ pattern
    const referer = request.headers.get("referer") || request.headers.get("origin") || ""
    let baseUrl = process.env.FRONTEND_URL || "http://localhost:3000"
    let includeSiteId = false

    // Try to extract origin from referer
    try {
      if (referer) {
        const refererUrl = new URL(referer)
        baseUrl = `${refererUrl.protocol}//${refererUrl.host}`
        // Check if referer includes /sites/{siteId}/ pattern
        if (refererUrl.pathname.includes(`/sites/${siteId}/`)) {
          includeSiteId = true
        }
      }
    } catch (error) {
      // Fallback to checking if baseUrl is localhost
      if (baseUrl.includes("localhost")) {
        includeSiteId = true
      }
    }

    // Construct success and cancel URLs - redirect to checkout page with status
    // In development with siteId: /sites/{siteId}/checkout?payment=success&orderId=...
    // In production: /checkout?payment=success&orderId=...
    const successUrl = includeSiteId
      ? `${baseUrl}/sites/${siteId}/checkout?payment=success&orderId=${order.id}`
      : `${baseUrl}/checkout?payment=success&orderId=${order.id}`
    const cancelUrl = includeSiteId
      ? `${baseUrl}/sites/${siteId}/checkout?payment=cancel`
      : `${baseUrl}/checkout?payment=cancel`

    const checkoutSessionResult = await sharedServices.ecommerce.createCheckoutSession(
      siteId,
      checkoutItems,
      {
        email: userEmail,
        userId: authResult.user?.userId,
        orderId: order.id,
        successUrl: successUrl,
        cancelUrl: cancelUrl,
        shippingCost: shippingCost, // Pass shipping cost to include in Stripe session
        tax: tax,
      }
    )

    if (!checkoutSessionResult.success) {
      // Order created but payment session failed - return order anyway
      console.error("Failed to create checkout session:", checkoutSessionResult.error)
      return NextResponse.json({
        success: true,
        data: {
          order,
          payment: {
            sessionId: null,
            url: null,
            error: checkoutSessionResult.error,
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        order,
        payment: checkoutSessionResult.data,
      },
    })
  } catch (error) {
    console.error("[ecommerce] Error creating order from checkout:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création de la commande" },
      { status: 500 }
    )
  }
}

