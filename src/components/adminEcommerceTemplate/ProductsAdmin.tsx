"use client"

import { useState, useEffect, useRef } from "react"
import { useSiteLink } from "@/hooks/use-site-link"
import {
  Search,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle,
  Plus,
  X,
  Upload,
  Filter,
  ArrowUpDown,
  ShoppingCart,
  Video,
  AlertCircle,
} from "lucide-react"

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB

interface Product {
  id: string
  siteId: string
  title: string
  price: number
  description_short: string
  description_long: string
  stock_quantity: number
  low_stock_threshold: number
  categories: Array<{ _id: string; name: string; slug: string }>
  tags: string[]
  media?: Array<{ url: string; type: "image" | "video" }> // Unified media array
  variants?: Array<{
    _id?: string
    id?: string
    name?: string // variant's name 
    type?: string // variant's type 
    value?: string // variant's value
    stockQuantity?: number
    priceModifier?: number
    // Added fields for variant-specific data
    taille?: string
    color?: string
    height?: string
    width?: string
    capacity?: string
    weight?: string
    price: number
    media?: Array<{ url: string; type: "image" | "video"; thumbnailUrl?: string }> // Added for variant media
  }>
  stripeProductId?: string
  createdAt: string
  updatedAt: string
  // Added fields for product-level specifications
  height?: string
  width?: string
  capacity?: string
  weight?: string
}

interface ProductsAdminProps {
  siteId: string
  categories: Array<{ id: string; name: string }>
  onDataChange?: () => void
  refreshTrigger?: number
}

