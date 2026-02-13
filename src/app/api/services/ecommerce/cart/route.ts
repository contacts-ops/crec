import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Cart } from "@/lib/models/cart"
import { Product } from "@/lib/models/product"
import { getGuestOrUserAuth } from "@/_sharedServices/utils/guestAuth"
import { FRENCH_ERROR_MESSAGES } from "@/_sharedServices/utils/errorHandler"

// GET user's cart (supports both authenticated users and guests)
export async function GET(request: NextRequest) {
  try {
    // Use optional auth - allows both guests and authenticated users
    const auth = await getGuestOrUserAuth(request)

    await connectToDatabase()

    let cart
    if (auth.isAuthenticated && auth.userId) {
      // Authenticated user - find cart by userId
      cart = await Cart.findOne({ userId: auth.userId }).populate("items.productId")
    } else {
      // Guest user - find cart by sessionId
      cart = await Cart.findOne({ sessionId: auth.sessionId }).populate("items.productId")
    }

    // If no cart exists, return empty cart
    if (!cart) {
      const response = NextResponse.json({ success: true, data: { items: [], total: 0 } }, { status: 200 })
      
      // Set guest_session_id cookie if guest and cookie doesn't exist
      if (!auth.isAuthenticated && !request.cookies.get("guest_session_id")) {
        response.cookies.set("guest_session_id", auth.sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: "/",
        })
      }
      
      return response
    }

    const response = NextResponse.json({ success: true, data: cart }, { status: 200 })
    
    // Set guest_session_id cookie if guest and cookie doesn't exist
    if (!auth.isAuthenticated && !request.cookies.get("guest_session_id")) {
      response.cookies.set("guest_session_id", auth.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      })
    }
    
    return response
  } catch (error) {
    console.error("Get cart error:", error)
    return NextResponse.json({ success: false, error: FRENCH_ERROR_MESSAGES.SERVER_ERROR }, { status: 500 })
  }
}

// POST - Add item to cart (supports both authenticated users and guests)
export async function POST(request: NextRequest) {
  try {
    // Use optional auth - allows both guests and authenticated users
    const auth = await getGuestOrUserAuth(request)

    const body = await request.json()
    const { productId, quantity, variantId } = body

    if (!productId || !quantity || quantity < 1) {
      return NextResponse.json({ success: false, error: "L'ID du produit et la quantité sont requis" }, { status: 400 })
    }

    await connectToDatabase()

    // Verify product exists and get current price
    const product = await Product.findById(productId)
    console.log("this is the product data", product)
    if (!product) {
      return NextResponse.json({ success: false, error: "Produit non trouvé" }, { status: 404 })
    }

    // Handle variant if provided
    let itemPrice = product.price
    let itemStock = product.stock_quantity
    let variant = null

    if (variantId && product.variants && Array.isArray(product.variants)) {
      variant = product.variants.find(
        (v: any) => (v.id === variantId || v._id?.toString() === variantId)
      )
      if (variant) {
        // Use variant price if available, otherwise use product price
        itemPrice = variant.price !== undefined ? variant.price : product.price
        itemStock = variant.stockQuantity !== undefined ? variant.stockQuantity : product.stock_quantity
      }
    }

    if (itemStock < quantity) {
      return NextResponse.json(
        { success: false, error: `Seulement ${itemStock} articles disponibles en stock` },
        { status: 400 },
      )
    }

    // Find or create cart based on auth type
    let cart
    if (auth.isAuthenticated && auth.userId) {
      // Authenticated user - find/create cart by userId
      cart = await Cart.findOne({ userId: auth.userId })
      if (!cart) {
        cart = new Cart({ userId: auth.userId, items: [] })
      }
    } else {
      // Guest user - find/create cart by sessionId
      cart = await Cart.findOne({ sessionId: auth.sessionId })
    if (!cart) {
        cart = new Cart({ sessionId: auth.sessionId, items: [] })
      }
    }

    // Check if item already in cart (same productId AND same variantId)
    const existingItem = cart.items.find(
      (item) => item.productId.toString() === productId && item.variantId === variantId
    )

    if (existingItem) {
      const totalQuantity = existingItem.quantity + quantity
      if (totalQuantity > itemStock) {
        return NextResponse.json(
          { success: false, error: `Seulement ${itemStock} articles disponibles en stock` },
          { status: 400 },
        )
      }
      existingItem.quantity = totalQuantity
      existingItem.price = itemPrice
    } else {
      cart.items.push({
        productId,
        quantity,
        price: itemPrice,
        variantId: variantId || undefined,
      })
    }

    // Recalculate total
    cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    await cart.save()

    const response = NextResponse.json({ success: true, data: cart }, { status: 201 })
    
    // Set guest_session_id cookie if guest and cookie doesn't exist
    if (!auth.isAuthenticated && !request.cookies.get("guest_session_id")) {
      response.cookies.set("guest_session_id", auth.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      })
    }
    
    return response
  } catch (error) {
    console.error("Add to cart error:", error)
    return NextResponse.json({ success: false, error: FRENCH_ERROR_MESSAGES.SERVER_ERROR }, { status: 500 })
  }
}

// DELETE - Clear cart (supports both authenticated users and guests)
export async function DELETE(request: NextRequest) {
  try {
    // Use optional auth - allows both guests and authenticated users
    const auth = await getGuestOrUserAuth(request)

    await connectToDatabase()

    let cart
    if (auth.isAuthenticated && auth.userId) {
      cart = await Cart.findOne({ userId: auth.userId })
    } else {
      cart = await Cart.findOne({ sessionId: auth.sessionId })
    }

    if (!cart) {
      return NextResponse.json({ success: false, error: "Panier non trouvé" }, { status: 404 })
    }

    cart.items = []
    cart.total = 0
    await cart.save()

    return NextResponse.json({ success: true, data: cart }, { status: 200 })
  } catch (error) {
    console.error("Clear cart error:", error)
    return NextResponse.json({ success: false, error: FRENCH_ERROR_MESSAGES.SERVER_ERROR }, { status: 500 })
  }
}
