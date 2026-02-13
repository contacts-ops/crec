import Stripe from "stripe"
import { Product } from "@/lib/models/product"
import mongoose from "mongoose"
const { Category } = await import("@/lib/models/category")
const { Order } = await import("@/lib/models/order")
const { Cart } = await import("@/lib/models/cart")

import type {
  CreateProductInput,
  UpdateProductInput,
  ListProductsFilters,
  CheckoutItem,
  CheckoutMetadata,
} from "@/types/ecommerce"
import { computeShippingCostFromItems, normalizeDeliveryOptions } from "@/_sharedServices/utils/deliveryShipping"

// Helper function to transform MongoDB document to API response
const transformToResponse = (doc: any) => {
  if (!doc) return null
  try {
    const obj = doc.toObject ? doc.toObject() : doc
    const { _id, ...rest } = obj
    const result = { 
      id: _id ? (_id.toString ? _id.toString() : String(_id)) : null, 
      ...rest 
    }
    if (result.media && Array.isArray(result.media)) {
      // Filter out empty media objects for cleaner responses
      result.media = result.media.filter((m: any) => m && m.url)
    }
    return result
  } catch (error: any) {
    console.error("[transformToResponse] Error transforming document:", error)
    // Return a safe fallback
    return {
      id: doc._id ? (doc._id.toString ? doc._id.toString() : String(doc._id)) : null,
      ...doc
    }
  }
}

// Helper function to check variation stock
const checkVariationStock = (variationId: string, variations: any[]): number => {
  const variation = variations.find((v) => v._id?.toString() === variationId || v.id === variationId)
  return variation ? variation.stockQuantity || 0 : 0
}

// Helper function to create variant with inherited data from main product
export function createVariantFromProduct(product: any, variantOverrides: any): any {
  return {
    id: variantOverrides.id || `variant_${Date.now()}`,
    color: variantOverrides.color && variantOverrides.color.trim() ? variantOverrides.color : product.color,
    taille: variantOverrides.taille && variantOverrides.taille.trim() ? variantOverrides.taille : product.taille,
    height: variantOverrides.height && variantOverrides.height.trim() ? variantOverrides.height : product.height,
    width: variantOverrides.width && variantOverrides.width.trim() ? variantOverrides.width : product.width,
    capacity:
      variantOverrides.capacity && variantOverrides.capacity.trim() ? variantOverrides.capacity : product.capacity,
    weight: variantOverrides.weight && variantOverrides.weight.trim() ? variantOverrides.weight : product.weight,
    price:
      variantOverrides.price !== undefined && variantOverrides.price !== null ? variantOverrides.price : product.price,
    stockQuantity:
      variantOverrides.stockQuantity !== undefined && variantOverrides.stockQuantity !== null
        ? variantOverrides.stockQuantity
        : product.stock_quantity,
    media: variantOverrides.media || [],
  }
}

// Helper function to get variant display data with fallbacks to main product
export function getVariantDisplayData(variant: any, product: any): any {
  return {
    id: variant.id,
    color: variant.color || product.color,
    taille: variant.taille || product.taille,
    height: variant.height || product.height,
    width: variant.width || product.width,
    capacity: variant.capacity || product.capacity,
    weight: variant.weight || product.weight,
    price: variant.price !== undefined && variant.price !== null ? variant.price : product.price,
    stockQuantity:
      variant.stockQuantity !== undefined && variant.stockQuantity !== null
        ? variant.stockQuantity
        : product.stock_quantity,
    media: variant.media && variant.media.length > 0 ? variant.media : product.media,
    title: variant.title || product.title,
    description_short: variant.description_short || product.description_short,
    description_long: variant.description_long || product.description_long,
    categories: variant.categories || product.categories,
    tags: variant.tags || product.tags,
  }
}

// Initialize Stripe
class EcommerceService {
  // Removed global Stripe instance - now using site-specific keys from database

  // ============================================
  // PRODUCT CRUD OPERATIONS
  // ============================================

  /**
   * Create a new product
   */
  async createProduct(
    siteId: string,
    productData: CreateProductInput,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { title, price, description_short, description_long } = productData

      if (!title || !price) {
        return { success: false, error: "Le titre et le prix sont obligatoires" }
      }

      if (!description_short || !description_long) {
        return { success: false, error: "Les descriptions courte et longue sont obligatoires" }
      }

      console.log("[BACKEND DEBUG] createProduct received:", {
        title,
        images: productData.images,
        imagesCount: productData.images?.length,
      })

      const productCreateData = {
        siteId: siteId,
        title: productData.title,
        description_short: productData.description_short,
        description_long: productData.description_long,
        price: productData.price,
        categories: productData.categories || [],
        tags: productData.tags || [],
        stock_quantity: productData.stock_quantity || 0,
        low_stock_threshold: productData.low_stock_threshold || 10,
        media: productData.media || [],
        variants: (productData.variants || []).map((v: any) => createVariantFromProduct(productData, v)),
        color: productData.color || "",
        taille: productData.taille || "",
        height: productData.height || "",
        width: productData.width || "",
        capacity: productData.capacity || "",
        weight: productData.weight || "",
        seo: productData.seo,
        ...(typeof (productData as any).deliveryCostOverride === "number" && (productData as any).deliveryCostOverride >= 0
          ? { deliveryCostOverride: (productData as any).deliveryCostOverride }
          : {}),
        ...((productData as any).sku ? { sku: (productData as any).sku } : {}),
      }

      console.log("[BACKEND DEBUG] Data being sent to Product.create:", productCreateData)

      const product = await Product.create(productCreateData)
      await product.save()

      if (productData.syncToStripe) {
        console.log("[BACKEND DEBUG] Syncing product to Stripe:", product._id.toString())
        const syncResult = await this.syncProductToStripe(siteId, product._id.toString())
        if (!syncResult.success) {
          console.error("[BACKEND DEBUG] Stripe sync failed:", syncResult.error)
          // Continue even if sync fails, but log the error
        }
        // Reload product after Stripe sync to get updated stripeProductId
        const reloadedProduct = await Product.findById(product._id)
        if (reloadedProduct) {
          console.log("[BACKEND DEBUG] Reloaded product after Stripe sync:", reloadedProduct.stripeProductId)
          const response = transformToResponse(reloadedProduct)
          return { success: true, data: response }
        }
      }

      const reloadedProduct = await Product.findById(product._id)
      console.log("[BACKEND DEBUG] Reloaded product from DB:", reloadedProduct)
      const response = transformToResponse(reloadedProduct || product)

      // Sync to Shippingbo when configured for this site (e.g. blancavenue)
      try {
        const { isShippingboSite, syncProductToShippingbo } = await import("@/_sharedServices/shippingbo")
        if (await isShippingboSite(siteId)) {
          const syncResult = await syncProductToShippingbo(siteId, product._id.toString())
          if (!syncResult.success) console.warn("[ecommerceService] Shippingbo product sync failed:", syncResult.error)
        }
      } catch (shippingboErr) {
        console.warn("[ecommerceService] Shippingbo product sync error (non-blocking):", shippingboErr)
      }

      return { success: true, data: response }
    } catch (error: any) {
      console.error("[BACKEND DEBUG] Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      })

      if (error.name === "ValidationError") {
        console.error("[BACKEND DEBUG] Validation errors:", error.errors)
        return { success: false, error: "Erreur de validation: " + error.message }
      }

      return { success: false, error: error.message || "Impossible de créer le produit" }
    }
  }

