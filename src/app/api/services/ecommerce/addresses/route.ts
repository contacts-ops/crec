import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Order } from "@/lib/models/order"
import { verifyUserAuthentication } from "@/_sharedServices/utils/newsletterAuth"

export async function GET(request: NextRequest) {
  try {
    const siteId = request.headers.get("x-site-id")
    if (!siteId) {
      return NextResponse.json({ error: "Site ID is required" }, { status: 400 })
    }

    // Verify user authentication
    const authResult = await verifyUserAuthentication(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = authResult.user.userId
    const userEmail = authResult.user?.email

    await connectToDatabase()

    // Fetch user's previous orders to extract unique addresses
    // Include all orders (including Pending) so users can see recently entered addresses
    // This allows addresses to appear immediately after order creation, even before payment
    // Try both userId and email to find orders
    let orders: any[] = []
    
    // First try by userId
    if (userId) {
      orders = await Order.find({
      siteId,
      userId: userId,
    })
        .select("shippingAddress billingAddress email")
      .sort({ createdAt: -1 })
      .limit(50) // Limit to recent orders for performance
      .lean()
    }

    // If no orders found by userId, try by email (fallback for edge cases)
    if (orders.length === 0 && userEmail) {
      orders = await Order.find({
        siteId,
        email: userEmail.toLowerCase(),
      })
        .select("shippingAddress billingAddress email")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
    }

    // Extract unique shipping addresses
    const uniqueAddresses = new Map<string, any>()

    orders.forEach((order: any) => {
      if (order.shippingAddress) {
        const addr = order.shippingAddress
        // Create a unique key from address components
        const key = `${addr.address || ""}_${addr.city || ""}_${addr.zipCode || ""}_${addr.nom || ""}_${addr.prenom || ""}`.toLowerCase()
        
        if (!uniqueAddresses.has(key)) {
          uniqueAddresses.set(key, {
            name: `${addr.prenom || ""} ${addr.nom || ""}`.trim() || "Adresse de livraison",
            address: addr.address || "",
            address2: addr.address2 || "",
            city: addr.city || "",
            postal: addr.zipCode || "",
            phone: addr.phone || "",
            companyName: addr.companyName || "",
            country: addr.country || "FR",
          })
        }
      }
    })

    // Convert map to array
    const addresses = Array.from(uniqueAddresses.values())

    return NextResponse.json({
      success: true,
      data: addresses,
    })
  } catch (error) {
    console.error("Error fetching saved addresses:", error)
    return NextResponse.json(
      { error: "Error fetching saved addresses" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const siteId = request.headers.get("x-site-id")
    if (!siteId) {
      return NextResponse.json({ error: "Site ID is required" }, { status: 400 })
    }

    // Verify user authentication
    const authResult = await verifyUserAuthentication(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { address } = await request.json()

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 })
    }

    // Addresses are saved automatically when orders are created
    // This endpoint is mainly for future use if we want to save addresses separately
    // For now, addresses are saved when orders are created

    return NextResponse.json({
      success: true,
      message: "Address will be saved with next order",
    })
  } catch (error) {
    console.error("Error saving address:", error)
    return NextResponse.json(
      { error: "Error saving address" },
      { status: 500 }
    )
  }
}

