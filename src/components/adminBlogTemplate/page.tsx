"use client";

import { useState, useEffect } from "react";
import { Editor } from '@tinymce/tinymce-react';
import { TINYMCE_CONFIG } from '@/lib/tinymce-config';
import { useSiteId } from "@/hooks/use-site-id";
import {
  FileText,
  Search,
  RefreshCw,
  Calendar,
  Edit,
  Trash2,
  Plus,
  CheckCircle,
  Clock,
  EyeOff,
  Eye,
  X,
  Filter,
  ArrowUpDown,
  XCircle,
  Sparkles,
  Hash,
  Timer,
  Play,
} from "lucide-react";
import { useSiteLink } from "@/hooks/use-site-link";

interface AdminBlogTemplateProps {
  siteId?: string;
  editableElements?: {
    [key: string]: string;
  };
  hasDomiciliationService?: boolean;
}

interface Article {
  _id: string;
  title: string;
  content: string;
  image: string | string[]; // Supporte les deux formats pour la compatibilité
  keywords: string[];
  views: number;
  createdAt: string;
  updatedAt: string;
}

const toKebab = (str: string) => {
  return str.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
};

export default function AdminBlogTemplate({
  editableElements = {},
  hasDomiciliationService = false
}: Omit<AdminBlogTemplateProps, 'siteId'>) {
  // Utiliser le hook pour récupérer le siteId
  const siteId = useSiteId();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState({ total: 0 });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [editForm, setEditForm] = useState({
    titre: "",
    contenu: "",
    tags: "",
    image: ""
  });
  const [createForm, setCreateForm] = useState({
    titre: "",
    contenu: "",
    tags: "",
    image: ""
  });
  const [generateForm, setGenerateForm] = useState({
    keywords: "",
    tone: "professional" as 'professional' | 'casual' | 'formal',
    length: "medium" as 'short' | 'medium' | 'long'
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingArticle, setGeneratingArticle] = useState(false);
  // États pour la planification automatique
  const [schedulerConfig, setSchedulerConfig] = useState({
    isActive: false,
    frequency: "daily" as 'daily' | 'weekly',
    time: "09:00",
    dayOfWeek: "monday" as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
    keywords: "",
    tone: "professional" as 'professional' | 'casual' | 'formal',
    length: "medium" as 'short' | 'medium' | 'long'
  });
  const [schedulerStatus, setSchedulerStatus] = useState<{
    isActive: boolean;
    nextExecution?: string;
    lastExecution?: string;
    totalExecutions: number;
    config?: {
      frequency: 'daily' | 'weekly';
      time: string;
      dayOfWeek?: string;
      keywords: string;
      tone: string;
      length: string;
    };
  }>({
    isActive: false,
    totalExecutions: 0
  });
  // États pour les sous-onglets
  const [activeSubTab, setActiveSubTab] = useState<"articles" | "keywords">("articles");
  // États pour la gestion des mots-clés
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);
  const [keywordSearchTerm, setKeywordSearchTerm] = useState("");
  const [generateKeywordSearchTerm, setGenerateKeywordSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Réduire pour avoir plusieurs pages

  const { transformLink } = useSiteLink();
  // Fonction pour afficher un message de succès temporaire
  const showSuccessMessage = (message: string) => {
    setSuccess(message);
    setError("");
    setTimeout(() => setSuccess(""), 5000);
  };

  // Fonction pour afficher un message d'erreur temporaire
  const showErrorMessage = (message: string) => {
    setError(message);
    setSuccess("");
    setTimeout(() => setError(""), 8000);
  };

  // Fonctions pour la gestion des mots-clés
  const fetchKeywords = async () => {
    if (!siteId) return;

    setIsLoadingKeywords(true);
    try {
      const response = await fetch(`/api/blog/keywords?siteId=${encodeURIComponent(siteId)}`);
      if (response.ok) {
        const data = await response.json();
        setKeywords(data.keywords || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des mots-clés:', error);
    } finally {
      setIsLoadingKeywords(false);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim() || !siteId) return;

    const keyword = newKeyword.trim().toLowerCase();
    if (keywords.includes(keyword)) {
      showErrorMessage("Ce mot-clé existe déjà");
      return;
    }

    try {
      const response = await fetch('/api/blog/keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          siteId
        }),
      });
      if (response.ok) {
        setKeywords([...keywords, keyword]);
        setNewKeyword("");
        showSuccessMessage("Mot-clé ajouté avec succès");
      } else {
        showErrorMessage("Erreur lors de l'ajout du mot-clé");
      }
    } catch (error) {
      showErrorMessage("Erreur lors de l'ajout du mot-clé");
    }
  };

  const removeKeyword = async (keywordToRemove: string) => {
    if (!siteId) return;

    try {
      const response = await fetch('/api/blog/keywords', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: keywordToRemove,
          siteId
        }),
      });
      if (response.ok) {
        setKeywords(keywords.filter(k => k !== keywordToRemove));
        showSuccessMessage("Mot-clé supprimé avec succès");
      } else {
        showErrorMessage("Erreur lors de la suppression du mot-clé");
      }
    } catch (error) {
      showErrorMessage("Erreur lors de la suppression du mot-clé");
    }
  };

  // Validation des données d'article
  const validateArticleData = (data: { titre: string; contenu: string; tags: string; image: string }) => {
    const errors: string[] = [];

    const titre = data.titre ?? "";
    if (!titre || titre.trim().length === 0) {
      errors.push("Le titre est requis");
    } else if (titre.trim().length < 3) {
      errors.push("Le titre doit contenir au moins 3 caractères");
    } else if (titre.trim().length > 100) {
      errors.push("Le titre ne doit pas dépasser 100 caractères");
    }

    const contenu = data.contenu ?? "";
    if (!contenu || contenu.trim().length === 0) {
      errors.push("Le contenu est requis");
    } else if (contenu.trim().length < 10) {
      errors.push("Le contenu doit contenir au moins 10 caractères");
    }

    // Validation des tags
    const tagsStr = data.tags ?? "";
    if (tagsStr) {
      const tags = tagsStr.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0);
      if (tags.length > 10) {
        errors.push("Vous ne pouvez pas ajouter plus de 10 tags");
      }
      for (const tag of tags) {
        if (tag.length > 40) {
          errors.push("Chaque tag ne doit pas dépasser 40 caractères");
          break;
        }
      }
    }

    // Validation des images
    if (!data.image || String(data.image).length === 0) {
      errors.push("Une image est requise");
    }

    return errors;
  };

  // Fonction pour uploader une image
  const uploadImage = async (file: File, blogId?: string) => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('siteId', siteId || '');
      if (blogId) {
        formData.append('blogId', blogId);
      }

      const response = await fetch('/api/blog/upload-images', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'upload');
      }

      const result = await response.json();
      return result.imageUrl;
    } catch (error) {
      console.error('Erreur upload image:', error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  // Fonction pour gérer l'ajout d'image
  const handleAddImage = async (event: React.ChangeEvent<HTMLInputElement>, formType: 'create' | 'edit') => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await uploadImage(file, formType === 'edit' ? selectedArticle?._id : undefined);
      if (formType === 'create') {
        setCreateForm(prev => ({
          ...prev,
          image: imageUrl
        }));
      } else {
        setEditForm(prev => ({
          ...prev,
          image: imageUrl
        }));
      }

      showSuccessMessage('Image ajoutée avec succès !');
    } catch (error) {
      showErrorMessage(error instanceof Error ? error.message : 'Erreur lors de l\'ajout de l\'image');
    }
  };

  // Fonction pour supprimer une image
  const handleRemoveImage = (imageUrl: string, formType: 'create' | 'edit') => {
    if (formType === 'create') {
      setCreateForm(prev => ({
        ...prev,
        image: ""
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        image: ""
      }));
    }
  };

  // Fonction pour récupérer les articles depuis l'API avec pagination côté serveur
  const fetchArticles = async (page: number = currentPage) => {
    setIsLoading(true);
    setError("");
    try {
      // Construire l'URL avec les paramètres de pagination, filtrage et tri
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString()
      });
      if (siteId) {
        params.append('siteId', siteId);
      }

      // Ajouter les paramètres de filtrage et tri
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (sortBy) {
        params.append('sortBy', sortBy);
      }
      if (sortOrder) {
        params.append('sortOrder', sortOrder);
      }

      const url = `/api/blog?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Aucun article trouvé");
        } else if (response.status === 500) {
          throw new Error("Erreur serveur lors du chargement des articles");
        } else {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
      }

      const data = await response.json();
      // Vérifier si la réponse contient la pagination (nouveau format)
      if (data.data && data.pagination) {
        setArticles(data.data);
        setPagination(data.pagination);
        setStats({ total: data.pagination.total });
        console.log("Articles récupérés avec pagination:", data.data.length, "sur", data.pagination.total);
      } else if (Array.isArray(data)) {
        // Rétrocompatibilité avec l'ancien format
        setArticles(data);
        setStats({ total: data.length });
        setPagination({
          total: data.length,
          page: 1,
          limit: data.length,
          pages: 1
        });
        console.log("Articles récupérés (format ancien):", data.length);
      } else {
        throw new Error("Format de données invalide");
      }

    } catch (error) {
      console.error('Erreur lors du chargement des articles:', error);
      showErrorMessage(error instanceof Error ? error.message : "Erreur inconnue lors du chargement");
      setArticles([]);
      setStats({ total: 0 });
      setPagination({
        total: 0,
        page: 1,
        limit: itemsPerPage,
        pages: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les données à l'initialisation et lorsque le siteId devient disponible
  useEffect(() => {
    fetchArticles();
    fetchKeywords();
    fetchSchedulerStatus();
  }, [siteId]);
  // Rafraîchir automatiquement le statut du scheduler toutes les 60s pour mettre à jour "Prochaine:"
  useEffect(() => {
    if (!siteId) return;
    fetchSchedulerStatus();
  }, [siteId]);
  // Déclenche automatiquement le cron côté serveur toutes les 60s quand la planification est active
  // useEffect(() => {
  //   if (!siteId) return;
  //   if (!schedulerStatus.isActive) return;
  //   const interval = setInterval(() => {
  //     fetch('/api/cron/blog-scheduler?force=0').catch(() => {});
  //   }, 60000);
  //   return () => clearInterval(interval);
  // }, [siteId, schedulerStatus.isActive]);
  // Fonctions pour la planification automatique
  const fetchSchedulerStatus = async () => {
    if (!siteId) return;

    try {
      const response = await fetch(`/api/blog/scheduler/status?siteId=${encodeURIComponent(siteId)}`);
      if (response.ok) {
        const data = await response.json();
        setSchedulerStatus(data);
        setSchedulerConfig(prev => ({
          ...prev,
          isActive: data.isActive
        }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement du statut du planificateur:', error);
    }
  };

  const startScheduler = async () => {
    if (!schedulerConfig.keywords.trim()) {
      showErrorMessage("Veuillez saisir au moins un mot-clé pour la planification");
      return;
    }

    try {
      const response = await fetch('/api/blog/scheduler/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId: siteId || "",
          ...schedulerConfig
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setSchedulerStatus(data);
        setSchedulerConfig(prev => ({ ...prev, isActive: true }));
        showSuccessMessage("Planification automatique activée avec succès !");
        setShowSchedulerModal(false);
      } else {
        const errorData = await response.json();
        showErrorMessage(errorData.error || "Erreur lors de l'activation de la planification");
      }
    } catch (error) {
      showErrorMessage("Erreur lors de l'activation de la planification");
    }
  };

  const stopScheduler = async () => {
    if (!siteId) return;

    // Confirmation avant d'arrêter
    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir arrêter la planification automatique ?\n\n" +
      "Cela empêchera la génération automatique d'articles selon le planning configuré."
    );
    if (!confirmed) return;

    try {
      const response = await fetch('/api/blog/scheduler/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId: siteId || ""
        }),
      });
      if (response.ok) {
        setSchedulerStatus(prev => ({ ...prev, isActive: false }));
        setSchedulerConfig(prev => ({ ...prev, isActive: false }));
        showSuccessMessage("Planification automatique arrêtée avec succès !");
      } else {
        const errorData = await response.json();
        showErrorMessage(errorData.error || "Erreur lors de l'arrêt de la planification");
      }
    } catch (error) {
      showErrorMessage("Erreur lors de l'arrêt de la planification");
    }
  };

  const handleOpenScheduler = () => {
    setSchedulerConfig(prev => ({
      ...prev,
      keywords: keywords.length > 0 ? keywords.join(", ") : ""
    }));
    setShowSchedulerModal(true);
  };

  // (bouton Exécuter maintenant supprimé)

  // Note: Le filtrage et tri sont maintenant gérés côté serveur via l'API
  // Cette fonction est conservée pour référence mais n'est plus utilisée pour la pagination

  // Utiliser les articles du serveur directement (pas de filtrage côté client pour la pagination)
  const currentArticles = articles;

  // Utiliser les données de pagination du serveur
  const totalPages = pagination.pages;
  const startIndex = (pagination.page - 1) * pagination.limit;
  const endIndex = startIndex + currentArticles.length;

  // Réinitialiser la page et refetch quand la recherche ou le tri change
  useEffect(() => {
    setCurrentPage(1);
    fetchArticles(1);
  }, [searchTerm, sortBy, sortOrder]);
  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case "published": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "draft": return <Edit className="w-4 h-4 text-yellow-500" />;
      case "archived": return <EyeOff className="w-4 h-4 text-gray-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case "published": return "bg-green-100 text-green-800";
      case "draft": return "bg-yellow-100 text-yellow-800";
      case "archived": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatutText = (statut: string) => {
    switch (statut) {
      case "published": return "Publié";
      case "draft": return "Brouillon";
      case "archived": return "Archivé";
      default: return "Inconnu";
    }
  };

  const handleRefreshArticles = () => {
    fetchArticles(pagination.page);
  };

  const handleEditArticle = (article: Article) => {
    setSelectedArticle(article);
    setEditForm({
      titre: article.title ?? "",
      contenu: article.content ?? "",
      tags: article.keywords?.join(", ") ?? "",
      image: Array.isArray(article.image) ? (article.image[0] || "") : (typeof article.image === 'string' ? article.image : "")
    });
    setShowEditModal(true);
  };

  const handleDeleteArticle = (article: Article) => {
    setSelectedArticle(article);
    setShowDeleteModal(true);
  };

  const handleSaveEdit = async () => {
    if (selectedArticle) {
      // Validation des données
      const validationErrors = validateArticleData(editForm);
      if (validationErrors.length > 0) {
        showErrorMessage(validationErrors.join(", "));
        return;
      }

      try {
        const response = await fetch(`/api/blog/${selectedArticle._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: (editForm.titre ?? "").trim(),
            content: (editForm.contenu ?? "").trim(),
            keywords: (editForm.tags ?? "").split(",").map(tag => tag.trim()).filter(tag => tag.length > 0),
            image: editForm.image
          }),
        });
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Article non trouvé");
          } else if (response.status === 400) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Données invalides");
          } else if (response.status === 500) {
            throw new Error("Erreur serveur lors de la mise à jour");
          } else {
            throw new Error(`Erreur HTTP: ${response.status}`);
          }
        }

        // Recharger les articles
        await fetchArticles(pagination.page);
        showSuccessMessage("Article modifié avec succès !");
      } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        showErrorMessage(error instanceof Error ? error.message : "Erreur lors de la mise à jour de l'article");
      }
    }
    setShowEditModal(false);
    setSelectedArticle(null);
  };

  const handleConfirmDelete = async () => {
    if (selectedArticle) {
      try {
        const response = await fetch(`/api/blog/${selectedArticle._id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Article non trouvé");
          } else if (response.status === 500) {
            throw new Error("Erreur serveur lors de la suppression");
          } else {
            throw new Error(`Erreur HTTP: ${response.status}`);
          }
        }

        // Recharger les articles
        await fetchArticles(pagination.page);
        showSuccessMessage("Article supprimé avec succès !");
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showErrorMessage(error instanceof Error ? error.message : "Erreur lors de la suppression de l'article");
      }
    }
    setShowDeleteModal(false);
    setSelectedArticle(null);
  };

  const handleCreateArticle = () => {
    setCreateForm({
      titre: "",
      contenu: "",
      tags: "",
      image: ""
    });
    setShowCreateModal(true);
  };

  const handleGenerateArticle = () => {
    setGenerateForm({
      keywords: "",
      tone: "professional",
      length: "medium"
    });
    setShowGenerateModal(true);
  };

  const handleGenerateContent = async () => {
    if (!generateForm.keywords.trim()) {
      showErrorMessage("Veuillez saisir au moins un mot-clé");
      return;
    }

    try {
      setGeneratingArticle(true);
      const keywords = generateForm.keywords
        .split(",")
        .map(k => k.trim())
        .filter(k => k.length > 0);
      const response = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords,
          siteId: siteId || "",
          tone: generateForm.tone,
          length: generateForm.length
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la génération");
      }

      const result = await response.json();
      if (result.success && result.article) {
        // Pré-remplir le formulaire de création avec l'article généré
        setCreateForm({
          titre: result.article.title,
          contenu: result.article.content,
          tags: result.article.keywords.join(", "),
          image: String(result.article.imageUrl || "") // S'assurer que c'est une chaîne
        });
        // Fermer le modal de génération et ouvrir celui de création
        setShowGenerateModal(false);
        setShowCreateModal(true);
        showSuccessMessage("Article et image générés avec succès ! Vous pouvez maintenant l'éditer et l'ajuster si nécessaire.");
      } else {
        throw new Error("Erreur lors de la génération de l'article");
      }

    } catch (error) {
      console.error('Erreur lors de la génération:', error);
      showErrorMessage(error instanceof Error ? error.message : "Erreur lors de la génération de l'article");
    } finally {
      setGeneratingArticle(false);
    }
  };

  const handleViewArticle = (article: Article) => {
    // Ouvrir l'article dans un nouvel onglet
    const url = transformLink(`/blog-page?slug=${toKebab(article.title)}-${article._id}`);
    window.open(url, '_blank');
  };

  const handleSaveCreate = async () => {
    // Validation des données
    const validationErrors = validateArticleData(createForm);
    if (validationErrors.length > 0) {
      showErrorMessage(validationErrors.join(", "));
      return;
    }

    try {
      const response = await fetch('/api/blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: createForm.titre.trim(),
          content: createForm.contenu.trim(),
          keywords: createForm.tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0),
          image: createForm.image,
          siteId: siteId || ""
        }),
      });
      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Données invalides");
        } else if (response.status === 500) {
          throw new Error("Erreur serveur lors de la création");
        } else {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
      }

      // Recharger les articles
      await fetchArticles(pagination.page);
      setShowCreateModal(false);
      setCreateForm({
        titre: "",
        contenu: "",
        tags: "",
        image: ""
      });
      showSuccessMessage("Article créé avec succès !");
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      showErrorMessage(error instanceof Error ? error.message : "Erreur lors de la création de l'article");
    }
  };



  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Gestion du Blog
            </h2>
            <p className="text-gray-600">
              Interface de gestion pour les articles du blog.
            </p>
            {/* Messages d'erreur et de succès */}
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

        {/* {/* Sous-onglets
        <div className="mb-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveSubTab("articles")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSubTab === "articles"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <List className="w-4 h-4" />
                Liste Blog
              </div>
            </button>
            <button
              onClick={() => setActiveSubTab("keywords")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSubTab === "keywords"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Mots-clés
              </div>
            </button>
          </div>
        </div> */}

        {/* Contenu des onglets */}
        {activeSubTab === "articles" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="relative bg-gray-50 rounded-lg p-4">
                {/* Icône en haut à droite */}
                <div className="absolute top-4 right-4 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex items-start">
                  <div className="flex-1 pr-12">
                    <p className="text-sm font-medium text-gray-600">Total Articles</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </div>

              {/* <div className="relative bg-gray-50 rounded-lg p-4">
                  <div className={`absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center ${
                      schedulerStatus.isActive ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                    <Timer className={`w-5 h-5 ${schedulerStatus.isActive ? 'text-green-600' : 'text-gray-500'}`} />
                  </div>

                  <div className="flex items-start">
                    <div className="flex-1 pr-12">
                      <p className="text-sm font-medium text-gray-600">Planification</p>
                      <p className={`text-lg font-bold ${schedulerStatus.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                        {schedulerStatus.isActive ? 'Active' : 'Inactive'}
                      </p>
                      
                      {schedulerStatus.isActive && schedulerStatus.config && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Fréquence:</span> {
                              schedulerStatus.config.frequency === 'daily' 
                                ? 'Quotidienne' 
                                : `Hebdomadaire (${schedulerStatus.config.dayOfWeek === 'monday' ? 'Lundi' :
                                    schedulerStatus.config.dayOfWeek === 'tuesday' ? 'Mardi' :
                                    schedulerStatus.config.dayOfWeek === 'wednesday' ? 'Mercredi' :
                                    schedulerStatus.config.dayOfWeek === 'thursday' ? 'Jeudi' :
                                    schedulerStatus.config.dayOfWeek === 'friday' ? 'Vendredi' :
                                    schedulerStatus.config.dayOfWeek === 'saturday' ? 'Samedi' :
                                    schedulerStatus.config.dayOfWeek === 'sunday' ? 'Dimanche' : 'N/A'})`
                            } • <span className="font-medium">Heure:</span> {schedulerStatus.config.time}
                          </p>
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Ton:</span> {
                              schedulerStatus.config.tone === 'professional' ? 'Professionnel' :
                              schedulerStatus.config.tone === 'casual' ? 'Décontracté' : 'Formel'
                            } • <span className="font-medium">Longueur:</span> {
                              schedulerStatus.config.length === 'short' ? 'Court' :
                              schedulerStatus.config.length === 'medium' ? 'Moyen' : 'Long'
                            }
                          </p>
                          {schedulerStatus.nextExecution && (
                            <p className="text-xs text-blue-600 font-medium">
                              📅 Prochaine: {new Date(schedulerStatus.nextExecution).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {schedulerStatus.isActive && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          ⚠️ Cliquez sur "Arrêter Planification" pour désactiver
                        </p>
                      )}
                    </div>
                  </div>
                </div> */}
            </div>

            {/* Filter Bar and Actions */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex flex-col gap-3">
                {/* Ligne recherche + actions */}
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Rechercher un article..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleRefreshArticles}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                      Actualiser
                    </button>
                    {/* <>
                      <button 
                        onClick={handleGenerateArticle}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
                      >
                        <Sparkles className="w-4 h-4" />
                        Générer Article
                      </button>
                      {schedulerStatus.isActive ? (
                        <button 
                          onClick={stopScheduler}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                        >
                          <Pause className="w-4 h-4" />
                          Arrêter Planification
                        </button>
                      ) : (
                        <button 
                          onClick={handleOpenScheduler}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
                        >
                          <Timer className="w-4 h-4" />
                          Planifier Auto
                        </button>
                      )}
                    </> */}
                    <button
                      onClick={handleCreateArticle}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Nouvel Article
                    </button>
                  </div>
                </div>

                {/* Ligne filtres sous la recherche */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Filtres :</span>
                    <span className="text-sm text-gray-600">Trier par :</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="createdAt">Date de création</option>
                      <option value="updatedAt">Date de modification</option>
                      <option value="title">Titre</option>
                      <option value="views">Nombre de vues</option>
                    </select>
                  </div>

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
                </div>

                {/* Filtres actifs */}
                {(searchTerm || sortBy !== "createdAt" || sortOrder !== "desc") && (
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
                    {sortBy !== "createdAt" && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        <span>Tri: {sortBy === "title" ? "Titre" : sortBy === "views" ? "Vues" : "Date de modification"}</span>
                        <button
                          onClick={() => setSortBy("createdAt")}
                          className="hover:bg-green-200 rounded-full p-1"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {sortOrder !== "desc" && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                        <span>Ordre: Croissant</span>
                        <button
                          onClick={() => setSortOrder("desc")}
                          className="hover:bg-purple-200 rounded-full p-1"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Articles List */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Liste des Articles ({pagination.total})
                  {isLoading && <span className="text-sm text-gray-500 ml-2">- Chargement...</span>}
                </h3>
              </div>

              <div className="divide-y divide-gray-200">
                {currentArticles.map((article) => (
                  <div key={article._id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-4">
                      {/* Image */}
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        {article.image ? (
                          <img
                            src={Array.isArray(article.image) ? article.image[0] : article.image}
                            alt={article.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <FileText className="w-8 h-8 text-gray-600" />
                        )}
                      </div>

                      {/* Contenu */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Publié
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {article.keywords && article.keywords.length > 0 ? article.keywords[0] : "Sans catégorie"}
                          </span>
                        </div>

                        <div className="mb-2">
                          <h4 className="font-medium text-gray-900 text-lg mb-1">{article.title}</h4>
                          <p className="text-sm text-gray-500 mb-2">
                            Vues: <span className="font-medium">{article.views}</span>
                          </p>
                          <p className="text-sm text-gray-500">
                            <Calendar className="inline w-3 h-3 mr-1" />
                            Créé le {new Date(article.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleViewArticle(article)}
                              className="flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-all duration-200 hover:shadow-sm border border-green-200 hover:border-green-300"
                              title="Voir l'article"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="text-sm font-medium">Voir</span>
                            </button>
                            <button
                              onClick={() => handleEditArticle(article)}
                              className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all duration-200 hover:shadow-sm border border-blue-200 hover:border-blue-300"
                              title="Modifier l'article"
                            >
                              <Edit className="w-4 h-4" />
                              <span className="text-sm font-medium">Modifier</span>
                            </button>
                            <button
                              onClick={() => handleDeleteArticle(article)}
                              className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all duration-200 hover:shadow-sm border border-red-200 hover:border-red-300"
                              title="Supprimer l'article"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="text-sm font-medium">Supprimer</span>
                            </button>
                          </div>

                          {/* Tags */}
                          {article.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {article.keywords.map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {currentArticles.length === 0 && !isLoading && (
                <div className="p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun article trouvé</h3>
                  <p className="text-gray-500">Aucun article ne correspond à vos critères de recherche.</p>
                </div>
              )}

              {isLoading && (
                <div className="p-8 text-center">
                  <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Chargement des articles...</h3>
                  <p className="text-gray-500">Récupération des articles depuis l'API.</p>
                </div>
              )}

              {/* Pagination */}
              {!isLoading && totalPages > 1 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Affichage {startIndex + 1}-{endIndex} sur {pagination.total} articles
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newPage = pagination.page - 1;
                          setCurrentPage(newPage);
                          fetchArticles(newPage);
                        }}
                        disabled={pagination.page === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Précédent
                      </button>
                      <span className="px-3 py-1 text-sm text-gray-600">
                        Page {pagination.page} sur {totalPages}
                      </span>
                      <button
                        onClick={() => {
                          const newPage = pagination.page + 1;
                          setCurrentPage(newPage);
                          fetchArticles(newPage);
                        }}
                        disabled={pagination.page === totalPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Suivant
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal d'édition */}
            {showEditModal && selectedArticle && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Modifier l'article</h3>
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Titre {editForm.titre.trim().length < 3 && editForm.titre.trim().length > 0 && (
                          <span className="text-red-500 text-xs ml-1">(minimum 3 caractères)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={editForm.titre}
                        onChange={(e) => setEditForm({ ...editForm, titre: e.target.value })}
                        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${editForm.titre.trim().length > 0 && editForm.titre.trim().length < 3
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300'
                          }`}
                        placeholder="Titre de l'article"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tags (séparés par des virgules)
                        {editForm.tags && editForm.tags.split(",").length > 10 && (
                          <span className="text-red-500 text-xs ml-1">(maximum 10 tags)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={editForm.tags}
                        onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${editForm.tags && editForm.tags.split(",").length > 10
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300'
                          }`}
                        placeholder="tag1, tag2, tag3"
                      />
                      {editForm.tags && (
                        <p className="text-xs text-gray-500 mt-1">
                          {editForm.tags.split(",").filter(tag => tag.trim().length > 0).length} tag(s) saisi(s)
                        </p>
                      )}
                    </div>

                    {/* Section Images */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Image *
                      </label>

                      {/* Upload d'image */}
                      <div className="mb-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleAddImage(e, 'edit')}
                          disabled={uploadingImage || Boolean(editForm.image && String(editForm.image).trim().length > 0)}
                          className="hidden"
                          id="edit-image-upload"
                        />
                        <label
                          htmlFor="edit-image-upload"
                          className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer ${uploadingImage || (editForm.image && String(editForm.image).trim().length > 0) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                          {uploadingImage ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Upload en cours...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Ajouter une image
                            </>
                          )}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Formats acceptés: JPG, PNG, GIF, WebP, SVG. Taille max: 5MB
                        </p>
                      </div>

                      {/* Affichage de l'image */}
                      {editForm.image && String(editForm.image).trim().length > 0 && (
                        <div className="mb-4">
                          <div className="relative group inline-block">
                            <img
                              src={editForm.image}
                              alt="Image de l'article"
                              className="w-64 h-32 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              onClick={() => handleRemoveImage(String(editForm.image || ''), 'edit')}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Supprimer l'image"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contenu</label>
                      <div className="border border-gray-300 rounded-lg">
                        <Editor
                          {...TINYMCE_CONFIG}
                          value={editForm.contenu ?? ""}
                          onEditorChange={(content: string) => setEditForm({ ...editForm, contenu: content })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleSaveEdit}
                      disabled={!(editForm.titre ?? "").trim() || !(editForm.contenu ?? "").trim() || !editForm.image || String(editForm.image).trim().length === 0}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      Sauvegarder
                    </button>
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de suppression */}
            {showDeleteModal && selectedArticle && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Supprimer l'article</h3>
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-gray-600 mb-4">
                    Êtes-vous sûr de vouloir supprimer l'article <strong>"{selectedArticle.title}"</strong> ?
                    Cette action est irréversible.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={handleConfirmDelete}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      Supprimer
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de création */}
            {showCreateModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Créer un nouvel article</h3>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Titre * {createForm.titre.trim().length < 3 && createForm.titre.trim().length > 0 && (
                          <span className="text-red-500 text-xs ml-1">(minimum 3 caractères)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={createForm.titre}
                        onChange={(e) => setCreateForm({ ...createForm, titre: e.target.value })}
                        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${createForm.titre.trim().length > 0 && createForm.titre.trim().length < 3
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300'
                          }`}
                        placeholder="Titre de l'article"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tags (séparés par des virgules)
                        {createForm.tags && createForm.tags.split(",").length > 10 && (
                          <span className="text-red-500 text-xs ml-1">(maximum 10 tags)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={createForm.tags}
                        onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })}
                        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${createForm.tags && createForm.tags.split(",").length > 10
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300'
                          }`}
                        placeholder="tag1, tag2, tag3"
                      />
                      {createForm.tags && (
                        <p className="text-xs text-gray-500 mt-1">
                          {createForm.tags.split(",").filter(tag => tag.trim().length > 0).length} tag(s) saisi(s)
                        </p>
                      )}
                    </div>

                    {/* Section Images */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Image *
                      </label>

                      {/* Upload d'image */}
                      <div className="mb-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleAddImage(e, 'create')}
                          disabled={uploadingImage || Boolean(createForm.image && String(createForm.image).trim().length > 0)}
                          className="hidden"
                          id="create-image-upload"
                        />
                        <label
                          htmlFor="create-image-upload"
                          className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer ${uploadingImage || (createForm.image && String(createForm.image).trim().length > 0) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                          {uploadingImage ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Upload en cours...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Ajouter une image
                            </>
                          )}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Formats acceptés: JPG, PNG, GIF, WebP, SVG. Taille max: 5MB
                        </p>
                      </div>

                      {/* Affichage de l'image */}
                      {createForm.image && String(createForm.image).trim().length > 0 && (
                        <div className="mb-4">
                          <div className="relative group inline-block">
                            <img
                              src={createForm.image}
                              alt="Image de l'article"
                              className="w-64 h-32 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              onClick={() => handleRemoveImage(String(createForm.image || ''), 'create')}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Supprimer l'image"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contenu *</label>
                      <div className="border border-gray-300 rounded-lg">
                        <Editor
                          {...TINYMCE_CONFIG}
                          value={createForm.contenu}
                          onEditorChange={(content: string) => setCreateForm({ ...createForm, contenu: content })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleSaveCreate}
                      disabled={!createForm.titre.trim() || !createForm.contenu.trim() || createForm.titre.trim().length < 3 || !createForm.image || String(createForm.image).trim().length === 0}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      Créer l'article
                    </button>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de génération d'article */}
            {showGenerateModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      Générer un Article
                    </h3>
                    <button
                      onClick={() => setShowGenerateModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mots-clés *
                      </label>
                      <input
                        type="text"
                        value={generateForm.keywords}
                        onChange={(e) => setGenerateForm({ ...generateForm, keywords: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Ex: domiciliation, entreprise, création, conseils"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Séparez les mots-clés par des virgules
                      </p>
                    </div>

                    {/* Mots-clés sauvegardés (toujours visible, avec fallback) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mots-clés disponibles
                      </label>
                      {/* Barre de recherche pour les mots-clés dans la popup */}
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Rechercher un mot-clé..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                          value={generateKeywordSearchTerm}
                          onChange={(e) => setGenerateKeywordSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                        {keywords.length === 0 ? (
                          <div className="w-full text-center py-4">
                            <p className="text-xs text-gray-500">Aucun mot-clé enregistré pour le moment.</p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {keywords
                              .filter(keyword => keyword.toLowerCase().includes(generateKeywordSearchTerm.toLowerCase()))
                              .map((keyword, index) => (
                                <button
                                  key={index}
                                  onClick={() => {
                                    const currentKeywords = generateForm.keywords.split(',').map(k => k.trim()).filter(k => k);
                                    if (!currentKeywords.includes(keyword)) {
                                      const newKeywords = [...currentKeywords, keyword].join(', ');
                                      setGenerateForm({ ...generateForm, keywords: newKeywords });
                                    }
                                  }}
                                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200 hover:bg-blue-200 transition-colors"
                                >
                                  + {keyword}
                                </button>
                              ))}
                            {generateKeywordSearchTerm && keywords.filter(k => k.toLowerCase().includes(generateKeywordSearchTerm.toLowerCase())).length === 0 && (
                              <div className="w-full text-center py-4">
                                <p className="text-xs text-gray-500">Aucun mot-clé trouvé</p>
                              </div>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">Cliquez sur un mot-clé pour l'ajouter</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ton de l'article
                      </label>
                      <select
                        value={generateForm.tone}
                        onChange={(e) => setGenerateForm({ ...generateForm, tone: e.target.value as 'professional' | 'casual' | 'formal' })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="professional">Professionnel</option>
                        <option value="casual">Décontracté</option>
                        <option value="formal">Formel</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Longueur de l'article
                      </label>
                      <select
                        value={generateForm.length}
                        onChange={(e) => setGenerateForm({ ...generateForm, length: e.target.value as 'short' | 'medium' | 'long' })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="short">Court (200-400 mots)</option>
                        <option value="medium">Moyen (800-1200 mots)</option>
                        <option value="long">Long (1200-2000 mots)</option>
                      </select>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 text-blue-600 mt-0.5">
                          <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="text-sm text-blue-800">
                          <p className="font-medium">Comment ça fonctionne ?</p>
                          <p className="mt-1">
                            Notre système analyse vos mots-clés et les informations de votre entreprise
                            pour générer un article personnalisé <strong>avec une image automatiquement créée</strong>.
                            Vous pourrez ensuite l'éditer et l'ajuster selon vos besoins.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleGenerateContent}
                      disabled={!generateForm.keywords.trim() || generatingArticle}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {generatingArticle ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Génération...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Générer l'Article
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowGenerateModal(false)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Onglet Mots-clés */}
        {activeSubTab === "keywords" && (
          <div className="space-y-6">
            {/* Stats des mots-clés */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Mots-clés</p>
                    <p className="text-2xl font-bold text-gray-900">{keywords.length}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Hash className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Ajout de mot-clé */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ajouter un mot-clé</h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Entrez un mot-clé..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                  />
                </div>
                <button
                  onClick={addKeyword}
                  disabled={!newKeyword.trim()}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ajouter
                </button>
              </div>
            </div>

            {/* Liste des mots-clés */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Mots-clés disponibles</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Ces mots-clés seront utilisés pour générer des articles de blog
                      {keywordSearchTerm && (
                        <span className="ml-2 text-blue-600">
                          • {keywords.filter(k => k.toLowerCase().includes(keywordSearchTerm.toLowerCase())).length} résultat(s) trouvé(s)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="w-full md:w-[32rem] relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Rechercher un mot-clé..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={keywordSearchTerm}
                      onChange={(e) => setKeywordSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {isLoadingKeywords ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">Chargement des mots-clés...</p>
                </div>
              ) : keywords.length === 0 ? (
                <div className="p-8 text-center">
                  <Hash className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">Aucun mot-clé ajouté</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Ajoutez des mots-clés pour générer des articles personnalisés
                  </p>
                </div>
              ) : (
                <div className="p-6">
                  <div className="flex flex-wrap gap-2">
                    {keywords
                      .filter(keyword =>
                        keyword.toLowerCase().includes(keywordSearchTerm.toLowerCase())
                      )
                      .map((keyword, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-200"
                        >
                          <Hash className="w-4 h-4" />
                          <span className="font-medium">{keyword}</span>
                          <button
                            onClick={() => removeKeyword(keyword)}
                            className="text-blue-500 hover:text-blue-700 transition-colors"
                            title="Supprimer ce mot-clé"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    {keywordSearchTerm && keywords.filter(k => k.toLowerCase().includes(keywordSearchTerm.toLowerCase())).length === 0 && (
                      <div className="w-full text-center py-8">
                        <Hash className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">Aucun mot-clé trouvé pour "{keywordSearchTerm}"</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Essayez avec un autre terme de recherche
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de planification automatique */}
        {showSchedulerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Timer className="w-5 h-5 text-green-600" />
                  Planification Automatique
                </h3>
                <button
                  onClick={() => setShowSchedulerModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Configuration de la fréquence */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fréquence de publication
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="daily"
                        checked={schedulerConfig.frequency === "daily"}
                        onChange={(e) => setSchedulerConfig({ ...schedulerConfig, frequency: e.target.value as 'daily' | 'weekly' })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Quotidienne</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="weekly"
                        checked={schedulerConfig.frequency === "weekly"}
                        onChange={(e) => setSchedulerConfig({ ...schedulerConfig, frequency: e.target.value as 'daily' | 'weekly' })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Hebdomadaire</span>
                    </label>
                  </div>
                </div>

                {/* Configuration de l'heure */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Heure de publication
                  </label>
                  <input
                    type="time"
                    value={schedulerConfig.time}
                    onChange={(e) => setSchedulerConfig({ ...schedulerConfig, time: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Configuration du jour de la semaine (si hebdomadaire) */}
                {schedulerConfig.frequency === "weekly" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jour de la semaine
                    </label>
                    <select
                      value={schedulerConfig.dayOfWeek}
                      onChange={(e) => setSchedulerConfig({ ...schedulerConfig, dayOfWeek: e.target.value as any })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="monday">Lundi</option>
                      <option value="tuesday">Mardi</option>
                      <option value="wednesday">Mercredi</option>
                      <option value="thursday">Jeudi</option>
                      <option value="friday">Vendredi</option>
                      <option value="saturday">Samedi</option>
                      <option value="sunday">Dimanche</option>
                    </select>
                  </div>
                )}

                {/* Configuration des mots-clés */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mots-clés pour la génération *
                  </label>
                  <input
                    type="text"
                    value={schedulerConfig.keywords}
                    onChange={(e) => setSchedulerConfig({ ...schedulerConfig, keywords: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Ex: domiciliation, entreprise, conseils, création"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Séparez les mots-clés par des virgules. Le système sélectionnera aléatoirement 2 à 3 mots-clés à chaque génération pour varier le contenu.
                  </p>
                </div>

                {/* Configuration du ton */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ton des articles
                  </label>
                  <select
                    value={schedulerConfig.tone}
                    onChange={(e) => setSchedulerConfig({ ...schedulerConfig, tone: e.target.value as 'professional' | 'casual' | 'formal' })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="professional">Professionnel</option>
                    <option value="casual">Décontracté</option>
                    <option value="formal">Formel</option>
                  </select>
                </div>

                {/* Configuration de la longueur */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Longueur des articles
                  </label>
                  <select
                    value={schedulerConfig.length}
                    onChange={(e) => setSchedulerConfig({ ...schedulerConfig, length: e.target.value as 'short' | 'medium' | 'long' })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="short">Court (200-400 mots)</option>
                    <option value="medium">Moyen (800-1200 mots)</option>
                    <option value="long">Long (1200-2000 mots)</option>
                  </select>
                </div>

                {/* Information sur le fonctionnement */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 text-green-600 mt-0.5">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-sm text-green-800">
                      <p className="font-medium">Comment ça fonctionne ?</p>
                      <p className="mt-1">
                        Le système générera automatiquement un nouvel article de blog à l'heure et la fréquence choisies.
                        Chaque article sera créé avec une image personnalisée et publié automatiquement sur votre site.
                      </p>
                      <p className="mt-2 font-medium">
                        {schedulerConfig.frequency === "daily"
                          ? `Un article sera créé tous les jours à ${schedulerConfig.time}`
                          : `Un article sera créé tous les ${schedulerConfig.dayOfWeek}s à ${schedulerConfig.time}`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={startScheduler}
                  disabled={!schedulerConfig.keywords.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Play className="w-4 h-4" />
                  Activer la Planification
                </button>
                <button
                  onClick={() => setShowSchedulerModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 