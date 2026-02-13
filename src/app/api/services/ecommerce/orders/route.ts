import { type NextRequest, NextResponse } from "next/server"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"
import jwt from "jsonwebtoken"
import { connectToDatabase } from "@/lib/db"
import { Utilisateur } from "@/lib/models/Utilisateur"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/services/ecommerce/orders - List orders for authenticated customer
export async function GET(request: NextRequest) {
  try {
    // Auth utilisateur via JWT token (same as /api/sharedServices/auth/me)
    const token = request.cookies.get("utilisateur_token")?.value
    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Verify JWT token
    let payload: any
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!)
    } catch {
      return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 401 })
    }

    // Get user from database
    await connectToDatabase()
    const user = await Utilisateur.findById(payload.userId).select("-password").lean()

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    const customerEmail = user.email
    if (!customerEmail) {
      return NextResponse.json({ error: "Email utilisateur introuvable" }, { status: 400 })
    }

    // Extract siteId - prioritize query param, then header, then extractSiteId
    const { searchParams } = new URL(request.url)
    let siteId = searchParams.get("siteId") // Query param takes priority
    if (!siteId) {
      siteId = request.headers.get("x-site-id") // Then try header
    }
    if (!siteId) {
      siteId = extractSiteId(request) // Finally try extractSiteId
    }

    console.log(`[ecommerce/orders] Extracted siteId:`, { 
      fromQuery: searchParams.get("siteId"),
      fromHeader: request.headers.get("x-site-id"),
      fromExtract: extractSiteId(request),
      final: siteId
    })

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 })
    }

    // Validate siteId - reject invalid values like "localhost:3000" or hostnames
    if (siteId.includes("localhost") || siteId.match(/^[a-z0-9.-]+:\d+$/)) {
      console.error(`[ecommerce/orders] Invalid siteId detected: ${siteId}. This appears to be a hostname instead of a siteId.`)
      return NextResponse.json({ 
        error: "Invalid siteId. Please ensure the siteId is passed correctly in the query parameter or header." 
      }, { status: 400 })
    }

    // Import Order model dynamically
    const { Order } = await import("@/lib/models/order")

    // Build query - filter by email and siteId
    const query: any = {
      email: customerEmail.toLowerCase(),
      siteId: siteId,
    }

    console.log(`[ecommerce/orders] Searching for orders with email: ${customerEmail.toLowerCase()}, siteId: ${siteId}`)

    // Apply filters
    const status = searchParams.get("status")
    if (status) {
      query.status = status
    }

    const search = searchParams.get("search")
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { "shippingAddress.nom": { $regex: search, $options: "i" } },
        { "shippingAddress.prenom": { $regex: search, $options: "i" } },
      ]
    }

    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 100
    const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0

    // Find orders matching the query, sorted by creation date (newest first)
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean()

    console.log(`[ecommerce/orders] Found ${orders.length} order(s) matching query`)
    
    // Debug: Check if there are any orders with different email casing
    if (orders.length === 0) {
      const allOrdersForSite = await Order.find({ siteId }).limit(5).select("email").lean()
      console.log(`[ecommerce/orders] Debug: Found ${allOrdersForSite.length} total order(s) for this siteId. Sample emails:`, allOrdersForSite.map((o: any) => o.email))
    }

    // Transform orders to match expected format
    const transformedOrders = orders.map((order: any) => ({
      _id: order._id?.toString() || null,
      id: order._id?.toString() || null,
      siteId: order.siteId,
      email: order.email,
      status: order.status || "Pending",
      paymentStatus: order.paymentStatus || "Pending",
      total: order.total || 0,
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


