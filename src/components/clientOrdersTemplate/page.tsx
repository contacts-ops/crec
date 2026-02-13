"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ShoppingCart,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Search,
  RefreshCw,
} from "lucide-react";
import { useSiteId } from "@/hooks/use-site-id";

interface ClientOrdersTemplateProps {
  siteId?: string;
}

type OrderStatus =
  | "pending"
  | "processing"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancellationrequested"
  | "cancelled"
  | "refunded";

type PaymentStatus = "pending" | "completed" | "failed" | "refunded" | "paid" | "unpaid";

interface OrderItem {
  id?: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice?: number;
  price?: number;
  total: number;
}

interface Order {
  id: string;
  siteId: string;
  email: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  items: OrderItem[];
  shippingAddress?: {
    nom?: string;
    prenom?: string;
    address?: string;
    city?: string;
    zipCode?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface OrdersStats {
  total: number;
  delivered: number;
  inProgress: number;
  cancelled: number;
}

export default function ClientOrdersTemplate({ siteId: siteIdProp }: ClientOrdersTemplateProps) {
  const siteIdFromHook = useSiteId();
  const siteId = siteIdProp || siteIdFromHook;
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrdersStats>({
    total: 0,
    delivered: 0,
    inProgress: 0,
    cancelled: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const loadOrders = async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (siteId) {
        params.append("siteId", siteId);
      }

      // Route côté client (non admin) pour récupérer les commandes de l'utilisateur connecté
      const response = await fetch(`/api/services/ecommerce/orders?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) {
          setError("Vous devez être connecté pour voir vos commandes.");
        } else {
          const err = await response.json().catch(() => null);
          throw new Error(err?.error || "Erreur lors du chargement des commandes");
        }
        setOrders([]);
        setStats({
          total: 0,
          delivered: 0,
          inProgress: 0,
          cancelled: 0,
        });
        return;
      }

      const data = await response.json();
      const list: Order[] = (data.orders || []).map((order: any) => ({
        ...order,
        status: (order.status || "pending").toLowerCase(),
        paymentStatus: (order.paymentStatus || "pending").toLowerCase(),
      }));
      setOrders(list);
      const delivered = list.filter((o) => o.status === "delivered").length;
      const inProgress = list.filter((o) =>
        ["pending", "processing", "packed", "shipped", "cancellationrequested"].includes(o.status)
      ).length;
      const cancelled = list.filter((o) => ["cancelled", "refunded"].includes(o.status)).length;

      setStats({
        total: list.length,
        delivered,
        inProgress,
        cancelled,
      });
    } catch (e) {
      console.error("Erreur lors du chargement des commandes:", e);
      setError(e instanceof Error ? e.message : "Erreur lors du chargement des commandes");
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [siteId]);
  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const customerName = order.shippingAddress
      ? `${order.shippingAddress.prenom || ""} ${order.shippingAddress.nom || ""}`.trim()
      : "";
    return (
      order.id.toLowerCase().includes(term) ||
      order.email.toLowerCase().includes(term) ||
      customerName.toLowerCase().includes(term)
    );
  });
  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return "En attente";
      case "processing":
        return "En cours de traitement";
      case "packed":
        return "Préparée";
      case "shipped":
        return "Expédiée";
      case "delivered":
        return "Livrée";
      case "cancellationrequested":
        return "Annulation demandée";
      case "cancelled":
        return "Annulée";
      case "refunded":
        return "Remboursée";
      default:
        return status;
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200";
      case "shipped":
      case "packed":
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancellationrequested":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "cancelled":
      case "refunded":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPaymentStatusLabel = (status: PaymentStatus) => {
    const s = status.toLowerCase();
    if (s === "completed" || s === "paid") return "Payé";
    if (s === "pending" || s === "unpaid") return "En attente de paiement";
    if (s === "failed") return "Paiement échoué";
    if (s === "refunded") return "Remboursé";
    return status;
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    const s = status.toLowerCase();
    if (s === "completed" || s === "paid") return "bg-green-100 text-green-800";
    if (s === "pending" || s === "unpaid") return "bg-yellow-100 text-yellow-800";
    if (s === "failed") return "bg-red-100 text-red-800";
    if (s === "refunded") return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-800";
  };

  const handleOpenCancelDialog = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCancellationReason("");
    setShowCancelDialog(true);
  };

  const handleCloseCancelDialog = () => {
    setShowCancelDialog(false);
    setSelectedOrderId(null);
    setCancellationReason("");
  };

  const handleRequestCancellation = async () => {
    if (!selectedOrderId) return;
    
    setCancellingOrderId(selectedOrderId);
    setShowCancelDialog(false);
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (siteId) { headers["x-site-id"] = siteId; }
      
      const response = await fetch(`/api/services/ecommerce/orders/${selectedOrderId}/request-cancellation`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ reason: cancellationReason.trim() || "" }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMessage(data.message || "Demande d'annulation envoyée avec succès");
        setTimeout(() => setSuccessMessage(""), 5000);
        await loadOrders();
      } else {
        setError(data.error || "Erreur lors de l'envoi de la demande d'annulation");
        setTimeout(() => setError(""), 5000);
      }
    } catch (error) {
      console.error("Error requesting cancellation:", error);
      setError("Erreur lors de l'envoi de la demande d'annulation");
      setTimeout(() => setError(""), 5000);
    } finally {
      setCancellingOrderId(null);
      setSelectedOrderId(null);
      setCancellationReason("");
    }
  };

  const canRequestCancellation = (order: Order) => {
    const status = order.status.toLowerCase();
    return (
      status !== "cancelled" &&
      status !== "refunded" &&
      status !== "cancellationrequested" &&
      status !== "shipped" &&
      status !== "delivered"
    );
  };

  if (isLoading && !orders.length) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-type="service">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Mes Commandes
            </h2>
            <p className="text-gray-600">
              Retrouvez l&apos;historique de vos commandes, leurs statuts et les informations de livraison.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300"
              onClick={loadOrders}
              disabled={isLoading}
            >
              <span className="flex items-center gap-2">
                <ShoppingCart className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                Actualiser
              </span>
            </Button>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Succès */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total commandes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En cours</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Livrées</p>
                <p className="text-2xl font-bold text-gray-900">{stats.delivered}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Annulées / remboursées</p>
                <p className="text-2xl font-bold text-gray-900">{stats.cancelled}</p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recherche */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher une commande (n°, email, nom)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Liste des commandes */}
        {filteredOrders.length === 0 ? (
          <div className="py-10 text-center">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? "Aucune commande trouvée" : "Vous n'avez pas encore de commande"}
            </h3>
            <p className="text-gray-500">
              {searchTerm
                ? "Aucune commande ne correspond à votre recherche."
                : "Lorsque vous passerez une commande sur ce site, elle apparaîtra ici."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const createdAt = new Date(order.createdAt);
              const address = order.shippingAddress;

              return (
                <div
                  key={order.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">Commande</span>
                        <span className="text-sm font-semibold text-gray-900">#{order.id && order.id.length >= 8 ? order.id.substring(0, 8).toUpperCase() : order.id?.toUpperCase() || ""}</span>
                        <Badge
                          className={`border ${getStatusColor(order.status)}`}
                        >
                          {getStatusLabel(order.status)}
                        </Badge>
                        <Badge className={`${getPaymentStatusColor(order.paymentStatus)} border-0`}>
                          {getPaymentStatusLabel(order.paymentStatus)}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {createdAt.toLocaleDateString("fr-FR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                        {address && (
                          <span className="flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            {(address.prenom || "") + " " + (address.nom || "")}
                            {address.city ? ` – ${address.city}` : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-500">Total</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {(order.total || 0).toFixed(2)} €
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  {order.items && order.items.length > 0 && (
                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">Articles</p>
                      <div className="space-y-1">
                        {order.items.map((item, index) => (
                          <div
                            key={item.id || `${order.id}-${index}`}
                            className="flex justify-between text-sm text-gray-700"
                          >
                            <div className="flex items-center gap-2">
                              <Package className="w-3 h-3 text-gray-400" />
                              <span>{item.name}</span>
                              {item.sku && (
                                <span className="text-xs text-gray-400">({item.sku})</span>
                              )}
                              <span className="text-xs text-gray-500">× {item.quantity}</span>
                            </div>
                            <span className="font-medium">
                              {(() => {
                                // Calculate item total: use item.total if available, otherwise calculate from price/unitPrice * quantity
                                const itemTotal = item.total ?? (
                                  (item.price || item.unitPrice) && item.quantity 
                                    ? (item.price || item.unitPrice) * item.quantity 
                                    : 0
                                )
                                return (itemTotal || 0).toFixed(2)
                              })()} €
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cancellation Button */}
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    {canRequestCancellation(order) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenCancelDialog(order.id)}
                        disabled={cancellingOrderId === order.id || showCancelDialog}
                        className="w-full border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                      >
                        {cancellingOrderId === order.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Envoi de la demande...
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Demander l'annulation
                          </>
                        )}
                      </Button>
                    )}
                    
                    {order.status === "cancellationrequested" && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <p className="text-xs text-orange-800 font-medium text-center">
                          ⏳ Annulation demandée - En attente d'approbation
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cancel Order Confirmation Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent className="sm:max-w-[500px]">
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <AlertDialogTitle className="text-xl font-semibold text-gray-900">
                  Demander l&apos;annulation
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-sm text-gray-600 pt-2">
                Êtes-vous sûr de vouloir demander l&apos;annulation de cette commande ? 
                Votre demande sera examinée par l&apos;administrateur et vous serez notifié de la décision.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="py-4">
              <label htmlFor="cancellation-reason" className="block text-sm font-medium text-gray-700 mb-2">
                Raison de l&apos;annulation (optionnel)
              </label>
              <textarea
                id="cancellation-reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Indiquez la raison de votre demande d'annulation..."
                className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {cancellationReason.length}/500 caractères
              </p>
            </div>

            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel 
                onClick={handleCloseCancelDialog}
                className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRequestCancellation}
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
              >
                <XCircle className="w-4 h-4 mr-2 inline" />
                Confirmer la demande
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}


