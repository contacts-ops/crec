"use client"

import { useState, useEffect } from "react"
import { useSiteLink } from "@/hooks/use-site-link"
import { ShoppingCart, Search, RefreshCw, Eye, Trash2, Filter, ArrowUpDown, X } from "lucide-react"

interface Order {
  id: string
  siteId: string
  email: string // Changed from customerEmail to match order model
  status: "Pending" | "Processing" | "Packed" | "Shipped" | "Delivered" | "CancellationRequested" | "Cancelled" | "Refunded"
  paymentStatus: "Pending" | "Completed" | "Failed" | "Refunded"
  total: number
  items: any[]
  shippingAddress?: {
    nom: string
    prenom: string
    address: string
    city: string
    zipCode: string
  }
  createdAt: string
  updatedAt: string
}

interface OrdersAdminProps {
  siteId: string
}

export default function OrdersAdmin({ siteId }: OrdersAdminProps) {
  const { transformLink } = useSiteLink()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [isApprovingCancellation, setIsApprovingCancellation] = useState(false)

  const itemsPerPage = 10

  const fetchOrders = async () => {
    setIsLoading(true)
    setError("")

    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append("status", statusFilter)
      if (searchTerm) params.append("search", searchTerm)

      const response = await fetch(`/api/services/ecommerce/orders/admin?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Erreur lors du chargement des commandes")
      }

      const data = await response.json()
      // Transform orders to match the interface
      const transformedOrders = (data.orders || []).map((order: any) => ({
        ...order,
        // Ensure status and paymentStatus match the interface
        status: order.status || "Pending",
        paymentStatus: order.paymentStatus || "Pending",
      }))
      setOrders(transformedOrders)
    } catch (error) {
      console.error("Erreur lors du chargement des commandes:", error)
      setError(error instanceof Error ? error.message : "Erreur inconnue")
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [siteId])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setIsUpdatingStatus(true)
    try {
      const response = await fetch(`/api/services/ecommerce/orders/admin/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json",
                    "x-site-id": siteId,
         },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Erreur lors de la mise à jour")
      }

      const updatedOrder = await response.json()
      setOrders(orders.map((o) => (o.id === orderId ? updatedOrder : o)))
      setSelectedOrder(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleDeleteOrder = (orderId: string) => {
    setShowDeleteConfirm(orderId)
  }

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return

    try {
      const response = await fetch(`/api/services/ecommerce/orders/admin/${showDeleteConfirm}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Erreur lors de la suppression")
      }

      setOrders(orders.filter((o) => o.id !== showDeleteConfirm))
      setSelectedOrder(null)
      setShowDeleteConfirm(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur inconnue")
      setShowDeleteConfirm(null)
    }
  }

  const handleApproveCancellation = async (orderId: string) => {
    if (!confirm("Approuver l'annulation de cette commande ? Le remboursement sera traité automatiquement si le paiement a été effectué.")) {
      return
    }

    setIsApprovingCancellation(true)
    try {
      const response = await fetch(`/api/services/ecommerce/orders/${orderId}/approve-cancellation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert(data.message || "Annulation approuvée avec succès")
        await fetchOrders()
        setSelectedOrder(null)
      } else {
        setError(data.error || "Erreur lors de l'approbation de l'annulation")
      }
    } catch (error) {
      console.error("Error approving cancellation:", error)
      setError(error instanceof Error ? error.message : "Erreur lors de l'approbation de l'annulation")
    } finally {
      setIsApprovingCancellation(false)
    }
  }

  const filteredOrders = orders
    .filter((order) => {
      const customerName = order.shippingAddress 
        ? `${order.shippingAddress.prenom} ${order.shippingAddress.nom}`.trim()
        : ""
      const matchesSearch =
        order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customerName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = !statusFilter || order.status.toLowerCase() === statusFilter.toLowerCase()
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA
    })

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = filteredOrders.slice(startIndex, endIndex)

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase()
    switch (normalizedStatus) {
      case "delivered":
        return "bg-green-50 text-green-700 border-green-200"
      case "shipped":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "processing":
      case "packed":
        return "bg-purple-50 text-purple-700 border-purple-200"
      case "prêt à être livré":
      case "prêt à être retiré":
        return "bg-teal-50 text-teal-700 border-teal-200"
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
      case "cancellationrequested":
        return "bg-orange-50 text-orange-700 border-orange-200"
      case "cancelled":
      case "refunded":
        return "bg-red-50 text-red-700 border-red-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const getPaymentStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase()
    switch (normalizedStatus) {
      case "completed":
      case "paid":
        return "bg-green-100 text-green-800"
      case "pending":
      case "unpaid":
        return "bg-orange-100 text-orange-800"
      case "refunded":
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "Pending":
        return "En attente"
      case "Processing":
        return "En cours de traitement"
      case "Packed":
        return "Emballé"
      case "Shipped":
        return "Expédié"
      case "Delivered":
        return "Livré"
      case "Prêt à être livré":
        return "Prêt à être livré"
      case "Prêt à être retiré":
        return "Prêt à être retiré"
      case "CancellationRequested":
        return "Annulation demandée"
      case "Cancelled":
        return "Annulé"
      case "Refunded":
        return "Remboursé"
      default:
        return status
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Header with Search and Actions */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Liste des Commandes</h3>
            <p className="text-sm text-gray-500">{filteredOrders.length} résultat(s)</p>
          </div>
          <div className="flex gap-2 flex-col sm:flex-row">
            <div className="w-full md:w-80 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={fetchOrders}
              disabled={isLoading}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </div>

        {/* Filter and Sort Bar */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtre :</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="processing">En cours de traitement</option>
              <option value="packed">Emballé</option>
              <option value="shipped">Expédié</option>
              <option value="delivered">Livré</option>
              <option value="prêt à être livré">Prêt à être livré</option>
              <option value="prêt à être retiré">Prêt à être retiré</option>
              <option value="cancellationrequested">Annulation demandée</option>
              <option value="cancelled">Annulé</option>
              <option value="refunded">Remboursé</option>
            </select>
          </div>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 bg-white w-fit"
          >
            <ArrowUpDown className="w-4 h-4" />
            {sortOrder === "asc" ? "Ancien" : "Récent"}
          </button>
        </div>

        {/* Items List */}
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {currentItems.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune commande trouvée</h3>
              <p className="text-gray-500">Les commandes apparaîtront ici une fois reçues</p>
            </div>
          ) : (
            currentItems.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h4 className="font-medium text-gray-900">
                        {order.shippingAddress 
                          ? `${order.shippingAddress.prenom} ${order.shippingAddress.nom}`.trim()
                          : "Client"}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getPaymentStatusColor(order.paymentStatus)}`}
                      >
                        {order.paymentStatus === "Completed"
                          ? "Payée"
                          : order.paymentStatus === "Pending"
                            ? "Non payée"
                            : order.paymentStatus === "Refunded"
                              ? "Remboursée"
                              : "Échouée"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2 truncate">{order.email}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                      <span>{order.items.length} article(s)</span>
                      <span className="font-medium">{order.total.toFixed(2)}€</span>
                      <span className="text-gray-400">{new Date(order.createdAt).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Voir les détails"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-gray-600">
              Affichage {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} sur {filteredOrders.length}
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

        {/* Error Message */}
        {error && (
          <div className="fixed top-4 right-4 p-3 bg-red-50 border border-red-200 rounded-lg z-40">
            <p className="text-sm text-red-600">
              <strong>Erreur :</strong> {error}
            </p>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Détails de la commande</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Customer Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Informations Client</h3>
                {selectedOrder.shippingAddress && (
                  <>
                    <p className="text-sm text-gray-600">
                      <strong>Nom :</strong> {selectedOrder.shippingAddress.prenom} {selectedOrder.shippingAddress.nom}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Adresse :</strong> {selectedOrder.shippingAddress.address}, {selectedOrder.shippingAddress.city} {selectedOrder.shippingAddress.zipCode}
                    </p>
                  </>
                )}
                <p className="text-sm text-gray-600">
                  <strong>Email :</strong> {selectedOrder.email}
                </p>
              </div>

              {/* Status Management */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Statut de la commande</h3>
                
                {/* Special handling for cancellation requests */}
                {selectedOrder.status === "CancellationRequested" && (
                  <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800 font-medium mb-2">
                      ⚠️ Demande d'annulation en attente
                    </p>
                    <p className="text-xs text-orange-600 mb-3">
                      Le client a demandé l'annulation de cette commande. Approuvez pour annuler la commande. 
                      {selectedOrder.paymentStatus === "Completed" && (
                        <span className="font-semibold block mt-1">
                          ⚠️ Paiement effectué - Vous devrez traiter le remboursement manuellement dans Stripe, puis mettre à jour le statut de paiement.
                        </span>
                      )}
                    </p>
                    <button
                      onClick={() => handleApproveCancellation(selectedOrder.id)}
                      disabled={isApprovingCancellation}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {isApprovingCancellation ? "Traitement..." : "Approuver l'annulation"}
                    </button>
                  </div>
                )}
                
                <div className="flex gap-2 flex-wrap">
                  {["Pending", "Processing", "Packed", "Shipped", "Delivered", "Prêt à être livré", "Prêt à être retiré", "CancellationRequested", "Cancelled", "Refunded"].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(selectedOrder.id, status)}
                      disabled={isUpdatingStatus || selectedOrder.status === "CancellationRequested"}
                      className={`px-3 py-1 text-sm rounded border transition-colors ${
                        selectedOrder.status === status
                          ? `${getStatusColor(status)} cursor-default`
                          : "border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                      }`}
                    >
                      {getStatusLabel(status)}
                    </button>
                  ))}
                </div>
                {selectedOrder.status === "CancellationRequested" && (
                  <p className="text-xs text-gray-500 mt-2">
                    Utilisez le bouton "Approuver l'annulation" ci-dessus pour traiter la demande
                  </p>
                )}
              </div>

              {/* Payment Status Management */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Statut de paiement</h3>
                <div className="flex gap-2 flex-wrap mb-2">
                  {["Pending", "Completed", "Failed", "Refunded"].map((paymentStatus) => (
                    <button
                      key={paymentStatus}
                      onClick={async () => {
                        setIsUpdatingStatus(true)
                        try {
                          const response = await fetch(`/api/services/ecommerce/orders/admin/${selectedOrder.id}`, {
                            method: "PUT",
                            headers: { 
                              "Content-Type": "application/json",
                              "x-site-id": siteId,
                            },
                            body: JSON.stringify({ paymentStatus }),
                          })

                          if (!response.ok) {
                            const err = await response.json()
                            throw new Error(err.error || "Erreur lors de la mise à jour")
                          }

                          const updatedOrder = await response.json()
                          setOrders(orders.map((o) => (o.id === selectedOrder.id ? updatedOrder : o)))
                          setSelectedOrder({ ...selectedOrder, paymentStatus: updatedOrder.paymentStatus })
                        } catch (error) {
                          setError(error instanceof Error ? error.message : "Erreur inconnue")
                        } finally {
                          setIsUpdatingStatus(false)
                        }
                      }}
                      disabled={isUpdatingStatus}
                      className={`px-3 py-1 text-sm rounded border transition-colors ${
                        selectedOrder.paymentStatus === paymentStatus
                          ? `${getPaymentStatusColor(paymentStatus)} cursor-default`
                          : "border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                      }`}
                    >
                      {paymentStatus === "Pending"
                        ? "En attente"
                        : paymentStatus === "Completed"
                          ? "Payée"
                          : paymentStatus === "Failed"
                            ? "Échouée"
                            : "Remboursée"}
                    </button>
                  ))}
                </div>
                {selectedOrder.status === "Cancelled" && selectedOrder.paymentStatus === "Completed" && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      ⚠️ <strong>Action requise :</strong> Cette commande est annulée mais le paiement n'a pas encore été remboursé. 
                      Traitez le remboursement dans Stripe, puis mettez à jour le statut de paiement à "Remboursée".
                    </p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Articles ({selectedOrder.items.length})</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                      <p>
                        <strong>Produit :</strong> {item.title || item.productName || "N/A"}
                      </p>
                      <p>
                        <strong>Quantité :</strong> {item.quantity}
                      </p>
                      <p>
                        <strong>Prix :</strong> {item.price?.toFixed(2) || item.price}€
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Total */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total :</span>
                  <span className="text-lg font-bold text-gray-900">{selectedOrder.total.toFixed(2)}€</span>
                </div>
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
                Êtes-vous sûr de vouloir supprimer cette commande ? Cette action est irréversible.
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
    </>
  )
}
