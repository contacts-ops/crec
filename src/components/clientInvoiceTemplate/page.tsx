"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Calendar,
  Search,
  Plus,
  LogIn
} from "lucide-react";

interface ClientInvoiceTemplateProps {
  siteId?: string;
  userId?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  date: string;
  dueDate: string;
  description: string;
  customerName: string;
  customerEmail: string;
  items: InvoiceItem[];
  stripeInvoiceId?: string;
  stripeSessionId: string;
  paymentIntentId?: string;
  hostedInvoiceUrl?: string;
  invoicePdfUrl?: string;
  isFailedPayment?: boolean;
  failedDetails?: {
    invoiceId?: string;
    failedAt?: string;
    reason?: string;
    attemptCount?: number;
  };
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceStats {
  total: number;
  totalAmount: number;
  paid: number;
  pending: number;
  failed?: number;
}

export default function ClientInvoiceTemplate({
  siteId,
  userId
}: ClientInvoiceTemplateProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
    total: 0,
    totalAmount: 0,
    paid: 0,
    pending: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  // Charger les factures de l'utilisateur connecté
  const loadInvoices = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/sharedServices/invoices", {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
        setStats(data.stats || {
          total: 0,
          totalAmount: 0,
          paid: 0,
          pending: 0
        });
        setIsAuthenticated(true);
      } else if (response.status === 401) {
        // Utilisateur non connecté en tant qu'Utilisateur
        setIsAuthenticated(false);
        setInvoices([]);
        setStats({
          total: 0,
          totalAmount: 0,
          paid: 0,
          pending: 0
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors du chargement des factures");
      }
    } catch (error) {
      console.error("Erreur lors du chargement des factures:", error);
      setError(error instanceof Error ? error.message : "Erreur lors du chargement des factures");
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Voir les détails d'une facture
  const handleViewInvoice = async (invoice: Invoice) => {
    try {
      setError("");
      // Utiliser le lien Stripe pour voir la facture
      if (invoice.hostedInvoiceUrl) {
        window.open(invoice.hostedInvoiceUrl, '_blank');
        setSuccess(`Ouverture de la facture ${invoice.invoiceNumber} dans Stripe`);
      } else {
        setError("Lien de visualisation non disponible pour cette facture");
      }
      
    } catch (error) {
      console.error("Erreur lors de l'affichage de la facture:", error);
      setError(error instanceof Error ? error.message : "Erreur lors de l'affichage de la facture");
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      setError("");
      // Utiliser le lien Stripe pour télécharger la facture
      if (invoice.invoicePdfUrl) {
        window.open(invoice.invoicePdfUrl, '_blank');
        setSuccess(`Téléchargement de la facture ${invoice.invoiceNumber} depuis Stripe`);
      } else {
        setError("Lien de téléchargement non disponible pour cette facture");
      }
      
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      setError(error instanceof Error ? error.message : "Erreur lors du téléchargement");
    }
  };

  // Construit l'URL du proxy pour afficher le PDF en inline
  const getPdfProxyUrl = (pdfUrl: string) => `/api/sharedServices/invoices/pdf?url=${encodeURIComponent(pdfUrl)}`;

  // Ouvrir la facture Stripe dans le dashboard
  const openStripeInvoiceInDashboard = (invoiceId: string, mode: 'test' | 'live' = 'test') => {
    if (!invoiceId) {
      alert("Aucune facture disponible pour cet impayé");
      return;
    }

    const prefix = mode === 'test' ? 'test/' : '';
    const url = `https://dashboard.stripe.com/${prefix}invoices/${invoiceId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Voir le PDF de la facture directement (prévisualisation modal)
  const handleViewInvoicePdf = async (invoice: Invoice) => {
    try {
      setError("");
      if (invoice.invoicePdfUrl) {
        setPreviewInvoice(invoice);
        setIsPreviewOpen(true);
        setSuccess(`Prévisualisation du PDF de la facture ${invoice.invoiceNumber}`);
      } else {
        setError("PDF non disponible pour cette facture");
      }

    } catch (error) {
      console.error("Erreur lors de l'ouverture du PDF:", error);
      setError(error instanceof Error ? error.message : "Erreur lors de l'ouverture du PDF");
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);
  // Filtrer les factures selon le terme de recherche
  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // Fonctions utilitaires pour les statuts
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payée';
      case 'pending':
        return 'En attente';
      case 'overdue':
        return 'En retard';
      case 'cancelled':
        return 'Annulée';
      default:
        return 'Inconnu';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <div className="text-center">
          <LogIn className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Connexion requise</h3>
          <p className="text-gray-500 mb-4">
            Vous devez être connecté en tant qu'utilisateur du site pour accéder à vos factures.
          </p>
          <Button 
            onClick={() => window.location.href = '/login'} 
            className="!bg-black !hover:bg-gray-900"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-type="service">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Mes Factures
              </h2>
              <p className="text-gray-600">
                Consultez et téléchargez vos factures de paiement.
              </p>
            </div>
          </div>

          {/* Messages d'état */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                <strong>Erreur :</strong> {error}
              </p>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">
                <strong>Succès :</strong> {success}
              </p>
            </div>
          )}
        </div>

        {/* Statistiques */}
        <div className={`grid grid-cols-1 md:grid-cols-4 ${stats.failed !== undefined && stats.failed > 0 ? 'lg:grid-cols-5' : ''} gap-4 mb-6`}>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total factures</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Montant total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAmount.toFixed(2)}€</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Payées</p>
                <p className="text-2xl font-bold text-gray-900">{stats.paid}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En attente</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>

          {stats.failed !== undefined && stats.failed > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Impayés</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Barre de recherche */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher une facture..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Liste des factures */}
        <div className="space-y-4">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? "Aucune facture trouvée" : "Aucune facture"}
              </h3>
              <p className="text-gray-500">
                {searchTerm 
                  ? "Aucune facture ne correspond à votre recherche."
                  : "Vous n'avez pas encore de factures de paiement."
                }
              </p>
            </div>
          ) : (
            filteredInvoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {invoice.invoiceNumber}
                        </h3>
                        <Badge className={getStatusColor(invoice.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(invoice.status)}
                            {getStatusText(invoice.status)}
                          </span>
                        </Badge>
                        {invoice.isFailedPayment && (
                          <Badge className="bg-red-100 text-red-800">
                            <span className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Impayé
                            </span>
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-2">{invoice.description}</p>
                      
                      {invoice.isFailedPayment && invoice.failedDetails && (
                        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm">
                          <p className="text-red-700 font-medium">Raison: {invoice.failedDetails.reason || 'Paiement refusé'}</p>
                          {invoice.failedDetails.attemptCount && (
                            <p className="text-red-600 text-xs">Tentatives: {invoice.failedDetails.attemptCount}</p>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(invoice.date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {invoice.amount.toFixed(2)} {invoice.currency}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {invoice.isFailedPayment && invoice.stripeInvoiceId ? (
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-black text-white hover:bg-gray-700"
                          onClick={() => openStripeInvoiceInDashboard(invoice.stripeInvoiceId as string, 'test')}
                        >
                          Voir la facture sur Stripe
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewInvoice(invoice)}
                            disabled={!invoice.hostedInvoiceUrl}
                            title={!invoice.hostedInvoiceUrl ? "Lien de visualisation non disponible" : "Voir la facture en ligne"}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Voir en ligne
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewInvoicePdf(invoice)}
                            disabled={!invoice.invoicePdfUrl}
                            title={!invoice.invoicePdfUrl ? "PDF non disponible" : "Voir le PDF dans une modale"}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Voir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadInvoice(invoice)}
                            disabled={!invoice.invoicePdfUrl}
                            title={!invoice.invoicePdfUrl ? "Lien de téléchargement non disponible" : "Télécharger le PDF"}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            PDF
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Modal de prévisualisation du PDF */}
      {previewInvoice && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-5xl w-[90vw] h-[85vh] p-0 overflow-hidden flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>
                Facture {previewInvoice.invoiceNumber}
              </DialogTitle>
            </DialogHeader>
            <div className="w-full flex-1">
              {previewInvoice.invoicePdfUrl ? (
                <iframe
                  src={getPdfProxyUrl(previewInvoice.invoicePdfUrl)}
                  title={`Facture ${previewInvoice.invoiceNumber}`}
                  className="w-full h-full"
                />
              ) : (
                <div className="p-6">PDF non disponible</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}