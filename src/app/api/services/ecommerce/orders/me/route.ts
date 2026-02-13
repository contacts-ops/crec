import { type NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"

// GET /api/services/ecommerce/orders/me - List orders for authenticated customer
// If siteId is provided (via header or query param), filter by siteId, otherwise, return all orders across all sites
export async function GET(request: NextRequest) {
  try {
    // Auth utilisateur via sharedServices
    const authResponse = await fetch(new URL("/api/sharedServices/auth/me", request.url), {
      headers: request.headers,
      cache: "no-store",
    })

    if (!authResponse.ok) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = await authResponse.json()
    const customerEmail = user?.email

    if (!customerEmail) {
      return NextResponse.json({ error: "Email utilisateur introuvable" }, { status: 400 })
    }

    // Extract siteId from header or query param
    let siteId = extractSiteId(request)
    const { searchParams } = new URL(request.url)
    if (!siteId && searchParams.get("siteId")) {
      siteId = searchParams.get("siteId")
    }

    const { connectToDatabase } = await import("@/lib/db")
    await connectToDatabase()

    const { Order } = await import("@/lib/models/order")

    // Build query - filter by email and optionally by siteId
    const query: any = { 
      email: customerEmail.toLowerCase() 
    }

    if (siteId) {
      query.siteId = siteId
    }

    // Find orders matching the query, sorted by creation date (newest first)
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(100) // Limit to 100 most recent orders
      .lean()

    // Transform orders to match expected format
    const transformedOrders = orders.map((order: any) => ({
      _id: order._id.toString(),
      siteId: order.siteId,
      email: order.email,
      status: order.status || "Pending",
      paymentStatus: order.paymentStatus || "Pending",
      total: order.total,
      items: order.items || [],
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      shippingCost: order.shippingCost || 0,
      deliveryMethod: order.deliveryMethod,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }))

    return NextResponse.json({ orders: transformedOrders })
  } catch (error: any) {
    console.error("[ecommerce] Error listing customer orders:", error)
    console.error("[ecommerce] Error details:", error.message, error.stack)
    return NextResponse.json({ error: error.message || "Failed to list orders" }, { status: 500 })
  }
}

