"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Star,
  MessageSquare,
  Search,
  RefreshCw,
  Globe,
  Star as StarIcon2,
  Filter,
  ArrowUpDown,
  XCircle
} from "lucide-react";

interface AdminAvisTemplateProps {
  siteId?: string;
  editableElements?: {
    [key: string]: string;
  };
}

interface Review {
  id: string;
  testimonial: string;
  by: string;
  imgSrc: string;
  rating: number;
  date: string;
  source: 'mock' | 'google' | 'trustpilot' | 'other';
}

interface Avis {
  id: string;
  clientName: string;
  rating: number;
  comment: string;
  date: string;
  source: string;
  imgSrc?: string;
}

export default function AdminAvisTemplate({
  siteId,
  editableElements = {}
}: AdminAvisTemplateProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [minRating, setMinRating] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    averageRating: 0,
    sources: {} as Record<string, number>
  });
  const [error, setError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fonction pour récupérer les avis depuis l'API
  const fetchAvis = async () => {
    setIsLoading(true);
    setError("");
    try {
      // D'abord, récupérer les informations de la bande avis active
      let apiKey = "";
      let placeId = "";
      let dataSource = "mock";

      if (siteId) {
        try {
          const pagesResponse = await fetch('/api/pages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ siteId: siteId }) });
          if (pagesResponse.ok) {
            const pagesData = await pagesResponse.json();
            const pages = pagesData.pages || [];

            // Chercher la bande avis active
            for (const page of pages) {
              if (page.components && Array.isArray(page.components)) {
                for (const component of page.components) {
                  if (component.service === "avis" || 
                      component.id.includes("avis") || 
                      component.id === "avis-delcourt" ||
                      component.id === "delevouy") {
                    
                    // Récupérer les propriétés de la bande avis
                    if (component.props) {
                      apiKey = component.props.apiKey || "";
                      placeId = component.props.placeId || "";
                      dataSource = component.props.dataSource || "mock";
                      console.log("Bande avis trouvée:", {
                        id: component.id,
                        dataSource,
                        hasApiKey: !!apiKey,
                        hasPlaceId: !!placeId
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

      // Préparer les paramètres pour l'API
      const apiParams: any = {
        siteId: siteId, // Ajouter le siteId requis par l'API
        dataSource: dataSource,
        limit: 100
      };

      // Ajouter les paramètres selon la source
      if (dataSource === "google" && apiKey && placeId) {
        apiParams.apiKey = apiKey;
        apiParams.placeId = placeId;
        console.log("Utilisation des paramètres Google:", { apiKey: apiKey.substring(0, 10) + "...", placeId });
      } else if (dataSource === "trustpilot" && apiKey) {
        apiParams.apiKey = apiKey;
        apiParams.businessId = placeId; // Utiliser placeId comme businessId pour Trustpilot
      }

      // Appeler l'API avec les paramètres appropriés
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiParams),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erreur ${response.status}: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      console.log("Réponse de l'API:", data);
      // Transformer les avis de l'API en format simple et éliminer les doublons
      const transformedAvis: Avis[] = data.reviews
        .map((review: Review) => ({
          id: review.id,
          clientName: review.by,
          rating: review.rating,
          comment: review.testimonial,
          date: review.date,
          source: review.source,
          imgSrc: review.imgSrc
        }))
        .filter((avis: Avis, index: number, self: Avis[]) => {
          // Éliminer les doublons basés sur l'ID
          const firstIndex = self.findIndex(a => a.id === avis.id);
          if (firstIndex !== index) {
            return false;
          }
          
          // Éliminer les doublons basés sur le contenu (nom + commentaire)
          const duplicateByContent = self.findIndex(a => 
            a.clientName === avis.clientName && 
            a.comment === avis.comment &&
            a.rating === avis.rating
          );
          return duplicateByContent === index;
        });
      setAvis(transformedAvis);
      // Calculer les statistiques
      const newStats = {
        total: data.totalReviews || transformedAvis.length,
        averageRating: data.averageRating || (transformedAvis.length > 0 
          ? transformedAvis.reduce((acc, a) => acc + a.rating, 0) / transformedAvis.length 
          : 0),
        sources: transformedAvis.reduce((acc, a) => {
          acc[a.source] = (acc[a.source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
      
      setStats(newStats);
      console.log("Avis récupérés avec succès:", transformedAvis.length);
    } catch (error) {
      console.error('Erreur lors du chargement des avis:', error);
      setError(error instanceof Error ? error.message : "Erreur inconnue");
      // Aucun avis trouvé
      setAvis([]);
      setStats({
        total: 0,
        averageRating: 0,
        sources: {}
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les avis au montage du composant
  useEffect(() => {
    fetchAvis();
  }, []);
  // Données filtrées et triées
  const getCurrentData = () => {
    let filtered = avis.filter(a => {
      const matchesSearch = a.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            a.comment.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRating = a.rating >= minRating;
      return matchesSearch && matchesRating;
    });
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case "date":
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case "rating":
          aValue = a.rating;
          bValue = b.rating;
          break;
        case "name":
          aValue = a.clientName.toLowerCase();
          bValue = b.clientName.toLowerCase();
          break;

        default:
          aValue = new Date(a.date);
          bValue = new Date(b.date);
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    return filtered;
  };

  const filteredAvis = getCurrentData();
  // Pagination
  const totalPages = Math.ceil(filteredAvis.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAvis = filteredAvis.slice(startIndex, endIndex);
  // Réinitialiser la page quand la recherche/filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder, minRating]);
  const getSourceIcon = (source: string) => {
    switch (source) {
      case "google": return <Globe className="w-4 h-4" />;
      case "trustpilot": return <MessageSquare className="w-4 h-4" />;
      case "mock": return <MessageSquare className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon2
        key={i}
        className={`w-4 h-4 ${
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  const handleRefreshAvis = () => {
    fetchAvis();
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Avis Clients
            </h2>
            <p className="text-gray-600">
            Interface de gestion pour les avis clients.
            </p>
            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">
                  <strong>Erreur :</strong> {error}
                </p>
                <p className="text-xs text-red-500 mt-1">
                  Les données factices sont affichées par défaut.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Avis</p>
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
                <p className="text-sm font-medium text-gray-600">Note Moyenne</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageRating.toFixed(1)}</p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          {/* Ligne recherche + action */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher un avis..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={handleRefreshAvis}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>

          {/* Ligne filtres sous la recherche */}
          <div className="mt-3 flex items-center gap-4 flex-wrap">

            {/* Tri */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtres :</span>
              <span className="text-sm text-gray-600">Trier par :</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="date">Date</option>
                <option value="rating">Note</option>
                <option value="name">Nom</option>
              </select>
            </div>

            {/* Ordre */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Ordre :</span>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <ArrowUpDown className="w-4 h-4" />
                {sortOrder === "asc" ? "Croissant" : "Décroissant"}
              </button>
            </div>



            {/* Note minimale */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Note minimale :</span>
              <select
                value={minRating}
                onChange={(e) => setMinRating(parseInt(e.target.value))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value={0}>Toutes</option>
                <option value={5}>5</option>
                <option value={4}>4+</option>
                <option value={3}>3+</option>
                <option value={2}>2+</option>
                <option value={1}>1+</option>
              </select>
            </div>
          </div>

          {/* Filtres actifs */}
          {(searchTerm || sortBy !== "date" || sortOrder !== "desc" || minRating !== 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {searchTerm && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  <span>Recherche: "{searchTerm}"</span>
                  <button onClick={() => setSearchTerm("")} className="hover:bg-blue-200 rounded-full p-1">
                    <XCircle className="w-3 h-3" />
                  </button>
                </div>
              )}
              {sortBy !== "date" && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  <span>Tri: {sortBy === "rating" ? "Note" : sortBy === "name" ? "Nom" : "Source"}</span>
                  <button onClick={() => setSortBy("date")} className="hover:bg-green-200 rounded-full p-1">
                    <XCircle className="w-3 h-3" />
                  </button>
                </div>
              )}
              {sortOrder !== "desc" && (
                <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                  <span>Ordre: Croissant</span>
                  <button onClick={() => setSortOrder("desc")} className="hover:bg-purple-200 rounded-full p-1">
                    <XCircle className="w-3 h-3" />
                  </button>
                </div>
              )}

              {minRating !== 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                  <span>Note: {minRating === 5 ? "5" : `${minRating}+`}</span>
                  <button onClick={() => setMinRating(0)} className="hover:bg-yellow-200 rounded-full p-1">
                    <XCircle className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Avis List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Liste des Avis récupérés ({filteredAvis.length})
              {isLoading && <span className="text-sm text-gray-500 ml-2">- Chargement...</span>}
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {currentAvis.map((avis) => (
              <div key={avis.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-gray-600">
                      {avis.clientName.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Contenu */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1">
                        {renderStars(avis.rating)}
                      </div>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium flex items-center gap-1">
                        {getSourceIcon(avis.source)}
                        {avis.source === "google" ? "Google" : 
                         avis.source === "trustpilot" ? "Trustpilot" : 
                         avis.source === "mock" ? "Factice" : avis.source}
                      </span>
                    </div>

                    <div className="mb-2">
                      <h4 className="font-medium text-gray-900">{avis.clientName}</h4>
                      <p className="text-sm text-gray-500">
                        {new Date(avis.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>

                    <p className="text-gray-700">{avis.comment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredAvis.length === 0 && !isLoading && (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun avis trouvé</h3>
              <p className="text-gray-500">Aucun avis ne correspond à vos critères de recherche.</p>
            </div>
          )}

          {isLoading && (
            <div className="p-8 text-center">
              <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Chargement des avis...</h3>
              <p className="text-gray-500">Récupération des avis depuis l'API.</p>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Affichage {startIndex + 1}-{Math.min(endIndex, filteredAvis.length)} sur {filteredAvis.length} avis
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
    </div>
  );
}
