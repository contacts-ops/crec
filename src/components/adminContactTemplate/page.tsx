"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Search,
  RefreshCw,
  User,
  Calendar,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Reply,
  Trash2,
  Eye,
  X,
  Filter
} from "lucide-react";

interface AdminContactTemplateProps {
  siteId?: string;
  editableElements?: {
    [key: string]: string;
  };
}

// Email placeholder pour les prises de contact "téléphone seul" (bande numéro)
const PHONE_ONLY_EMAIL = '__phone_only@contact.local';
const isPhoneOnlyContact = (email: string) =>
  !!email && (email === PHONE_ONLY_EMAIL || email.includes('phone_only@contact.local'));
interface Contact {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  date: string;
  phone?: string;
  company?: string;
  siteId?: string | null;
  source?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
}

export default function AdminContactTemplate({
  siteId,
  editableElements = {}
}: AdminContactTemplateProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    read: 0,
    replied: 0,
    archived: 0,
    deleted: 0
  });
  const [error, setError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  // Suppression directe: plus de modal de confirmation
  const [statusFilter, setStatusFilter] = useState<string>("");
  // Cache local pour persister les éléments supprimés entre les onglets
  const [deletedCache, setDeletedCache] = useState<Record<string, Contact>>({});
  // Persist cache across reloads
  const loadDeletedCache = () => {
    try {
      const raw = localStorage.getItem('adminContactDeletedCache');
      if (!raw) return {} as Record<string, Contact>;
      return JSON.parse(raw) as Record<string, Contact>;
    } catch {
      return {} as Record<string, Contact>;
    }
  };
  const saveDeletedCache = (data: Record<string, Contact>) => {
    try {
      localStorage.setItem('adminContactDeletedCache', JSON.stringify(data));
    } catch {}
  };
  // Confirmation suppression définitive
  const [showHardDeleteModal, setShowHardDeleteModal] = useState(false);
  const [contactToHardDelete, setContactToHardDelete] = useState<Contact | null>(null);
  const itemsPerPage = 10;

  // Calcul du nombre de jours restants avant purge définitive
  const getDeletedBadgeText = (deletedAt?: string | null) => {
    if (!deletedAt) return 'Supprimé';
    const deletedTime = new Date(deletedAt).getTime();
    const now = Date.now();
    const diffDays = Math.floor((now - deletedTime) / (1000 * 60 * 60 * 24));
    const daysLeft = Math.max(0, 7 - diffDays);
    return daysLeft > 0 ? `Supprimé · J-${daysLeft}` : 'Supprimé · purge imminente';
  };

  // Fonction pour récupérer les contacts depuis l'API
  const fetchContacts = async () => {
    setIsLoading(true);
    setError("");
    try {
      // D'abord, récupérer les informations de la bande contact active
      let contactEmail = "";
      let contactPhone = "";
      let dataSource = "mock";

      if (siteId) {
        try {
          const pagesResponse = await fetch('/api/pages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ siteId: siteId }) });
          if (pagesResponse.ok) {
            const pagesData = await pagesResponse.json();
            const pages = pagesData.pages || [];

            // Chercher la bande contact active
            for (const page of pages) {
              if (page.components && Array.isArray(page.components)) {
                for (const component of page.components) {
                  if (component.service === "contact" || 
                      component.id.includes("contact") || 
                      component.id === "contact-form") {
                    
                    // Récupérer les propriétés de la bande contact
                    if (component.props) {
                      contactEmail = component.props.contactEmail || "";
                      contactPhone = component.props.contactPhone || "";
                      dataSource = component.props.dataSource || "mock";
                      console.log("Bande contact trouvée:", {
                        id: component.id,
                        contactEmail,
                        contactPhone,
                        dataSource
                      });
                    }
                    break;
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des pages:", error);
        }
      }

      // Préparer les paramètres de base (ne pas filtrer par email expéditeur)
      const apiParams: any = { dataSource: dataSource };

      // Construire les deux requêtes: normale (hors supprimés par défaut) et supprimés
      const baseBody = {
        ...apiParams,
        siteId: siteId || undefined
      };
      const deletedBody = {
        ...apiParams,
        // Important: certains messages supprimés peuvent ne pas avoir de siteId
        siteId: undefined,
        status: 'deleted' as const
      };

      const [respBase, respDeleted] = await Promise.all([
        fetch('/api/sharedServices/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(baseBody),
        }),
        fetch('/api/sharedServices/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deletedBody),
        })
      ]);
      if (!respBase.ok) {
        const errorData = await respBase.json();
        throw new Error(`Erreur ${respBase.status}: ${errorData.message || respBase.statusText}`);
      }
      if (!respDeleted.ok) {
        const errorData = await respDeleted.json();
        throw new Error(`Erreur ${respDeleted.status}: ${errorData.message || respDeleted.statusText}`);
      }

      const [dataBase, dataDeleted] = await Promise.all([respBase.json(), respDeleted.json()]);
      console.log("Réponse API contacts (base, deleted):", dataBase, dataDeleted);
      const mapContact = (contact: any): Contact => ({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        message: contact.message,
        status: contact.status,
        date: contact.date,
        phone: contact.phone,
        company: contact.company,
        siteId: contact.siteId || null,
        source: contact.source || null,
        isDeleted: contact.isDeleted || false,
        deletedAt: contact.deletedAt || null,
      });
      const baseContacts: Contact[] = (dataBase.contacts || []).map(mapContact);
      const deletedContacts: Contact[] = (dataDeleted.contacts || []).map(mapContact);
      // Fusionner base + supprimés, serveur prioritaire et cache appliqué si besoin
      const mergedMapAll = new Map<string, Contact>();
      [...baseContacts, ...deletedContacts].forEach(c => mergedMapAll.set(c.id, c));
      // Appliquer le cache supprimés pour préserver les états locaux
      Object.values(deletedCache).forEach(c => {
        mergedMapAll.set(c.id, { ...mergedMapAll.get(c.id), ...c } as Contact);
      });
      const mergedContacts = Array.from(mergedMapAll.values());
      setContacts(mergedContacts);
      // Calculer les statistiques
      const newStats = {
        total: mergedContacts.length,
        new: mergedContacts.filter(c => c.status === 'new' && !c.isDeleted).length,
        read: mergedContacts.filter(c => c.status === 'read' && !c.isDeleted).length,
        replied: mergedContacts.filter(c => c.status === 'replied' && !c.isDeleted).length,
        archived: mergedContacts.filter(c => c.status === 'archived' && !c.isDeleted).length,
        deleted: mergedContacts.filter(c => c.isDeleted).length,
      };
      
      setStats(newStats);
      console.log("Contacts récupérés avec succès:", mergedContacts.length);
    } catch (error) {
      console.error('Erreur lors du chargement des contacts:', error);
      setError(error instanceof Error ? error.message : "Erreur inconnue");
      // En cas d'erreur, afficher une liste vide au lieu de données factices
      setContacts([]);
      const emptyStats = {
        total: 0,
        new: 0,
        read: 0,
        replied: 0,
        archived: 0,
        deleted: 0,
      };
      
      setStats(emptyStats);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Charger le cache persistant au premier rendu
    const persisted = loadDeletedCache();
    if (Object.keys(persisted).length > 0) {
      setDeletedCache(persisted);
    }
    fetchContacts();
  }, [siteId]);
  // Recalcul automatique des statistiques quand la liste ou le cache changent
  useEffect(() => {
    const deletedIds = new Set(Object.keys(deletedCache));
    const mergedForStats = contacts.map(c => deletedIds.has(c.id) ? { ...c, isDeleted: true } : c);
    const newStats = {
      total: mergedForStats.length,
      new: mergedForStats.filter(c => c.status === 'new' && !c.isDeleted).length,
      read: mergedForStats.filter(c => c.status === 'read' && !c.isDeleted).length,
      replied: mergedForStats.filter(c => c.status === 'replied' && !c.isDeleted).length,
      archived: mergedForStats.filter(c => c.status === 'archived' && !c.isDeleted).length,
      deleted: mergedForStats.filter(c => c.isDeleted).length,
    };
    setStats(newStats);
  }, [contacts, deletedCache]);
  // Fonction pour obtenir l'icône de statut
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'read':
        return <Eye className="w-4 h-4 text-gray-500" />;
      case 'replied':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'archived':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  // Fonction pour obtenir la couleur de statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return "bg-blue-100 text-blue-800";
      case 'read':
        return "bg-gray-100 text-gray-800";
      case 'replied':
        return "bg-green-100 text-green-800";
      case 'archived':
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Fonction pour obtenir le texte de statut
  const getStatusText = (status: string) => {
    switch (status) {
      case 'new':
        return "Nouveau";
      case 'read':
        return "Lu";
      case 'replied':
        return "Répondu";
      case 'archived':
        return "Archivé";
      default:
        return "Inconnu";
    }
  };

  const handleRefreshContacts = () => {
    fetchContacts();
  };

  // Filtres statut (Tous, Nouveaux, Répondus, Supprimés)
  const renderStatusFilters = () => {
    const filters = [
      { id: "", label: "Tous" },
      { id: "new", label: "Nouveaux" },
      { id: "replied", label: "Répondus" },
      { id: "deleted", label: "Supprimés" },
    ];
    return (
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 rounded-t">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtrer par état :</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {filters.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => { setStatusFilter(id); setCurrentPage(1); }}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  statusFilter === id
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const handleContactClick = async (contact: Contact) => {
    setSelectedContact(contact);
    // Marquer comme lu si le statut est "new"
    if (contact.status === 'new') {
      try {
        const response = await fetch('/api/sharedServices/contact', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contactId: contact.id,
            action: 'markAsRead'
          }),
        });
        if (response.ok) {
          // Recharger les données depuis la base de données
          await fetchContacts();
        }
      } catch (error) {
        console.error("Erreur lors du marquage comme lu:", error);
      }
    }
  };

  const handleReply = (contact: Contact) => {
    setSelectedContact(contact);
    setShowReplyModal(true);
  };

  const handleSendReply = async () => {
    if (!selectedContact || !replyMessage.trim()) return;

    try {
      // Envoyer la réponse via l'API
      const response = await fetch('/api/sharedServices/contact', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactId: selectedContact.id,
          action: 'reply',
          data: {
            replyMessage: replyMessage
          }
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Erreur API:", errorData);
        throw new Error(errorData.message || errorData.error || 'Erreur lors de l\'envoi de la réponse');
      }

      const result = await response.json();
      console.log("Réponse envoyée avec succès:", result.message);
      // Afficher des informations détaillées sur l'email
      if (result.emailSent === false) {
        console.log("⚠️ Email non envoyé:", result.emailInfo);
      } else if (result.emailSent === true) {
        console.log("✅ Email envoyé:", result.emailInfo);
      }

      // Recharger les données depuis la base de données
      await fetchContacts();
      setShowReplyModal(false);
      setReplyMessage("");
      setSelectedContact(null);
      // Afficher une notification de succès
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full';
      // Déterminer le message selon si l'email a été envoyé ou non
      const emailStatus = result.emailSent === true ? 'Email envoyé' : 'Réponse enregistrée en base';
      const emailInfo = result.emailInfo || '';
      
      notification.innerHTML = `
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <div>
            <div class="font-medium">${result.message}</div>
            <div class="text-sm opacity-90">${emailStatus}</div>
            ${emailInfo ? `<div class="text-xs opacity-75 mt-1">${emailInfo}</div>` : ''}
          </div>
        </div>
      `;
      
      document.body.appendChild(notification);
      // Animation d'entrée
      setTimeout(() => {
        notification.classList.remove('translate-x-full');
      }, 100);
      // Auto-suppression après 5 secondes
      setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 300);
      }, 5000);
    } catch (error) {
      console.error("Erreur lors de l'envoi de la réponse:", error);
      // Afficher une notification d'erreur
      const errorNotification = document.createElement('div');
      errorNotification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full';
      errorNotification.innerHTML = `
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          <div>
            <div class="font-medium">Erreur lors de l'envoi</div>
            <div class="text-sm opacity-90">${error instanceof Error ? error.message : 'Erreur inconnue'}</div>
          </div>
        </div>
      `;
      
      document.body.appendChild(errorNotification);
      // Animation d'entrée
      setTimeout(() => {
        errorNotification.classList.remove('translate-x-full');
      }, 100);
      // Auto-suppression après 8 secondes
      setTimeout(() => {
        errorNotification.classList.add('translate-x-full');
        setTimeout(() => {
          document.body.removeChild(errorNotification);
        }, 300);
      }, 8000);
    }
  };

  // Suppression de la fonction d'archivage à la demande: plus de bouton ni d'action Archiver

  const handleDelete = async (contact: Contact) => {
    try {
      const response = await fetch('/api/sharedServices/contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: contact.id, action: 'delete' })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la suppression');
      }
      // Mise à jour optimiste: marquer localement comme supprimé
      const deletedAtIso = new Date().toISOString();
      setContacts(prev => prev.map(c =>
        c.id === contact.id ? { ...c, isDeleted: true, deletedAt: deletedAtIso } : c
      ));
      // Stocker dans le cache supprimés
      setDeletedCache(prev => {
        const next = {
          ...prev,
          [contact.id]: { ...contact, isDeleted: true, deletedAt: deletedAtIso }
        } as Record<string, Contact>;
        saveDeletedCache(next);
        return next;
      });
      // Rester sur l'onglet courant; l'élément disparaîtra de "Tous" et sera visible dans "Supprimés"
      // Un refetch se fera lors du prochain rafraîchissement manuel ou changement d'onglet
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  // Suppression directe: plus de confirmation nécessaire
  const confirmDelete = async () => {};
  const cancelDelete = () => {};

  // Filtrer par catégorie selon le statut demandé
  const isSameDay = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  const categoryFilteredContacts = contacts.filter((c) => {
    const isInDeletedCache = !!deletedCache[c.id];
    if (statusFilter === "new") {
      return c.status === 'new' && isSameDay(c.date) && !c.isDeleted && !isInDeletedCache;
    }
    if (statusFilter === "replied") {
      return c.status === 'replied' && !c.isDeleted && !isInDeletedCache;
    }
    if (statusFilter === "deleted") {
      return c.isDeleted === true || isInDeletedCache;
    }
    // Tous: exclure les supprimés pour éviter les doublons
    return c.isDeleted !== true && !isInDeletedCache;
  });
  // Filtrer par recherche textuelle
  const filteredContacts = categoryFilteredContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // Pagination
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentContacts = filteredContacts.slice(startIndex, endIndex);
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Gestion des Messages Contact
            </h2>
            <p className="text-gray-600">
              Interface de gestion pour les messages de contact de votre site.
            </p>
            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">
                  <strong>Erreur :</strong> {error}
                </p>
                <p className="text-xs text-red-500 mt-1">
                  Impossible de récupérer les contacts depuis la base de données.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Nouveaux</p>
                <p className="text-2xl font-bold text-gray-900">{stats.new}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Répondus</p>
                <p className="text-2xl font-bold text-gray-900">{stats.replied}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Supprimés</p>
                <p className="text-2xl font-bold text-gray-900">{stats.deleted}</p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher un contact..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={handleRefreshContacts}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {renderStatusFilters()}

        {/* Messages d'erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Contacts List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Liste des Messages ({filteredContacts.length})
              {isLoading && <span className="text-sm text-gray-500 ml-2">- Chargement...</span>}
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {currentContacts.map((contact) => (
              <div key={contact.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="w-8 h-8 text-gray-600" />
                  </div>

                  {/* Contenu */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(contact.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(contact.status)}`}>
                          {(contact.isDeleted || deletedCache[contact.id]) ? 'Supprimé' : getStatusText(contact.status)}
                        </span>
                      </div>
                      {(contact.isDeleted || deletedCache[contact.id]) && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                          {getDeletedBadgeText((contact.deletedAt || deletedCache[contact.id]?.deletedAt) as string)}
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {contact.company || "Particulier"}
                      </span>
                    </div>

                    <div className="mb-2">
                      <h4 className="font-medium text-gray-900 text-lg mb-1">{contact.subject}</h4>
                      <p className="text-sm text-gray-500 mb-2">
                        De <span className="font-medium">{contact.name}</span>
                        {isPhoneOnlyContact(contact.email) && contact.phone
                          ? <> — <span className="font-medium">Tél : {contact.phone}</span></>
                          : <> ({contact.email})</>
                        }
                      </p>
                      <p className="text-sm text-gray-500">
                        <Calendar className="inline w-3 h-3 mr-1" />
                        {new Date(contact.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Europe/Paris'
                        })}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div></div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleContactClick(contact)}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all duration-200 hover:shadow-sm border border-blue-200 hover:border-blue-300"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-sm font-medium">Voir</span>
                        </button>
                        {!isPhoneOnlyContact(contact.email) && (
                        <button 
                          onClick={() => handleReply(contact)}
                          className="flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-all duration-200 hover:shadow-sm border border-green-200 hover:border-green-300"
                          title="Répondre"
                        >
                          <Reply className="w-4 h-4" />
                          <span className="text-sm font-medium">Répondre</span>
                        </button>
                        )}
                        {/* Bouton Archiver retiré */}
                        {/* Supprimer / Restaurer */}
                        {(contact.isDeleted || deletedCache[contact.id]) ? (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/sharedServices/contact', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ contactId: contact.id, action: 'restore' })
                                  });
                                  if (!res.ok) throw new Error('Erreur restauration');
                                  // Retirer du cache supprimés et mettre à jour localement
                                  setDeletedCache(prev => {
                                    const { [contact.id]: _, ...rest } = prev;
                                    saveDeletedCache(rest as Record<string, Contact>);
                                    return rest as Record<string, Contact>;
                                  });
                                  setContacts(prev => {
                                    const exists = prev.some(c => c.id === contact.id);
                                    const restored = { ...contact, isDeleted: false, deletedAt: null } as Contact;
                                    if (exists) {
                                      return prev.map(c => c.id === contact.id ? restored : c);
                                    }
                                    // Si on n'est pas dans l'onglet supprimés, on peut le réinsérer pour l'afficher immédiatement
                                    if (statusFilter !== 'deleted') {
                                      return [restored, ...prev];
                                    }
                                    return prev;
                                  });
                                } catch (e) {
                                  console.error('Erreur restauration', e);
                                }
                              }}
                              className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all duration-200 hover:shadow-sm border border-blue-200 hover:border-blue-300"
                              title="Restaurer"
                            >
                              <Reply className="w-4 h-4" />
                              <span className="text-sm font-medium">Restaurer</span>
                            </button>
                            <button 
                              onClick={() => {
                                setContactToHardDelete(contact);
                                setShowHardDeleteModal(true);
                              }}
                              className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all duration-200 hover:shadow-sm border border-red-200 hover:border-red-300"
                              title="Supprimer définitivement"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="text-sm font-medium">Supprimer définitivement</span>
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleDelete(contact)}
                            className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all duration-200 hover:shadow-sm border border-red-200 hover:border-red-300"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm font-medium">Supprimer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredContacts.length === 0 && !isLoading && (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun message trouvé</h3>
              <p className="text-gray-500">Aucun message ne correspond à vos critères de recherche.</p>
            </div>
          )}

          {isLoading && (
            <div className="p-8 text-center">
              <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Chargement des messages...</h3>
              <p className="text-gray-500">Récupération des messages depuis l'API.</p>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Affichage {startIndex + 1}-{Math.min(endIndex, filteredContacts.length)} sur {filteredContacts.length} messages
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Affichage de {startIndex + 1} à {Math.min(endIndex, filteredContacts.length)} sur {filteredContacts.length} résultats
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Précédent
              </button>
              <span className="px-3 py-2 text-sm text-gray-700">
                Page {currentPage} sur {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}

        {/* Modal de réponse */}
        {showReplyModal && selectedContact && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Répondre à {selectedContact.name}</h3>
                <button 
                  onClick={() => {
                    setShowReplyModal(false);
                    setReplyMessage("");
                    setSelectedContact(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message original</label>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-900">{selectedContact.message}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Votre réponse *</label>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={6}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tapez votre réponse..."
                    required
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSendReply}
                  disabled={!replyMessage.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Envoyer la réponse
                </button>
                <button
                  onClick={() => {
                    setShowReplyModal(false);
                    setReplyMessage("");
                    setSelectedContact(null);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de détail du contact */}
        {selectedContact && !showReplyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Détails du message</h3>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">De</label>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-900 font-medium">{selectedContact.name}</p>
                    {!isPhoneOnlyContact(selectedContact.email) && (
                      <p className="text-sm text-gray-600">{selectedContact.email}</p>
                    )}
                    {selectedContact.phone && (
                      <p className="text-sm text-gray-600 font-medium">Tél : {selectedContact.phone}</p>
                    )}
                    {selectedContact.company && (
                      <p className="text-sm text-gray-600">Entreprise : {selectedContact.company}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-900">{selectedContact.subject}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    {isPhoneOnlyContact(selectedContact.email) && selectedContact.phone && (
                      <p className="text-sm text-gray-900 font-medium mb-2">Numéro à rappeler : {selectedContact.phone}</p>
                    )}
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedContact.message}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-900">
                        {new Date(selectedContact.date).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Europe/Paris'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(selectedContact.status)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedContact.status)}`}>
                          {selectedContact.isDeleted ? 'Supprimé' : getStatusText(selectedContact.status)}
                        </span>
                        {selectedContact.isDeleted && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">
                            {getDeletedBadgeText(selectedContact.deletedAt)}
                          </span>
                        )}
                      </div>
                                             {/* Affichage du Site ID et Source retirés */}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                {!isPhoneOnlyContact(selectedContact.email) && (
                <button
                  onClick={() => handleReply(selectedContact)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  <Reply className="w-4 h-4 inline mr-2" />
                  Répondre
                </button>
                )}
                {/* Bouton Archiver retiré */}
              </div>
            </div>
          </div>
        )}

        {/* Confirmation suppression définitive */}
        {showHardDeleteModal && contactToHardDelete && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
            <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
              <h2 className="text-lg font-semibold mb-4">Confirmer la suppression</h2>
              <p>
                Voulez-vous vraiment supprimer définitivement le message de <b>{contactToHardDelete.name}</b> ?
              </p>
              <p className="text-sm text-gray-600 mt-2 break-words">
                Sujet: {contactToHardDelete.subject}
              </p>
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded max-h-48 overflow-auto">
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                  {contactToHardDelete.message}
                </p>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowHardDeleteModal(false);
                    setContactToHardDelete(null);
                  }}
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                >
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    if (!contactToHardDelete) return;
                    try {
                      const res = await fetch('/api/sharedServices/contact', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contactId: contactToHardDelete.id, action: 'hardDelete' })
                      });
                      if (!res.ok) throw new Error('Erreur suppression définitive');
                      setContacts(prev => prev.filter(c => c.id !== contactToHardDelete.id));
                      setDeletedCache(prev => {
                        const { [contactToHardDelete.id]: _, ...rest } = prev;
                        saveDeletedCache(rest as Record<string, Contact>);
                        return rest as Record<string, Contact>;
                      });
                    } catch (e) {
                      console.error('Erreur suppression définitive', e);
                    } finally {
                      setShowHardDeleteModal(false);
                      setContactToHardDelete(null);
                    }
                  }}
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 