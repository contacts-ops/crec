import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Cart } from "@/lib/models/cart"
import { Product } from "@/lib/models/product"
import { getGuestOrUserAuth } from "@/_sharedServices/utils/guestAuth"
import { FRENCH_ERROR_MESSAGES } from "@/_sharedServices/utils/errorHandler"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"

// PUT - Update cart item quantity (supports both authenticated users and guests)
export async function PUT(request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    
    let siteId = request.headers.get("x-site-id") || extractSiteId(request)
    if (!siteId) return NextResponse.json({ success: false, error: "siteId est requis" }, { status: 400 })

    // Use optional auth - allows both guests and authenticated users
    const auth = await getGuestOrUserAuth(request)

    const body = await request.json()
    const { quantity, variantId } = body
    const { id } = await params
    const productId = id

    console.log("DEBUG: this is the product id", productId)
    console.log("DEBUG: this is the quantity", quantity)
    console.log("DEBUG: this is the variantId", variantId)

    if (!quantity || quantity < 1) {
      return NextResponse.json({ success: false, error: "La quantité doit être d'au moins 1" }, { status: 400 })
    }

    await connectToDatabase()

    // Find cart based on auth type
    let cart
    if (auth.isAuthenticated && auth.userId) {
      cart = await Cart.findOne({ userId: auth.userId })
    } else {
      cart = await Cart.findOne({ sessionId: auth.sessionId })
    }
    
    if (!cart) {
      return NextResponse.json({ success: false, error: "Panier non trouvé" }, { status: 404 })
    }

    // Find item by productId AND variantId (if variantId is provided)
    const item = cart.items.find(
      (item) => item.productId.toString() === productId && item.variantId === variantId
    )
    if (!item) {
      return NextResponse.json({ success: false, error: "Article non trouvé dans le panier" }, { status: 404 })
    }

    const product = await Product.findById(productId)
    if (!product) {
      return NextResponse.json({ success: false, error: "Produit non trouvé" }, { status: 404 })
    }

    // Handle variant if provided
    let itemPrice = product.price
    let itemStock = product.stock_quantity

    if (variantId && product.variants && Array.isArray(product.variants)) {
      const variant = product.variants.find(
        (v: any) => (v.id === variantId || v._id?.toString() === variantId)
      )
      if (variant) {
        // Use variant price if available, otherwise use product price
        itemPrice = variant.price !== undefined ? variant.price : product.price
        itemStock = variant.stockQuantity !== undefined ? variant.stockQuantity : product.stock_quantity
      }
    }

    console.log("DEBUG: this is the item stock: ", itemStock)
    if (quantity > itemStock) {
      console.log("we are here ")
      return NextResponse.json(
        { success: false, error: `Seulement ${itemStock} articles disponibles en stock` },
        { status: 400 },
      )
    }

    item.quantity = quantity
    item.price = itemPrice

    // Recalculate total
    cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    await cart.save()

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
    console.error("Update cart error:", error)
    return NextResponse.json({ success: false, error: FRENCH_ERROR_MESSAGES.SERVER_ERROR }, { status: 500 })
  }
}

// DELETE - Remove item from cart (supports both authenticated users and guests)
export async function DELETE(request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    // Use optional auth - allows both guests and authenticated users
    const auth = await getGuestOrUserAuth(request)

    const { id } = await params
    const productId = id
    // Try to get request body, default to empty object if not present or if DELETE doesn't have body
    let variantId: string | undefined
    try {
      const body = await request.json()
      variantId = body.variantId
    } catch (e) {
      // Request body is empty or not JSON, which is fine for DELETE
      variantId = undefined
    }

    await connectToDatabase()

    // Find cart based on auth type
    let cart
    if (auth.isAuthenticated && auth.userId) {
      cart = await Cart.findOne({ userId: auth.userId })
    } else {
      cart = await Cart.findOne({ sessionId: auth.sessionId })
    }
    
    if (!cart) {
      return NextResponse.json({ success: false, error: "Panier non trouvé" }, { status: 404 })
    }

    // If variantId is provided, match both productId and variantId
    // Otherwise, match only productId (for backward compatibility)
    if (variantId) {
      cart.items = cart.items.filter(
        (item) => !(item.productId.toString() === productId && item.variantId === variantId)
      )
    } else {
      // If no variantId, remove all items with this productId (backward compatibility)
      // But this might not be desired if variants exist, so we'll only remove if no variantId exists
      cart.items = cart.items.filter(
        (item) => !(item.productId.toString() === productId && !item.variantId)
      )
    }

    // Recalculate total
    cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    await cart.save()

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
    console.error("Delete from cart error:", error)
    return NextResponse.json({ success: false, error: FRENCH_ERROR_MESSAGES.SERVER_ERROR }, { status: 500 })
  }
}