  /**
   * Get a single product by ID
   */
  async getProduct(siteId: string, productId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const product = await Product.findOne({
        _id: productId,
        siteId,
      }).populate("categories")

      if (!product) {
        return { success: false, error: "Produit non trouvé" }
      }

      return { success: true, data: transformToResponse(product) }
    } catch (error: any) {
      console.error("[ecommerceService] Error fetching product:", error)
      return { success: false, error: "Impossible de récupérer le produit" }
    }
  }

  /**
   * List products with optional filters
   */
  async listProducts(
    siteId: string,
    filters: ListProductsFilters = {},
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const query: any = { siteId }

      // Apply filters
      if (filters.category) {
        query.categories = filters.category
      }

      if (filters.tag) {
        query.tags = { $in: Array.isArray(filters.tag) ? filters.tag : [filters.tag] }
      }

      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        query.price = {}
        if (filters.minPrice !== undefined) query.price.$gte = filters.minPrice
        if (filters.maxPrice !== undefined) query.price.$lte = filters.maxPrice
      }

      if (filters.inStock) {
        query.stock_quantity = { $gt: 0 }
      }

      if (filters.search) {
        query.$or = [
          { title: { $regex: filters.search, $options: "i" } },
          { description_short: { $regex: filters.search, $options: "i" } },
          { tags: { $regex: filters.search, $options: "i" } },
        ]
      }

      const limit = filters.limit || 50
      const offset = filters.offset || 0

      const [products, total] = await Promise.all([
        Product.find(query).populate("categories").limit(limit).skip(offset).sort({ createdAt: -1 }),
        Product.countDocuments(query),
      ])

      return { success: true, data: { products: products.map(transformToResponse), total } }
    } catch (error: any) {
      console.error("[ecommerceService] Error listing products:", error)
      return { success: false, error: "Impossible de récupérer les produits" }
    }
  }

  /**
   * Update a product
   */
  async updateProduct(
    siteId: string,
    productId: string,
    productData: UpdateProductInput,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!siteId) {
        return { success: false, error: "Site ID est obligatoire" }
      }

      const updateData: any = { ...productData }
      if (productData.variants && Array.isArray(productData.variants)) {
        updateData.variants = productData.variants.map((v: any) => createVariantFromProduct(productData, v))
      }

      const product = await Product.findOneAndUpdate(
        { _id: productId, siteId },
        { $set: updateData },
        { new: true, runValidators: true },
      ).populate("categories")

      if (!product) {
        return { success: false, error: "Produit non trouvé" }
      }

      // Always sync to Stripe if syncToStripe is true (for both new and existing products)
      if (productData.syncToStripe) {
        console.log("[BACKEND DEBUG] Syncing updated product to Stripe:", productId)
        const syncResult = await this.syncProductToStripe(siteId, productId)
        if (!syncResult.success) {
          console.error("[BACKEND DEBUG] Stripe sync failed during update:", syncResult.error)
          // Continue even if sync fails, but log the error
        }
        // Reload product after Stripe sync to get updated stripeProductId
        const reloadedProduct = await Product.findById(productId).populate("categories")
        if (reloadedProduct) {
          console.log("[BACKEND DEBUG] Reloaded product after Stripe sync (update):", reloadedProduct.stripeProductId)
          const out = transformToResponse(reloadedProduct)
          try {
            const { isShippingboSite, syncProductToShippingbo } = await import("@/_sharedServices/shippingbo")
            if (await isShippingboSite(siteId)) await syncProductToShippingbo(siteId, productId)
          } catch (e) {
            console.warn("[ecommerceService] Shippingbo product sync (update) error:", e)
          }
          return { success: true, data: out }
        }
      }

      try {
        const { isShippingboSite, syncProductToShippingbo } = await import("@/_sharedServices/shippingbo")
        if (await isShippingboSite(siteId)) await syncProductToShippingbo(siteId, productId)
      } catch (e) {
        console.warn("[ecommerceService] Shippingbo product sync (update) error:", e)
      }
      return { success: true, data: transformToResponse(product) }
    } catch (error: any) {
      console.error("[ecommerceService] Error updating product:", error)
      return { success: false, error: error.message || "Impossible de mettre à jour le produit" }
    }
  }

  /**
   * Add or update variants for a product
   */
  async upsertProductVariants(
    siteId: string,
    productId: string,
    variants: any[],
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const product = await Product.findOne({ _id: productId, siteId })

      if (!product) {
        return { success: false, error: "Product not found" }
      }

      product.variants = variants
      product.markModified("variants")
      await product.save()

      return { success: true, data: transformToResponse(product) }
    } catch (error: any) {
      console.error("[ecommerceService] Error updating variants:", error)
      return { success: false, error: "Unable to update variants" }
    }
  }

  /**
   * Add media to product (images or videos)
   */
  async addProductMedia(
    siteId: string,
    productId: string,
    mediaItems: Array<{ url: string; type: "image" | "video"; thumbnailUrl?: string }>,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const product = await Product.findOne({ _id: productId, siteId })

      if (!product) {
        return { success: false, error: "Product not found" }
      }

      const currentMedia = product.media || []
      const totalMedia = currentMedia.length + mediaItems.length

      if (totalMedia > 6) {
        return {
          success: false,
          error: `Product can have maximum 6 media items. Currently: ${currentMedia.length}, Adding: ${mediaItems.length}`,
        }
      }

      product.media = [...currentMedia, ...mediaItems]
      product.markModified("media")
      await product.save()

      return { success: true, data: transformToResponse(product) }
    } catch (error: any) {
      console.error("[ecommerceService] Error adding media:", error)
      return { success: false, error: "Unable to add media to product" }
    }
  }

  /**
   * Add media to variant
   */
  async addVariantMedia(
    siteId: string,
    productId: string,
    variantId: string,
    mediaItems: Array<{ url: string; type: "image" | "video"; thumbnailUrl?: string }>,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const product = await Product.findOne({ _id: productId, siteId })

      if (!product) {
        return { success: false, error: "Product not found" }
      }

      const variant = product.variants?.find((v) => v._id?.toString() === variantId || v.id === variantId)

      if (!variant) {
        return { success: false, error: "Variant not found" }
      }

      const currentMedia = variant.media || []
      const totalMedia = currentMedia.length + mediaItems.length

      if (totalMedia > 6) {
        return {
          success: false,
          error: `Variant can have maximum 6 media items. Currently: ${currentMedia.length}, Adding: ${mediaItems.length}`,
        }
      }

      variant.media = [...currentMedia, ...mediaItems]
      product.markModified("variants")
      await product.save()

      return { success: true, data: transformToResponse(product) }
    } catch (error: any) {
      console.error("[ecommerceService] Error adding variant media:", error)
      return { success: false, error: "Unable to add media to variant" }
    }
  }

  /**
   * Calculate price with variant modifiers
   */
  getProductPriceWithVariants(product: any, selectedVariantIds: string[]): number {
    let totalPrice = product.price || 0
    for (const variantId of selectedVariantIds) {
      const variant = product.variants?.find((v) => v._id?.toString() === variantId || v.id === variantId)
      if (variant && variant.priceModifier) {
        totalPrice += variant.priceModifier
      }
    }
    return Math.max(0, totalPrice)
  }

  /**
   * Get total available stock considering variants
   */
  getProductStockWithVariants(product: any, selectedVariantIds: string[]): number {
    const totalStock = product.stock_quantity || 0

    if (selectedVariantIds.length > 0) {
      let minStock = product.stock_quantity || 0
      for (const variantId of selectedVariantIds) {
        const varStock = checkVariationStock(variantId, product.variants || [])
        minStock = Math.min(minStock, varStock)
      }
      return minStock
    }

    return totalStock
  }

  /**
   * Delete a product
   */
  async deleteProduct(siteId: string, productId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const product = await Product.findOne({ _id: productId, siteId })

      if (!product) {
        return { success: false, error: "Produit non trouvé" }
      }

      // Optionally archive/deactivate in Stripe instead of deleting
      if (product.stripeProductId) {
        try {
          // Get site-specific Stripe keys to deactivate product
          const stripeKeys = await this.getEcommerceStripeKeys(siteId)
          if (stripeKeys.stripeSecretKey) {
            const siteStripe = new Stripe(stripeKeys.stripeSecretKey, {
              apiVersion: "2025-08-27.basil",
            })
            await siteStripe.products.update(product.stripeProductId, {
              active: false,
            })
          }
        } catch (stripeError) {
          console.error("[ecommerceService] Error deactivating Stripe product:", stripeError)
        }
      }

      await Product.deleteOne({ _id: productId, siteId })
      return { success: true }
    } catch (error: any) {
      console.error("[ecommerceService] Error deleting product:", error)
      return { success: false, error: "Impossible de supprimer le produit" }
    }
  }

  // ============================================
  // CATEGORY CRUD OPERATIONS
  // ============================================

  /**
   * Create a new category
   */
  async createCategory(siteId: string, categoryData: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log("this category data", categoryData)
      const category = await Category.create({
        siteId,
        name: categoryData.name,
        slug: categoryData.slug || categoryData.name.toLowerCase().replace(/\s+/g, "-"),
        description: categoryData.description,
        parent: categoryData.parent || null,
        visible: categoryData.visible !== false,
        order: categoryData.order || 0,
        seo: categoryData.seo,
        images: categoryData.images || [],
      })

      return { success: true, data: transformToResponse(category) }
    } catch (error: any) {
      if (error.code === 11000) {
        return { success: false, error: "Une catégorie avec ce slug existe déjà pour ce site" }
      }
      console.error("[ecommerceService] Error creating category:", error)
      return { success: false, error: error.message || "Impossible de créer la catégorie" }
    }
  }

  /**
   * Get a single category by ID
   */
  async getCategory(siteId: string, categoryId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const category = await Category.findOne({
        _id: categoryId,
        siteId,
      }).populate("parent")

      if (!category) {
        return { success: false, error: "Catégorie non trouvée" }
      }

      return { success: true, data: transformToResponse(category) }
    } catch (error: any) {
      console.error("[ecommerceService] Error fetching category:", error)
      return { success: false, error: "Impossible de récupérer la catégorie" }
    }
  }

  /**
   * List categories with optional filters
   */
  async listCategories(siteId: string, filters: any = {}): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Import and connect to database
      const { connectToDatabase } = await import("@/lib/db")
      await connectToDatabase()

      const query: any = { siteId }

      // Subcategories: filter by parent (optional)
      if (filters.parentId != null && filters.parentId !== "") {
        query.parent = filters.parentId
      } else if (filters.topLevelOnly) {
        // Only top-level categories (no parent) — for sites that don't use subcategories
        query.$or = [{ parent: null }, { parent: { $exists: false } }]
      }

      const limit = filters.limit || 50
      const offset = filters.offset || 0

      const [categories, total] = await Promise.all([
        Category.find(query).populate("parent").limit(limit).skip(offset).sort({ createdAt: -1 }),
        Category.countDocuments(query),
      ])

      return { success: true, data: { categories: categories.map(transformToResponse), total } }
    } catch (error: any) {
      console.error("[ecommerceService] Error listing categories:", error)
      console.error("[ecommerceService] Error details:", error.message, error.stack)
      return { success: false, error: "Impossible de récupérer les catégories" }
    }
  }

  /**
   * Update a category
   */
  async updateCategory(
    siteId: string,
    categoryId: string,
    categoryData: any,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!siteId) {
        return { success: false, error: "Site ID est obligatoire" }
      }

      const category = await Category.findOneAndUpdate(
        { _id: categoryId, siteId },
        { $set: categoryData },
        { new: true, runValidators: true },
      ).populate("parent")

      if (!category) {
        return { success: false, error: "Catégorie non trouvée" }
      }

      return { success: true, data: transformToResponse(category) }
    } catch (error: any) {
      if (error.code === 11000) {
        return { success: false, error: "Une catégorie avec ce slug existe déjà pour ce site" }
      }
      console.error("[ecommerceService] Error updating category:", error)
      return { success: false, error: error.message || "Impossible de mettre à jour la catégorie" }
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(siteId: string, categoryId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const category = await Category.findOne({ _id: categoryId, siteId })

      if (!category) {
        return { success: false, error: "Catégorie non trouvée" }
      }

      // Check if category has products
      const productCount = await Product.countDocuments({
        siteId,
        categories: categoryId,
      })

      if (productCount > 0) {
        return { success: false, error: "Impossible de supprimer la catégorie avec des produits associés" }
      }

      const subcategoryCount = await Category.countDocuments({
        siteId,
        parent: categoryId,
      })

      if (subcategoryCount > 0) {
        return { success: false, error: "Impossible de supprimer la catégorie avec des sous-catégories" }
      }

      await Category.deleteOne({ _id: categoryId, siteId })
      return { success: true }
    } catch (error: any) {
      console.error("[ecommerceService] Error deleting category:", error)
      return { success: false, error: "Impossible de supprimer la catégorie" }
    }
  }

  /**
   * Reorder categories for homepage display
   */
  async reorderCategories(
    siteId: string,
    categoryOrders: Array<{ id: string; order: number }>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      for (const { id, order } of categoryOrders) {
        await Category.findOneAndUpdate({ _id: id, siteId }, { $set: { order } }, { new: true })
      }
      return { success: true }
    } catch (error: any) {
      console.error("[ecommerceService] Error reordering categories:", error)
      return { success: false, error: "Failed to reorder categories" }
    }
  }

  /**
   * Toggle category visibility for homepage
   */
  async toggleCategoryVisibility(
    siteId: string,
    categoryId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const category = await Category.findOne({ _id: categoryId, siteId })

      if (!category) {
        return { success: false, error: "Category not found" }
      }

      category.visible = !category.visible
      await category.save()

      return { success: true, data: transformToResponse(category) }
    } catch (error: any) {
      console.error("[ecommerceService] Error toggling category visibility:", error)
      return { success: false, error: "Failed to toggle category visibility" }
    }
  }

  /**
   * Add images to category
   */
  async addCategoryImages(
    siteId: string,
    categoryId: string,
    imageUrls: string[],
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const category = await Category.findOne({ _id: categoryId, siteId })

      if (!category) {
        return { success: false, error: "Catégorie non trouvée" }
      }

      const currentImages = (category as any).images || []
      const totalImages = currentImages.length + imageUrls.length

      if (totalImages > 1) {
        return {
          success: false,
          error: `La catégorie peut avoir un maximum de 1 image. Actuellement: ${currentImages.length}, Ajout: ${imageUrls.length}`,
        }
      }
      ;(category as any).images = [...currentImages, ...imageUrls]
      await category.save()

      return { success: true, data: transformToResponse(category) }
    } catch (error: any) {
      console.error("[ecommerceService] Error adding category images:", error)
      return { success: false, error: "Impossible d'ajouter les images à la catégorie" }
    }
  }

  /**
   * Remove image from category
   */
  async removeCategoryImage(
    siteId: string,
    categoryId: string,
    imageUrl: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const category = await Category.findOne({ _id: categoryId, siteId })

      if (!category) {
        return { success: false, error: "Catégorie non trouvée" }
      }
      ;(category as any).images = ((category as any).images || []).filter((img: string) => img !== imageUrl)
      await category.save()

      return { success: true, data: transformToResponse(category) }
    } catch (error: any) {
      console.error("[ecommerceService] Error removing category image:", error)
      return { success: false, error: "Impossible de supprimer l'image de la catégorie" }
    }
  }

  // ============================================
  // ORDER CRUD OPERATIONS
  // ============================================

  /**
   * Create a new order
   */
  async createOrder(siteId: string, orderData: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!orderData.customerEmail) {
        return { success: false, error: "L'email du client est obligatoire" }
      }

      if (!orderData.items || orderData.items.length === 0) {
        return { success: false, error: "Au moins un article est obligatoire" }
      }

      const order = await Order.create({
        siteId,
        customerEmail: orderData.customerEmail,
        customerName: orderData.customerName || "",
        items: orderData.items,
        subtotal: orderData.subtotal || 0,
        tax: orderData.tax || 0,
        shipping: orderData.shipping || 0,
        total: orderData.total || 0,
        status: orderData.status || "pending",
        shippingAddress: orderData.shippingAddress || {},
        billingAddress: orderData.billingAddress || {},
        notes: orderData.notes || "",
        paymentStatus: orderData.paymentStatus || "unpaid",
        paymentMethod: orderData.paymentMethod || "",
        stripeSessionId: orderData.stripeSessionId || "",
      })

      return { success: true, data: transformToResponse(order) }
    } catch (error: any) {
      console.error("[ecommerceService] Error creating order:", error)
      return { success: false, error: error.message || "Impossible de créer la commande" }
    }
  }

  /**
   * Get a single order by ID
   */
  async getOrder(siteId: string, orderId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const order = await Order.findOne({
        _id: mongoose.Types.ObjectId.createFromHexString(orderId),
        siteId,
      })

      if (!order) {
        return { success: false, error: "Commande non trouvée" }
      }

      return { success: true, data: transformToResponse(order) }
    } catch (error: any) {
      console.error("[ecommerceService] Error fetching order:", error)
      return { success: false, error: "Impossible de récupérer la commande" }
    }
  }

  /**
   * List orders with optional filters
   */
  async listOrders(siteId: string, filters: any = {}): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Import connectToDatabase dynamically
      const { connectToDatabase } = await import("@/lib/db")
      await connectToDatabase()

      // Import Order model dynamically
      const { Order } = await import("@/lib/models/order")
      
      if (!Order) {
        throw new Error("Order model not found")
      }

      const query: any = { siteId }

      if (filters.status) {
        query.status = filters.status
      }

      if (filters.search) {
        query.$or = [
          { email: { $regex: filters.search, $options: "i" } },
          { "shippingAddress.nom": { $regex: filters.search, $options: "i" } },
          { "shippingAddress.prenom": { $regex: filters.search, $options: "i" } },
        ]
      }

      const limit = filters.limit || 50
      const offset = filters.offset || 0

      const [orders, total] = await Promise.all([
        Order.find(query).limit(limit).skip(offset).sort({ createdAt: -1 }),
        Order.countDocuments(query),
      ])

      // Transform orders with error handling for each order
      const transformedOrders = orders.map((order: any) => {
        try {
          return transformToResponse(order)
        } catch (error: any) {
          console.error("[ecommerceService] Error transforming order:", error, order?._id)
          // Return a safe fallback for this order
          return {
            id: order?._id?.toString() || order?.id || null,
            ...order,
            error: "Failed to transform order"
          }
        }
      }).filter((order: any) => order !== null) // Filter out null orders

      return { success: true, data: { orders: transformedOrders, total } }
    } catch (error: any) {
      console.error("[ecommerceService] Error listing orders:", error)
      console.error("[ecommerceService] Error details:", error.message, error.stack)
      return { success: false, error: error.message || "Impossible de récupérer les commandes" }
    }
  }

  /**
   * Update an order
   */
  async updateOrder(
    siteId: string,
    orderId: string,
    orderData: any,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Import connectToDatabase
      const { connectToDatabase } = await import("@/lib/db")
      await connectToDatabase()

      // Convert orderId to ObjectId if it's a valid hex string
      let orderIdQuery: any = orderId
      if (mongoose.Types.ObjectId.isValid(orderId)) {
        orderIdQuery = new mongoose.Types.ObjectId(orderId)
      }

      // Get current order to check if status is changing
      const currentOrder = await Order.findOne({ _id: orderIdQuery, siteId })
      if (!currentOrder) {
        console.error(`[ecommerceService] Order not found for update - orderId: ${orderId}, siteId: ${siteId}`)
        return { success: false, error: "Commande non trouvée" }
      }

      const oldStatus = currentOrder.status
      const newStatus = orderData.status

      // Update order
      const order = await Order.findOneAndUpdate(
        { _id: orderIdQuery, siteId },
        { $set: orderData },
        { new: true, runValidators: true },
      )

      if (!order) {
        return { success: false, error: "Commande non trouvée" }
      }

      // Send email notification if status changed
      if (newStatus && newStatus !== oldStatus && order.email) {
        try {
          // Use dynamic imports to avoid circular dependencies
          const emailServiceModule = await import("./emailService")
          const sendgridConfigServiceModule = await import("./sendgridConfigService")
          
          // Get from address for ecommerce emails (always uses "ecommerce@" prefix)
          const fromAddress = await sendgridConfigServiceModule.sendgridConfigService.getEcommerceFromAddress(siteId)
          
          // Status labels in French
          const statusLabels: Record<string, string> = {
            Pending: "En attente",
            Processing: "En cours de traitement",
            Packed: "Emballée",
            Shipped: "Expédiée",
            Delivered: "Livrée",
            Cancelled: "Annulée",
            Refunded: "Remboursée",
          }

          const statusLabel = statusLabels[newStatus] || newStatus
          const oldStatusLabel = statusLabels[oldStatus] || oldStatus

          // Format order number: Use first 8 characters of orderId (more readable than last 8)
          const orderNumber = orderId.length >= 8 ? orderId.substring(0, 8).toUpperCase() : orderId.toUpperCase()
          const subject = `Mise à jour de votre commande #${orderNumber}`
          
          const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Mise à jour de votre commande</h2>
              
              <p>Bonjour,</p>
              
              <p>Le statut de votre commande <strong>#${orderNumber}</strong> a été mis à jour.</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
                <p style="margin: 0;"><strong>Ancien statut :</strong> ${oldStatusLabel}</p>
                <p style="margin: 5px 0 0 0;"><strong>Nouveau statut :</strong> ${statusLabel}</p>
              </div>
              
              <p>Vous pouvez suivre l'état de votre commande à tout moment.</p>
              
              <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px;">
                Cet email a été envoyé automatiquement. Veuillez ne pas y répondre.
              </p>
            </div>
          `

          await emailServiceModule.emailService.sendTransactionalEmail({
            to: order.email,
            subject: subject,
            htmlContent: htmlContent,
            fromEmail: fromAddress,
            fromName: "Service Client",
            siteId: siteId,
          })

          console.log(`[ecommerceService] Order status change email sent to ${order.email} for order ${orderId}`)
        } catch (emailError) {
          // Don't fail the order update if email fails
          console.error("[ecommerceService] Error sending order status email:", emailError)
        }
      }

      return { success: true, data: transformToResponse(order) }
    } catch (error: any) {
      console.error("[ecommerceService] Error updating order:", error)
      return { success: false, error: error.message || "Impossible de mettre à jour la commande" }
    }
  }

  /**
   * Delete an order
   */
  async deleteOrder(siteId: string, orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const order = await Order.findOne({ _id: orderId, siteId })

      if (!order) {
        return { success: false, error: "Commande non trouvée" }
      }

      await Order.deleteOne({ _id: orderId, siteId })
      return { success: true }
    } catch (error: any) {
      console.error("[ecommerceService] Error deleting order:", error)
      return { success: false, error: "Impossible de supprimer la commande" }
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    siteId: string,
    orderId: string,
    status: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"]

      if (!validStatuses.includes(status)) {
        return { success: false, error: `Statut invalide. Statuts valides: ${validStatuses.join(", ")}` }
      }

      const order = await Order.findOneAndUpdate(
        { _id: orderId, siteId },
        { $set: { status, updatedAt: new Date() } },
        { new: true },
      )

      if (!order) {
        return { success: false, error: "Commande non trouvée" }
      }

      return { success: true, data: transformToResponse(order) }
    } catch (error: any) {
      console.error("[ecommerceService] Error updating order status:", error)
      return { success: false, error: "Impossible de mettre à jour le statut de la commande" }
    }
  }

  // ============================================
  // CHECKOUT & ORDER OPERATIONS
  // ============================================

  /**
   * Checkout: Convert cart to order
   */
  async checkout(checkoutData: {
    cartId: string
    siteId: string
    shippingAddress: any
    billingAddress: any
    deliveryMethod: string
    email: string
    userId?: string
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { cartId, siteId, shippingAddress, billingAddress, deliveryMethod, email, userId } = checkoutData

      const cart = await Cart.findById(cartId).populate("items.productId")

      if (!cart) {
        return { success: false, error: "Cart not found" }
      }

      if (cart.items.length === 0) {
        return { success: false, error: "Cart is empty" }
      }

      if (
        !shippingAddress.nom ||
        !shippingAddress.prenom ||
        !shippingAddress.address ||
        !shippingAddress.city ||
        !shippingAddress.zipCode
      ) {
        return { success: false, error: "Invalid shipping address" }
      }

      if (
        !billingAddress.nom ||
        !billingAddress.prenom ||
        !billingAddress.address ||
        !billingAddress.city ||
        !billingAddress.zipCode
      ) {
        return { success: false, error: "Invalid billing address" }
      }

      const orderItems = cart.items.map((item: any) => ({
        productId: item.productId._id,
        quantity: item.quantity,
        price: item.price, // This already contains variant price if variant exists
        title: item.productId.title,
        variantId: item.variantId || undefined, // Include variantId in order items
      }))

      // Load site delivery options and price mode (server-side)
      const { connectToDatabase } = await import("@/lib/db")
      const { Site } = await import("@/lib/models/Site")
      await connectToDatabase()
      const site = await Site.findOne({ siteId }).lean() as any
      const deliveryOptions = site?.ecommerce?.delivery
        ? normalizeDeliveryOptions(site.ecommerce.delivery as Record<string, unknown>)
        : null
      const shippingItems = cart.items.map((item: any) => ({
        quantity: item.quantity || 0,
        productId: item.productId ? { deliveryCostOverride: item.productId.deliveryCostOverride } : null,
      }))
      const shippingCost = computeShippingCostFromItems(deliveryOptions, deliveryMethod, shippingItems)

      const priceMode = site?.ecommerce?.priceMode === "TTC" ? "TTC" : "HT"
      const vatRate = typeof site?.ecommerce?.vatRate === "number" ? site.ecommerce.vatRate : 0.2

      // Calculate totals: TTC = no extra tax; HT = add VAT
      const subtotal = cart.total
      const tax = priceMode === "TTC" ? 0 : (subtotal + shippingCost) * vatRate
      const total = subtotal + shippingCost + tax

      // Order number for display and Shippingbo idempotency (e.g. Ilkay / blancavenue)
      const { isShippingboSite } = await import("@/_sharedServices/shippingbo")
      const orderNumber = (await isShippingboSite(siteId))
        ? `ILKAY-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-6)}`
        : undefined

      const order = await Order.create({
        siteId,
        ...(orderNumber ? { order_number: orderNumber } : {}),
        userId: userId || null,
        email: email?.toLowerCase(), // Normalize email to lowercase for consistent querying
        items: orderItems,
        total: total, // Total includes shipping and tax
        status: "Pending",
        paymentStatus: "Pending",
        deliveryMethod,
        shippingCost: shippingCost,
        shippingAddress: {
          nom: shippingAddress.nom,
          prenom: shippingAddress.prenom,
          address: shippingAddress.address,
          city: shippingAddress.city,
          zipCode: shippingAddress.zipCode,
          country: shippingAddress.country || "FR",
          phone: shippingAddress.phone,
        },
        billingAddress: {
          nom: billingAddress.nom,
          prenom: billingAddress.prenom,
          address: billingAddress.address,
          city: billingAddress.city,
          zipCode: billingAddress.zipCode,
          country: billingAddress.country || "FR",
          phone: billingAddress.phone,
        },
      })

      // Clear cart items and reset total
      await Cart.findByIdAndUpdate(cartId, { $set: { items: [], total: 0 } })

      return { success: true, data: transformToResponse(order) }
    } catch (error: any) {
      console.error("[ecommerceService] Checkout error:", error)
      return { success: false, error: error.message || "Checkout failed" }
    }
  }

  // ============================================
  // STRIPE INTEGRATION
  // ============================================

  /**
   * Sync product to Stripe (create or update)
   */
  async syncProductToStripe(
    siteId: string,
    productId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Get site-specific Stripe keys from database
      const stripeKeys = await this.getEcommerceStripeKeys(siteId)
      
      if (!stripeKeys.stripeSecretKey) {
        return { 
          success: false, 
          error: "Veuillez configurer votre environnement Stripe dans la section Configuration de l'admin e-commerce" 
        }
      }

      // Create Stripe instance with site-specific key
      const siteStripe = new Stripe(stripeKeys.stripeSecretKey, {
        apiVersion: "2025-08-27.basil",
      })

      const product = await Product.findOne({ _id: productId, siteId })

      if (!product) {
        return { success: false, error: "Produit non trouvé" }
      }

      let stripeProduct: Stripe.Product

      if (product.stripeProductId) {
        // Update existing Stripe product
        stripeProduct = await siteStripe.products.update(product.stripeProductId, {
          name: product.title,
          description: product.description_short,
          images: product.media?.map((media: any) => media.url) || [],
          metadata: {
            siteId,
            productId: product._id.toString(),
          },
        })

        // Update price
        await siteStripe.prices.create({
          product: stripeProduct.id,
          unit_amount: Math.round(product.price * 100),
          currency: "eur",
        })
      } else {
        // Create new Stripe product with price
        stripeProduct = await siteStripe.products.create({
          name: product.title,
          description: product.description_short,
          images: product.media?.map((media: any) => media.url) || [],
          metadata: {
            siteId,
            productId: product._id.toString(),
          },
          default_price_data: {
            currency: "eur",
            unit_amount: Math.round(product.price * 100),
          },
        })

        // Save Stripe product ID to database
        product.stripeProductId = stripeProduct.id
        await product.save()
        console.log("[BACKEND DEBUG] Saved stripeProductId to product:", stripeProduct.id)
      }

      // Reload product to ensure we have the latest data
      const reloadedProduct = await Product.findById(product._id)
      if (reloadedProduct) {
        console.log("[BACKEND DEBUG] Reloaded product after Stripe sync:", reloadedProduct.stripeProductId)
        return { success: true, data: transformToResponse(reloadedProduct) }
      }

      return { success: true, data: transformToResponse(product) }
    } catch (error: any) {
      console.error("[ecommerceService] Error syncing product to Stripe:", error)
      return { success: false, error: "Impossible de synchroniser le produit avec Stripe" }
    }
  }

  /**
   * Create Stripe checkout session
   */
  async createCheckoutSession(
    siteId: string,
    items: CheckoutItem[],
    metadata: CheckoutMetadata,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // Note: successUrl and cancelUrl should be provided in metadata
    // They are constructed in the API route with proper siteId handling
    try {
      // Get site-specific Stripe keys from database
      const stripeKeys = await this.getEcommerceStripeKeys(siteId)
      
      if (!stripeKeys.stripeSecretKey) {
        return { 
          success: false, 
          error: "Veuillez configurer votre environnement Stripe dans la section Configuration de l'admin e-commerce" 
        }
      }

      // Create Stripe instance with site-specific key
      const siteStripe = new Stripe(stripeKeys.stripeSecretKey, {
        apiVersion: "2025-08-27.basil",
      })

      // Fetch products and validate
      const productIds = items.map((item) => item.productId)
      const products = await Product.find({
        _id: { $in: productIds },
        siteId,
      })

      if (products.length !== items.length) {
        return { success: false, error: "Certains produits n'ont pas été trouvés" }
      }

      // Build line items for Stripe
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

      for (const item of items) {
        const product = products.find((p) => p._id.toString() === item.productId)

        if (!product) {
          return { success: false, error: `Produit ${item.productId} non trouvé` }
        }

        // Check stock (considering variant if applicable)
        let stockToCheck = product.stock_quantity
        if (item.variantId && product.variants && Array.isArray(product.variants)) {
          const variant = product.variants.find(
            (v: any) => (v.id === item.variantId || v._id?.toString() === item.variantId)
          )
          if (variant && variant.stockQuantity !== undefined) {
            stockToCheck = variant.stockQuantity
          }
        }

        if (stockToCheck < item.quantity) {
          return { success: false, error: `Stock insuffisant pour le produit: ${product.title}` }
        }

        // Use exact price from cart if provided (prevents price tampering)
        // Otherwise fall back to product price
        const itemPrice = item.price !== undefined ? item.price : product.price

        // Ensure product is synced to Stripe (for product info, but we'll use custom price)
        if (!product.stripeProductId) {
          const syncResult = await this.syncProductToStripe(siteId, product._id.toString())
          if (!syncResult.success) {
            return { success: false, error: `Impossible de synchroniser le produit avec Stripe: ${product.title}` }
          }
        }

        // Create a price object with the exact cart price (in cents)
        // This ensures Stripe uses the exact price from the cart, not the product price
        const priceAmount = Math.round(itemPrice * 100) // Convert to cents

        // Create a one-time price for this specific checkout session
        // This ensures we use the exact cart price, not the product's default price
        const customPrice = await siteStripe.prices.create({
          product: product.stripeProductId,
          unit_amount: priceAmount,
          currency: "eur",
        })

        lineItems.push({
          price: customPrice.id,
          quantity: item.quantity,
        })
      }

      // Add shipping as a line item if shipping cost > 0
      if (metadata.shippingCost && metadata.shippingCost > 0) {
        // Create or get shipping product in Stripe
        let shippingProductId = `shipping_${siteId}`
        try {
          // Try to find existing shipping product
          const existingProducts = await siteStripe.products.search({
            query: `metadata['siteId']:'${siteId}' AND metadata['type']:'shipping'`,
          })

          if (existingProducts.data.length > 0) {
            shippingProductId = existingProducts.data[0].id
          } else {
            // Create shipping product
            const shippingProduct = await siteStripe.products.create({
              name: "Frais de livraison (HT)",
              description: "Frais de livraison hors taxes",
              metadata: {
                siteId,
                type: "shipping",
              },
            })
            shippingProductId = shippingProduct.id
          }

          // Create a one-time price for shipping with exact amount
          const shippingPrice = await siteStripe.prices.create({
              product: shippingProductId,
              unit_amount: Math.round(metadata.shippingCost * 100), // Convert to cents
              currency: "eur",
            })

          lineItems.push({
            price: shippingPrice.id,
            quantity: 1,
          })
        } catch (error) {
          console.error("[ecommerceService] Error adding shipping to Stripe:", error)
          // Continue without shipping in Stripe - we'll handle it in the webhook
        }
      }

      // Add VAT/Tax as a line item if tax > 0
      if (metadata.tax && metadata.tax > 0) {
        // Create or get tax product in Stripe
        let taxProductId = `tax_${siteId}`
        try {
          // Try to find existing tax product
          const existingProducts = await siteStripe.products.search({
            query: `metadata['siteId']:'${siteId}' AND metadata['type']:'tax'`,
          })

          if (existingProducts.data.length > 0) {
            taxProductId = existingProducts.data[0].id
          } else {
            // Create tax product
            const taxProduct = await siteStripe.products.create({
              name: "TVA (20%) - Total TTC incluant la taxe",
              description: "Taxe sur la valeur ajoutée - Total TTC incluant la taxe",
              metadata: {
                siteId,
                type: "tax",
              },
          })
            taxProductId = taxProduct.id
          }

          // Create a one-time price for tax with exact amount
          const taxPrice = await siteStripe.prices.create({
            product: taxProductId,
            unit_amount: Math.round(metadata.tax * 100), // Convert to cents
            currency: "eur",
          })

            lineItems.push({
            price: taxPrice.id,
              quantity: 1,
            })
        } catch (error) {
          console.error("[ecommerceService] Error adding tax to Stripe:", error)
          // Continue without tax in Stripe - we'll handle it in the webhook
        }
      }

      // Create Stripe checkout session
      // (constructed with siteId in API route)
      // Fallback URLs redirect to checkout page with payment status
      const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000"
      const isLocalhost = baseUrl.includes("localhost")
      const orderId = metadata.orderId || ""
      const fallbackSuccessUrl = isLocalhost
        ? `${baseUrl}/sites/${siteId}/checkout?payment=success${orderId ? `&orderId=${orderId}` : ""}`
        : `${baseUrl}/checkout?payment=success${orderId ? `&orderId=${orderId}` : ""}`
      const fallbackCancelUrl = isLocalhost
        ? `${baseUrl}/sites/${siteId}/checkout?payment=cancel`
        : `${baseUrl}/checkout?payment=cancel`

      const sessionMetadata = {
        siteId,
        userId: metadata.userId || "",
        orderId: metadata.orderId || "",
        shippingCost: metadata.shippingCost?.toString() || "0",
        tax: metadata.tax?.toString() || "0",
      }

      const session = await siteStripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        success_url: metadata.successUrl || fallbackSuccessUrl,
        cancel_url: metadata.cancelUrl || fallbackCancelUrl,
        customer_email: metadata.email,
        customer_creation: "always", // Always create a Stripe customer so invoices can be retrieved later
        metadata: sessionMetadata,
      })

      return {
        success: true,
        data: {
          sessionId: session.id,
          url: session.url || "",
        },
      }
    } catch (error: any) {
      console.error("[ecommerceService] Error creating checkout session:", error)
      return { success: false, error: "Impossible de créer la session de paiement" }
    }
  }

  /**
   * Handle Stripe webhook events
   * Note: siteId should be extracted from the event metadata in the webhook route
   */
  async handleStripeWebhook(rawBody: string, signature: string, siteId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // First, try to extract siteId from the raw event (before verification)
      // We need to parse the event to get siteId, but we need to verify signature first
      // So we'll try to verify with all possible siteIds or extract from event after verification
      
      // If siteId is provided, use it directly
      let event: Stripe.Event | null = null
      let verifiedSiteId: string | undefined = siteId

      // Try to verify with provided siteId first
      if (siteId) {
        const stripeKeys = await this.getEcommerceStripeKeys(siteId)
        if (stripeKeys.stripeSecretKey && stripeKeys.isTestMode !== undefined) {
          const siteStripe = new Stripe(stripeKeys.stripeSecretKey, {
            apiVersion: "2025-08-27.basil",
          })

          // Get webhook secret from database (based on environment)
          const { connectToDatabase } = await import("@/lib/db")
          const { Site } = await import("@/lib/models/Site")
          await connectToDatabase()
          const site = await Site.findOne({ siteId }).lean() as any
          const ecommerceConfig = site?.ecommerce || {}
          const isTestMode = stripeKeys.isTestMode ?? (ecommerceConfig.environment === "development")
          
          // Get webhook secret based on environment
          let webhookSecret = isTestMode 
            ? (ecommerceConfig.testWebhookSecret || ecommerceConfig.webhookSecret) // Legacy support
            : (ecommerceConfig.liveWebhookSecret || ecommerceConfig.webhookSecret) // Legacy support

          if (webhookSecret) {
            try {
              event = siteStripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
              verifiedSiteId = siteId
            } catch (err: any) {
              console.error(`[ecommerce] Webhook verification failed for siteId ${siteId}:`, err.message)
            }
          }
        }
      }

      // If verification failed or no siteId provided, try to extract siteId from event
      if (!event) {
        // Try to parse event without verification to extract siteId
        try {
          const unverifiedEvent = JSON.parse(rawBody) as any
          const extractedSiteId = unverifiedEvent?.data?.object?.metadata?.siteId
          
          if (extractedSiteId) {
            const stripeKeys = await this.getEcommerceStripeKeys(extractedSiteId)
            if (stripeKeys.stripeSecretKey) {
              const siteStripe = new Stripe(stripeKeys.stripeSecretKey, {
                apiVersion: "2025-08-27.basil",
              })

              const { connectToDatabase } = await import("@/lib/db")
              const { Site } = await import("@/lib/models/Site")
              await connectToDatabase()
              const site = await Site.findOne({ siteId: extractedSiteId }).lean() as any
              const ecommerceConfig = site?.ecommerce || {}
              const isTestMode = stripeKeys.isTestMode ?? (ecommerceConfig.environment === "development")
              
              // Get webhook secret based on environment
              let webhookSecret = isTestMode 
                ? (ecommerceConfig.testWebhookSecret || ecommerceConfig.webhookSecret) // Legacy support
                : (ecommerceConfig.liveWebhookSecret || ecommerceConfig.webhookSecret) // Legacy support

              if (webhookSecret) {
                try {
                  event = siteStripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
                  verifiedSiteId = extractedSiteId
                } catch (err: any) {
                  console.error(`[ecommerce] Webhook verification failed for extracted siteId ${extractedSiteId}:`, err.message)
                }
              }
            }
          }
        } catch (parseError) {
          // Ignore parse errors - we'll fail verification below
        }
      }

      if (!event) {
        console.error("[ecommerceService] Webhook signature verification failed - no valid siteId or webhook secret found")
        return { success: false, error: "Veuillez configurer votre secret webhook Stripe dans la section Configuration de l'admin e-commerce" }
      }

      // Handle different event types
      try {
      console.log(`[ecommerceService] Processing webhook event: ${event.type}`)
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session
          console.log(`[ecommerceService] Handling checkout.session.completed for session: ${session.id}`)
          console.log(`[ecommerceService] Session metadata:`, session.metadata)
          await this.handleCheckoutCompleted(session, verifiedSiteId)
          console.log(`[ecommerceService] Successfully processed checkout.session.completed`)
          break
        }

        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent
          await this.handlePaymentSucceeded(paymentIntent, verifiedSiteId)
          break
        }

        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent
          await this.handlePaymentFailed(paymentIntent, verifiedSiteId)
          break
        }

        default:
            // Unhandled event type - log only in development
            if (process.env.NODE_ENV === "development") {
          console.log(`[ecommerceService] Unhandled event type: ${event.type}`)
      }
        }
      return { success: true }
      } catch (handlerError: any) {
        console.error(`[ecommerceService] Error processing event ${event.type}:`, handlerError)
        return { success: false, error: `Error processing event: ${handlerError.message}` }
      }
    } catch (error: any) {
      console.error("[ecommerceService] Error handling webhook:", error)
      console.error("[ecommerceService] Error stack:", error.stack)
      return { success: false, error: `Impossible de traiter le webhook: ${error.message || "Unknown error"}` }
    }
  }

  /**
   * Handle completed checkout session
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session, verifiedSiteId?: string): Promise<void> {
    try {
      console.log(`[ecommerceService] handleCheckoutCompleted called for session: ${session.id}`)
      let siteId = verifiedSiteId || session.metadata?.siteId
      let userId = session.metadata?.userId
      let orderId = session.metadata?.orderId
      console.log(`[ecommerceService] Extracted metadata - siteId: ${siteId}, userId: ${userId}, orderId: ${orderId}`)

      // If metadata is missing, try to retrieve the full session from Stripe
      // This can happen with test webhooks from Stripe CLI
      if (!siteId || !orderId) {
        try {
          // Get site-specific Stripe keys to retrieve session
          if (siteId) {
            const stripeKeys = await this.getEcommerceStripeKeys(siteId)
            if (stripeKeys.stripeSecretKey) {
              const siteStripe = new Stripe(stripeKeys.stripeSecretKey, {
                apiVersion: "2025-08-27.basil",
              })
              const fullSession = await siteStripe.checkout.sessions.retrieve(session.id, {
                expand: ['payment_intent']
              })
              siteId = fullSession.metadata?.siteId || siteId
              userId = fullSession.metadata?.userId || userId
              orderId = fullSession.metadata?.orderId || orderId
            }
          }
        } catch (retrieveError: any) {
          console.error("[ecommerceService] Failed to retrieve session from Stripe:", retrieveError.message)
        }
      }

      if (!siteId || !orderId) {
        console.error("[ecommerceService] Missing required metadata in checkout session")
        return
      }

      // Import connectToDatabase dynamically
      const { connectToDatabase } = await import("@/lib/db")
      await connectToDatabase()

      // Try to find order - handle both string and ObjectId formats
      let existingOrder = null
      try {
        // First try direct string match (Mongoose should handle this)
        existingOrder = await Order.findOne({ _id: orderId, siteId })
        
        // If not found, try ObjectId conversion
        if (!existingOrder && mongoose.Types.ObjectId.isValid(orderId)) {
          existingOrder = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId), siteId })
        }
      } catch (e: any) {
        console.error(`[ecommerceService] Error finding order:`, e.message)
      }

      if (!existingOrder) {
        console.error(`[ecommerceService] Order not found: ${orderId} for siteId: ${siteId}`)
        return
      }

      // Update order status to Completed and Processing
      const updateResult = await this.updateOrder(siteId, orderId, {
        paymentStatus: "Completed",
        status: "Processing",
      })

      if (!updateResult.success) {
        console.error(`[ecommerceService] Failed to update order ${orderId}:`, updateResult.error)
      }

      // Push order to Shippingbo when configured for this site (e.g. blancavenue)
      try {
        const { isShippingboSite, pushOrderToShippingbo } = await import("@/_sharedServices/shippingbo")
        if (await isShippingboSite(siteId)) {
          const pushResult = await pushOrderToShippingbo(siteId, orderId)
          if (pushResult.success && pushResult.shippingbo_order_id) {
            console.log(`[ecommerceService] Order ${orderId} pushed to Shippingbo: ${pushResult.shippingbo_order_id}`)
          } else if (!pushResult.success) {
            console.warn(`[ecommerceService] Shippingbo push failed for order ${orderId}:`, pushResult.error)
          }
        }
      } catch (shippingboErr) {
        console.warn("[ecommerceService] Shippingbo push error (non-blocking):", shippingboErr)
      }

      // Send order confirmation email to customer
      console.log(`[ecommerceService] Checking email for order ${orderId}:`, { 
        hasEmail: !!existingOrder.email, 
        email: existingOrder.email,
        orderData: { email: existingOrder.email, siteId, orderId }
      })
      
      if (existingOrder.email) {
        try {
          const emailServiceModule = await import("./emailService")
          const sendgridConfigServiceModule = await import("./sendgridConfigService")
          
          // Get from address for ecommerce emails
          const fromAddress = await sendgridConfigServiceModule.sendgridConfigService.getEcommerceFromAddress(siteId)
          console.log(`[ecommerceService] From address for email:`, fromAddress)
          
          // Format order number
          const orderNumber = orderId.length >= 8 ? orderId.substring(0, 8).toUpperCase() : orderId.toUpperCase()
          
          const subtotal = existingOrder.items?.reduce((sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 0), 0) || 0
          const shippingCost = existingOrder.shippingCost || 0
          const total = existingOrder.total ?? (subtotal + shippingCost)

          const { Site } = await import("@/lib/models/Site")
          const siteDoc = await Site.findOne({ siteId }).lean() as any
          const priceMode = siteDoc?.ecommerce?.priceMode === "TTC" ? "TTC" : "HT"
          const vatRate = typeof siteDoc?.ecommerce?.vatRate === "number" ? siteDoc.ecommerce.vatRate : 0.2
          const tax = priceMode === "TTC" ? 0 : (subtotal + shippingCost) * vatRate
          const priceLabel = priceMode === "TTC" ? "TTC" : "HT"
          const showTaxLine = priceMode === "HT" && tax > 0

          const subject = `Confirmation de votre commande #${orderNumber}`
          
          const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Confirmation de commande</h2>
              
              <p>Bonjour ${existingOrder.shippingAddress?.prenom || ""} ${existingOrder.shippingAddress?.nom || ""},</p>
              
              <p>Nous avons bien reçu votre paiement et votre commande <strong>#${orderNumber}</strong> a été confirmée.</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                <h3 style="margin-top: 0; color: #155724;">Récapitulatif de votre commande :</h3>
                <p><strong>Numéro de commande :</strong> #${orderNumber}</p>
                <p><strong>Date :</strong> ${new Date(existingOrder.createdAt).toLocaleDateString("fr-FR")}</p>
                <p><strong>Statut :</strong> En cours de traitement</p>
                <p><strong>Méthode de livraison :</strong> ${existingOrder.deliveryMethod === "standard" ? "Livraison standard" : existingOrder.deliveryMethod === "express" ? "Livraison Express" : "Retrait en entrepôt"}</p>
              </div>
              
              <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ddd;">
                <h3 style="margin-top: 0; color: #333;">Détails de la commande :</h3>
                ${existingOrder.items?.map((item: any) => `
                  <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                    <p style="margin: 0;"><strong>${item.title || "Produit"}</strong> x ${item.quantity || 1}</p>
                    <p style="margin: 5px 0 0 0; color: #666;">${(item.price || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € ${priceLabel}</p>
                  </div>
                `).join("") || ""}
                <div style="padding: 10px 0; margin-top: 10px; border-top: 2px solid #333;">
                  <p style="margin: 5px 0;"><strong>Sous-total :</strong> ${subtotal.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € ${priceLabel}</p>
                  <p style="margin: 5px 0;"><strong>Frais de livraison :</strong> ${shippingCost.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € ${priceLabel}</p>
                  ${showTaxLine ? `<p style="margin: 5px 0;"><strong>TVA (${Math.round(vatRate * 100)}%) :</strong> ${tax.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>` : ""}
                  <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold;"><strong>Total TTC :</strong> ${total.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                </div>
              </div>
              
              ${existingOrder.shippingAddress ? `
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333;">Adresse de livraison :</h3>
                  <p style="margin: 5px 0;">${existingOrder.shippingAddress.companyName || ""}</p>
                  <p style="margin: 5px 0;">${existingOrder.shippingAddress.prenom || ""} ${existingOrder.shippingAddress.nom || ""}</p>
                  <p style="margin: 5px 0;">${existingOrder.shippingAddress.address || ""}</p>
                  <p style="margin: 5px 0;">${existingOrder.shippingAddress.zipCode || ""} ${existingOrder.shippingAddress.city || ""}</p>
                  ${existingOrder.shippingAddress.phone ? `<p style="margin: 5px 0;">Tél: ${existingOrder.shippingAddress.phone}</p>` : ""}
                </div>
              ` : ""}
              
              <p>Vous recevrez un email de mise à jour lorsque votre commande sera expédiée.</p>
              
              <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px;">
                Cet email a été envoyé automatiquement. Veuillez ne pas y répondre.
              </p>
            </div>
          `

          await emailServiceModule.emailService.sendTransactionalEmail({
            to: existingOrder.email,
            subject: subject,
            htmlContent: htmlContent,
            fromEmail: fromAddress,
            fromName: "Service Client",
            siteId: siteId,
          })

          console.log(`[ecommerceService] Order confirmation email sent to ${existingOrder.email} for order ${orderId}`)
        } catch (emailError) {
          // Don't fail the webhook if email fails
          console.error("[ecommerceService] Error sending order confirmation email:", emailError)
          console.error("[ecommerceService] Email error details:", emailError instanceof Error ? emailError.message : String(emailError))
        }
      } else {
        console.warn(`[ecommerceService] Order ${orderId} has no email field - cannot send confirmation email`)
        console.warn(`[ecommerceService] Order data:`, { 
          _id: existingOrder._id, 
          siteId: existingOrder.siteId,
          hasEmailField: 'email' in existingOrder,
          orderKeys: Object.keys(existingOrder)
        })
      }
    } catch (error: any) {
      console.error("[ecommerceService] Error handling checkout completed:", error)
      console.error("[ecommerceService] Error stack:", error.stack)
      throw error // Re-throw to be caught by webhook handler
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent, siteId?: string): Promise<void> {
    try {
      console.log(`[ecommerceService] Payment succeeded: ${paymentIntent.id}`)
    } catch (error) {
      console.error("[ecommerceService] Error handling payment succeeded:", error)
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent, siteId?: string): Promise<void> {
    try {
      console.log(`[ecommerceService] Payment failed: ${paymentIntent.id}`)
    } catch (error) {
      console.error("[ecommerceService] Error handling payment failed:", error)
    }
  }

  async processPayment(
    siteId: string,
    orderId: string,
    chargeId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const order = await Order.findOneAndUpdate(
        { _id: mongoose.Types.ObjectId.createFromHexString(orderId), siteId },
        {
          $set: {
            paymentStatus: "Paid",
            status: "Processing",
            stripeChargeId: chargeId,
            paidAt: new Date(),
          },
        },
        { new: true, runValidators: true },
      )

      if (!order) {
        return { success: false, error: "Order not found" }
      }

      return { success: true, data: transformToResponse(order) }
    } catch (error: any) {
      console.error("[ecommerceService] Error processing payment:", error)
      return { success: false, error: error.message || "Payment processing failed" }
    }
  }

  /**
   * Get Stripe keys for e-commerce module
   * Uses ONLY e-commerce specific configuration from database (site.ecommerce)
   * Completely independent from shared services and environment variables
   * Public method to allow API routes to access site-specific keys
   */
  async getEcommerceStripeKeys(siteId: string): Promise<{ stripeSecretKey?: string; stripePublishableKey?: string; isTestMode?: boolean }> {
    try {
      console.log(`[ecommerce] Getting Stripe keys for siteId: ${siteId}`)
      
      const { connectToDatabase } = await import("@/lib/db")
      const { Site } = await import("@/lib/models/Site")
      await connectToDatabase()

      const site = await Site.findOne({ siteId }).lean() as any

      if (!site) {
        console.log(`[ecommerce] Site not found for siteId: ${siteId}`)
        return {}
      }

      // Use ONLY e-commerce specific config (site.ecommerce), not shared services config (site.stripe)
      const ecommerceConfig = site.ecommerce

      if (!ecommerceConfig) {
        console.log(`[ecommerce] No e-commerce configuration found for site: ${site.name || siteId}`)
        return {}
      }

      console.log(`[ecommerce] E-commerce config found for site: ${site.name || siteId}`, {
        environment: ecommerceConfig.environment,
        isConfigured: ecommerceConfig.isConfigured,
        hasTestKeys: !!(ecommerceConfig.testPublicKey && ecommerceConfig.testSecretKey),
        hasLiveKeys: !!(ecommerceConfig.livePublicKey && ecommerceConfig.liveSecretKey),
      })

      if (!ecommerceConfig.isConfigured) {
        console.log(`[ecommerce] E-commerce configuration not complete for site: ${site.name || siteId}`)
        return {}
      }

      // Determine mode based on environment setting
      const isTestMode = ecommerceConfig.environment === "development"

      // Select appropriate keys based on environment
      let selectedSecretKey: string | undefined
      let selectedPublicKey: string | undefined

      if (isTestMode) {
        selectedSecretKey = ecommerceConfig.testSecretKey
        selectedPublicKey = ecommerceConfig.testPublicKey
      } else {
        selectedSecretKey = ecommerceConfig.liveSecretKey
        selectedPublicKey = ecommerceConfig.livePublicKey
      }

      if (!selectedSecretKey) {
        console.log(`[ecommerce] No secret key found for ${isTestMode ? 'development' : 'production'} environment for site: ${site.name || siteId}`)
        return {}
      }

      console.log(`[ecommerce] Stripe keys retrieved from e-commerce config for site: ${site.name || siteId} (environment: ${ecommerceConfig.environment})`)
      return {
        stripeSecretKey: selectedSecretKey,
        stripePublishableKey: selectedPublicKey,
        isTestMode: isTestMode
      }
    } catch (error: any) {
      console.error('[ecommerce] Error getting Stripe keys:', error)
      console.error('[ecommerce] Error stack:', error?.stack)
      console.error('[ecommerce] Error message:', error?.message)
      return {}
    }
  }

  /**
   * Get invoices for a customer (e-commerce module specific)
   * Uses site-specific Stripe keys and links invoices to orders
   */
  async getCustomerInvoices(
    siteId: string,
    customerEmail: string
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      console.log(`[ecommerce] Getting invoices for customer: ${customerEmail}, siteId: ${siteId}`)
      
      // Use e-commerce specific Stripe key retrieval (more lenient)
      const stripeKeys = await this.getEcommerceStripeKeys(siteId)

      if (!stripeKeys.stripeSecretKey) {
        console.log(`[ecommerce] No Stripe secret key found for siteId: ${siteId}`)
        return { success: false, error: "Veuillez configurer votre environnement Stripe dans la section Configuration de l'admin e-commerce" }
      }

      console.log(`[ecommerce] Stripe keys retrieved, creating Stripe instance...`)

      // Create Stripe instance with site-specific key
      let siteStripe: Stripe
      try {
        siteStripe = new Stripe(stripeKeys.stripeSecretKey, {
          apiVersion: "2025-08-27.basil",
        })
        console.log(`[ecommerce] Stripe instance created successfully`)
      } catch (stripeError: any) {
        console.error(`[ecommerce] Error creating Stripe instance:`, stripeError)
        return { success: false, error: `Erreur lors de l'initialisation de Stripe: ${stripeError.message || 'Invalid Stripe key'}` }
      }

      // Find customer by email
      let customers
      try {
        console.log(`[ecommerce] Searching for customer with email: ${customerEmail.toLowerCase()}`)
        customers = await siteStripe.customers.list({
          email: customerEmail.toLowerCase(),
          limit: 1,
        })
        console.log(`[ecommerce] Found ${customers.data.length} customer(s)`)
      } catch (stripeError: any) {
        console.error(`[ecommerce] Error searching for customer:`, stripeError)
        return { success: false, error: `Erreur lors de la recherche du client: ${stripeError.message || 'Stripe API error'}` }
      }

      if (customers.data.length === 0) {
        // No customer found, return empty invoices
        console.log(`[ecommerce] No customer found, returning empty invoices`)
        return { success: true, data: [] }
      }

      const customerId = customers.data[0].id
      console.log(`[ecommerce] Customer found: ${customerId}`)

      // Get all invoices for this customer
      let invoices
      try {
        console.log(`[ecommerce] Fetching invoices for customer: ${customerId}`)
        invoices = await siteStripe.invoices.list({
          customer: customerId,
          limit: 100,
          expand: ["data.payment_intent", "data.charge"],
        })
        console.log(`[ecommerce] Found ${invoices.data.length} invoice(s)`)
      } catch (stripeError: any) {
        console.error(`[ecommerce] Error fetching invoices:`, stripeError)
        return { success: false, error: `Erreur lors de la récupération des factures: ${stripeError.message || 'Stripe API error'}` }
      }

      // Get all orders for this customer to link invoices
      const { connectToDatabase } = await import("@/lib/db")
      await connectToDatabase()
      const customerOrders = await Order.find({
        siteId,
        email: customerEmail.toLowerCase(),
      })
        .sort({ createdAt: -1 })
        .lean()

      // Get all checkout sessions to link invoices to orders
      const checkoutSessions: Stripe.Checkout.Session[] = []
      let hasMore = true
      let startingAfter: string | undefined = undefined

      // Fetch checkout sessions with pagination
      try {
        console.log(`[ecommerce] Fetching checkout sessions...`)
        while (hasMore && checkoutSessions.length < 500) {
          const sessions = await siteStripe.checkout.sessions.list({
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          })

          checkoutSessions.push(...sessions.data)
          hasMore = sessions.has_more
          if (sessions.data.length > 0) {
            startingAfter = sessions.data[sessions.data.length - 1].id
          } else {
            hasMore = false
          }
        }
        console.log(`[ecommerce] Found ${checkoutSessions.length} checkout session(s)`)
      } catch (stripeError: any) {
        console.error(`[ecommerce] Error fetching checkout sessions:`, stripeError)
        // Continue without checkout sessions - invoices will still be returned but won't be linked to orders
        console.log(`[ecommerce] Continuing without checkout session linking...`)
      }

      // Transform invoices and link to orders
      const transformedInvoices = invoices.data.map((invoice) => {
        // Find linked order by matching checkout session metadata
        let linkedOrder = null
        let linkedOrderId: string | null = null

        // Try to find checkout session that created this invoice
        const relatedSession = checkoutSessions.find((session) => {
          // Check if invoice payment_intent matches session payment_intent
          if (invoice.payment_intent) {
            const paymentIntentId = typeof invoice.payment_intent === "string"
              ? invoice.payment_intent
              : (invoice.payment_intent as Stripe.PaymentIntent).id

            if (session.payment_intent === paymentIntentId) {
              return true
            }
          }
          return false
        })

        if (relatedSession?.metadata?.orderId) {
          linkedOrderId = relatedSession.metadata.orderId
          linkedOrder = customerOrders.find((order: any) => {
            const orderIdStr = order._id?.toString() || order.id
            return orderIdStr === linkedOrderId
          })
        }

        // If no direct link, try to match by amount and date
        if (!linkedOrder) {
          const invoiceAmount = invoice.amount_paid / 100 // Convert from cents
          const invoiceDate = new Date(invoice.created * 1000)

          linkedOrder = customerOrders.find((order: any) => {
            const orderTotal = order.total || 0
            const amountMatch = Math.abs(orderTotal - invoiceAmount) < 0.01 // 1 cent tolerance
            const orderDate = new Date(order.createdAt)
            const dateDiff = Math.abs(invoiceDate.getTime() - orderDate.getTime())
            const dateMatch = dateDiff <= 7 * 24 * 60 * 60 * 1000 // 7 days tolerance
            return amountMatch && dateMatch
          })

          if (linkedOrder) {
            linkedOrderId = linkedOrder._id?.toString() || linkedOrder.id
          }
        }

        const lineItem = invoice.lines?.data[0]
        const description = lineItem?.description || invoice.description || "Facture de commande"

        return {
          id: invoice.id,
          invoiceNumber: invoice.number || invoice.id,
          amount: invoice.amount_paid / 100, // Convert from cents to euros
          currency: (invoice.currency || "eur").toUpperCase(),
          status: invoice.status === "paid" ? "paid" : invoice.status === "open" ? "pending" : invoice.status === "void" ? "cancelled" : "pending",
          date: new Date(invoice.created * 1000).toISOString(),
          dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : new Date(invoice.created * 1000).toISOString(),
          description: description,
          customerName: invoice.customer_name || customerEmail.split("@")[0],
          customerEmail: invoice.customer_email || customerEmail,
          hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
          invoicePdfUrl: invoice.invoice_pdf || undefined,
          stripeInvoiceId: invoice.id,
          stripeSessionId: relatedSession?.id || undefined,
          linkedOrderId: linkedOrderId || undefined,
        }
      })

      // Also process completed checkout sessions as invoices (Stripe doesn't auto-create invoices from checkout)
      // Filter checkout sessions for this customer and site
      const customerCheckoutSessions = checkoutSessions.filter((session) => {
        // Match by customer email or customer ID
        const sessionEmail = session.customer_email || (session.customer_details?.email)
        const sessionCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id
        
        // Check if session belongs to this customer
        const emailMatch = sessionEmail && sessionEmail.toLowerCase() === customerEmail.toLowerCase()
        const customerIdMatch = sessionCustomerId === customerId
        
        // Check if session is for this site
        const siteMatch = session.metadata?.siteId === siteId
        
        // Only include completed and paid sessions
        const statusMatch = session.payment_status === "paid" && session.status === "complete"
        
        return (emailMatch || customerIdMatch) && siteMatch && statusMatch
      })

      console.log(`[ecommerce] Found ${customerCheckoutSessions.length} completed checkout session(s) for this customer`)

      // Convert checkout sessions to invoice-like objects
      const sessionInvoices = customerCheckoutSessions.map((session) => {
        // Find linked order
        let linkedOrder = null
        let linkedOrderId: string | null = null

        if (session.metadata?.orderId) {
          linkedOrderId = session.metadata.orderId
          linkedOrder = customerOrders.find((order: any) => {
            const orderIdStr = order._id?.toString() || order.id
            return orderIdStr === linkedOrderId
          })
        }

        // If no order linked, try to match by amount
        if (!linkedOrder && session.amount_total) {
          const sessionAmount = session.amount_total / 100 // Convert from cents
          linkedOrder = customerOrders.find((order: any) => {
            const orderTotal = order.total || 0
            const amountMatch = Math.abs(orderTotal - sessionAmount) < 0.01 // 1 cent tolerance
            const orderDate = new Date(order.createdAt)
            const sessionDate = new Date(session.created * 1000)
            const dateDiff = Math.abs(sessionDate.getTime() - orderDate.getTime())
            const dateMatch = dateDiff <= 7 * 24 * 60 * 60 * 1000 // 7 days tolerance
            return amountMatch && dateMatch
          })

          if (linkedOrder) {
            linkedOrderId = linkedOrder._id?.toString() || linkedOrder.id
          }
        }

        return {
          id: `session_${session.id}`,
          invoiceNumber: session.id.substring(0, 12).toUpperCase(),
          amount: (session.amount_total || 0) / 100, // Convert from cents to euros
          currency: (session.currency || "eur").toUpperCase(),
          status: session.payment_status === "paid" ? "paid" : "pending",
          date: new Date(session.created * 1000).toISOString(),
          dueDate: new Date(session.created * 1000).toISOString(),
          description: "Facture de commande",
          customerName: session.customer_details?.name || customerEmail.split("@")[0],
          customerEmail: session.customer_email || session.customer_details?.email || customerEmail,
          hostedInvoiceUrl: undefined,
          invoicePdfUrl: undefined,
          stripeInvoiceId: undefined,
          stripeSessionId: session.id,
          linkedOrderId: linkedOrderId || undefined,
        }
      })

      // Combine invoices and session invoices, removing duplicates (prefer actual invoices)
      const allInvoices = [...transformedInvoices]
      const existingSessionIds = new Set(transformedInvoices.map((inv) => inv.stripeSessionId).filter(Boolean))
      
      sessionInvoices.forEach((sessionInv) => {
        // Only add if not already covered by an actual invoice
        if (!existingSessionIds.has(sessionInv.stripeSessionId)) {
          allInvoices.push(sessionInv)
        }
      })

      // Sort by date (newest first)
      allInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      console.log(`[ecommerce] Successfully processed ${transformedInvoices.length} invoice(s) and ${sessionInvoices.length} checkout session(s)`)
      return { success: true, data: allInvoices }
    } catch (error: any) {
      console.error("[ecommerce] Error getting customer invoices:", error)
      console.error("[ecommerce] Error stack:", error?.stack)
      console.error("[ecommerce] Error message:", error?.message)
      return { success: false, error: error?.message || "Erreur lors de la récupération des factures" }
    }
  }
}

export const ecommerceService = new EcommerceService()
