"use client";

import { useState, useEffect } from "react";
import { useSiteId } from "@/hooks/use-site-id";
import {
  Calendar,
  Search,
  RefreshCw,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  X,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown
} from "lucide-react";

interface AdminRdvTemplateProps {
  siteId?: string;
  editableElements?: {
    [key: string]: string;
  };
}

interface RendezVous {
  id: string;
  siteId: string;
  hostName: string;
  eventName: string;
  eventDescription: string;
  callDuration: string;
  location: string;
  timeZone: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  hostEmail: string;
  selectedDate: string;
  selectedTime: string;
  additionalNotes: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export default function AdminRdvTemplate({
  editableElements = {}
}: Omit<AdminRdvTemplateProps, 'siteId'>) {
  // Utiliser le hook pour récupérer le siteId
  const siteId = useSiteId();
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rendezVous, setRendezVous] = useState<RendezVous[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0
  });
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRdv, setSelectedRdv] = useState<RendezVous | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rdvToDelete, setRdvToDelete] = useState<RendezVous | null>(null);
  const itemsPerPage = 10;
  // Sélecteur de vue pour le bloc principal (liste ou semaine) + décalage semaine
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list');
  const [weekOffset, setWeekOffset] = useState(0);
  // Filtre de statut
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'createdAt' | 'userName'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  // États pour la configuration des horaires
  const [showAvailabilityConfig, setShowAvailabilityConfig] = useState(false);
  const [availabilityConfig, setAvailabilityConfig] = useState({
    monday: { enabled: true, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' },
    friday: { enabled: true, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' },
    saturday: { enabled: false, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' },
    sunday: { enabled: false, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' }
  });
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  // Fonction pour récupérer les rendez-vous depuis l'API
  const fetchRendezVous = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch('/api/sharedServices/rdv/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId: siteId || 'default-site'
        }),
      });
      if (!response.ok) {
        // Vérifier si la réponse est du HTML (page d'erreur)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error(`API non disponible (${response.status}) - Vérifiez que le serveur est démarré`);
        }
        
        try {
          const errorData = await response.json();
          throw new Error(`Erreur ${response.status}: ${errorData.message || response.statusText}`);
        } catch (parseError) {
          throw new Error(`Erreur ${response.status}: Réponse invalide de l'API`);
        }
      }

      const data = await response.json();
      console.log("Réponse de l'API rendez-vous:", data);
      setRendezVous(data.rendezVous || []);
      // Calculer les statistiques
      const newStats = {
        total: data.totalRendezVous || data.rendezVous?.length || 0,
        pending: data.rendezVous?.filter((rdv: RendezVous) => rdv.status === 'pending').length || 0,
        confirmed: data.rendezVous?.filter((rdv: RendezVous) => rdv.status === 'confirmed').length || 0
      };
      
      setStats(newStats);
      console.log("Rendez-vous récupérés avec succès:", data.rendezVous?.length || 0);
    } catch (error) {
      console.error('Erreur lors du chargement des rendez-vous:', error);
      setError(error instanceof Error ? error.message : "Erreur inconnue");
      // En cas d'erreur, afficher une liste vide
      setRendezVous([]);
      const emptyStats = {
        total: 0,
        pending: 0,
        confirmed: 0
      };
      
      setStats(emptyStats);
    } finally {
      setIsLoading(false);
    }
  };

  // Helpers messages
  const showSuccessMessage = (message: string) => {
    setSuccess(message);
    setError("");
    setTimeout(() => setSuccess(""), 5000);
  };
  const showErrorMessage = (message: string) => {
    setError(message);
    setSuccess("");
    setTimeout(() => setError(""), 8000);
  };

  // Fonction pour synchroniser les RDV depuis Google Calendar
  const handleSyncFromGoogle = async (silent: boolean = false) => {
    if (!siteId) {
      if (!silent) {
        showErrorMessage('Impossible de synchroniser : siteId manquant');
      }
      return;
    }

    setIsSyncingGoogle(true);
    if (!silent) {
      setError('');
      setSuccess('');
    }

    try {
      // Calculer les dates : 1 semaine en arrière et 1 mois en avant
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 1 semaine en arrière
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 mois en avant

      const response = await fetch('/api/sharedServices/rdv/sync-from-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          maxResults: 250
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.details || errorData.error || 'Erreur lors de la synchronisation';
        if (!silent) {
          showErrorMessage(errorMessage);
        }
        console.error('Erreur synchronisation Google Calendar:', errorMessage);
        return;
      }

      const data = await response.json();
      if (data.success) {
        const stats = data.stats || {};
        const syncedCount = data.syncedRdv?.length || 0;
        const errorsCount = data.errors?.length || 0;
        
        // Afficher un message seulement si des RDV ont été synchronisés ou s'il y a des erreurs
        if (!silent || syncedCount > 0 || errorsCount > 0) {
          let message = `Synchronisation terminée : ${syncedCount} RDV créé(s)/mis à jour`;
          if (stats.bookedCountFromGoogleNotInDB) {
            message += ` (${stats.bookedCountFromGoogleNotInDB} événements Google non synchronisés trouvés)`;
          }
          if (errorsCount > 0) {
            message += `. ${errorsCount} erreur(s) rencontrée(s)`;
          }
          
          if (silent && syncedCount === 0 && errorsCount === 0) {
            // Ne pas afficher de message si synchronisation silencieuse et rien à synchroniser
            console.log('Synchronisation Google Calendar : aucun nouveau RDV à synchroniser');
          } else {
            showSuccessMessage(message);
          }
        }
        
        // Recharger les rendez-vous après synchronisation
        await fetchRendezVous();
      } else {
        const errorMessage = data.error || 'Erreur lors de la synchronisation';
        if (!silent) {
          showErrorMessage(errorMessage);
        }
        console.error('Erreur synchronisation Google Calendar:', errorMessage);
      }

    } catch (error) {
      console.error('Erreur lors de la synchronisation depuis Google Calendar:', error);
      if (!silent) {
        showErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue lors de la synchronisation');
      }
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  useEffect(() => {
    fetchRendezVous();
    fetchAvailabilityConfig();
    // Synchroniser automatiquement depuis Google Calendar au chargement (mode silencieux)
    if (siteId) {
      handleSyncFromGoogle(true);
    }
  }, [siteId]);
  // Fonction pour obtenir l'icône de statut
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  // Fonction pour obtenir la couleur de statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return "bg-yellow-100 text-yellow-800";
      case 'confirmed':
        return "bg-green-100 text-green-800";
      case 'cancelled':
        return "bg-red-100 text-red-800";
      case 'completed':
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Fonction pour obtenir le texte de statut
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return "En attente";
      case 'confirmed':
        return "Confirmé";
      case 'cancelled':
        return "Annulé";
      case 'completed':
        return "Terminé";
      default:
        return "Inconnu";
    }
  };

  const handleRefreshRendezVous = () => {
    fetchRendezVous();
  };

  const handleRdvClick = (rdv: RendezVous) => {
    setSelectedRdv(rdv);
  };

  const handleUpdateStatus = async (rdvId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/sharedServices/rdv/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rdvId,
          status: newStatus
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la mise à jour');
      }

      // Recharger les données depuis la base de données
      await fetchRendezVous();
      showSuccessMessage('Statut mis à jour');
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      showErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue lors de la mise à jour');
    }
  };

  const handleDelete = (rdv: RendezVous) => {
    if (rdv.status === 'confirmed') {
      alert("Vous ne pouvez pas supprimer un rendez-vous confirmé.");
      return;
    }
    setRdvToDelete(rdv);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!rdvToDelete) return;

    try {
      const response = await fetch('/api/sharedServices/rdv/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rdvId: rdvToDelete.id
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la suppression');
      }

      // Recharger les données depuis la base de données
      await fetchRendezVous();
      showSuccessMessage('Rendez-vous supprimé');
      // Fermer la modal
      setShowDeleteModal(false);
      setRdvToDelete(null);
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      showErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue lors de la suppression');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setRdvToDelete(null);
  };

  // Fonctions pour la configuration des horaires
  const fetchAvailabilityConfig = async () => {
    try {
      const response = await fetch(`/api/sharedServices/rdv/availability?siteId=${siteId || 'default-site'}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.availability) {
          setAvailabilityConfig(data.availability);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration des horaires:', error);
    }
  };

  const saveAvailabilityConfig = async () => {
    setIsSavingAvailability(true);
    try {
      const response = await fetch('/api/sharedServices/rdv/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId: siteId || 'default-site',
          availability: availabilityConfig
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la sauvegarde');
      }

      showSuccessMessage('Configuration des horaires sauvegardée');
      setShowAvailabilityConfig(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des horaires:', error);
      showErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue lors de la sauvegarde');
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const updateAvailabilityDay = (day: string, field: string, value: any) => {
    setAvailabilityConfig(prev => ({
      ...prev,
      [day]: {
        ...prev[day as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const getDayLabel = (day: string) => {
    const labels = {
      monday: 'Lundi',
      tuesday: 'Mardi',
      wednesday: 'Mercredi',
      thursday: 'Jeudi',
      friday: 'Vendredi',
      saturday: 'Samedi',
      sunday: 'Dimanche'
    };
    return labels[day as keyof typeof labels] || day;
  };

  // Fonction pour parser la durée en minutes
  const parseDurationToMinutes = (duration: string | number | null | undefined): number => {
    if (typeof duration === "number") {
      return isFinite(duration) ? duration : 30;
    }
    if (!duration) return 30;

    const sanitized = duration.toString().toLowerCase().replace(/,/g, ".").trim();
    if (!sanitized) return 30;

    const onlyNumber = Number(sanitized);
    if (!Number.isNaN(onlyNumber) && onlyNumber > 0) {
      return onlyNumber;
    }

    let totalMinutes = 0;
    const hourMatch = sanitized.match(/(\d+(?:\.\d+)?)\s*h/);
    if (hourMatch) {
      totalMinutes += Math.round(parseFloat(hourMatch[1]) * 60);
    }

    const minuteMatch = sanitized.match(/(\d+(?:\.\d+)?)\s*(?:min|m|minutes?)/);
    if (minuteMatch) {
      totalMinutes += Math.round(parseFloat(minuteMatch[1]));
    }

    if (!minuteMatch && sanitized.includes("h")) {
      const afterH = sanitized.split("h")[1];
      const trailingNumber = Number(afterH);
      if (!Number.isNaN(trailingNumber)) {
        totalMinutes += trailingNumber;
      }
    }

    if (totalMinutes <= 0) {
      const fallbackDigits = sanitized.match(/(\d+(?:\.\d+)?)/);
      if (fallbackDigits) {
        totalMinutes = Number(fallbackDigits[1]);
      }
    }

    return totalMinutes > 0 ? totalMinutes : 30;
  };

  // Filtrer les rendez-vous selon le terme de recherche
  const filteredRendezVous = rendezVous
    .filter(rdv =>
      rdv.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rdv.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rdv.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rdv.hostName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(rdv => statusFilter === 'all' ? true : rdv.status === statusFilter)
    .sort((a, b) => {
      let aVal: any;
      let bVal: any;
      if (sortBy === 'userName') {
        aVal = a.userName.toLowerCase();
        bVal = b.userName.toLowerCase();
      } else if (sortBy === 'createdAt') {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      } else {
        // 'date' combine date + heure sélectionnée
        const aDate = new Date(a.selectedDate);
        const aHour = parseInt(a.selectedTime.split(':')[0] || '0', 10);
        aDate.setHours(aHour, 0, 0, 0);
        const bDate = new Date(b.selectedDate);
        const bHour = parseInt(b.selectedTime.split(':')[0] || '0', 10);
        bDate.setHours(bHour, 0, 0, 0);
        aVal = aDate.getTime();
        bVal = bDate.getTime();
      }
      const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  // Pagination
  const totalPages = Math.ceil(filteredRendezVous.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRendezVous = filteredRendezVous.slice(startIndex, endIndex);
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* En-tête */}
        <div className="mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-gray-900">Gestion des Rendez-vous</h2>
              {isSyncingGoogle && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synchronisation Google Calendar...</span>
                </div>
              )}
            </div>
            <p className="text-gray-600">Interface de gestion pour les rendez-vous de votre site.</p>
            {/* Messages d'erreur et de succès */}
            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600"><strong>Erreur :</strong> {error}</p>
              </div>
            )}
            {success && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600"><strong>Succès :</strong> {success}</p>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard (aligné sur AdminBlogTemplate) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total RDV</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
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
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Confirmés</p>
                <p className="text-2xl font-bold text-gray-900">{stats.confirmed}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Affichage central (liste) */}
        <>
            {/* Configuration des horaires de disponibilité */}
            <div className="mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Horaires de disponibilité</h3>
                      <p className="text-sm text-gray-500">Configurez vos horaires de disponibilité pour les rendez-vous</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAvailabilityConfig(!showAvailabilityConfig)}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2"
                  >
                    {showAvailabilityConfig ? 'Masquer' : 'Configurer'}
                  </button>
                </div>

                {showAvailabilityConfig && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="space-y-4">
                      {Object.entries(availabilityConfig).map(([day, config]) => (
                        <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3 min-w-[120px]">
                            <input
                              type="checkbox"
                              id={`enabled-${day}`}
                              checked={config.enabled}
                              onChange={(e) => updateAvailabilityDay(day, 'enabled', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor={`enabled-${day}`} className="text-sm font-medium text-gray-700">
                              {getDayLabel(day)}
                            </label>
                          </div>
                          
                          {config.enabled && (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">De</span>
                                <input
                                  type="time"
                                  value={config.start}
                                  onChange={(e) => updateAvailabilityDay(day, 'start', e.target.value)}
                                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">à</span>
                                <input
                                  type="time"
                                  value={config.end}
                                  onChange={(e) => updateAvailabilityDay(day, 'end', e.target.value)}
                                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-sm text-gray-500">Pause</span>
                                <input
                                  type="time"
                                  value={config.pauseStart}
                                  onChange={(e) => updateAvailabilityDay(day, 'pauseStart', e.target.value)}
                                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <span className="text-sm text-gray-500">à</span>
                                <input
                                  type="time"
                                  value={config.pauseEnd}
                                  onChange={(e) => updateAvailabilityDay(day, 'pauseEnd', e.target.value)}
                                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                            </>
                          )}
                          
                          {!config.enabled && (
                            <span className="text-sm text-gray-400 italic">Non disponible</span>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => setShowAvailabilityConfig(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={saveAvailabilityConfig}
                        disabled={isSavingAvailability}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSavingAvailability ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Sauvegarde...
                          </>
                        ) : (
                          'Sauvegarder'
                        )}
                      </button>
                    </div>

                    {/* (Aperçu semaine retiré ici) */}
                  </div>
                )}
              </div>
            </div>

            {/* (Aperçu semaine permanent retiré) */}

            {/* Messages d'erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Sélecteur Liste/Semaine */}
            <div className="flex gap-2 justify-center items-center my-6">
              <button
                className={`px-4 py-2 rounded-lg font-medium border transition-colors ${viewMode === 'list' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                onClick={() => setViewMode('list')}
              >
                Liste
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-medium border transition-colors ${viewMode === 'week' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                onClick={() => setViewMode('week')}
              >
                Semaine
              </button>
            </div>

            {/* Rendez-vous List */}
            {viewMode === 'list' && (
            <div className="bg-white rounded-lg border border-gray-200 max-h-screen flex flex-col">
              <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Liste des Rendez-vous</h3>
                  <p className="text-sm text-gray-500">{filteredRendezVous.length} résultat(s){isLoading && ' • Chargement…'}</p>
                </div>
                <div className="w-full md:w-80 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Rechercher un rendez-vous…"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Filter and Sort Bar (moved into list header) */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Filtrer par état :</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { key: 'all', label: 'Tous' },
                      { key: 'pending', label: 'En attente' },
                      { key: 'confirmed', label: 'Confirmés' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setStatusFilter(key as any)}
                        className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                          statusFilter === key
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-600">Trier par :</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                  >
                    <option value="date">Date du RDV</option>
                    <option value="createdAt">Date de création</option>
                    <option value="userName">Nom du client</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                    title="Basculer ordre"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    {sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
                  </button>
                  <button
                    onClick={handleRefreshRendezVous}
                    disabled={isLoading || isSyncingGoogle}
                    className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium border transition-colors bg-gray-900 text-white border-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Rafraîchir les rendez-vous"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Rafraîchissement...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Actualiser
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleSyncFromGoogle(false)}
                    disabled={isSyncingGoogle || isLoading}
                    className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium border transition-colors bg-blue-600 text-white border-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Synchroniser manuellement les RDV depuis Google Calendar"
                  >
                    {isSyncingGoogle ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Synchronisation...
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4" />
                        Sync Google
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Bandeau de statistiques (simple) */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-gray-200 text-gray-800">Total {stats.total}</span>
                  <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">En attente {stats.pending}</span>
                  <span className="px-2 py-1 rounded-full bg-green-100 text-green-800">Confirmés {stats.confirmed}</span>
                </div>
              </div>

              <div className="divide-y divide-gray-200 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                {currentRendezVous.map((rdv) => (
                  <div key={rdv.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4 justify-between">
                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(rdv.status)}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(rdv.status)}`}>
                              {getStatusText(rdv.status)}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {rdv.eventName}
                          </span>
                        </div>

                        <div className="mb-0">
                          <h4 className="font-medium text-gray-900 text-base mb-1">{rdv.userName}</h4>
                          <p className="text-sm text-gray-500 mb-1">
                            {rdv.userEmail}
                            {rdv.userPhone && <> • <Phone className="inline w-3 h-3 mr-1" />{rdv.userPhone}</>}
                            {' • '}{rdv.hostName}
                          </p>
                          <p className="text-sm text-gray-500">
                            <Calendar className="inline w-3 h-3 mr-1" />
                            {new Date(rdv.selectedDate).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })} à {rdv.selectedTime}
                          </p>
                          {rdv.additionalNotes && (
                            <p className="text-sm text-gray-500 mt-1 italic">
                              Note: {rdv.additionalNotes}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Actions alignées à droite */}
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        {rdv.status === 'pending' && (
                          <button 
                            onClick={() => handleUpdateStatus(rdv.id, 'confirmed')}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg transition-colors hover:bg-green-700"
                            title="Confirmer"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Confirmer</span>
                          </button>
                        )}
                        {rdv.status !== 'confirmed' && (
                          <button 
                            onClick={() => handleDelete(rdv)}
                            className="flex items-center gap-2 px-3 py-2 bg-white text-red-600 rounded-lg transition-colors hover:bg-red-50 border border-red-200"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm font-medium">Supprimer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredRendezVous.length === 0 && !isLoading && (
                <div className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun rendez-vous trouvé</h3>
                  <p className="text-gray-500">Aucun rendez-vous ne correspond à vos critères de recherche.</p>
                </div>
              )}

              {isLoading && (
                <div className="p-8 text-center">
                  <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Chargement des rendez-vous...</h3>
                  <p className="text-gray-500">Récupération des rendez-vous depuis l'API.</p>
                </div>
              )}

              {/* Pagination */}
              {!isLoading && totalPages > 1 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Affichage {startIndex + 1}-{Math.min(endIndex, filteredRendezVous.length)} sur {filteredRendezVous.length} rendez-vous
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
            )}

            {/* Vue Semaine principale (basculable) */}
            {viewMode === 'week' && (
              (() => {
                const today = new Date();
                const firstDayOfWeek = today.getDate() - today.getDay() + 1;
                const baseDate = new Date(today.setDate(firstDayOfWeek));
                baseDate.setDate(baseDate.getDate() + weekOffset * 7);
                const startDate = new Date(baseDate);
                const endDate = new Date(baseDate);
                endDate.setDate(startDate.getDate() + 6);
                return (
                  <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 p-2">
                    <div className="flex justify-center items-center gap-4 mb-4">
                      <button
                        className="p-2 rounded bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200"
                        onClick={() => setWeekOffset(weekOffset - 1)}
                        aria-label="Semaine précédente"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="font-medium text-gray-700 text-sm">
                        {startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' '}–{' '}
                        {endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <button
                        className="p-2 rounded bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200"
                        onClick={() => setWeekOffset(weekOffset + 1)}
                        aria-label="Semaine suivante"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                    <table className="min-w-full border border-gray-200 bg-white">
                      <thead>
                        <tr>
                          <th className="border-b p-2 bg-gray-50 w-20 text-xs">Heure</th>
                          {[...Array(7)].map((_, i) => {
                            const day = new Date(baseDate);
                            day.setDate(baseDate.getDate() + i);
                            return (
                              <th key={i} className="border-b p-2 bg-gray-50 text-xs font-semibold">
                                {day.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {[...Array(12)].map((_, h) => {
                          const hour = h + 8;
                          return (
                            <tr key={hour} style={{ height: '60px' }}>
                              <td className="border-r p-2 text-xs text-gray-500 bg-gray-50 align-top">{hour}:00</td>
                              {[...Array(7)].map((_, d) => {
                                const cellDate = new Date(baseDate);
                                cellDate.setDate(baseDate.getDate() + d);
                                // Utiliser une comparaison de dates locale pour éviter les décalages de timezone
                                const cellYear = cellDate.getFullYear();
                                const cellMonth = cellDate.getMonth();
                                const cellDay = cellDate.getDate();
                                // Trouver les événements qui COMMENCENT à cette heure précise (pas ceux qui continuent)
                                const rdvsStartingHere = rendezVous.filter(rdv => {
                                  const rdvDate = new Date(rdv.selectedDate);
                                  const rdvYear = rdvDate.getFullYear();
                                  const rdvMonth = rdvDate.getMonth();
                                  const rdvDay = rdvDate.getDate();
                                  // Vérifier que c'est le même jour
                                  if (rdvYear !== cellYear || rdvMonth !== cellMonth || rdvDay !== cellDay) {
                                    return false;
                                  }
                                  
                                  // Extraire l'heure locale depuis selectedTime (format HH:MM)
                                  const [rdvHourStr] = rdv.selectedTime.split(':');
                                  const rdvStartHour = parseInt(rdvHourStr || '0', 10);
                                  // L'événement doit commencer exactement à cette heure
                                  return rdvStartHour === hour;
                                });
                                // Griser selon config dispo/pauses
                                const dayKeys2: Array<keyof typeof availabilityConfig> = [
                                  'monday','tuesday','wednesday','thursday','friday','saturday','sunday'
                                ];
                                const key = dayKeys2[d];
                                const cfg = availabilityConfig[key];
                                let gray = false;
                                if (!cfg?.enabled) gray = true;
                                else {
                                  const [startH] = cfg.start.split(':').map(Number);
                                  const [endH] = cfg.end.split(':').map(Number);
                                  const [pStartH] = cfg.pauseStart.split(':').map(Number);
                                  const [pEndH] = cfg.pauseEnd.split(':').map(Number);
                                  const withinWorking = hour >= startH && hour < endH;
                                  const withinPause = hour >= pStartH && hour < pEndH;
                                  gray = !(withinWorking && !withinPause);
                                }
                                const tdStyle = gray ? 'bg-gray-50 opacity-50' : '';
                                
                                // Vérifier si cette cellule doit être vide (car un événement précédent s'étend ici)
                                const hasContinuingEvent = rendezVous.some(rdv => {
                                  const rdvDate = new Date(rdv.selectedDate);
                                  const rdvYear = rdvDate.getFullYear();
                                  const rdvMonth = rdvDate.getMonth();
                                  const rdvDay = rdvDate.getDate();
                                  if (rdvYear !== cellYear || rdvMonth !== cellMonth || rdvDay !== cellDay) {
                                    return false;
                                  }
                                  
                                  const [rdvHourStr, rdvMinuteStr] = rdv.selectedTime.split(':');
                                  const rdvStartHour = parseInt(rdvHourStr || '0', 10);
                                  const rdvStartMinute = parseInt(rdvMinuteStr || '0', 10);
                                  const durationMinutes = parseDurationToMinutes(rdv.callDuration);
                                  const rdvEndTotalMinutes = rdvStartHour * 60 + rdvStartMinute + durationMinutes;
                                  const rdvEndHour = Math.floor(rdvEndTotalMinutes / 60);
                                  // Un événement continue ici s'il a commencé avant cette heure et se termine après
                                  return rdvStartHour < hour && rdvEndHour > hour;
                                });
                                // Si un événement continue ici, ne pas rendre cette cellule (elle sera couverte par le rowSpan)
                                if (hasContinuingEvent && rdvsStartingHere.length === 0) {
                                  return null;
                                }
                                
                                const rowSpanValue = rdvsStartingHere.length > 0 
                                  ? Math.max(1, Math.ceil(parseDurationToMinutes(rdvsStartingHere[0].callDuration) / 60))
                                  : undefined;
                                
                                return (
                                  <td 
                                    key={d} 
                                    className={`border p-1 align-top min-w-[120px] ${tdStyle}`}
                                    rowSpan={rowSpanValue}
                                    style={rowSpanValue && rowSpanValue > 1 ? {
                                      height: `${rowSpanValue * 60}px`,
                                      verticalAlign: 'top'
                                    } : {}}
                                  >
                                    {rdvsStartingHere.map(rdv => {
                                      const durationMinutes = parseDurationToMinutes(rdv.callDuration);
                                      const cellHeight = Math.max(60, durationMinutes);
                                      return (
                                        <div 
                                          key={rdv.id} 
                                          className="mb-1 p-1 rounded bg-blue-50 border border-blue-200 text-xs text-blue-900"
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'flex-start',
                                            height: `${cellHeight}px`,
                                            minHeight: `${cellHeight}px`
                                          }}
                                        >
                                          <span className="font-semibold">{rdv.userName}</span>
                                          {rdv.userPhone && <span className="text-gray-600">📞 {rdv.userPhone}</span>}
                                          <span>{rdv.eventName}</span>
                                          <span className="text-gray-500">{rdv.selectedTime} ({rdv.callDuration})</span>
                                        </div>
                                      );
                                    })}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()
            )}
          </>
      </div>
      
      {showDeleteModal && rdvToDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-4">
              {rdvToDelete.status === 'confirmed' ? 'Suppression impossible' : 'Confirmer la suppression'}
            </h2>
            <p>Voulez-vous vraiment supprimer le rendez-vous de <b>{rdvToDelete.userName}</b> ?</p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
              >
                Annuler
              </button>
              {rdvToDelete?.status !== 'confirmed' && (
                <button 
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 