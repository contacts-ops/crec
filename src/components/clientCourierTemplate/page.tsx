"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Download,
  Eye,
  Search,
  Calendar,
  FileText,
  Image,
  X
} from "lucide-react";

interface ClientCourierTemplateProps {
  siteId?: string;
  userId?: string;
}

interface CourierItem {
  id: string;
  titre: string;
  description?: string;
  fichiers?: {
    nom: string;
    url: string;
    type: 'pdf' | 'image';
    taille: number;
  }[];
  // legacy fallback
  fichier?: {
    nom: string;
    url: string;
    type: 'pdf' | 'image';
    taille: number;
  };
  dateCreation: string;
  dateModification?: string;
  utilisateur?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function ClientCourierTemplate({
  siteId,
  userId
}: ClientCourierTemplateProps) {
  const [courierItems, setCourierItems] = useState<CourierItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CourierItem | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  // Récupérer l'email de l'utilisateur connecté
  const loadUserEmail = async () => {
    try {
      const response = await fetch("/api/sharedServices/auth/me", {
        credentials: "include"
      });
      if (response.ok) {
        const userData = await response.json();
        setUserEmail(userData.email);
        console.log("Email utilisateur récupéré:", userData.email);
      } else {
        console.error("Impossible de récupérer l'email de l'utilisateur");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de l'email:", error);
    }
  };

  // Charger les éléments de courrier depuis la base de données
  const loadCourierItems = async () => {
    if (!siteId) {
      setError("Site ID requis pour charger les courriers");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/sharedServices/courriers?siteId=${siteId}`);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.courriers) {
        // Filtrer par email de l'utilisateur connecté
        let filteredItems = data.courriers;
        if (userEmail) {
          filteredItems = data.courriers.filter((item: CourierItem) => 
            item.utilisateur?.email === userEmail
          );
          console.log(`Filtrage des courriers pour l'email: ${userEmail}`);
          console.log(`Courriers trouvés: ${filteredItems.length} sur ${data.courriers.length}`);
        }
        
        setCourierItems(filteredItems);
      } else {
        throw new Error(data.error || "Erreur lors du chargement des courriers");
      }
    } catch (error) {
      console.error("❌ Erreur lors du chargement des courriers:", error);
      setError(error instanceof Error ? error.message : "Erreur lors du chargement des courriers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserEmail();
  }, []);
  useEffect(() => {
    if (userEmail) {
      loadCourierItems();
    }
  }, [siteId, userEmail]);
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-4 h-4" />;
      case 'image':
        return <Image className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

     const filteredItems = courierItems.filter(item => {
     const matchesSearch = item.titre.toLowerCase().includes(searchTerm.toLowerCase());
     return matchesSearch;
   });
  const handleDownload = async (item: CourierItem) => {
    try {
      const main = (item.fichiers && item.fichiers[0]) || item.fichier;
      if (!main) throw new Error('Aucun fichier');
      const response = await fetch(main.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = main.nom;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setError("Erreur lors du téléchargement du fichier");
    }
  };

  const handleView = (item: CourierItem) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  // Aperçu multi-documents (images + PDF)
  const renderFilePreview = (item: CourierItem) => {
    const files = (item.fichiers && item.fichiers.length ? item.fichiers : (item.fichier ? [item.fichier] : []));
    if (files.length === 0) return null;
    return (
      <div className="mt-4">
        <h3 className="font-semibold text-gray-900 mb-2">Aperçu des documents</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {files.map((f, i) => (
            <div key={i} className="border border-gray-200 rounded-lg bg-white p-3">
              <p className="text-sm font-medium text-gray-800 mb-2 break-words">{f.nom} <span className="text-gray-500">({formatFileSize(f.taille)})</span></p>
              {f.type === 'image' ? (
                <img src={f.url} alt={f.nom} className="w-full h-40 object-contain rounded" />
              ) : (
                <div className="text-center py-6">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">Aperçu PDF non disponible</p>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">
                    <Download className="w-4 h-4 mr-2" />
                    Ouvrir le PDF
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-lg border">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-type="service">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Header */}
        <div className="mb-6">
          <div>
                         <h2 className="text-xl font-semibold text-gray-900 mb-2">
               Mon Courrier Digitalisé
             </h2>
             <p className="text-gray-600">
               Consultez votre courrier reçu via notre service de domiciliation.
             </p>
            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">
                  <strong>Erreur :</strong> {error}
                </p>
              </div>
            )}
            {success && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">
                  <strong>Succès :</strong> {success}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <Mail className="w-6 h-6 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-xl font-bold text-gray-900">{courierItems.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <FileText className="w-6 h-6 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Fichiers</p>
                <p className="text-xl font-bold text-gray-900">{
                  courierItems.reduce((acc, it) => acc + ((it.fichiers && it.fichiers.length) ? it.fichiers.length : (it.fichier ? 1 : 0)), 0)
                }</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher un document..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Courrier List (un item par courrier) */}
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun courrier trouvé</h3>
              <p className="text-gray-600">{searchTerm ? "Aucun courrier ne correspond à vos critères de recherche." : "Aucun courrier n'a été reçu pour le moment."}</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const main = (item.fichiers && item.fichiers[0]) || item.fichier;
              const extraCount = (item.fichiers && item.fichiers.length ? item.fichiers.length - 1 : 0);
              return (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{(main?.type || 'pdf').toUpperCase()}</Badge>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-medium text-gray-900">{item.titre}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(item.dateCreation)}</span>
                          <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{formatFileSize(main?.taille || 0)}</span>
                          {extraCount > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">+ {extraCount} autre(s)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => handleView(item)}>
                        <Eye className="w-4 h-4 mr-1" />Voir
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownload(item)}>
                        <Download className="w-4 h-4 mr-1" />Télécharger
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{selectedItem.titre}</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetailModal(false)}
                  className="p-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
                             <div className="space-y-4">
                 <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Informations du fichier</h3>
                  <div className="bg-gray-50 p-3 rounded">
                    {(() => {
                      const main = (selectedItem.fichiers && selectedItem.fichiers[0]) || selectedItem.fichier;
                      return (
                        <>
                          <p><strong>Nom:</strong> {main?.nom || '—'}</p>
                          <p><strong>Type:</strong> {(main?.type || 'pdf').toUpperCase()}</p>
                          <p><strong>Taille:</strong> {formatFileSize(main?.taille || 0)}</p>
                        </>
                      );
                    })()}
                    <p><strong>Date de création:</strong> {formatDate(selectedItem.dateCreation)}</p>
                    {selectedItem.dateModification && (
                      <p><strong>Dernière modification:</strong> {formatDate(selectedItem.dateModification)}</p>
                    )}
                  </div>
                </div>
                
                {/* Aperçu du fichier */}
                {renderFilePreview(selectedItem)}
                
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <Button onClick={() => handleDownload(selectedItem)}>
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 