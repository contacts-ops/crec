"use client"

import { useState, useEffect, Fragment } from "react"
import { useSiteLink } from "@/hooks/use-site-link"
import { Search, RefreshCw, Edit, Trash2, Layers, Plus, X, Upload, Filter, ArrowUpDown } from "lucide-react"

interface Category {
  id: string
  siteId: string
  name: string
  slug: string
  description: string
  visible?: boolean
  order?: number
  parent?: string | null
  parentPopulated?: { id: string; name: string } | null
  images?: string[]
  createdAt: string
  updatedAt: string
}

interface CategoriesAdminProps {
  siteId: string
  onDataChange?: () => void
  refreshTrigger?: number
}

export default function CategoriesAdmin({ siteId, onDataChange, refreshTrigger }: CategoriesAdminProps) {
  const { transformLink } = useSiteLink()
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Category | null>(null)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
    parent: "" as string, // optional: parent category id for subcategories
  })

  const [topLevelOnly, setTopLevelOnly] = useState(true) // true = only categories, false = all (categories + subcategories)
  const [subcategoriesByParent, setSubcategoriesByParent] = useState<Record<string, Category[]>>({})
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null)
  const [topLevelCategories, setTopLevelCategories] = useState<Category[]>([]) // for parent dropdown in create/edit

  const itemsPerPage = 10

  const fetchCategories = async () => {
    setIsLoading(true)
    setError("")

    try {
      const params = new URLSearchParams({ siteId })
      if (topLevelOnly) params.set("topLevelOnly", "true")
      const response = await fetch(`/api/services/ecommerce/categories/admin?${params}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: Impossible de charger les catégories`)
      }

      const text = await response.text()
      if (!text) {
        console.warn("[DEBUG] Empty response from categories API")
        setCategories([])
        return
      }

      const data = JSON.parse(text)
      setCategories(data.data?.categories || [])
    } catch (error) {
      console.error("Erreur lors du chargement des catégories:", error)
      setError(error instanceof Error ? error.message : "Erreur inconnue")
      setCategories([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = async (files: FileList) => {
    if (!files) return

    const maxImages = 1
    const currentImageCount = (editingItem?.images?.length || 0) - imagesToDelete.length + uploadedImages.length

    if (currentImageCount + files.length > maxImages) {
      showErrorMessage(`Maximum ${maxImages} image autorisée. Vous en avez actuellement ${currentImageCount}`)
      return
    }

    setIsUploading(true)
    const formData = new FormData()

    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i])
    }
    formData.append("resourceType", "category")
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
        throw new Error("Erreur lors de l'upload")
      }

      const data = await response.json()
      setUploadedImages([...uploadedImages, ...data.data.urls])
      showSuccessMessage("Image uploadée avec succès")
    } catch (error) {
      showErrorMessage(error instanceof Error ? error.message : "Erreur d'upload")
    } finally {
      setIsUploading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!categoryForm.name || !categoryForm.slug) {
      showErrorMessage("Nom et slug requis")
      return
    }

    const imagesToSend = uploadedImages.length > 0 ? uploadedImages : []
    console.log("[DEBUG] Creating category with images:", imagesToSend)

    try {
      const createResponse = await fetch(`/api/services/ecommerce/categories/admin?siteId=${siteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryForm.name,
          slug: categoryForm.slug,
          description: categoryForm.description,
          parent: categoryForm.parent || undefined,
          images: imagesToSend,
          siteId,
        }),
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        throw new Error(errorData.error || "Erreur création catégorie")
      }

      const createdCategory = await createResponse.json()
      console.log("[DEBUG] Category created:", createdCategory)

      showSuccessMessage("Catégorie créée avec succès")
      setShowCreateModal(false)
      setCategoryForm({ name: "", slug: "", description: "", parent: "" })
      setUploadedImages([])
      setImagesToDelete([])

      await fetchCategories()
      onDataChange?.()
    } catch (error) {
      console.error("Error creating category:", error)
      showErrorMessage(error instanceof Error ? error.message : "Erreur")
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    setShowDeleteConfirm(categoryId)
  }

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return

    try {
      const response = await fetch(`/api/services/ecommerce/categories/admin/${showDeleteConfirm}?siteId=${siteId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erreur suppression")
      }

      showSuccessMessage("Catégorie supprimée")
      setShowDeleteConfirm(null)

      await fetchCategories()
      onDataChange?.()
    } catch (error) {
      showErrorMessage(error instanceof Error ? error.message : "Erreur")
    }
  }

  const handleEditCategory = async () => {
    if (!editingItem) return

    try {
      const finalImages = [
        ...(editingItem?.images?.filter((img) => !imagesToDelete.includes(img)) || []),
        ...uploadedImages,
      ]

      const response = await fetch(`/api/services/ecommerce/categories/admin/${editingItem.id}?siteId=${siteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryForm.name,
          slug: categoryForm.slug,
          description: categoryForm.description,
          parent: categoryForm.parent || null,
          images: finalImages,
          imagesToDelete: imagesToDelete,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erreur modification")
      }

      showSuccessMessage("Catégorie modifiée avec succès")
      setShowEditModal(false)
      setEditingItem(null)
      setCategoryForm({ name: "", slug: "", description: "" })
      setUploadedImages([])
      setImagesToDelete([])
      fetchCategories()
      onDataChange?.()
    } catch (error) {
      showErrorMessage(error instanceof Error ? error.message : "Erreur")
    }
  }

  const fetchSubcategories = async (parentId: string) => {
    const isExpanded = expandedParentId === parentId
    if (isExpanded) {
      setExpandedParentId(null)
      return
    }
    try {
      const response = await fetch(
        `/api/services/ecommerce/categories/admin?siteId=${siteId}&parentId=${parentId}`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
      )
      if (!response.ok) return
      const data = await response.json()
      const list = data.data?.categories || []
      setSubcategoriesByParent((prev) => ({ ...prev, [parentId]: list }))
      setExpandedParentId(parentId)
    } catch (e) {
      console.error("Error fetching subcategories:", e)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [siteId, refreshTrigger, topLevelOnly])

  // Fetch top-level categories for parent dropdown when create/edit modal is open
  useEffect(() => {
    if (!siteId || (!showCreateModal && !showEditModal)) return
    const params = new URLSearchParams({ siteId, topLevelOnly: "true" })
    fetch(`/api/services/ecommerce/categories/admin?${params}`, { headers: { "Content-Type": "application/json" } })
      .then((r) => r.json())
      .then((data) => setTopLevelCategories(data.data?.categories ?? []))
      .catch(() => setTopLevelCategories([]))
  }, [siteId, showCreateModal, showEditModal])

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

  const filteredCategories = categories
    .filter(
      (category) =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.slug.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, "fr")
      return sortOrder === "asc" ? cmp : -cmp
    })

  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = filteredCategories.slice(startIndex, endIndex)

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header with Search and Actions */}
      <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Liste des Catégories</h3>
          <p className="text-sm text-gray-500">{filteredCategories.length} résultat(s)</p>
        </div>
        <div className="flex gap-2">
          <div className="w-full md:w-80 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher par nom ou slug..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={fetchCategories}
            disabled={isLoading}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => {
              setShowCreateModal(true)
              setCategoryForm({ name: "", slug: "", description: "", parent: "" })
              setUploadedImages([])
              setImagesToDelete([])
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Trier par :</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!topLevelOnly}
              onChange={(e) => setTopLevelOnly(!e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Afficher sous-catégories</span>
          </label>
        </div>
        <div className="flex items-center gap-2">
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
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Catégorie</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Slug</th>
              {!topLevelOnly && (
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Parent</th>
              )}
              {topLevelOnly && (
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Sous-catégories</th>
              )}
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={topLevelOnly ? 4 : 4} className="p-8 text-center">
                  <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune catégorie trouvée</h3>
                  <p className="text-gray-500">Créez votre première catégorie</p>
                </td>
              </tr>
            ) : (
              currentItems.map((item) => (
                <>
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-6">
                    <div className="flex items-center gap-3">
                      {item.images && item.images.length > 0 && (
                        <img
                          src={item.images[0] || "/placeholder.svg"}
                          alt="category"
                          className="w-20 h-20 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            // Open lightbox for category image
                          }}
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-6 text-sm text-gray-600">{item.slug}</td>
                  {!topLevelOnly && (
                    <td className="px-4 py-6 text-sm text-gray-600">
                      {(item as any).parent?.name ?? "—"}
                    </td>
                  )}
                  {topLevelOnly && (
                    <td className="px-4 py-6">
                      <button
                        type="button"
                        onClick={() => fetchSubcategories(item.id)}
                        className="text-sm text-gray-600 hover:text-gray-900 underline"
                      >
                        {expandedParentId === item.id
                          ? "Masquer"
                          : subcategoriesByParent[item.id] !== undefined
                            ? `Voir (${subcategoriesByParent[item.id].length})`
                            : "Voir"}
                      </button>
                      {expandedParentId === item.id && (subcategoriesByParent[item.id]?.length ?? 0) === 0 && (
                        <span className="text-xs text-gray-500 ml-1">Aucune</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingItem(item)
                          setCategoryForm({
                            name: item.name,
                            slug: item.slug,
                            description: item.description ?? "",
                            parent: item.parent ?? "",
                          })
                          setUploadedImages([])
                          setImagesToDelete([])
                          setShowEditModal(true)
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              {topLevelOnly && expandedParentId === item.id && (subcategoriesByParent[item.id]?.length ?? 0) > 0 && (
                <tr className="bg-gray-50">
                  <td colSpan={4} className="px-4 py-2">
                    <div className="pl-8 space-y-1">
                      <p className="text-xs font-medium text-gray-500 mb-2">Sous-catégories :</p>
                      {subcategoriesByParent[item.id].map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                          <span className="text-sm text-gray-700">{sub.name}</span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(sub)
                                setCategoryForm({
                                  name: sub.name,
                                  slug: sub.slug,
                                  description: sub.description ?? "",
                                  parent: sub.parent ?? item.id,
                                })
                                setUploadedImages([])
                                setImagesToDelete([])
                                setShowEditModal(true)
                              }}
                              className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(sub.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Affichage {startIndex + 1}-{Math.min(endIndex, filteredCategories.length)} sur {filteredCategories.length}
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
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">Créer une catégorie</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la catégorie *</label>
                <input
                  type="text"
                  placeholder="Ex: Transpalettes"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL) *</label>
                <input
                  type="text"
                  placeholder="Ex: transpalettes (sans espaces, minuscules)"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  placeholder="Description de la catégorie pour les clients"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent (optionnel — sous-catégorie)</label>
                <select
                  value={categoryForm.parent}
                  onChange={(e) => setCategoryForm({ ...categoryForm, parent: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="">— Catégorie principale (aucun parent)</option>
                  {topLevelCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Image Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <label className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-600">Glissez une image ou cliquez (max 1)</span>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files!)}
                    className="hidden"
                    disabled={isUploading || uploadedImages.length >= 1}
                  />
                </label>
              </div>

              {/* Image Preview */}
              {uploadedImages.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img src={img || "/placeholder.svg"} alt="preview" className="w-16 h-16 rounded object-cover" />
                      <button
                        onClick={() => setUploadedImages(uploadedImages.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateCategory}
                  disabled={isUploading}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 font-medium"
                >
                  Créer la catégorie
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">Modifier la catégorie</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la catégorie *</label>
                <input
                  type="text"
                  placeholder="Ex: Transpalettes"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL) *</label>
                <input
                  type="text"
                  placeholder="Ex: transpalettes (sans espaces, minuscules)"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  placeholder="Description de la catégorie pour les clients"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent (optionnel — sous-catégorie)</label>
                <select
                  value={categoryForm.parent}
                  onChange={(e) => setCategoryForm({ ...categoryForm, parent: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="">— Catégorie principale (aucun parent)</option>
                  {topLevelCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image de la catégorie</label>

                {(editingItem?.images?.length || 0) - imagesToDelete.length + uploadedImages.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-600 mb-2">Images actuelles:</p>
                    <div className="flex gap-2 flex-wrap">
                      {editingItem?.images?.map(
                        (img, idx) =>
                          !imagesToDelete.includes(img) && (
                            <div key={`existing-${idx}`} className="relative">
                              <img
                                src={img || "/placeholder.svg"}
                                alt="current"
                                className="w-16 h-16 rounded object-cover"
                              />
                              <button
                                onClick={() => setImagesToDelete([...imagesToDelete, img])}
                                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-700"
                                title="Supprimer cette image"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ),
                      )}

                      {uploadedImages.map((img, idx) => (
                        <div key={`new-${idx}`} className="relative">
                          <img src={img || "/placeholder.svg"} alt="new" className="w-16 h-16 rounded object-cover" />
                          <button
                            onClick={() => setUploadedImages(uploadedImages.filter((_, i) => i !== idx))}
                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-700"
                            title="Supprimer cette image"
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
                        Glissez une image ou cliquez (max 1 - actuellement{" "}
                        {(editingItem?.images?.length || 0) - imagesToDelete.length + uploadedImages.length})
                      </span>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files!)}
                      className="hidden"
                      disabled={
                        isUploading ||
                        (editingItem?.images?.length || 0) - imagesToDelete.length + uploadedImages.length >= 1
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleEditCategory}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-medium"
                >
                  Modifier la catégorie
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
                Êtes-vous sûr de vouloir supprimer cette catégorie ? Cette action est irréversible.
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