export default function ProductsAdmin({ siteId, categories, onDataChange, refreshTrigger }: ProductsAdminProps) {
  const { transformLink } = useSiteLink()
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock" | "category">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [imageCarouselIndex, setImageCarouselIndex] = useState<{ [key: string]: number }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [priceMode, setPriceMode] = useState<"HT" | "TTC">("HT")

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Product | null>(null)

  const [variantMediaToUpload, setVariantMediaToUpload] = useState<
    Array<{ url: string; type: "image" | "video"; thumbnailUrl?: string }>
  >([])
  const [variantMediaToDelete, setVariantMediaToDelete] = useState<string[]>([])

  const [variants, setVariants] = useState<
    Array<{
      id?: string
      _id?: string // Added _id to handle existing variant IDs from DB
      color?: string
      priceModifier?: number
      stockQuantity?: number
      media?: Array<{ url: string; type: "image" | "video"; thumbnailUrl?: string }>
      // Added fields for variant-specific data
      taille?: string
      height?: string
      width?: string
      capacity?: string
      weight?: string
      price: number
    }>
  >([])
  const [variantForm, setVariantForm] = useState<{
    taille: string
    color: string
    height: string
    width: string
    capacity: string
    weight: string
    price: number
    stockQuantity: number
  }>({
    taille: "",
    color: "",
    height: "",
    width: "",
    capacity: "",
    weight: "",
    price: 0,
    stockQuantity: 0,
  })
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null)
  const [showVariantModal, setShowVariantModal] = useState(false)

  const [media, setMedia] = useState<Array<{ url: string; type: "image" | "video"; thumbnailUrl?: string }>>([])
  const [mediaToDelete, setMediaToDelete] = useState<string[]>([])
  const [newMediaItems, setNewMediaItems] = useState<
    Array<{ url: string; type: "image" | "video"; thumbnailUrl?: string }>
  >([])
  const [isUploading, setIsUploading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const [productForm, setProductForm] = useState({
    title: "",
    price: "",
    description_short: "",
    description_long: "",
    color: "",
    taille: "", 
    stock_quantity: 0,
    low_stock_threshold: 10,
    categories: "",
    syncToStripe: true,
    height: "",
    width: "",
    capacity: "",
    weight: "",
    deliveryCostOverride: "" as string | number,
  })

  const [selectedCategory, setSelectedCategory] = useState("")
  const [subcategories, setSubcategories] = useState<Array<{ id: string; name: string }>>([])
  const [categoryForSub, setCategoryForSub] = useState("") // top-level category id when showing subcategory dropdown

  const itemsPerPage = 10

  // When category (top-level) is selected, fetch subcategories for that category
  const fetchSubcategoriesForProduct = (parentId: string) => {
    if (!parentId || !siteId) {
      setSubcategories([])
      return
    }
    fetch(`/api/services/ecommerce/categories/admin?siteId=${siteId}&parentId=${parentId}`, {
      headers: { "Content-Type": "application/json" },
    })
      .then((r) => r.json())
      .then((data) => setSubcategories((data.data?.categories ?? []).map((c: any) => ({ id: c.id ?? c._id, name: c.name }))))
      .catch(() => setSubcategories([]))
  }

  // When opening edit with a product that has a category/subcategory, resolve parent to show subcategory dropdown
  useEffect(() => {
    if (!showEditModal || !editingItem || !productForm.categories || !siteId) return
    const catId = productForm.categories
    fetch(`/api/services/ecommerce/categories/admin/${catId}?siteId=${siteId}`, { headers: { "Content-Type": "application/json" } })
      .then((r) => r.json())
      .then((data) => {
        const parent = data.parent
        const parentId = parent?.id ?? parent?._id ?? parent
        if (parentId) {
          setCategoryForSub(parentId)
          fetchSubcategoriesForProduct(parentId)
        } else {
          setCategoryForSub(catId)
          fetchSubcategoriesForProduct(catId)
        }
      })
      .catch(() => {
        setCategoryForSub(catId)
        fetchSubcategoriesForProduct(catId)
      })
  }, [showEditModal, editingItem?.id, productForm.categories, siteId])

  const handleMediaUpload = async (files: FileList) => {
    if (!files) return

    // Validate file sizes
    const validFiles: File[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const isVideo = file.type.startsWith("video")
      const isImage = file.type.startsWith("image")
      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE

      if (file.size > maxSize) {
        const maxSizeMB = isVideo ? 50 : 5
        showErrorMessage(
          `${file.name}: Fichier trop volumineux (max ${maxSizeMB}MB pour les ${isVideo ? "vidéos" : "images"})`,
        )
        continue
      }

      if (!isVideo && !isImage) {
        showErrorMessage(`${file.name}: Type de fichier non accepté`)
        continue
      }

      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    const maxMedia = 6
    const currentCount = media.length + newMediaItems.length - mediaToDelete.length

    if (currentCount + validFiles.length > maxMedia) {
      showErrorMessage(`Maximum ${maxMedia} fichiers média autorisés. Actuellement: ${currentCount}`)
      return
    }

    setIsUploading(true)
    const formData = new FormData()

    for (let i = 0; i < validFiles.length; i++) {
      formData.append("files", validFiles[i])
    }
    formData.append("resourceType", "product")
    formData.append("siteId", siteId)

    try {
      const response = await fetch("/api/services/ecommerce/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "x-site-id": siteId,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Upload error")
      }

      const data = await response.json()
      const uploadedMedia = data.data.urls.map((url: string, idx: number) => ({
        url,
        type: validFiles[idx].type.startsWith("video") ? "video" : "image",
      }))

      // Check for duplicates before adding
      const existingUrls = new Set([...media.map(m => m.url), ...newMediaItems.map(m => m.url)])
      const uniqueMedia = uploadedMedia.filter(m => !existingUrls.has(m.url))

      if (uniqueMedia.length < uploadedMedia.length) {
        showErrorMessage("Certains fichiers sont déjà présents et ont été ignorés")
      }

      setNewMediaItems([...newMediaItems, ...uniqueMedia])
      
      // Reset file input to allow uploading the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      
      showSuccessMessage("Médias uploadés avec succès")
    } catch (error) {
      console.error("[DEBUG] Product media upload error:", error)
      showErrorMessage(error instanceof Error ? error.message : "Erreur lors de l'upload")
    } finally {
      setIsUploading(false)
    }
  }

  const handleVariantMediaUpload = async (files: FileList) => {
    if (!files) return

    const validFiles: File[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const isVideo = file.type.startsWith("video")
      const isImage = file.type.startsWith("image")
      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE

      if (file.size > maxSize) {
        const maxSizeMB = isVideo ? 50 : 5
        showErrorMessage(
          `${file.name}: Fichier trop volumineux (max ${maxSizeMB}MB pour les ${isVideo ? "vidéos" : "images"})`,
        )
        continue
      }

      if (!isVideo && !isImage) {
        showErrorMessage(`${file.name}: Type de fichier non accepté`)
        continue
      }

      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    const maxMedia = 6
    const currentCount = variantMediaToUpload.length - variantMediaToDelete.length

    if (currentCount + validFiles.length > maxMedia) {
      showErrorMessage(`Maximum ${maxMedia} fichiers média pour la variante. Actuellement: ${currentCount}`)
      return
    }

    setIsUploading(true)
    const formData = new FormData()

    for (let i = 0; i < validFiles.length; i++) {
      formData.append("files", validFiles[i])
    }
    formData.append("resourceType", "product")
    formData.append("siteId", siteId)

    try {
      const response = await fetch("/api/services/ecommerce/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "x-site-id": siteId,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Upload error")
      }

      const data = await response.json()
      const uploadedMedia = data.data.urls.map((url: string, idx: number) => ({
        url,
        type: validFiles[idx].type.startsWith("video") ? "video" : "image",
      }))

      setVariantMediaToUpload([...variantMediaToUpload, ...uploadedMedia])
      showSuccessMessage("Médias de variante uploadés avec succès")
    } catch (error) {
      console.error("[DEBUG] Upload error:", error)
      showErrorMessage(error instanceof Error ? error.message : "Échec de l'upload")
    } finally {
      setIsUploading(false)
    }
  }

  const handleEditVariant = (variant: any) => {
    console.log("[DEBUG] Edit variant clicked:", variant)
    setEditingVariantId(variant.id || variant._id)
    setVariantForm({
      taille: variant.taille || "",
      color: variant.color || "",
      height: variant.height || "",
      width: variant.width || "",
      capacity: variant.capacity || "",
      weight: variant.weight || "",
      price: variant.price || 0,
      stockQuantity: variant.stockQuantity || 0,
    })
    setVariantMediaToUpload(variant.media || [])
    setVariantMediaToDelete([])
    setShowVariantModal(true) // Ensure modal opens
  }

  const handleSaveVariant = async () => {
    console.log("[DEBUG] handleSaveVariant called, editing variant:", editingVariantId)

    // Check if at least one variant field is filled (excluding price and stockQuantity)
    const hasVariantField = !!(
      variantForm.taille ||
      variantForm.color ||
      variantForm.height ||
      variantForm.width ||
      variantForm.capacity ||
      variantForm.weight
    )

    if (!hasVariantField) {
      showErrorMessage("Au moins un champ de variante doit être rempli (taille, couleur, dimensions, capacité, ou poids)")
      return
    }

    // Check for maximum variants only if we are adding a new one
    if (!editingVariantId && variants.length >= 4) {
      showErrorMessage("Maximum 4 variantes par produit")
      return
    }

    try {
      // Inherit from main product if variant field is empty
      const variantData = {
        id: editingVariantId || `variant_${Date.now()}`, // Generate unique ID for new variants
        _id: editingVariantId ? undefined : undefined, // If editing, _id should remain as is if it exists from DB
        taille: variantForm.taille || (productForm.taille as string) || undefined,
        color: variantForm.color || (productForm.color as string) || undefined,
        height: variantForm.height || ((productForm as any).height as string) || undefined,
        width: variantForm.width || ((productForm as any).width as string) || undefined,
        capacity: variantForm.capacity || ((productForm as any).capacity as string) || undefined,
        weight: variantForm.weight || ((productForm as any).weight as string) || undefined,
        // Price and stockQuantity: use variant value if set, otherwise inherit from product
        price: variantForm.price !== undefined && variantForm.price !== 0 
          ? variantForm.price 
          : (typeof productForm.price === 'number' ? productForm.price : Number.parseFloat(productForm.price as any) || 0),
        stockQuantity: variantForm.stockQuantity !== undefined && variantForm.stockQuantity !== 0
          ? variantForm.stockQuantity
          : (productForm.stock_quantity || 0),
        media: variantMediaToUpload,
      }

      if (editingVariantId) {
        // Update existing variant
        const updatedVariants = variants.map((v) => {
          if (v.id === editingVariantId || v._id === editingVariantId) {
            return {
              ...v, // Keep existing properties like _id if present
              ...variantData,
              id: v.id || v._id || variantData.id, // Preserve existing ID or _id if editing
            }
          }
          return v
        })
        setVariants(updatedVariants)
        console.log("[DEBUG] Variant updated successfully")
        showSuccessMessage("Variante mise à jour")
      } else {
        // Add new variant
        setVariants([...variants, variantData])
        console.log("[DEBUG] Variant added successfully")
        showSuccessMessage("Variante ajoutée")
      }

      // Reset form and close modal
      setShowVariantModal(false)
      setEditingVariantId(null)
      setVariantForm({
        taille: "",
        color: "",
        height: "",
        width: "",
        capacity: "",
        weight: "",
        price: 0,
        stockQuantity: 0,
      })
      setVariantMediaToUpload([])
      setVariantMediaToDelete([])
    } catch (error) {
      console.error("[DEBUG] Error saving variant:", error)
      showErrorMessage(error instanceof Error ? error.message : "Erreur lors de la sauvegarde de la variante")
    }
  }

  const handleRemoveVariant = (id: string) => {
    console.log("[DEBUG] Removing variant:", id)
    // Remove by both id and _id to handle potential database IDs
    setVariants(variants.filter((v) => v.id !== id && v._id !== id))
    showSuccessMessage("Variante supprimée")
  }

  const fetchProducts = async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/services/ecommerce/products/admin?siteId=${siteId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: Impossible de charger les produits`)
      }

      const text = await response.text()
      if (!text) {
        console.warn("[DEBUG] Empty response from products API")
        setProducts([])
        return
      }

      const data = JSON.parse(text)
      setProducts(data.data?.products || [])
    } catch (error) {
      console.error("Erreur lors du chargement des produits:", error)
      setError(error instanceof Error ? error.message : "Erreur inconnue")
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProduct = async () => {
    if (!productForm.title || !productForm.price) {
      showErrorMessage("Titre et prix requis")
      return
    }

    if (!productForm.description_short || !productForm.description_long) {
      showErrorMessage("Les descriptions courte et longue sont requises")
      return
    }

    try {
      const createResponse = await fetch(`/api/services/ecommerce/products/admin?siteId=${siteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...productForm,
          syncToStripe: true, // Always sync to Stripe automatically
          price: Number.parseFloat(productForm.price as any),
          stock_quantity: Number.parseInt(productForm.stock_quantity as any) || 0,
          low_stock_threshold: Number.parseInt(productForm.low_stock_threshold as any) || 10,
          categories: productForm.categories ? [productForm.categories] : [], // Ensure categories is an array
          media: newMediaItems, // Use unified media
          variants: variants, // Use simplified variants
          siteId,
          ...(productForm.deliveryCostOverride !== "" && productForm.deliveryCostOverride !== undefined
            ? { deliveryCostOverride: Number(productForm.deliveryCostOverride) }
            : {}),
        }),
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        throw new Error(errorData.error || "Erreur création produit")
      }

      const createdProduct = await createResponse.json()
      const productId = createdProduct.id || createdProduct._id

      if (!productId) {
        throw new Error("Failed to get product ID from response")
      }

      // Handle media attachment (if any)
      if (newMediaItems.length > 0) {
        const attachResponse = await fetch("/api/services/ecommerce/upload", {
          method: "POST",
          credentials: "include",
          headers: {
            "X-Requested-With": "XMLHttpRequest",
            "x-site-id": siteId,
          },
          body: (() => {
            const formData = new FormData()
            formData.append("resourceType", "product")
            formData.append("resourceId", productId)
            formData.append("siteId", siteId)
            newMediaItems.forEach((item) => {
              formData.append("mediaUrls", JSON.stringify({ url: item.url, type: item.type }))
            })
            return formData
          })(),
        })

        if (!attachResponse.ok) {
          console.error("Warning: Product created but media failed to attach")
        }
      }

      showSuccessMessage("Produit créé avec succès")
      // Refresh products list to get updated Stripe sync status
      await fetchProducts()
      setShowCreateModal(false)
      setProductForm({
        title: "",
        price: "",
        description_short: "",
        description_long: "",
        color: "",
        taille: "", // Reset
        stock_quantity: 0,
        low_stock_threshold: 10,
        categories: "",
        syncToStripe: true,
        height: "", // Reset
        width: "", // Reset
        capacity: "", // Reset
        weight: "", // Reset
        deliveryCostOverride: "",
      })
      setVariants([]) // Reset
      setMedia([]) // Reset
      setNewMediaItems([]) // Reset
      setMediaToDelete([]) // Reset
      fetchProducts()
      onDataChange?.()
    } catch (error) {
      console.error("Error creating product:", error)
      showErrorMessage(error instanceof Error ? error.message : "Erreur")
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    setShowDeleteConfirm(productId)
  }

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return

    try {
      const response = await fetch(`/api/services/ecommerce/products/admin/${showDeleteConfirm}?siteId=${siteId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erreur suppression")
      }

      showSuccessMessage("Produit supprimé")
      setShowDeleteConfirm(null)
      fetchProducts()
      onDataChange?.()
    } catch (error) {
      showErrorMessage(error instanceof Error ? error.message : "Erreur")
    }
  }

  const handleSyncStripe = async (productId: string) => {
    try {
      const response = await fetch(`/api/services/ecommerce/products/admin/${productId}/sync-stripe?siteId=${siteId}`, {
        method: "POST",
      })

      if (!response.ok) throw new Error("Erreur sync Stripe")

      showSuccessMessage("Produit synchronisé avec Stripe")
      fetchProducts()
      onDataChange?.()
    } catch (error) {
      showErrorMessage(error instanceof Error ? error.message : "Erreur")
    }
  }

  const handleSyncStripeFromEdit = async () => {
    if (!editingItem) return
    setIsSyncing(true)
    try {
      const response = await fetch(
        `/api/services/ecommerce/products/admin/${editingItem.id}/sync-stripe?siteId=${siteId}`,
        {
          method: "POST",
        },
      )

      if (!response.ok) throw new Error("Erreur sync Stripe")

      showSuccessMessage("Produit synchronisé avec Stripe")
      // Update editingItem to reflect sync status immediately
      setEditingItem({ ...editingItem, stripeProductId: "synced" })
      fetchProducts() // Re-fetch 
      onDataChange?.()
    } catch (error) {
      showErrorMessage(error instanceof Error ? error.message : "Erreur")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleEditProduct = async () => {
    if (!editingItem) return

    try {
      // Filter out deleted media from existing media
      const existingMedia = (editingItem?.media || []).filter((img: any) => {
        const imgUrl = typeof img === "string" ? img : (img.url || img)
        return !mediaToDelete.includes(imgUrl)
      }).map((img: any) => {
        // Normalize media objects
        if (typeof img === "string") {
          return { url: img, type: "image" }
        }
        return { url: img.url || img, type: img.type || "image" }
      })

      // Normalize new media items
      const newMedia = newMediaItems.map((item) => {
        if (item.url && item.type) {
          return { url: item.url, type: item.type }
        }
        return { url: typeof item === "string" ? item : item.url, type: "image" }
      })

      const finalMedia = [...existingMedia, ...newMedia]

      // Ensure variants are properly formatted with potential _id from DB
      const formattedVariants = variants.map((v: any) => ({
        _id: v._id, // Include _id if it exists
        id: v.id, // Include id if it exists
        price: v.price ?? 0,
        stockQuantity: v.stockQuantity ?? 0,
        taille: v.taille || "",
        color: v.color || "",
        height: v.height || "",
        width: v.width || "",
        capacity: v.capacity || "",
        weight: v.weight || "",
        media: (v.media || []).map(
          (m: any) =>
            typeof m === "string"
              ? { url: m, type: "image" } // Default to image if string
              : m.url && m.type
                ? m // Keep existing structure
                : { url: m.url || m, type: m.type || "image" }, // Ensure proper object structure
        ),
      }))

      const response = await fetch(`/api/services/ecommerce/products/admin/${editingItem.id}?siteId=${siteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...productForm,
          syncToStripe: true, // Always sync to Stripe automatically on update
          low_stock_threshold: Number.parseInt(productForm.low_stock_threshold as any) || 10,
          media: finalMedia,
          mediaToDelete: mediaToDelete,
          variants: formattedVariants,
          categories: productForm.categories ? [productForm.categories] : [],
          ...(productForm.deliveryCostOverride !== "" && productForm.deliveryCostOverride !== undefined
            ? { deliveryCostOverride: Number(productForm.deliveryCostOverride) }
            : {}),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erreur modification")
      }

      showSuccessMessage("Produit modifié avec succès")
      // Refresh products list to get updated Stripe sync status
      await fetchProducts()
      setShowEditModal(false)
      setEditingItem(null)
      setProductForm({
        title: "",
        price: "",
        description_short: "",
        description_long: "",
        color: "",
        taille: "", // Reset
        stock_quantity: 0,
        low_stock_threshold: 10,
        categories: "",
        syncToStripe: true,
        height: "", // Reset
        width: "", // Reset
        capacity: "", // Reset
        weight: "", // Reset
        deliveryCostOverride: "",
      })
      setVariants([]) // Reset
      setMedia([]) // Reset
      setNewMediaItems([]) // Reset
      setMediaToDelete([]) // Reset
      fetchProducts()
    } catch (error) {
      console.error("[DEBUG] Error updating product:", error)
      showErrorMessage(error instanceof Error ? error.message : "Erreur modification")
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [siteId, refreshTrigger])

  useEffect(() => {
    if (!siteId) return
    fetch(`/api/services/ecommerce/admin/config?siteId=${siteId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.config?.priceMode === "TTC") setPriceMode("TTC")
        else setPriceMode("HT")
      })
      .catch(() => setPriceMode("HT"))
  }, [siteId])

  const showSuccessMessage = (message: string) => {
    setSuccess(message)
    setError("")
    setTimeout(() => setSuccess(""), 5000)
  }

  const showErrorMessage = (message: string) => {
    setError(message)
    setSuccess("")
    setTimeout(() => setError(""), 8000)
  }

  const handleImageCarouselNext = (productId: string, totalImages: number) => {
    setImageCarouselIndex((prev) => ({
      ...prev,
      [productId]: ((prev[productId] || 0) + 1) % totalImages,
    }))
  }

  const handleImageCarouselPrev = (productId: string, totalImages: number) => {
    setImageCarouselIndex((prev) => ({
      ...prev,
      [productId]: ((prev[productId] || 0) - 1 + totalImages) % totalImages,
    }))
  }

  const filteredProducts = products
    .filter(
      (product) =>
        (product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description_short.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedCategory === "" ||
          (product.categories &&
            product.categories.some((cat) => (typeof cat === "object" ? cat._id : cat) === selectedCategory))),
    )
    .sort((a, b) => {
      let aVal: any
      let bVal: any

      if (sortBy === "price") {
        aVal = a.price
        bVal = b.price
      } else if (sortBy === "stock") {
        aVal = a.stock_quantity
        bVal = b.stock_quantity
      } else if (sortBy === "category") {
        // Safely access category name
        aVal =
          a.categories && a.categories.length > 0
            ? typeof a.categories[0] === "object"
              ? a.categories[0].name
              : a.categories[0]
            : ""
        bVal =
          b.categories && b.categories.length > 0
            ? typeof b.categories[0] === "object"
              ? b.categories[0].name
              : b.categories[0]
            : ""
      } else {
        aVal = a.title.toLowerCase()
        bVal = b.title.toLowerCase()
      }

      const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      return sortOrder === "asc" ? cmp : -cmp
    })

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = filteredProducts.slice(startIndex, endIndex)

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header with Search and Actions */}
      <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Liste des Produits</h3>
          <p className="text-sm text-gray-500">{filteredProducts.length} résultat(s)</p>
        </div>
        <div className="flex gap-2">
          <div className="w-full md:w-80 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher par titre ou description..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={fetchProducts}
            disabled={isLoading}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => {
              setShowCreateModal(true)
              setCategoryForSub("")
              setSubcategories([])
              setProductForm({
                title: "",
                price: "",
                description_short: "",
                description_long: "",
                color: "",
                taille: "", // Reset
                stock_quantity: 0,
                low_stock_threshold: 10,
                categories: "",
                syncToStripe: true,
                height: "", // Reset
                width: "", // Reset
                capacity: "", // Reset
                weight: "", // Reset
                deliveryCostOverride: "",
              })
              setVariants([]) // Reset
              setMedia([]) // Reset
              setNewMediaItems([]) // Reset
              setMediaToDelete([]) // Reset
              setEditingVariantId(null) // Ensure no variant is being edited on modal open
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Créer
          </button>
        </div>
      </div>

      {/* Filter and Sort Bar */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtrer et trier :</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value)
              setCurrentPage(1)
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
          >
            <option value="name">Nom</option>
            <option value="price">Prix</option>
            <option value="stock">Stock</option>
            <option value="category">Catégorie</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 bg-white"
          >
            <ArrowUpDown className="w-4 h-4" />
            {sortOrder === "asc" ? "Croissant" : "Décroissant"}
          </button>
        </div>
      </div>

      {/* Items List - Changed to Table Layout */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Produit</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Prix (EUR {priceMode})</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Stock</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Catégorie</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Stripe</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center">
                  <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun produit trouvé</h3>
                  <p className="text-gray-500">Créez votre premier produit</p>
                </td>
              </tr>
            ) : (
              currentItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  {/* Fix table to display media from unified media array and show variant count */}
                  <td className="px-4 py-6">
                    <div className="flex items-center gap-3">
                      {item.media && item.media.length > 0 ? (
                        <div className="relative group">
                          <img
                            src={item.media[imageCarouselIndex[item.id] || 0]?.url || "/placeholder.svg"}
                            alt="product"
                            className="w-20 h-20 rounded object-cover"
                          />
                          {/* Image counter badge */}
                          {item.media && item.media.length > 0 && (
                            <div className="absolute -bottom-1 -right-1 bg-gray-900 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                              {Math.min((imageCarouselIndex[item.id] || 0) + 1, item.media.filter((m) => m && (m.type === "image" || !m.type)).length)}/
                              {item.media.filter((m) => m && (m.type === "image" || !m.type)).length}
                            </div>
                          )}
                          {/* Navigation arrows - show on hover */}
                          {item.media.filter((m) => m.type === "image").length > 1 && (
                            <div className="absolute inset-0 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() =>
                                  handleImageCarouselPrev(item.id, (item.media || []).filter((m) => m.type === "image").length)
                                }
                                className="bg-black bg-opacity-60 text-white p-1 rounded-full hover:bg-opacity-80 transition-all"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 19l-7-7 7-7"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() =>
                                  handleImageCarouselNext(item.id, (item.media || []).filter((m) => m.type === "image").length)
                                }
                                className="bg-black bg-opacity-60 text-white p-1 rounded-full hover:bg-opacity-80 transition-all"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded bg-gray-200 flex items-center justify-center">
                          <ShoppingCart className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.description_short}</p>
                        {item.variants && item.variants.length > 0 && (
                          <p className="text-xs text-blue-600 font-medium mt-1">
                            {item.variants.length} variante{item.variants.length > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-6 text-sm text-gray-600">{item.price.toFixed(2)}€</td>
                  <td className="px-4 py-6 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">{item.stock_quantity}</span>
                      {item.stock_quantity <= item.low_stock_threshold && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium">
                          ⚠️ Faible
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-6 text-sm text-gray-600">
                    {item.categories && item.categories.length > 0
                      ? typeof item.categories[0] === "object"
                        ? item.categories[0].name
                        : item.categories[0]
                      : "-"}
                  </td>
                  <td className="px-4 py-6 text-sm">
                    {item.stripeProductId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Oui
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-medium">
                        Non
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">

                      <button
                        onClick={() => {
                          setEditingItem(item)
                          setProductForm({
                            title: item.title,
                            price: item.price.toString(),
                            description_short: item.description_short,
                            description_long: item.description_long,
                            color: (item as any).color || "",
                            taille: (item as any).taille || "",
                            stock_quantity: item.stock_quantity,
                            low_stock_threshold: item.low_stock_threshold,
                            categories:
                              item.categories && item.categories.length > 0
                                ? typeof item.categories[0] === "object"
                                  ? item.categories[0]._id // Use _id for category selection
                                  : item.categories[0]
                                : "",
                            syncToStripe: true, // This will be handled by the sync button in edit mode
                            height: item.height || "",
                            width: item.width || "",
                            capacity: item.capacity || "",
                            weight: item.weight || "",
                            deliveryCostOverride: (item as any).deliveryCostOverride ?? "",
                          })
                          // Map existing variants, ensuring they have an 'id' property for consistency
                          setVariants(
                            (item.variants || []).map((v) => ({
                              id: v.id || v._id?.toString() || `variant_${Date.now()}`, // Use v.id, fallback to _id, or generate new if neither exists
                              _id: v._id, // Preserve the database _id
                              price: v.price ?? 0,
                              stockQuantity: v.stockQuantity ?? 0,
                              taille: v.taille || "",
                              color: v.color || "",
                              height: v.height || "",
                              width: v.width || "",
                              capacity: v.capacity || "",
                              weight: v.weight || "",
                              media: v.media || [], // Ensure media is an array
                            })),
                          )
                          setMedia(
                            (item.media || []).map((m) => {
                              const url = typeof m === "string" ? m : (m.url || "")
                              const type = typeof m === "string" ? "image" : (m.type || "image")
                              return { url, type }
                            }),
                          )
                          setNewMediaItems([]) // Clear any new media from previous modal interactions
                          setMediaToDelete([]) // Clear any media marked for deletion
                          setShowEditModal(true)
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(item.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Affichage {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} sur {filteredProducts.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              Page {currentPage} sur {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[95vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">Créer un produit</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setProductForm({
                    title: "",
                    price: "",
                    description_short: "",
                    description_long: "",
                    color: "",
                    taille: "", // Reset
                    stock_quantity: 0,
                    low_stock_threshold: 10,
                    categories: "",
                    syncToStripe: true,
                    height: "", // Reset
                    width: "", // Reset
                    capacity: "", // Reset
                    weight: "", // Reset
                    deliveryCostOverride: "",
                  })
                  setVariants([]) // Reset
                  setMedia([]) // Reset
                  setNewMediaItems([]) // Reset
                  setMediaToDelete([]) // Reset
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre du produit *</label>
                <input
                  type="text"
                  placeholder="Ex: Produit"
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix (EUR {priceMode}) *</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    step="10"
                    min="0"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { return;} }}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                    €
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {priceMode === "HT" ? "Prix HT (sans taxes) — la TVA s'ajoute au checkout." : "Prix TTC (toutes taxes comprises) — le client paie ce montant."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coût livraison personnalisé (€/unité) (optionnel)</label>
                <input
                  type="number"
                  placeholder="Laisser vide = tarif global"
                  step="0.01"
                  min="0"
                  value={productForm.deliveryCostOverride === "" || productForm.deliveryCostOverride === undefined ? "" : productForm.deliveryCostOverride}
                  onChange={(e) => setProductForm({ ...productForm, deliveryCostOverride: e.target.value === "" ? "" : e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si renseigné, ce montant est utilisé par unité pour la livraison à la place du tarif par article du site.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description courte *</label>
                <input
                  type="text"
                  placeholder="Brève description du produit (50-100 caractères)"
                  value={productForm.description_short}
                  onChange={(e) => setProductForm({ ...productForm, description_short: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description longue *</label>
                <textarea
                  placeholder="Description détaillée du produit, caractéristiques, matériaux, etc."
                  value={productForm.description_long}
                  onChange={(e) => setProductForm({ ...productForm, description_long: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  rows={4}
                />
              </div>

              {/* Optional fields for basic product setup */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Couleur (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: Rouge"
                    value={productForm.color}
                    onChange={(e) => setProductForm({ ...productForm, color: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taille (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: L"
                    value={productForm.taille}
                    onChange={(e) => setProductForm({ ...productForm, taille: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Specification Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hauteur (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: 50cm"
                    value={(productForm as any).height}
                    onChange={(e) => setProductForm({ ...productForm, height: e.target.value } as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Largeur (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: 30cm"
                    value={(productForm as any).width}
                    onChange={(e) => setProductForm({ ...productForm, width: e.target.value } as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacité (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: 100L"
                    value={(productForm as any).capacity}
                    onChange={(e) => setProductForm({ ...productForm, capacity: e.target.value } as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poids (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: 5kg"
                    value={(productForm as any).weight}
                    onChange={(e) => setProductForm({ ...productForm, weight: e.target.value } as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantité en stock</label>
                <input
                  type="number"
                  placeholder="0"
                  value={productForm.stock_quantity}
                  onChange={(e) =>
                    setProductForm({ ...productForm, stock_quantity: Number.parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seuil d'alerte stock</label>
                <input
                  type="number"
                  placeholder="10"
                  value={productForm.low_stock_threshold}
                  onChange={(e) =>
                    setProductForm({ ...productForm, low_stock_threshold: Number.parseInt(e.target.value) || 10 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Alerte quand le stock descend en dessous de ce nombre</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                <select
                  value={categoryForSub || (categories.some((c) => c.id === productForm.categories) ? productForm.categories : "")}
                  onChange={(e) => {
                    const v = e.target.value
                    setProductForm({ ...productForm, categories: v })
                    setCategoryForSub(v)
                    fetchSubcategoriesForProduct(v)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                >
                  <option value="">Sélectionner une catégorie (ou aucune)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              {categoryForSub && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sous-catégorie (optionnel)</label>
                  <select
                    value={subcategories.some((s) => s.id === productForm.categories) ? productForm.categories : ""}
                    onChange={(e) => setProductForm({ ...productForm, categories: e.target.value || categoryForSub })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                  >
                    <option value="">— Aucune (catégorie uniquement)</option>
                    {subcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Media Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <label className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-600">Glissez des médias ou cliquez (max 6)</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*" // Accept both images and videos
                    onChange={(e) => handleMediaUpload(e.target.files!)}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>

              {/* Media Preview */}
              {(newMediaItems.length > 0 || media.length > 0) && (
                <div className="flex gap-2 flex-wrap">
                  {media.map((item) => (
                    <div key={`existing-${item.url}`} className="relative">
                      {item.type === "image" ? (
                        <img
                          src={item.url || "/placeholder.svg"}
                          alt="preview"
                          className="w-16 h-16 rounded object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded object-cover bg-black flex items-center justify-center">
                          <Video className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setMediaToDelete([...mediaToDelete, item.url])
                          setMedia(media.filter((m) => m.url !== item.url))
                        }}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {newMediaItems.map((item) => (
                    <div key={`new-${item.url}`} className="relative">
                      {item.type === "image" ? (
                        <img
                          src={item.url || "/placeholder.svg"}
                          alt="preview"
                          className="w-16 h-16 rounded object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded object-cover bg-black flex items-center justify-center">
                          <Video className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <button
                        onClick={() => setNewMediaItems(newMediaItems.filter((m) => m.url !== item.url))}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">Variantes du produit</label>
                  <button
                    onClick={() => {
                      setEditingVariantId(null) // Ensure we are creating a new variant
                      setVariantForm({
                        taille: "",
                        color: "",
                        height: "",
                        width: "",
                        capacity: "",
                        weight: "",
                        price: 0,
                        stockQuantity: 0,
                      })
                      setVariantMediaToUpload([]) // Reset variant media
                      setVariantMediaToDelete([]) // Reset deleted variant media
                      setShowVariantModal(true)
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>

                {variants.length > 0 ? (
                  <div className="space-y-2">
                    {variants.map((variant) => (
                      <div
                        key={variant.id || variant._id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{variant.taille || "Sans taille"}</p>
                          <p className="text-xs text-gray-500">
                            Stock: {variant.stockQuantity || productForm.stock_quantity} • Prix:{" "}
                            {Number(variant.price).toFixed(2)}€
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditVariant(variant)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Modifier cette variante"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const variantId = variant.id || variant._id
                              if (variantId) handleRemoveVariant(variantId)
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer cette variante"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">
                    Aucune variante ajoutée
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setProductForm({
                      title: "",
                      price: "",
                      description_short: "",
                      description_long: "",
                      color: "",
                      taille: "", // Reset
                      stock_quantity: 0,
                      low_stock_threshold: 10,
                      categories: "",
                      syncToStripe: true,
                      height: "", // Reset
                      width: "", // Reset
                      capacity: "", // Reset
                      weight: "", // Reset
                      deliveryCostOverride: "",
                    })
                    setVariants([]) // Reset
                    setMedia([]) // Reset
                    setNewMediaItems([]) // Reset
                    setMediaToDelete([]) // Reset
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateProduct}
                  disabled={isUploading}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 font-medium"
                >
                  Créer le produit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[95vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">Modifier le produit</h3>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingItem(null)
                  setProductForm({
                    title: "",
                    price: "",
                    description_short: "",
                    description_long: "",
                    color: "",
                    taille: "", // Reset
                    stock_quantity: 0,
                    low_stock_threshold: 10,
                    categories: "",
                    syncToStripe: true,
                    height: "", // Reset
                    width: "", // Reset
                    capacity: "", // Reset
                    weight: "", // Reset
                    deliveryCostOverride: "",
                  })
                  setVariants([]) // Reset
                  setMedia([]) // Reset
                  setNewMediaItems([]) // Reset
                  setMediaToDelete([]) // Reset
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre du produit *</label>
                <input
                  type="text"
                  placeholder="Ex: Produit"
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix (EUR {priceMode}) *</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                    €
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {priceMode === "HT" ? "Prix HT (sans taxes) — la TVA s'ajoute au checkout." : "Prix TTC (toutes taxes comprises) — le client paie ce montant."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coût livraison personnalisé (€/unité) (optionnel)</label>
                <input
                  type="number"
                  placeholder="Laisser vide = tarif global"
                  step="0.01"
                  min="0"
                  value={productForm.deliveryCostOverride === "" || productForm.deliveryCostOverride === undefined ? "" : productForm.deliveryCostOverride}
                  onChange={(e) => setProductForm({ ...productForm, deliveryCostOverride: e.target.value === "" ? "" : e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si renseigné, ce montant est utilisé par unité pour la livraison à la place du tarif par article du site.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description courte *</label>
                <input
                  type="text"
                  placeholder="Brève description du produit (50-100 caractères)"
                  value={productForm.description_short}
                  onChange={(e) => setProductForm({ ...productForm, description_short: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description longue *</label>
                <textarea
                  placeholder="Description détaillée du produit, caractéristiques, matériaux, etc."
                  value={productForm.description_long}
                  onChange={(e) => setProductForm({ ...productForm, description_long: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  rows={4}
                />
              </div>

              {/* Optional fields for basic product setup */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Couleur (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: Rouge"
                    value={productForm.color}
                    onChange={(e) => setProductForm({ ...productForm, color: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taille (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: L"
                    value={productForm.taille}
                    onChange={(e) => setProductForm({ ...productForm, taille: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Specification Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hauteur (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: 50cm"
                    value={(productForm as any).height}
                    onChange={(e) => setProductForm({ ...productForm, height: e.target.value } as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Largeur (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: 30cm"
                    value={(productForm as any).width}
                    onChange={(e) => setProductForm({ ...productForm, width: e.target.value } as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacité (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: 100L"
                    value={(productForm as any).capacity}
                    onChange={(e) => setProductForm({ ...productForm, capacity: e.target.value } as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poids (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: 5kg"
                    value={(productForm as any).weight}
                    onChange={(e) => setProductForm({ ...productForm, weight: e.target.value } as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantité en stock</label>
                <input
                  type="number"
                  placeholder="0"
                  value={productForm.stock_quantity}
                  onChange={(e) =>
                    setProductForm({ ...productForm, stock_quantity: Number.parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seuil d'alerte stock</label>
                <input
                  type="number"
                  placeholder="10"
                  value={productForm.low_stock_threshold}
                  onChange={(e) =>
                    setProductForm({ ...productForm, low_stock_threshold: Number.parseInt(e.target.value) || 10 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Alerte quand le stock descend en dessous de ce nombre</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                <select
                  value={categoryForSub || (categories.some((c) => c.id === productForm.categories) ? productForm.categories : "")}
                  onChange={(e) => {
                    const v = e.target.value
                    setProductForm({ ...productForm, categories: v })
                    setCategoryForSub(v)
                    fetchSubcategoriesForProduct(v)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                >
                  <option value="">Sélectionner une catégorie (ou aucune)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              {categoryForSub && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sous-catégorie (optionnel)</label>
                  <select
                    value={subcategories.some((s) => s.id === productForm.categories) ? productForm.categories : ""}
                    onChange={(e) => setProductForm({ ...productForm, categories: e.target.value || categoryForSub })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                  >
                    <option value="">— Aucune (catégorie uniquement)</option>
                    {subcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Médias du produit</label>

                {media.length + newMediaItems.length - mediaToDelete.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-600 mb-2">Médias actuels:</p>
                    <div className="flex gap-2 flex-wrap">
                      {/* Existing media */}
                      {media.map(
                        (item) =>
                          !mediaToDelete.includes(item.url) && (
                            <div key={`existing-${item.url}`} className="relative">
                              {item.type === "image" ? (
                                <img
                                  src={item.url || "/placeholder.svg"}
                                  alt="current"
                                  className="w-16 h-16 rounded object-cover"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded object-cover bg-black flex items-center justify-center">
                                  <Video className="w-6 h-6 text-white" />
                                </div>
                              )}
                              <button
                                onClick={() => {
                                  const urlToDelete = item.url
                                  // Only add to delete list, don't remove from state immediately
                                  // The filter in the map will handle hiding it
                                  setMediaToDelete((prev) => {
                                    if (prev.includes(urlToDelete)) return prev
                                    return [...prev, urlToDelete]
                                  })
                                }}
                                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-700"
                                title="Supprimer ce média"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ),
                      )}

                      {/* Newly uploaded media */}
                      {newMediaItems.map((item) => (
                        <div key={`new-${item.url}`} className="relative">
                          {item.type === "image" ? (
                            <img
                              src={item.url || "/placeholder.svg"}
                              alt="new"
                              className="w-16 h-16 rounded object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded object-cover bg-black flex items-center justify-center">
                              <Video className="w-6 h-6 text-white" />
                            </div>
                          )}
                          <button
                            onClick={() => {
                              const urlToDelete = item.url
                              setNewMediaItems((prev) => prev.filter((m) => m.url !== urlToDelete))
                            }}
                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-700"
                            title="Supprimer ce média"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <label className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-6 h-6 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Glissez des médias ou cliquez (max 6 - actuellement{" "}
                        {media.length + newMediaItems.length - mediaToDelete.length})
                      </span>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={(e) => handleMediaUpload(e.target.files!)}
                      className="hidden"
                      disabled={isUploading || media.length + newMediaItems.length - mediaToDelete.length >= 6}
                    />
                  </label>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">Variantes du produit</label>
                  <button
                    onClick={() => {
                      setEditingVariantId(null) // Ensure we are creating a new variant
                      setVariantForm({
                        taille: "",
                        color: "",
                        height: "",
                        width: "",
                        capacity: "",
                        weight: "",
                        price: 0,
                        stockQuantity: 0,
                      })
                      setVariantMediaToUpload([]) // Reset variant media
                      setVariantMediaToDelete([]) // Reset deleted variant media
                      setShowVariantModal(true)
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>

                {variants.length > 0 ? (
                  <div className="space-y-2">
                    {variants.map((variant) => (
                      <div
                        key={variant.id || variant._id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{variant.taille || "Sans taille"}</p>
                          <p className="text-xs text-gray-500">
                            Stock: {variant.stockQuantity || productForm.stock_quantity} • Prix:{" "}
                            {Number(variant.price).toFixed(2)}€
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditVariant(variant)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Modifier cette variante"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const variantId = variant.id || variant._id
                              if (variantId) handleRemoveVariant(variantId)
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer cette variante"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">
                    Aucune variante ajoutée
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Synchronisation Stripe</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Statut</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {editingItem?.stripeProductId ? "Produit synchronisé avec Stripe" : "Non synchronisé avec Stripe"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                        editingItem?.stripeProductId ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {editingItem?.stripeProductId ? "Oui" : "Non"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingItem(null)
                    setProductForm({
                      title: "",
                      price: "",
                      description_short: "",
                      description_long: "",
                      color: "",
                      taille: "", // Reset
                      stock_quantity: 0,
                      low_stock_threshold: 10,
                      categories: "",
                      syncToStripe: true,
                      height: "", // Reset
                      width: "", // Reset
                      capacity: "", // Reset
                      weight: "", // Reset
                      deliveryCostOverride: "",
                    })
                    setVariants([]) // Reset
                    setMedia([]) // Reset
                    setNewMediaItems([]) // Reset
                    setMediaToDelete([]) // Reset
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleEditProduct}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-medium"
                >
                  Modifier le produit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmer la suppression</h3>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Variant Modal */}
      {showVariantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h4 className="font-semibold">
                {editingVariantId ? "Modifier la variante" : "Créer une variante de produit"}
              </h4>
              <button
                onClick={() => {
                  setShowVariantModal(false)
                  setEditingVariantId(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-yellow-900 mb-1">
                    Règle de validation
                  </p>
                  <p className="text-xs text-yellow-800">
                    Au moins un champ de variante doit être rempli (taille, couleur, dimensions, capacité, ou poids). 
                    Les autres champs hériteront automatiquement des valeurs du produit principal si laissés vides.
                  </p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-900 mb-2">
                  Données héritées du produit principal (hériteront si vides):
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-blue-700">
                      Titre: <span className="font-medium">{productForm.title}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700">
                      Prix de base: <span className="font-medium">{productForm.price}€</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700">
                      Couleur: <span className="font-medium">{productForm.color || "Non définie"}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700">
                      Taille: <span className="font-medium">{productForm.taille || "Non définie"}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700">
                      Hauteur: <span className="font-medium">{(productForm as any).height || "Non définie"}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700">
                      Largeur: <span className="font-medium">{(productForm as any).width || "Non définie"}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700">
                      Capacité: <span className="font-medium">{(productForm as any).capacity || "Non définie"}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700">
                      Poids: <span className="font-medium">{(productForm as any).weight || "Non définie"}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taille/Variant (Optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: L, M, XL ou autre spécification"
                  value={variantForm.taille}
                  onChange={(e) => setVariantForm({ ...variantForm, taille: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Laissez vide pour hériter la valeur du produit</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Couleur (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: Rouge (hérité si vide)"
                    value={variantForm.color}
                    onChange={(e) => setVariantForm({ ...variantForm, color: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Laissez vide pour hériter</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hauteur (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: 50cm (hérité si vide)"
                    value={variantForm.height}
                    onChange={(e) => setVariantForm({ ...variantForm, height: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Laissez vide pour hériter</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Largeur (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: 30cm (hérité si vide)"
                    value={variantForm.width}
                    onChange={(e) => setVariantForm({ ...variantForm, width: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Laissez vide pour hériter</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacité (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: 100L (hérité si vide)"
                    value={variantForm.capacity}
                    onChange={(e) => setVariantForm({ ...variantForm, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Laissez vide pour hériter</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poids (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: 5kg (hérité si vide)"
                    value={variantForm.weight}
                    onChange={(e) => setVariantForm({ ...variantForm, weight: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Laissez vide pour hériter</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix de cette variante (€) (Optionnel)</label>
                <input
                  type="number"
                  placeholder="0.00 (hérite du produit si 0 ou vide)"
                  step="0.01"
                  min="0"
                  value={variantForm.price}
                  onChange={(e) => setVariantForm({ ...variantForm, price: Number.parseFloat(e.target.value) || 0 })}
                  onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { return;} }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Laissez 0 ou vide pour hériter du prix du produit principal</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantité en stock (Optionnel)</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={variantForm.stockQuantity}
                  onChange={(e) =>
                    setVariantForm({ ...variantForm, stockQuantity: Number.parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Laissez 0 ou vide pour hériter de la quantité du produit principal</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Médias pour cette variante (max 6)
                </label>

                {variantMediaToUpload.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-600 mb-2">Médias actuels de la variante:</p>
                    <div className="flex gap-2 flex-wrap">
                      {variantMediaToUpload
                        .filter((item) => !variantMediaToDelete.includes(item.url))
                        .map((item, idx) => (
                          <div key={`variant-media-${idx}`} className="relative">
                            {item.type === "image" ? (
                              <img
                                src={item.url || "/placeholder.svg"}
                                alt="variant media"
                                className="w-16 h-16 rounded object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded object-cover bg-black flex items-center justify-center">
                                <Video className="w-6 h-6 text-white" />
                              </div>
                            )}
                            <button
                              onClick={() => {
                                const urlToDelete = item.url
                                setVariantMediaToDelete((prev) => [...prev, urlToDelete])
                                setVariantMediaToUpload((prev) => prev.filter((m) => m.url !== urlToDelete))
                              }}
                              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-700"
                              title="Supprimer ce média"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <label className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-6 h-6 text-gray-400" />
                      <span className="text-sm text-gray-600">Glissez des médias ou cliquez</span>
                      <span className="text-xs text-gray-500">Images (max 5MB) ou Vidéos (max 50MB)</span>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => handleVariantMediaUpload(e.target.files!)}
                      disabled={isUploading || variantMediaToUpload.length >= 6}
                    />
                  </label>
                </div>
              </div>


              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowVariantModal(false)
                    setEditingVariantId(null)
                    setVariantForm({
                      taille: "",
                      color: "",
                      height: "",
                      width: "",
                      capacity: "",
                      weight: "",
                      price: 0,
                      stockQuantity: 0,
                    })
                    setVariantMediaToUpload([])
                    setVariantMediaToDelete([])
                  }}
                  className="flex-1 px-3 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveVariant}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingVariantId ? "Mettre à jour la variante" : "Créer la variante"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="fixed top-4 right-4 p-3 bg-red-50 border border-red-200 rounded-lg z-[9999] shadow-lg">
          <p className="text-sm text-red-600">
            <strong>Erreur :</strong> {error}
          </p>
        </div>
      )}
      {success && (
        <div className="fixed top-4 right-4 p-3 bg-green-50 border border-green-200 rounded-lg z-[9999] shadow-lg">
          <p className="text-sm text-green-600">
            <strong>Succès :</strong> {success}
          </p>
        </div>
      )}
    </div>
  )
}
