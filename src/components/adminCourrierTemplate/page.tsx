"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Eye,
  Download,
  Upload,
  FileText,
  Image,
  AlertCircle,
  Calendar,
  User,
  Filter,
  MoreVertical,
  Clock,
  ArrowUpDown,
  XCircle,
} from "lucide-react";

interface AdminCourrierTemplateProps {
  siteId?: string;
  editableElements?: {
    [key: string]: string;
  };
}

interface Courrier {
  id: string;
  titre: string;
  description?: string;
  fichiers?: {
    nom: string;
    url: string;
    type: "pdf" | "image";
    taille: number;
  }[];
  // legacy fallback
  fichier?: {
    nom: string;
    url: string;
    type: "pdf" | "image";
    taille: number;
  };
  siteId: string;
  utilisateurId: string;
  utilisateur?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  dateCreation: string;
  dateModification?: string;
}

interface CourrierStats {
  total: number;
  parUtilisateur: Record<string, number>;
}

export default function AdminCourrierTemplate({
  siteId,
  editableElements = {},
}: AdminCourrierTemplateProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [courriers, setCourriers] = useState<Courrier[]>([]);
  const [stats, setStats] = useState<CourrierStats>({
    total: 0,
    parUtilisateur: {},
  });
  const [error, setError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCourrier, setSelectedCourrier] = useState<Courrier | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [filterUser, setFilterUser] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("dateCreation");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterType, setFilterType] = useState<string>("all");
  const [users, setUsers] = useState<any[]>([]);
  const [failedPaymentUserIds, setFailedPaymentUserIds] = useState<string[]>([]);
  const [failedPaymentSummaryByUser, setFailedPaymentSummaryByUser] = useState<Record<string, { count: number; totalAmount: number }>>({});
  const [failedPaymentSummaryByEmail, setFailedPaymentSummaryByEmail] = useState<Record<string, { count: number; totalAmount: number }>>({});
  const failedPaymentUserIdSet = useMemo(() => new Set(failedPaymentUserIds), [failedPaymentUserIds]);
  // États pour la modal de création
  const [newCourrierData, setNewCourrierData] = useState<{
    titre: string;
    description?: string;
    utilisateurId: string;
    fichiers: File[];
  }>({
    titre: "",
    description: "",
    utilisateurId: "",
    fichiers: [],
  });
  const [isUploading, setIsUploading] = useState(false);
  const [filePickerKey, setFilePickerKey] = useState(0);
  const itemsPerPage = 10;
  const selectedUserHasFailedPayment = newCourrierData.utilisateurId ? failedPaymentUserIdSet.has(newCourrierData.utilisateurId) : false;
  const selectedUserFailedSummary = selectedUserHasFailedPayment && newCourrierData.utilisateurId
    ? failedPaymentSummaryByUser[newCourrierData.utilisateurId]
    : undefined;

  // Données factices pour la démonstration
  const mockCourriers: Courrier[] = [
    {
      id: "1",
      titre: "Courrier important - Facture",
      fichier: {
        nom: "facture_123.pdf",
        url: "https://majoli-hub-images-s3.s3.eu-north-1.amazonaws.com/courriers/demo/facture_123.pdf",
        type: "pdf",
        taille: 245678,
      },
      siteId: siteId || "demo",
      utilisateurId: "user1",
      utilisateur: {
        firstName: "Jean",
        lastName: "Dupont",
        email: "jean.dupont@exemple.com",
      },
      dateCreation: "2024-01-20T10:30:00Z",
      dateModification: "2024-01-20T10:30:00Z",
    },
    {
      id: "2",
      titre: "Recommandé - Document juridique",
      fichier: {
        nom: "document_legal.pdf",
        url: "https://majoli-hub-images-s3.s3.eu-north-1.amazonaws.com/courriers/demo/document_legal.pdf",
        type: "pdf",
        taille: 1234567,
      },
      siteId: siteId || "demo",
      utilisateurId: "user2",
      utilisateur: {
        firstName: "Marie",
        lastName: "Martin",
        email: "marie.martin@exemple.com",
      },
      dateCreation: "2024-01-19T14:22:00Z",
      dateModification: "2024-01-19T14:22:00Z",
    },
    {
      id: "3",
      titre: "Photo - Preuve de livraison",
      fichier: {
        nom: "livraison_photo.jpg",
        url: "https://majoli-hub-images-s3.s3.eu-north-1.amazonaws.com/courriers/demo/livraison_photo.jpg",
        type: "image",
        taille: 456789,
      },
      siteId: siteId || "demo",
      utilisateurId: "user1",
      utilisateur: {
        firstName: "Jean",
        lastName: "Dupont",
        email: "jean.dupont@exemple.com",
      },
      dateCreation: "2024-01-18T09:15:00Z",
      dateModification: "2024-01-18T09:15:00Z",
    },
  ];

  // Fonction pour récupérer les courriers depuis l'API
  const fetchCourriers = async () => {
    setIsLoading(true);
    setError("");
    try {
      if (siteId) {
        const response = await fetch(
          `/api/sharedServices/courriers?siteId=${siteId}`
        );
        if (response.ok) {
          const data = await response.json();
          setCourriers(data.courriers || []);
          setStats(data.stats || calculateStats(data.courriers || []));
        } else {
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              `Erreur ${response.status}: ${response.statusText}`
          );
        }
      } else {
        // Utiliser les données factices si pas de siteId
        setCourriers(mockCourriers);
        setStats(calculateStats(mockCourriers));
      }
    } catch (error) {
      console.error("Erreur lors du chargement des courriers:", error);
      setError(error instanceof Error ? error.message : "Erreur inconnue");
      // Utiliser des données factices par défaut
      setCourriers(mockCourriers);
      setStats(calculateStats(mockCourriers));
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour récupérer les utilisateurs
  const fetchUsers = async () => {
    if (!siteId) return;

    try {
      const response = await fetch(
        `/api/sharedServices/utilisateurs?siteId=${siteId}`
      );
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error);
    }
  };

  const calculateStats = (courriersList: Courrier[]): CourrierStats => {
    const stats: CourrierStats = {
      total: courriersList.length,
      parUtilisateur: {},
    };

    // Calculer les statistiques par utilisateur
    courriersList.forEach((courrier) => {
      const userName = courrier.utilisateur 
        ? `${courrier.utilisateur.firstName} ${courrier.utilisateur.lastName}`
        : "Utilisateur inconnu";
      stats.parUtilisateur[userName] = (stats.parUtilisateur[userName] || 0) + 1;
    });
    return stats;
  };

  useEffect(() => {
    fetchCourriers();
    fetchUsers();
  }, [siteId]);
  useEffect(() => {
    let isMounted = true;

    const fetchFailedPaymentUsers = async () => {
      if (!siteId) {
        return;
      }

      try {
        const response = await fetch(`/api/sharedServices/stripe/failed-payments/site/${siteId}`);
        if (!response.ok) {
          console.warn('⚠️ Impossible de récupérer les impayés pour le module courrier:', response.status, response.statusText);
          return;
        }

        const data = await response.json();
        if (!isMounted) {
          return;
        }

        const ids: string[] = [];
        const summaryByUser: Record<string, { count: number; totalAmount: number }> = {};
        const summaryByEmail: Record<string, { count: number; totalAmount: number }> = {};

        (data.failedPayments || []).forEach((entry: any) => {
          const userId = (entry.userId || '').toString().trim();
          const email = (entry.userEmail || '').toLowerCase().trim();
          const amount = typeof entry.amount === 'number' ? entry.amount : 0;

          if (userId) {
            ids.push(userId);
            if (!summaryByUser[userId]) {
              summaryByUser[userId] = { count: 0, totalAmount: 0 };
            }
            summaryByUser[userId].count += 1;
            summaryByUser[userId].totalAmount += amount;
          }

          if (email) {
            if (!summaryByEmail[email]) {
              summaryByEmail[email] = { count: 0, totalAmount: 0 };
            }
            summaryByEmail[email].count += 1;
            summaryByEmail[email].totalAmount += amount;
          }
        });
        setFailedPaymentUserIds(Array.from(new Set(ids)));
        setFailedPaymentSummaryByUser(summaryByUser);
        setFailedPaymentSummaryByEmail(summaryByEmail);
      } catch (error) {
        console.error('❌ Erreur lors du chargement des impayés pour le module courrier:', error);
      }
    };

    fetchFailedPaymentUsers();
    return () => {
      isMounted = false;
    };
  }, [siteId]);
  // Fonction pour créer un courrier
  const createCourrier = async (courrierData: any) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('titre', courrierData.titre);
      formData.append('utilisateurId', courrierData.utilisateurId);
      formData.append('siteId', siteId || '');
      if (Array.isArray(courrierData.fichiers)) {
        const max = Math.min(courrierData.fichiers.length, 5);
        console.log(`📁 Envoi de ${max} fichiers à l'API:`, courrierData.fichiers.slice(0, max).map((f: File) => f.name));
        for (let i = 0; i < max; i++) {
          formData.append('fichiers', courrierData.fichiers[i]);
        }
      }

      const response = await fetch(`/api/sharedServices/courriers`, {
        method: "POST",
        body: formData,
      });
      const responseData = await response.json();
      if (response.ok) {
        console.log("📦 Réponse de l'API courrier:", responseData);
        console.log("📎 Fichiers retournés par l'API:", responseData.fichiers ? responseData.fichiers.length : 0, responseData.fichiers);
        setCourriers((prev) => [responseData, ...prev]);
        setStats(calculateStats([responseData, ...courriers]));
        setError("");
        // Envoyer un email de notification au client
        try {
          await sendCourrierNotificationEmail(responseData, courrierData);
        } catch (emailError) {
          console.error("Erreur lors de l'envoi de l'email de notification:", emailError);
          // Ne pas bloquer la création du courrier si l'email échoue
        }
        
        return true;
      } else {
        setError(responseData.error || `Erreur ${response.status}: ${response.statusText}`);
        return false;
      }
    } catch (error) {
      console.error("Erreur lors de la création:", error);
      setError(
        error instanceof Error ? `Erreur de connexion: ${error.message}` : "Erreur de connexion"
      );
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  // Fonction pour envoyer un email de notification de courrier
  const sendCourrierNotificationEmail = async (courrier: Courrier, courrierData: any) => {
    try {
      // Récupérer les informations de l'utilisateur
      const user = users.find(u => u.id === courrierData.utilisateurId);
      if (!user || !user.email) {
        console.error("Utilisateur non trouvé ou email manquant");
        return;
      }

      // Préparer la liste des fichiers pour l'email
      const filesList = (courrier.fichiers && courrier.fichiers.length ? courrier.fichiers : (courrier.fichier ? [courrier.fichier] : [])).slice(0,5);
      // Préparer les données de l'email
      const emailData: any = {
        to: user.email,
        subject: `Nouveau courrier disponible : ${courrier.titre}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Nouveau courrier disponible</h2>
            
            <p>Bonjour ${user.firstName || ""},</p>
            
            <p>Un nouveau courrier a été créé pour vous et est maintenant disponible dans votre espace client.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Titre :</strong> ${courrier.titre}</p>
              <p><strong>Type de fichier :</strong> ${(((courrier.fichiers && courrier.fichiers[0]) || courrier.fichier)?.type || 'pdf').toUpperCase()}</p>
              <p><strong>Date de création :</strong> ${formatDate(courrier.dateCreation)}</p>
              ${courrier.description ? `<p><strong>Description :</strong> ${courrier.description}</p>` : ''}
            </div>
            
            <p>Les fichiers du courrier sont joints à cet email pour votre commodité.</p>
            ${filesList.length > 0 ? `<p><strong>Nombre de fichiers attachés :</strong> ${filesList.length}</p>` : ''}
            
            <p style="color: #666; font-size: 12px;">
              Cet email a été envoyé automatiquement. Veuillez ne pas y répondre.
            </p>
          </div>
        `,
        fromName: "Service Courriers",
        siteId: siteId
      };
      console.log("📎 Fichiers à traiter pour l'email:", filesList.length, filesList.map(f => ({ nom: f.nom, url: f.url, type: f.type })));
      if (filesList.length) {
        emailData.attachments = [];
        for (let i = 0; i < filesList.length; i++) {
          const f = filesList[i];
          try {
            console.log(`📎 Traitement du fichier ${i + 1}/${filesList.length}: ${f.nom}`);
            // Ajouter un délai entre les requêtes pour éviter les limites de taux
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            const fileResponse = await fetch(f.url, {
              method: 'GET',
              headers: {
                'Accept': '*/*',
              },
            });
            if (fileResponse.ok) {
              const fileBuffer = await fileResponse.arrayBuffer();
              // Vérifier que le fichier n'est pas vide
              if (fileBuffer.byteLength === 0) {
                console.warn(`⚠️ Fichier ${f.nom} est vide, ignoré`);
                continue;
              }
              
              // Convertir ArrayBuffer en base64 côté client (méthode optimisée pour gros fichiers)
              const uint8Array = new Uint8Array(fileBuffer);
              let binaryString = '';
              const chunkSize = 8192; // Traiter par chunks pour éviter le stack overflow
              for (let i = 0; i < uint8Array.length; i += chunkSize) {
                const chunk = uint8Array.slice(i, i + chunkSize);
                binaryString += String.fromCharCode.apply(null, Array.from(chunk));
              }
              const base64Content = btoa(binaryString);
              const mimeType = f.type === 'pdf' ? 'application/pdf' : (f.type.startsWith('image/') ? f.type : 'application/octet-stream');
              emailData.attachments.push({
                content: base64Content,
                filename: f.nom,
                type: mimeType,
                disposition: 'attachment'
              });
              console.log(`✅ Fichier ${f.nom} ajouté avec succès (${fileBuffer.byteLength} bytes)`);
            } else {
              console.error(`❌ Erreur HTTP ${fileResponse.status} pour le fichier ${f.nom}: ${fileResponse.statusText}`);
              // Essayer de récupérer le texte d'erreur
              try {
                const errorText = await fileResponse.text();
                console.error(`❌ Détails de l'erreur:`, errorText);
              } catch (e) {
                console.error(`❌ Impossible de lire le message d'erreur`);
              }
            }
          } catch (attachmentError) {
            console.error(`❌ Erreur lors du traitement du fichier ${f.nom}:`, attachmentError);
          }
        }
        console.log(`📎 Total des pièces jointes ajoutées: ${emailData.attachments.length}/${filesList.length}`);
        // Si aucun fichier n'a pu être ajouté, afficher un avertissement
        if (emailData.attachments.length === 0 && filesList.length > 0) {
          console.warn(`⚠️ Aucun fichier n'a pu être ajouté à l'email sur ${filesList.length} fichiers`);
        }
      }

      const emailResponse = await fetch('/api/sharedServices/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });
      if (!emailResponse.ok) {
        throw new Error(`Erreur lors de l'envoi de l'email: ${emailResponse.status}`);
      }

      console.log("Email de notification de courrier envoyé avec succès à:", user.email);
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email de notification:", error);
      throw error;
    }
  };



  // Fonction pour supprimer un courrier
  const deleteCourrier = async (courrierId: string) => {
    try {
      const response = await fetch(
        `/api/sharedServices/courriers/${courrierId}`,
        {
          method: "DELETE",
        }
      );
      if (response.ok) {
        setCourriers((prev) => prev.filter((c) => c.id !== courrierId));
        setStats(calculateStats(courriers.filter((c) => c.id !== courrierId)));
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Erreur ${response.status}: ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      setError(
        error instanceof Error ? error.message : "Erreur lors de la suppression"
      );
      return false;
    }
  };

  // Données filtrées et triées
  const getCurrentData = () => {
    let filtered = courriers.filter((courrier) => {
      const matchesSearch =
        courrier.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (courrier.description && courrier.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (courrier.utilisateur?.firstName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (courrier.utilisateur?.lastName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (courrier.utilisateur?.email?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchesUser = filterUser === "all" || courrier.utilisateurId === filterUser;
      const mainFile = (courrier.fichiers && courrier.fichiers[0]) || courrier.fichier;
      const matchesType = filterType === "all" || (mainFile?.type === filterType);
      return matchesSearch && matchesUser && matchesType;
    });
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "titre":
          aValue = a.titre.toLowerCase();
          bValue = b.titre.toLowerCase();
          break;
        case "utilisateur":
          aValue = a.utilisateur ? `${a.utilisateur.firstName} ${a.utilisateur.lastName}`.toLowerCase() : "";
          bValue = b.utilisateur ? `${b.utilisateur.firstName} ${b.utilisateur.lastName}`.toLowerCase() : "";
          break;
        case "type":
          aValue = ((a.fichiers && a.fichiers[0]) || a.fichier)?.type?.toLowerCase() || "";
          bValue = ((b.fichiers && b.fichiers[0]) || b.fichier)?.type?.toLowerCase() || "";
          break;
        case "dateModification":
          aValue = a.dateModification ? new Date(a.dateModification).getTime() : 0;
          bValue = b.dateModification ? new Date(b.dateModification).getTime() : 0;
          break;
        default:
          aValue = new Date(a.dateCreation).getTime();
          bValue = new Date(b.dateCreation).getTime();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    return filtered;
  };

  const filteredAndSortedCourriers = getCurrentData();
  // Pagination
  const totalPages = Math.ceil(filteredAndSortedCourriers.length / itemsPerPage);
  const paginatedCourriers = filteredAndSortedCourriers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  // Réinitialiser la page quand la recherche/filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder, filterUser, filterType]);
  const getStatusColor = (statut: string) => {
    switch (statut) {
      case "nouveau":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "lu":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "traite":
        return "bg-green-100 text-green-800 border-green-200";
      case "archive":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case "nouveau":
        return <AlertCircle className="h-4 w-4" />;
      case "lu":
        return <Eye className="h-4 w-4" />;
      case "traite":
        return <Mail className="h-4 w-4" />;
      case "archive":
        return <FileText className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusText = (statut: string) => {
    switch (statut) {
      case "nouveau":
        return "Nouveau";
      case "lu":
        return "Lu";
      case "traite":
        return "Traité";
      case "archive":
        return "Archivé";
      default:
        return "Inconnu";
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="h-5 w-5 text-red-600" />;
      case "image":
        return <Image className="h-5 w-5 text-green-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris"
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleRefresh = () => {
    fetchCourriers();
    fetchUsers();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length) {
      // Vérifier le type de fichier
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const validated: File[] = [];
      for (const f of files) {
        if (!allowedTypes.includes(f.type)) {
          setError("Type de fichier non autorisé. Seuls les PDF et les images sont acceptés.");
          return;
        }
        if (f.size > 10 * 1024 * 1024) {
          setError("Un fichier est trop volumineux. Taille maximale: 10MB");
          return;
        }
        validated.push(f);
      }
      setNewCourrierData(prev => ({
        ...prev,
        fichiers: validated.slice(0, 5)
      }));
      setError("");
    }
  };

  return (
    <div className="p-6" data-type="service">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Gestion des Courriers
            </h2>
            <p className="text-gray-600">
              Interface de gestion pour les courriers reçus et documents des clients.
            </p>
            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">
                  <strong>Erreur :</strong> {error}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Courriers
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
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
                placeholder="Rechercher un courrier..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <button
              onClick={() => { 
                setNewCourrierData({ titre: "", description: "", utilisateurId: "", fichiers: [] });
                setError("");
                setFilePickerKey(prev => prev + 1);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouveau Courrier
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
                <option value="dateCreation">Date de création</option>
                <option value="titre">Titre</option>
                <option value="utilisateur">Utilisateur</option>
                <option value="type">Type de fichier</option>
                <option value="dateModification">Date de modification</option>
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

            {/* Utilisateur */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Utilisateur :</span>
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">Tous les utilisateurs</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Type de fichier */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Type :</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">Tous les types</option>
                <option value="pdf">PDF</option>
                <option value="image">Image</option>
              </select>
            </div>
          </div>

          {/* Filtres actifs */}
          {(searchTerm || sortBy !== "dateCreation" || sortOrder !== "desc" || filterUser !== "all" || filterType !== "all") && (
            <div className="mt-3 flex flex-wrap gap-2">
              {searchTerm && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  <span>Recherche: "{searchTerm}"</span>
                  <button onClick={() => setSearchTerm("")} className="hover:bg-blue-200 rounded-full p-1">
                    <XCircle className="w-3 h-3" />
                  </button>
                </div>
              )}
              {sortBy !== "dateCreation" && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  <span>Tri: {sortBy === "titre" ? "Titre" : sortBy === "utilisateur" ? "Utilisateur" : sortBy === "type" ? "Type" : "Date de modification"}</span>
                  <button onClick={() => setSortBy("dateCreation")} className="hover:bg-green-200 rounded-full p-1">
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
              {filterUser !== "all" && (
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                  <span>Utilisateur: {users.find(u => u.id === filterUser)?.firstName} {users.find(u => u.id === filterUser)?.lastName}</span>
                  <button onClick={() => setFilterUser("all")} className="hover:bg-orange-200 rounded-full p-1">
                    <XCircle className="w-3 h-3" />
                  </button>
                </div>
              )}
              {filterType !== "all" && (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                  <span>Type: {filterType.toUpperCase()}</span>
                  <button onClick={() => setFilterType("all")} className="hover:bg-yellow-200 rounded-full p-1">
                    <XCircle className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Courriers List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Liste des Courriers ({filteredAndSortedCourriers.length})
              {isLoading && (
                <span className="text-sm text-gray-500 ml-2">
                  - Chargement...
                </span>
              )}
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {paginatedCourriers.map((courrier, index) => {
              const mainFile = (courrier.fichiers && courrier.fichiers[0]) || courrier.fichier;
              const userFailedSummary = (courrier.utilisateurId && failedPaymentSummaryByUser[courrier.utilisateurId])
                || ((courrier.utilisateur?.email ? failedPaymentSummaryByEmail[(courrier.utilisateur.email || '').toLowerCase()] : undefined));
              const userHasFailedPayment = !!userFailedSummary;
              return (
              <div key={courrier.id || `courrier-${index}`} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  {/* Icône fichier */}
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {getFileIcon(mainFile?.type || 'pdf')}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {(mainFile?.type || 'pdf').toUpperCase()}
                      </span>
                    </div>

                    <div className="mb-2">
                      <h4 className="font-medium text-gray-900 mb-1">
                        {courrier.titre}
                        {courrier.fichiers && courrier.fichiers.length > 0 && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {courrier.fichiers.length} fichier(s)
                          </span>
                        )}
                        {userHasFailedPayment && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Impayé Stripe
                          </span>
                        )}
                      </h4>
                      {courrier.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {courrier.description}
                        </p>
                      )}
                      <div className="flex items-center text-sm text-gray-500 gap-4">
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {courrier.utilisateur 
                            ? `${courrier.utilisateur.firstName} ${courrier.utilisateur.lastName}`
                            : "Utilisateur inconnu"}
                          {userHasFailedPayment && userFailedSummary && (
                            <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-600">
                              {userFailedSummary.count} impayé(s)
                              {userFailedSummary.totalAmount ? `• ${(userFailedSummary.totalAmount / 100).toFixed(2)} €` : ''}
                            </span>
                          )}
                        </span>
                        {mainFile && (
                          <span className="flex items-center">
                            <FileText className="h-3 w-3 mr-1" />
                            {mainFile.nom} ({formatFileSize(mainFile.taille)})
                          </span>
                        )}
                        {courrier.fichiers && courrier.fichiers.length > 1 && (
                          <span className="flex items-center">
                            + {courrier.fichiers.length - 1} autre(s)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          Créé le {formatDate(courrier.dateCreation)}
                        </p>
                        {courrier.dateModification && (
                          <p className="text-sm text-gray-600">
                            Modifié le {formatDate(courrier.dateModification)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedCourrier(courrier);
                            setShowViewModal(true);
                          }}
                          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
                          title="Voir le courrier"
                        >
                          <Eye className="w-4 h-4 mr-1 inline" />
                          Voir
                        </button>

                        <button
                          onClick={() => {
                            setSelectedCourrier(courrier);
                            setShowDeleteModal(true);
                          }}
                          className="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors font-medium"
                          title="Supprimer le courrier"
                        >
                          <Trash2 className="w-4 h-4 mr-1 inline" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );})}
          </div>

          {filteredAndSortedCourriers.length === 0 && !isLoading && (
            <div className="p-8 text-center">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun courrier trouvé
              </h3>
              <p className="text-gray-500">
                Aucun courrier ne correspond à vos critères de recherche.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="p-8 text-center">
              <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Chargement des courriers...
              </h3>
              <p className="text-gray-500">
                Récupération des courriers depuis l'API.
              </p>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Affichage {(currentPage - 1) * itemsPerPage + 1}-
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredAndSortedCourriers.length
                  )}{" "}
                  sur {filteredAndSortedCourriers.length} courriers
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

      {/* Modal de création de courrier */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Nouveau Courrier
              </h3>
            </div>
            <div className="px-6 py-4">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">
                    <strong>Erreur :</strong> {error}
                  </p>
                </div>
              )}
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titre *
                  </label>
                  <Input
                    type="text"
                    placeholder="Titre du courrier"
                    value={newCourrierData.titre}
                    onChange={(e) =>
                      setNewCourrierData((prev) => ({
                        ...prev,
                        titre: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Utilisateur *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={newCourrierData.utilisateurId}
                    onChange={(e) =>
                      setNewCourrierData((prev) => ({
                        ...prev,
                        utilisateurId: e.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Sélectionner un utilisateur</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </option>
                    ))}
                  </select>
                  {selectedUserHasFailedPayment && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5" />
                      <div>
                        <p className="font-medium">Ce client a des impayés Stripe en cours.</p>
                        <p className="text-xs text-red-600">
                          Merci de vérifier la situation avant l'envoi. {selectedUserFailedSummary?.count ? `${selectedUserFailedSummary.count} impayé(s)` : ''}
                          {selectedUserFailedSummary?.totalAmount ? ` • ${(selectedUserFailedSummary.totalAmount / 100).toFixed(2)} €` : ''}
                        </p>
                      </div>
                    </div>
                  )}
                </div>



                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fichier (PDF ou Image) *
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>Sélectionner des fichiers (max 5)</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            multiple
                            key={filePickerKey}
                            className="sr-only"
                            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                            onChange={handleFileChange}
                            required
                          />
                        </label>
                        <p className="pl-1">ou glisser-déposer</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PDF, PNG, JPG, GIF jusqu'à 10MB • 5 fichiers max
                      </p>
                      {newCourrierData.fichiers.length > 0 && (
                        <div className="text-left">
                          <p className="text-sm text-green-600 font-medium mb-1">✓ {newCourrierData.fichiers.length} fichier(s) sélectionné(s)</p>
                          <ul className="text-xs text-gray-600 list-disc pl-5 space-y-1">
                            {newCourrierData.fichiers.slice(0,5).map((f, i) => (
                              <li key={i}>{f.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError("");
                  setNewCourrierData({ titre: "", description: "", utilisateurId: "", fichiers: [] });
                  setFilePickerKey(prev => prev + 1);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                disabled={isUploading}
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  // Validation des champs requis
                  if (!newCourrierData.titre.trim()) {
                    setError("Le titre est requis");
                    return;
                  }
                  if (!newCourrierData.utilisateurId) {
                    setError("L'utilisateur est requis");
                    return;
                  }
                  if (!newCourrierData.fichiers || newCourrierData.fichiers.length === 0) {
                    setError("Au moins un fichier est requis");
                    return;
                  }

                  if (selectedUserHasFailedPayment) {
                    const confirmSend = window.confirm("Ce client a des impayés Stripe. Voulez-vous vraiment envoyer ce courrier ?");
                    if (!confirmSend) {
                      return;
                    }
                  }

                  const success = await createCourrier(newCourrierData);
                  if (success) {
                    setNewCourrierData({
                      titre: "",
                      utilisateurId: "",
                      fichiers: [],
                    });
                    setShowCreateModal(false);
                    setError("");
                    setFilePickerKey(prev => prev + 1);
                  }
                }}
                disabled={isUploading}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 inline animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de visualisation */}
      {showViewModal && selectedCourrier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Détails du Courrier
              </h3>
            </div>
            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    {selectedCourrier.titre}
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Type:</span>
                    <span className="ml-2">{(((selectedCourrier.fichiers && selectedCourrier.fichiers[0]) || selectedCourrier.fichier)?.type || 'pdf').toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Taille:</span>
                    <span className="ml-2">{formatFileSize((((selectedCourrier.fichiers && selectedCourrier.fichiers[0]) || selectedCourrier.fichier)?.taille) || 0)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Utilisateur:</span>
                    <span className="ml-2">
                      {selectedCourrier.utilisateur 
                        ? `${selectedCourrier.utilisateur.firstName} ${selectedCourrier.utilisateur.lastName}`
                        : "Utilisateur inconnu"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Date de création:</span>
                    <span className="ml-2">{formatDate(selectedCourrier.dateCreation)}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h5 className="font-medium text-gray-900 mb-2">Aperçu des documents</h5>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {(() => {
                      const files = (selectedCourrier.fichiers && selectedCourrier.fichiers.length
                        ? selectedCourrier.fichiers
                        : (selectedCourrier.fichier ? [selectedCourrier.fichier] : []));
                      if (files.length === 0) return <p className="text-gray-600">Aucun fichier</p>;
                      return (
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
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedCourrier(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suppression */}
      {showDeleteModal && selectedCourrier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Supprimer le Courrier
              </h3>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  {getFileIcon((((selectedCourrier.fichiers && selectedCourrier.fichiers[0]) || selectedCourrier.fichier)?.type) || 'pdf')}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedCourrier.titre}
                  </p>
                  <p className="text-sm text-gray-500">{(((selectedCourrier.fichiers && selectedCourrier.fichiers[0]) || selectedCourrier.fichier)?.nom) || ''}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Êtes-vous sûr de vouloir supprimer ce courrier ? Cette
                action est irréversible et supprimera également le fichier associé.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedCourrier(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  try {
                    const success = await deleteCourrier(selectedCourrier.id);
                    if (success) {
                      setShowDeleteModal(false);
                      setSelectedCourrier(null);
                      fetchCourriers();
                    }
                  } catch (error) {
                    setError("Erreur lors de la suppression");
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 