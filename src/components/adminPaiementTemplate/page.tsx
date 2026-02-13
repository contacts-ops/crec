"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  Search,
  RefreshCw,
  Euro,
  Calendar,
  User,
  Package,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Eye,
  Download,
  ExternalLink,
  Filter,
  ArrowUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface AdminPaiementTemplateProps {
  siteId?: string;
  editableElements?: {
    [key: string]: string;
  };
  defaultView?: "all" | "failed";
}

interface Paiement {
  id: string;
  clientName: string;
  email: string;
  montant: number;
  devise: string;
  statut: 'completed' | 'pending' | 'failed' | 'refunded';
  date: string;
  service: string;
  methode: string;
  stripeSessionId?: string;
  stripeInvoiceId?: string;
  isFailedPayment?: boolean;
  failedDetails?: {
    invoiceId?: string;
    failedAt?: string;
    reason?: string;
    attemptCount?: number;
  };
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
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface FailedPayment {
  invoiceId: string;
  amount: number;
  currency: string;
  failedAt: string | Date;
  reason?: string;
  attemptCount: number;
  userId?: string;
  userEmail?: string;
  userName?: string;
}

export default function AdminPaiementTemplate({
  siteId,
  editableElements = {},
  defaultView = "all"
}: AdminPaiementTemplateProps) {
  const [view, setView] = useState<"all" | "failed">(defaultView);
  const [searchTerm, setSearchTerm] = useState("");
  // Synchroniser la vue avec la prop defaultView
  useEffect(() => {
    console.log('🔄 defaultView changed:', defaultView);
    setView(defaultView);
  }, [defaultView]);
  const [isLoading, setIsLoading] = useState(false);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    totalMontant: 0,
    completed: 0,
    pending: 0,
    failed: 0
  });
  const [failedStats, setFailedStats] = useState({
    totalUsers: 0,
    usersWithFailedPayments: 0,
    totalFailedPayments: 0,
    totalAmount: 0,
  });
  const [error, setError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedPaiement, setSelectedPaiement] = useState<Paiement | null>(null);
  const [paiementInvoices, setPaiementInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [loadingInvoicesByPaiement, setLoadingInvoicesByPaiement] = useState<Record<string, boolean>>({});
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [selectedInvoiceForPdf, setSelectedInvoiceForPdf] = useState<Invoice | null>(null);
  const [focusedInvoice, setFocusedInvoice] = useState<Invoice | null>(null);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState<string | null>(null);
  const [invoiceAvailability, setInvoiceAvailability] = useState<Record<string, boolean>>({});
  const [invoicesByPaiement, setInvoicesByPaiement] = useState<Record<string, Invoice[]>>({});
  const [sortField, setSortField] = useState<keyof Paiement>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priceRangeFilter, setPriceRangeFilter] = useState<{ min: number; max: number }>({ min: 0, max: 10000 });
  const [dateRangeFilter, setDateRangeFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [deletingFailedInvoiceId, setDeletingFailedInvoiceId] = useState<string | null>(null);
  const itemsPerPage = 5;

  // Fonction pour récupérer les paiements depuis l'API (vue "all").
  const fetchPaiements = async () => {
    setIsLoading(true);
    setError("");
    try {
      if (!siteId) {
        throw new Error("SiteId requis pour récupérer les paiements");
      }

      // TODO: Remplacer par le vrai endpoint de vos paiements quand disponible
      const response = await fetch('/api/sharedServices/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId: siteId,
          serviceName: "Domiciliation d'Entreprise"
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erreur ${response.status}: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      const transformedPaiements: Paiement[] = (data.payments || []).map((payment: any, index: number) => {
        if(payment.status === 'failed') {
          console.log("🔍 Payment:", payment);
        }
        const amountRaw = typeof payment.amount === 'number' ? payment.amount : Number(payment.amount);
        const montant = Number.isFinite(amountRaw) ? amountRaw : 0;
        const currency = payment.currency ? payment.currency.toString().toUpperCase() : 'EUR';
        const stripeInvoiceId = payment.stripeInvoiceId || payment.invoiceId || undefined;

        return {
          id: payment.id || stripeInvoiceId || `payment-${index}`,
          clientName: payment.customerName || 'Client inconnu',
          email: payment.customerEmail || '',
          montant,
          devise: currency,
          statut: payment.status || 'completed',
          date: payment.date || new Date().toISOString(),
          service: payment.serviceName || "Domiciliation d'Entreprise",
          methode: payment.paymentMethod || 'Carte bancaire',
          stripeSessionId: payment.stripeSessionId || undefined,
          stripeInvoiceId,
          isFailedPayment: payment.status === 'failed' || payment.isFailedPayment || false,
          failedDetails: payment.failedDetails || undefined,
        };
      });
      setPaiements(transformedPaiements);
      const newStats = {
        total: data.totalPayments || transformedPaiements.length,
        totalMontant: data.totalAmount || transformedPaiements.reduce((acc, p) => acc + p.montant, 0),
        completed: transformedPaiements.filter(p => p.statut === 'completed').length,
        pending: transformedPaiements.filter(p => p.statut === 'pending').length,
        failed: transformedPaiements.filter(p => p.statut === 'failed').length
      };

      setStats(newStats);
      // Vérifier automatiquement la disponibilité des factures pour tous les paiements
      checkAllPaiementsInvoiceAvailability(transformedPaiements);
    } catch (error) {
      console.error('Erreur lors du chargement des paiements:', error);
      setError(error instanceof Error ? error.message : "Erreur inconnue");
      setPaiements([]);
      setStats({ total: 0, totalMontant: 0, completed: 0, pending: 0, failed: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour récupérer les impayés (vue "failed").
  const fetchFailedPayments = async () => {
    setIsLoading(true);
    setError("");
    try {
      if (!siteId) {
        throw new Error("SiteId requis pour récupérer les impayés");
      }

      const response = await fetch(`/api/sharedServices/stripe/failed-payments/site/${siteId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erreur ${response.status}: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      const rawFailedPayments: any[] = Array.isArray(data.failedPayments) ? data.failedPayments : [];

      const list: FailedPayment[] = rawFailedPayments.map((entry: any) => {
        const source = entry && typeof entry === 'object' && entry._doc ? entry._doc : entry;

        const amountValue = source?.amount ?? entry?.amount ?? 0;
        const rawAmount = typeof amountValue === 'number' ? amountValue : Number(amountValue);
        const invoiceRaw = source?.invoiceId ?? entry?.invoiceId ?? '';
        const currencyRaw = source?.currency ?? entry?.currency ?? 'eur';
        const attemptRaw = source?.attemptCount ?? entry?.attemptCount ?? 1;

        const userIdRaw = entry?.userId ?? entry?._id ?? source?.userId ?? source?._id;
        const userEmailRaw = entry?.userEmail ?? entry?.email ?? source?.userEmail ?? source?.email ?? '';
        const userNameRaw = entry?.userName
          ?? source?.userName
          ?? (source?.firstName && source?.lastName ? `${source.firstName} ${source.lastName}`.trim()
            : source?.firstName || source?.lastName || entry?.firstName || entry?.lastName || '');
        return {
          invoiceId: invoiceRaw ? invoiceRaw.toString() : '—',
          amount: Number.isFinite(rawAmount) ? rawAmount : 0,
          currency: currencyRaw ? currencyRaw.toString() : 'eur',
          failedAt: source?.failedAt || entry?.failedAt,
          reason: source?.reason || entry?.reason,
          attemptCount: typeof attemptRaw === 'number' ? attemptRaw : Number(attemptRaw) || 1,
          userId: userIdRaw ? userIdRaw.toString() : undefined,
          userEmail: userEmailRaw.toString(),
          userName: userNameRaw,
        } as FailedPayment;
      });
      setFailedPayments(list);
      setFailedStats({
        totalUsers: data.totalUsers || 0,
        usersWithFailedPayments: data.usersWithFailedPayments || 0,
        totalFailedPayments: data.totalFailedPayments || list.length,
        totalAmount: typeof data.totalAmount === 'number'
          ? data.totalAmount
          : list.reduce((sum, fp) => sum + (fp.amount || 0), 0),
      });
    } catch (error) {
      console.error('Erreur lors du chargement des impayés:', error);
      setError(error instanceof Error ? error.message : "Erreur inconnue");
      setFailedPayments([]);
      setFailedStats({ totalUsers: 0, usersWithFailedPayments: 0, totalFailedPayments: 0, totalAmount: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  // Charger selon la vue active
  useEffect(() => {
    if (view === "failed") {
      fetchFailedPayments();
    } else {
      fetchPaiements();
    }
  }, [view, siteId]);
  const filteredPaiements = useMemo(() => {
    let filtered = paiements.filter(paiement => {
      // Filtre par recherche (nom client ou email)
      const matchesSearch = paiement.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           paiement.email.toLowerCase().includes(searchTerm.toLowerCase());
      // Filtre par statut
      const matchesStatus = statusFilter === 'all' || paiement.statut === statusFilter;
      
      // Filtre par plage de prix
      const matchesPrice = paiement.montant >= priceRangeFilter.min && paiement.montant <= priceRangeFilter.max;
      
      // Filtre par plage de dates
      let matchesDate = true;
      if (dateRangeFilter.start || dateRangeFilter.end) {
        const paiementDate = new Date(paiement.date);
        if (dateRangeFilter.start) {
          const startDate = new Date(dateRangeFilter.start);
          matchesDate = matchesDate && paiementDate >= startDate;
        }
        if (dateRangeFilter.end) {
          const endDate = new Date(dateRangeFilter.end);
          endDate.setHours(23, 59, 59, 999); // Fin de la journée
          matchesDate = matchesDate && paiementDate <= endDate;
        }
      }
      
      return matchesSearch && matchesStatus && matchesPrice && matchesDate;
    });
    // Tri
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      // Gestion spéciale pour les dates
      if (sortField === 'date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      // Gestion spéciale pour les montants
      if (sortField === 'montant') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }
      
      // Tri numérique ou alphabétique
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      } else {
        const aStr = String(aValue || '').toLowerCase();
        const bStr = String(bValue || '').toLowerCase();
        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      }
    });
    return filtered;
  }, [paiements, searchTerm, statusFilter, priceRangeFilter, dateRangeFilter, sortField, sortDirection]);
  const filteredFailed = useMemo(() => {
    return failedPayments
      .filter(fp => {
        const email = (fp.userEmail || "").toLowerCase();
        const name = (fp.userName || "").toLowerCase();
        const q = searchTerm.toLowerCase();
        return email.includes(q) || name.includes(q) || (fp.invoiceId || "").toLowerCase().includes(q);
      })
      .sort((a, b) => new Date(b.failedAt).getTime() - new Date(a.failedAt).getTime());
  }, [failedPayments, searchTerm]);
  // Pagination
  const list = view === "failed" ? filteredFailed : filteredPaiements;
  const totalPages = Math.ceil(list.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentList = list.slice(startIndex, endIndex);
  // Réinitialiser la page quand la recherche ou la vue change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, view, statusFilter, priceRangeFilter, dateRangeFilter, sortField, sortDirection]);
  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case "completed": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "pending": return <Clock className="w-4 h-4 text-yellow-500" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-500" />;
      case "refunded": return <RefreshCw className="w-4 h-4 text-blue-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case "completed": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "failed": return "bg-red-100 text-red-800";
      case "refunded": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatutText = (statut: string) => {
    switch (statut) {
      case "completed": return "Complété";
      case "pending": return "En attente";
      case "failed": return "Échoué";
      case "refunded": return "Remboursé";
      default: return "Inconnu";
    }
  };

  const handleRefresh = () => {
    if (view === "failed") fetchFailedPayments();
    else fetchPaiements();
  };

  const openStripeInvoiceInDashboard = (invoiceId: string, mode: 'test' | 'live' = 'test') => {
    if (!invoiceId) {
      alert("Aucune facture disponible pour cet impayé");
      return;
    }

    const prefix = mode === 'test' ? 'test/' : '';
    const url = `https://dashboard.stripe.com/${prefix}invoices/${invoiceId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Supprimer un impayé manuellement (ex: client régularisé)
  const handleDeleteFailedPayment = async (userId: string | undefined, invoiceId: string) => {
    if (!userId) {
      setError("Impossible de supprimer l'impayé: utilisateur introuvable");
      return;
    }

    setDeletingFailedInvoiceId(invoiceId);
    setError("");
    try {
      const response = await fetch(`/api/sharedServices/stripe/failed-payments/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Erreur ${response.status}`);
      }

      setFailedPayments(prev => {
        const updated = prev.filter(fp => !(fp.userId === userId && fp.invoiceId === invoiceId));
        const uniqueUsers = new Set(updated.map(fp => fp.userId).filter(Boolean));
        const totalAmount = updated.reduce((sum, fp) => sum + (fp.amount || 0), 0);
        setFailedStats(prevStats => ({
          ...prevStats,
          usersWithFailedPayments: uniqueUsers.size,
          totalFailedPayments: updated.length,
          totalAmount,
        }));
        return updated;
      });
    } catch (err) {
      console.error('❌ Erreur suppression impayé:', err);
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression de l'impayé");
    } finally {
      setDeletingFailedInvoiceId(null);
    }
  };

  // Filtrer par email de l'utilisateur courant
  const filterByUserEmail = (email: string) => {
    setSearchTerm(email || "");
    setCurrentPage(1);
  };

  // Fonction pour gérer le tri
  const handleSort = (field: keyof Paiement) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Fonction pour réinitialiser tous les filtres
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriceRangeFilter({ min: 0, max: 10000 });
    setDateRangeFilter({ start: '', end: '' });
    setSortField('date');
    setSortDirection('desc');
    setCurrentPage(1);
  };

  // Fonction pour vérifier si des filtres sont actifs
  const hasActiveFilters = () => {
    return searchTerm !== '' || 
           statusFilter !== 'all' || 
           priceRangeFilter.min !== 0 || 
           priceRangeFilter.max !== 10000 ||
           dateRangeFilter.start !== '' || 
           dateRangeFilter.end !== '';
  };

  // Fonction pour récupérer les factures liées à un paiement
  const fetchPaiementInvoices = async (paiement: Paiement) => {
    setIsLoadingInvoices(true);
    setSelectedPaiement(paiement);
    setIsInvoiceModalOpen(true);
    try {
      // Récupérer les factures Stripe directement depuis l'API avec limite
      const response = await fetch(`/api/sharedServices/invoices?siteId=${encodeURIComponent(siteId || '')}&email=${encodeURIComponent(paiement.email)}&limit=50`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Utiliser la fonction de filtrage stricte pour ce paiement
        const filteredInvoices = filterInvoicesForPaiement(data.invoices || [], paiement);
        // Supprimer les doublons basés sur l'ID de la facture
        const uniqueInvoices = filteredInvoices.filter((invoice: Invoice, index: number, self: Invoice[]) => 
          index === self.findIndex((i: Invoice) => i.id === invoice.id)
        );
        // Mettre en cache les factures pour ce paiement
        setInvoicesByPaiement(prev => ({ ...prev, [paiement.id]: uniqueInvoices }));
        setPaiementInvoices(uniqueInvoices);
      } else {
        console.error('Erreur lors de la récupération des factures:', response.status, response.statusText);
        setPaiementInvoices([]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des factures:', error);
      setPaiementInvoices([]);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  // Fonction pour ouvrir la facture en ligne
  const handleViewInvoiceOnline = (invoice: Invoice) => {
    if (invoice.hostedInvoiceUrl) {
      window.open(invoice.hostedInvoiceUrl, '_blank');
    }
  };

  // Fonction pour télécharger la facture PDF
  const handleDownloadInvoice = async (invoice: Invoice) => {
    if (invoice.invoicePdfUrl) {
      setIsDownloadingInvoice(invoice.id);
      try {
        // Utiliser le proxy PDF pour éviter les problèmes CORS
        const proxyUrl = getPdfProxyUrl(invoice.invoicePdfUrl);
        const response = await fetch(proxyUrl);
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `facture-${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Erreur lors du téléchargement:', error);
        alert('Erreur lors du téléchargement de la facture. Veuillez réessayer.');
      } finally {
        setIsDownloadingInvoice(null);
      }
    }
  };

  // Fonction pour ouvrir le visualiseur PDF
  const handleViewPdf = (invoice: Invoice) => {
    if (!invoice.invoicePdfUrl) {
      alert("Cette facture n'a pas de PDF associé.");
      return;
    }
    
    setSelectedInvoiceForPdf(invoice);
    setIsPdfViewerOpen(true);
  };

  // Fonction pour obtenir l'URL du PDF via proxy (comme dans clientInvoiceTemplate)
  const getPdfProxyUrl = (pdfUrl: string) => `/api/sharedServices/invoices/pdf?url=${encodeURIComponent(pdfUrl)}`;

  // Fonction pour obtenir la couleur du statut de la facture
  const getInvoiceStatusColor = (status: string) => {
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

  // Fonction pour obtenir l'icône du statut de la facture
  const getInvoiceStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'overdue':
        return <XCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Fonction pour obtenir le texte du statut de la facture
  const getInvoiceStatusText = (status: string) => {
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

  // Fonction simplifiée pour vérifier la correspondance
  const getCorrespondanceLevel = (paiement: Paiement, invoice: Invoice) => {
    // Correspondance exacte par IDs Stripe
    if (paiement.stripeSessionId && invoice.stripeSessionId === paiement.stripeSessionId) {
      return { level: 'exact', text: 'Correspondance exacte par ID Stripe', color: 'green' };
    }
    if (paiement.stripeInvoiceId && invoice.stripeInvoiceId === paiement.stripeInvoiceId) {
      return { level: 'exact', text: 'Correspondance exacte par ID Stripe', color: 'green' };
    }
    
    // Correspondance par montant et date
    const paiementAmountCents = Math.round(paiement.montant * 100);
    const montantMatch = Math.abs(invoice.amount - paiementAmountCents) <= 25;
    const paiementDate = new Date(paiement.date);
    const invoiceDate = new Date(invoice.date);
    const dateDiff = Math.abs(paiementDate.getTime() - invoiceDate.getTime());
    const dateMatch = dateDiff <= (3 * 24 * 60 * 60 * 1000);
    if (montantMatch && dateMatch) {
      return { level: 'good', text: 'Correspondance par montant et date', color: 'yellow' };
    }
    
    return { level: 'weak', text: 'Correspondance faible', color: 'red' };
  };

  // Fonction pour filtrer strictement les factures correspondant à un paiement
  const filterInvoicesForPaiement = (invoices: Invoice[], paiement: Paiement): Invoice[] => {
    return invoices.filter((invoice: Invoice) => {
      // Vérifier d'abord l'email
      const emailMatch = invoice.customerEmail === paiement.email;
      if (!emailMatch) return false;
      
      // Priorité 1: Correspondance exacte par IDs Stripe (la plus fiable)
      if (paiement.stripeSessionId || paiement.stripeInvoiceId) {
        const sessionMatch = paiement.stripeSessionId && invoice.stripeSessionId === paiement.stripeSessionId;
        const invoiceMatch = paiement.stripeInvoiceId && invoice.stripeInvoiceId === paiement.stripeInvoiceId;
        if (sessionMatch || invoiceMatch) return true;
      }
      
      // Priorité 2: Correspondance stricte par montant et date (plus restrictive)
      const paiementAmountCents = Math.round(paiement.montant * 100);
      const montantMatch = Math.abs(invoice.amount - paiementAmountCents) <= 25; // Tolérance réduite à 25 centimes
      
      const paiementDate = new Date(paiement.date);
      const invoiceDate = new Date(invoice.date);
      const dateDiff = Math.abs(paiementDate.getTime() - invoiceDate.getTime());
      const dateMatch = dateDiff <= (3 * 24 * 60 * 60 * 1000); // Tolérance réduite à 3 jours
      
      return montantMatch && dateMatch;
    });
  };

  // Vérifier et ouvrir les factures uniquement si disponibles
  const checkAndOpenInvoices = async (paiement: Paiement) => {
    // Si on sait déjà qu'il n'y a pas de factures, ne rien faire
    if (invoiceAvailability[paiement.id] === false) {
      return;
    }
    
    // Si on sait déjà qu'il y a des factures, ouvrir directement la modal
    if (invoiceAvailability[paiement.id] === true) {
      setLoadingInvoicesByPaiement(prev => ({ ...prev, [paiement.id]: true }));
      setSelectedPaiement(paiement);
      setFocusedInvoice(null);
      try {
        // Vérifier d'abord si on a déjà les factures en cache
        if (invoicesByPaiement[paiement.id]) {
          const cached = invoicesByPaiement[paiement.id];
          setPaiementInvoices(cached);
          setFocusedInvoice(cached[0] || null);
          setIsInvoiceModalOpen(true);
          return;
        }
        
        const response = await fetch(`/api/sharedServices/invoices?siteId=${encodeURIComponent(siteId || '')}&email=${encodeURIComponent(paiement.email)}&limit=50`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          // Utiliser la fonction de filtrage stricte
          const filtered = filterInvoicesForPaiement(data.invoices || [], paiement);
          const unique = filtered.filter((inv: Invoice, idx: number, self: Invoice[]) => 
            idx === self.findIndex(i => i.id === inv.id)
          );
          // Mettre en cache les factures pour ce paiement
          setInvoicesByPaiement(prev => ({ ...prev, [paiement.id]: unique }));
          setPaiementInvoices(unique);
          setFocusedInvoice(unique[0] || null);
          setIsInvoiceModalOpen(true);
        } else {
          // En cas d'erreur, mettre à jour le cache
          setInvoiceAvailability(prev => ({ ...prev, [paiement.id]: false }));
        }
      } catch (e) {
        // En cas d'erreur, mettre à jour le cache
        setInvoiceAvailability(prev => ({ ...prev, [paiement.id]: false }));
      } finally {
        setLoadingInvoicesByPaiement(prev => ({ ...prev, [paiement.id]: false }));
      }
    }
  };

  // Fonction pour ouvrir directement la première facture disponible
  const openFirstInvoiceDirectly = async (paiement: Paiement) => {
    // Si on sait déjà qu'il n'y a pas de factures, ne rien faire
    if (invoiceAvailability[paiement.id] === false) {
      return;
    }
    
    // Si on sait déjà qu'il y a des factures, récupérer et ouvrir la première
    if (invoiceAvailability[paiement.id] === true) {
      setLoadingInvoicesByPaiement(prev => ({ ...prev, [paiement.id]: true }));
      try {
        // Vérifier d'abord si on a déjà les factures en cache
        if (invoicesByPaiement[paiement.id]) {
          const cachedInvoices = invoicesByPaiement[paiement.id];
          if (cachedInvoices.length > 0) {
            const firstInvoice = cachedInvoices[0];
            setFocusedInvoice(firstInvoice);
            if (firstInvoice.invoicePdfUrl) {
              handleViewPdf(firstInvoice);
            } else if (firstInvoice.hostedInvoiceUrl) {
              handleViewInvoiceOnline(firstInvoice);
            } else {
              // Si aucune option n'est disponible, ouvrir la modal
              setPaiementInvoices(cachedInvoices);
              setSelectedPaiement(paiement);
              setFocusedInvoice(firstInvoice);
              setIsInvoiceModalOpen(true);
            }
          }
          return;
        }
        
        const response = await fetch(`/api/sharedServices/invoices?siteId=${encodeURIComponent(siteId || '')}&email=${encodeURIComponent(paiement.email)}&limit=50`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          // Utiliser la fonction de filtrage stricte
          const filtered = filterInvoicesForPaiement(data.invoices || [], paiement);
          const unique = filtered.filter((inv: Invoice, idx: number, self: Invoice[]) => 
            idx === self.findIndex(i => i.id === inv.id)
          );
          // Mettre en cache les factures pour ce paiement
          setInvoicesByPaiement(prev => ({ ...prev, [paiement.id]: unique }));
          if (unique.length > 0) {
            // Ouvrir directement la première facture
            const firstInvoice = unique[0];
            setFocusedInvoice(firstInvoice);
            if (firstInvoice.invoicePdfUrl) {
              handleViewPdf(firstInvoice);
            } else if (firstInvoice.hostedInvoiceUrl) {
              handleViewInvoiceOnline(firstInvoice);
            } else {
              // Si aucune option n'est disponible, ouvrir la modal
              setPaiementInvoices(unique);
              setSelectedPaiement(paiement);
              setFocusedInvoice(firstInvoice);
              setIsInvoiceModalOpen(true);
            }
          }
        }
      } catch (e) {
        console.error('Erreur lors de l\'ouverture directe de la facture:', e);
      } finally {
        setLoadingInvoicesByPaiement(prev => ({ ...prev, [paiement.id]: false }));
      }
    }
  };

  // Fonction pour vérifier automatiquement la disponibilité des factures pour tous les paiements
  const checkAllPaiementsInvoiceAvailability = async (paiementsList: Paiement[]) => {
    const availabilityMap: Record<string, boolean> = {};
    
    // Initialiser tous les paiements sans email comme n'ayant pas de factures
    paiementsList.forEach(paiement => {
      if (!paiement.email) {
        availabilityMap[paiement.id] = false;
      }
    });
    // Récupérer tous les emails uniques des paiements
    const uniqueEmails = [...new Set(paiementsList.filter(p => p.email).map(p => p.email))];
    
    if (uniqueEmails.length === 0) {
      setInvoiceAvailability(availabilityMap);
      return;
    }
    
    try {
      // Une seule requête pour récupérer toutes les factures pour tous les emails avec limite
      const response = await fetch(`/api/sharedServices/invoices?siteId=${encodeURIComponent(siteId || '')}&limit=100`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        const allInvoices = data.invoices || [];
        
        // Pour chaque paiement, vérifier s'il a des factures correspondantes
        paiementsList.forEach(paiement => {
          if (!paiement.email) {
            availabilityMap[paiement.id] = false;
            return;
          }
          
          // Utiliser la fonction de filtrage stricte pour ce paiement
          const matchingInvoices = filterInvoicesForPaiement(allInvoices, paiement);
          // Supprimer les doublons basés sur l'ID de la facture
          const uniqueMatchingInvoices = matchingInvoices.filter((invoice: Invoice, index: number, self: Invoice[]) => 
            index === self.findIndex((i: Invoice) => i.id === invoice.id)
          );
          availabilityMap[paiement.id] = uniqueMatchingInvoices.length > 0;
          
          // Mettre en cache les factures pour ce paiement
          if (uniqueMatchingInvoices.length > 0) {
            setInvoicesByPaiement(prev => ({ ...prev, [paiement.id]: uniqueMatchingInvoices }));
          }
        });
      } else {
        // En cas d'erreur, marquer tous les paiements comme n'ayant pas de factures
        paiementsList.forEach(paiement => {
          availabilityMap[paiement.id] = false;
        });
      }
    } catch (error) {
      // En cas d'erreur, marquer tous les paiements comme n'ayant pas de factures
      paiementsList.forEach(paiement => {
        availabilityMap[paiement.id] = false;
      });
    }
    
    setInvoiceAvailability(availabilityMap);
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {view === "failed" ? "Impayés" : "Gestion des Paiements"}
              </h2>
              <p className="text-gray-600">
                {view === "failed" ? "Suivi des paiements échoués enregistrés en base." : "Interface de gestion pour les paiements clients."}
              </p>
              {error && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">
                    <strong>Erreur :</strong> {error}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setView("all")}
                className={`px-3 py-2 rounded-lg text-sm border ${view === "all" ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Tous les paiements
              </button>
              <button
                onClick={() => setView("failed")}
                className={`px-3 py-2 rounded-lg text-sm border ${view === "failed" ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Impayés
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {view === "all" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Paiements</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Montant Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalMontant}€</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Euro className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Complétés</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total impayés</p>
                  <p className="text-2xl font-bold text-gray-900">{failedStats.totalFailedPayments}</p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Montant total</p>
                  <p className="text-2xl font-bold text-gray-900">{(failedStats.totalAmount / 100).toFixed(2)}€</p>
                </div>
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Euro className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Utilisateurs impactés</p>
                  <p className="text-2xl font-bold text-gray-900">{failedStats.usersWithFailedPayments}/{failedStats.totalUsers}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar and Actions */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex flex-col gap-3">
            {/* Ligne recherche + actions */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher un paiement..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Actualiser
                </button>
                {hasActiveFilters() && (
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>

            {/* Ligne filtres sous la recherche */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filtres :</span>
                <span className="text-sm text-gray-600">Statut :</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="completed">Complété</option>
                  <option value="pending">En attente</option>
                  <option value="failed">Échoué</option>
                  <option value="refunded">Remboursé</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Prix min (€) :</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceRangeFilter.min}
                  onChange={(e) => setPriceRangeFilter(prev => ({ ...prev, min: Number(e.target.value) }))}
                  className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Prix max (€) :</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceRangeFilter.max}
                  onChange={(e) => setPriceRangeFilter(prev => ({ ...prev, max: Number(e.target.value) }))}
                  className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Date début :</span>
                <input
                  type="date"
                  value={dateRangeFilter.start}
                  onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Date fin :</span>
                <input
                  type="date"
                  value={dateRangeFilter.end}
                  onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Trier par :</span>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as keyof Paiement)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="date">Date</option>
                  <option value="clientName">Client</option>
                  <option value="email">Email</option>
                  <option value="statut">Statut</option>
                  <option value="montant">Montant</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Ordre :</span>
                <button
                  onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  {sortDirection === "asc" ? "Croissant" : "Décroissant"}
                </button>
              </div>
            </div>

            {/* Filtres actifs */}
            {hasActiveFilters() && (
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    <span>Recherche: "{searchTerm}"</span>
                    <button
                      onClick={() => setSearchTerm("")}
                      className="hover:bg-blue-200 rounded-full p-1"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {statusFilter !== "all" && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    <span>Statut: {getStatutText(statusFilter)}</span>
                    <button
                      onClick={() => setStatusFilter("all")}
                      className="hover:bg-green-200 rounded-full p-1"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {(priceRangeFilter.min !== 0 || priceRangeFilter.max !== 10000) && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                    <span>Prix: {priceRangeFilter.min}€ - {priceRangeFilter.max}€</span>
                    <button
                      onClick={() => setPriceRangeFilter({ min: 0, max: 10000 })}
                      className="hover:bg-yellow-200 rounded-full p-1"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {(dateRangeFilter.start || dateRangeFilter.end) && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    <span>
                      Date: {dateRangeFilter.start || "∞"} - {dateRangeFilter.end || "∞"}
                    </span>
                    <button
                      onClick={() => setDateRangeFilter({ start: "", end: "" })}
                      className="hover:bg-purple-200 rounded-full p-1"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {sortField !== "date" && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                    <span>
                      Tri: {sortField === "clientName" ? "Client" : sortField === "email" ? "Email" : sortField === "statut" ? "Statut" : "Montant"}
                    </span>
                    <button
                      onClick={() => setSortField("date")}
                      className="hover:bg-indigo-200 rounded-full p-1"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {sortDirection !== "desc" && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm">
                    <span>Ordre: Croissant</span>
                    <button
                      onClick={() => setSortDirection("desc")}
                      className="hover:bg-pink-200 rounded-full p-1"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Liste */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {view === "failed" ? `Liste des impayés (${list.length})` : `Liste des Paiements (${list.length})`}
              {isLoading && <span className="text-sm text-gray-500 ml-2">- Chargement...</span>}
            </h3>
          </div>

          {/* En-têtes de colonnes avec tri (seulement pour la vue "all") */}
          {view === "all" && (
            <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
              <div className="col-span-3">
                <button
                  onClick={() => handleSort('clientName')}
                  className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                >
                  Client
                  {sortField === 'clientName' && (
                    <span className="text-blue-600">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </div>
              <div className="col-span-3">
                <button
                  onClick={() => handleSort('email')}
                  className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                >
                  Email
                  {sortField === 'email' && (
                    <span className="text-blue-600">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </div>
              <div className="col-span-2">
                <button
                  onClick={() => handleSort('statut')}
                  className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                >
                  Statut
                  {sortField === 'statut' && (
                    <span className="text-blue-600">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </div>
              <div className="col-span-2">
                <button
                  onClick={() => handleSort('date')}
                  className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                >
                  Date
                  {sortField === 'date' && (
                    <span className="text-blue-600">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </div>
              <div className="col-span-2">
                <button
                  onClick={() => handleSort('montant')}
                  className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                >
                  Montant
                  {sortField === 'montant' && (
                    <span className="text-blue-600">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="divide-y divide-gray-200">
            {view === "failed" ? (
              // Rendu pour les impayés
              (currentList as FailedPayment[]).map((fp: FailedPayment) => (
                <div key={`${fp.invoiceId}-${fp.failedAt}`} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800`}>
                          Échoué
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(fp.failedAt).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <div className="mb-2">
                        <h4 className="font-medium text-gray-900">{fp.userName || fp.userEmail || 'Utilisateur inconnu'}</h4>
                        <p className="text-sm text-gray-500">{fp.userEmail}</p>
                        {fp.invoiceId ? (
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-black text-white hover:bg-gray-700 p-4"
                              onClick={() => openStripeInvoiceInDashboard(fp.invoiceId, 'live')}
                            >
                              Voir la facture sur Stripe
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Facture non renseignée</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          {fp.reason || 'Paiement refusé'}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            {(fp.amount / 100).toFixed(2)} {(fp.currency || 'EUR').toUpperCase()}
                          </p>
                          <p className="text-xs text-gray-500">Tentatives: {fp.attemptCount}</p>
                          {fp.userId && (
                            <button
                              onClick={() => handleDeleteFailedPayment(fp.userId, fp.invoiceId)}
                              disabled={deletingFailedInvoiceId === fp.invoiceId}
                              className="mt-2 inline-flex items-center gap-1 px-3 py-1 text-xs border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingFailedInvoiceId === fp.invoiceId ? 'Suppression...' : 'Marquer comme résolu'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Rendu pour les paiements normaux
              (currentList as Paiement[]).map((paiement: Paiement) => (
                <div key={paiement.id} className="p-4 hover:bg-gray-50">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Colonne Client */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <CreditCard className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{paiement.clientName}</h4>
                          <p className="text-sm text-gray-500">{paiement.service || "Domiciliation d'Entreprise"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Colonne Email */}
                    <div className="col-span-3">
                      <p className="text-sm text-gray-900">{paiement.email}</p>
                      <p className="text-xs text-gray-500">{paiement.methode}</p>
                    </div>

                    {/* Colonne Statut */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        {getStatutIcon(paiement.statut)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatutColor(paiement.statut)}`}>
                          {getStatutText(paiement.statut)}
                        </span>
                      </div>
                    </div>

                    {/* Colonne Date */}
                    <div className="col-span-2">
                      <p className="text-sm text-gray-900">
                        {new Date(paiement.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>

                    {/* Colonne Montant et Actions */}
                    <div className="col-span-2">
                      <div className="flex items-center justify-between">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">{paiement.montant.toFixed(2)} {paiement.devise}</p>
                          {/* Boutons pour les factures */}
                          {paiement.email && invoiceAvailability[paiement.id] === true && (
                            <div className="flex gap-1 mt-1">
                              {/* Bouton Détails - ouvre la popup */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => checkAndOpenInvoices(paiement)}
                                disabled={loadingInvoicesByPaiement[paiement.id] || false}
                                className="!bg-blue-50 !border-blue-200 !text-blue-700 hover:!bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed !p-2"
                                title="Voir les détails de la facture"
                              >
                                {loadingInvoicesByPaiement[paiement.id] ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <FileText className="w-4 h-4" />
                                )}
                              </Button>
                              {/* Bouton pour ouvrir directement la facture */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openFirstInvoiceDirectly(paiement)}
                                disabled={loadingInvoicesByPaiement[paiement.id] || false}
                                className="!bg-green-50 !border-green-200 !text-green-700 hover:!bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed !p-2"
                                title="Ouvrir directement la facture"
                              >
                                {loadingInvoicesByPaiement[paiement.id] ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                              {/* Bouton pour filtrer par utilisateur */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => filterByUserEmail(paiement.email)}
                                className="!bg-gray-50 !border-gray-200 !text-gray-700 hover:!bg-gray-100 !p-2"
                                title="N'afficher que les paiements de cet utilisateur"
                              >
                                <User className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          {/* Indicateur de chargement si la vérification est en cours */}
                          {paiement.email && invoiceAvailability[paiement.id] === undefined && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Vérification des factures...
                            </div>
                          )}
                          {paiement.statut === 'failed' && paiement.stripeInvoiceId && (
                            <div className="flex mt-2 justify-end">
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-black text-white hover:bg-gray-700"
                                onClick={() => openStripeInvoiceInDashboard(paiement.stripeInvoiceId as string, 'test')}
                              >
                                Voir la facture sur Stripe
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {list.length === 0 && !isLoading && (
            <div className="p-8 text-center">
              {view === "failed" ? (
                <>
                  <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun impayé trouvé</h3>
                  <p className="text-gray-500">Aucun paiement échoué enregistré pour le moment.</p>
                </>
              ) : (
                <>
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun paiement trouvé</h3>
                  <p className="text-gray-500">Aucun paiement ne correspond à vos critères de recherche.</p>
                </>
              )}
            </div>
          )}

          {isLoading && (
            <div className="p-8 text-center">
              <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Chargement...</h3>
              <p className="text-gray-500">Récupération des données depuis l'API.</p>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Affichage {startIndex + 1}-{Math.min(endIndex, list.length)} sur {list.length} éléments (5 par page)
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
            </div>
          )}
        </div>
      </div>

      {/* Modal pour les factures */}
      <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-semibold">
              Factures - {selectedPaiement?.clientName || 'Utilisateur inconnu'}
            </DialogTitle>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {paiementInvoices.length} facture(s) trouvée(s)
              </p>
              {selectedPaiement && (
                <div className="text-sm text-gray-500">
                  Paiement: {selectedPaiement.montant}€ • {new Date(selectedPaiement.date).toLocaleDateString('fr-FR')}
                </div>
              )}
            </div>
          </DialogHeader>
          
          {isLoadingInvoices ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Chargement des factures...</h3>
                <p className="text-gray-500">Récupération des factures depuis Stripe.</p>
              </div>
            </div>
          ) : paiementInvoices.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune facture trouvée</h3>
                <p className="text-gray-500">Aucune facture liée à ce paiement n'a été trouvée.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              {(focusedInvoice ? [focusedInvoice] : paiementInvoices).map((invoice) => (
                <div key={invoice.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  {/* Header simplifié */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">
                            {invoice.invoiceNumber}
                          </h4>
                          <p className="text-sm text-gray-600">{invoice.description}</p>
                          {selectedPaiement && (
                            <div className="mt-1">
                              {(() => {
                                const correspondance = getCorrespondanceLevel(selectedPaiement, invoice);
                                const colorClasses = {
                                  green: 'bg-green-100 text-green-800',
                                  yellow: 'bg-yellow-100 text-yellow-800',
                                  red: 'bg-red-100 text-red-800'
                                };
                                return (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClasses[correspondance.color as keyof typeof colorClasses]}`}>
                                    {correspondance.text}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            {(invoice.amount / 100).toFixed(2)}€
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(invoice.date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <Badge className={`${getInvoiceStatusColor(invoice.status)} px-3 py-1`}>
                          <span className="flex items-center gap-2">
                            {getInvoiceStatusIcon(invoice.status)}
                            {getInvoiceStatusText(invoice.status)}
                          </span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Informations essentielles */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Client</p>
                        <p className="text-sm font-medium text-gray-900">{invoice.customerName}</p>
                        <p className="text-xs text-gray-500">{invoice.customerEmail}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dates</p>
                        <p className="text-sm text-gray-900">
                          Créée: {new Date(invoice.date).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-sm text-gray-900">
                          Échéance: {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Référence</p>
                        <p className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded">
                          {invoice.stripeInvoiceId}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Détails de la facture - simplifié */}
                  <div className="px-6 pb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">{invoice.description}</p>
                          <p className="text-sm text-gray-600">Quantité: {invoice.items[0]?.quantity || 1}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            {(invoice.amount / 100).toFixed(2)}€
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions simplifiées */}
                  <div className="px-6 pb-6">
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPdf(invoice)}
                        disabled={!invoice.invoicePdfUrl}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewInvoiceOnline(invoice)}
                        disabled={!invoice.hostedInvoiceUrl}
                        className="flex-1"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Voir en ligne
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadInvoice(invoice)}
                        disabled={isDownloadingInvoice === invoice.id}
                        className="flex-1"
                      >
                        {isDownloadingInvoice === invoice.id ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        Télécharger
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal pour visualiser le PDF de la facture */}
      <Dialog open={isPdfViewerOpen} onOpenChange={setIsPdfViewerOpen}>
        <DialogContent className="max-w-6xl h-[95vh] flex flex-col">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-semibold">
              Facture {selectedInvoiceForPdf?.invoiceNumber} - {selectedInvoiceForPdf?.customerName}
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              Visualisation de la facture PDF
            </p>
          </DialogHeader>
          
          <div className="flex-1 relative">
            {selectedInvoiceForPdf?.invoicePdfUrl ? (
              <div className="w-full h-full">
                <iframe
                  src={getPdfProxyUrl(selectedInvoiceForPdf.invoicePdfUrl)}
                  title={`Facture ${selectedInvoiceForPdf.invoiceNumber}`}
                  className="w-full h-full border-0 rounded-lg"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">PDF non disponible</h3>
                  <p className="text-gray-500">Cette facture n'a pas de PDF associé.</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setIsPdfViewerOpen(false)}
            >
              Fermer
            </Button>
            {selectedInvoiceForPdf?.invoicePdfUrl && (
              <Button
                onClick={() => handleDownloadInvoice(selectedInvoiceForPdf)}
                disabled={isDownloadingInvoice === selectedInvoiceForPdf.id}
              >
                {isDownloadingInvoice === selectedInvoiceForPdf.id ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {isDownloadingInvoice === selectedInvoiceForPdf.id ? "Téléchargement..." : "Télécharger"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}