"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  Mail,
  Phone,
  Calendar,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  ArrowUpDown,
  Download,
  Upload,
} from "lucide-react";

interface AdminUsersTemplateProps {
  siteId?: string;
  editableElements?: {
    [key: string]: string;
  };
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "user" | "editor" | "viewer";
  status: "active" | "inactive" | "pending";
  phone?: string;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  permissions: string[];
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<string, number>;
  recentLogins: number;
}

export default function AdminUsersTemplate({
  siteId,
  editableElements = {},
}: AdminUsersTemplateProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    inactive: 0,
    byRole: {},
    recentLogins: 0,
  });
  const [error, setError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [siteName, setSiteName] = useState<string>("");
  // États pour la modal de création
  const [newUserData, setNewUserData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: "admin" | "user" | "editor" | "viewer";
    password: string;
    status: "active" | "inactive" | "pending";
  }>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "user",
    password: "",
    status: "active",
  });
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const itemsPerPage = 10;

  // Données factices pour la démonstration
  const mockUsers: User[] = [
    {
      id: "1",
      email: "admin@majoli.io",
      firstName: "Jean",
      lastName: "Dupont",
      role: "admin",
      status: "active",
      phone: "+33 1 23 45 67 89",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      createdAt: "2024-01-15T10:30:00Z",
      lastLogin: "2024-01-20T14:22:00Z",
      permissions: ["read", "write", "delete", "admin"],
    },
    {
      id: "2",
      email: "editor@majoli.io",
      firstName: "Marie",
      lastName: "Martin",
      role: "editor",
      status: "active",
      phone: "+33 1 98 76 54 32",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      createdAt: "2024-01-10T09:15:00Z",
      lastLogin: "2024-01-19T16:45:00Z",
      permissions: ["read", "write"],
    },
    {
      id: "3",
      email: "viewer@majoli.io",
      firstName: "Pierre",
      lastName: "Bernard",
      role: "viewer",
      status: "active",
      phone: "+33 1 45 67 89 12",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      createdAt: "2024-01-05T11:20:00Z",
      lastLogin: "2024-01-18T10:30:00Z",
      permissions: ["read"],
    },
    {
      id: "4",
      email: "user@majoli.io",
      firstName: "Sophie",
      lastName: "Leroy",
      role: "user",
      status: "pending",
      phone: "+33 1 34 56 78 90",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      createdAt: "2024-01-22T08:45:00Z",
      lastLogin: undefined,
      permissions: ["read"],
    },
    {
      id: "5",
      email: "inactive@majoli.io",
      firstName: "Lucas",
      lastName: "Moreau",
      role: "user",
      status: "inactive",
      phone: "+33 1 67 89 12 34",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      createdAt: "2023-12-15T14:30:00Z",
      lastLogin: "2023-12-28T09:15:00Z",
      permissions: ["read"],
    },
  ];

  // Fonction pour récupérer les utilisateurs depuis l'API
  const fetchUsers = async () => {
    setIsLoading(true);
    setError("");
    try {
      if (siteId) {
        const response = await fetch(
          `/api/sharedServices/utilisateurs?siteId=${siteId}`
        );
        if (response.ok) {
          const data = await response.json();
          // Normaliser les IDs des utilisateurs
          const normalizedUsers = (data.users || []).map((user: any) => ({
            ...user,
            id: user.id || user._id?.toString() || `temp-${Date.now()}-${Math.random()}`
          }));
          setUsers(normalizedUsers);
          setStats(data.stats || calculateStats(normalizedUsers));
        } else {
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              `Erreur ${response.status}: ${response.statusText}`
          );
        }
      } else {
        // Utiliser les données factices si pas de siteId
        const normalizedMockUsers = mockUsers.map((user, index) => ({
          ...user,
          id: user.id || `mock-${index + 1}`
        }));
        setUsers(normalizedMockUsers);
        setStats(calculateStats(normalizedMockUsers));
      }
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error);
      setError(error instanceof Error ? error.message : "Erreur inconnue");
      // Utiliser des données factices par défaut
      const normalizedFallbackUsers = mockUsers.map((user, index) => ({
        ...user,
        id: user.id || `fallback-${index + 1}`
      }));
      setUsers(normalizedFallbackUsers);
      setStats(calculateStats(normalizedFallbackUsers));
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (usersList: User[]): UserStats => {
    const stats: UserStats = {
      total: usersList.length,
      active: usersList.filter((u) => u.status === "active").length,
      inactive: usersList.filter((u) => u.status === "inactive").length,
      byRole: {},
      recentLogins: usersList.filter((u) => {
        if (!u.lastLogin) return false;
        const lastLogin = new Date(u.lastLogin);
        const now = new Date();
        const diffDays =
          (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      }).length,
    };

    // Calculer les statistiques par rôle
    usersList.forEach((user) => {
      stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
    });
    return stats;
  };

  useEffect(() => {
    fetchUsers();
    fetchSiteName();
  }, [siteId]);
  // Fonction pour créer un utilisateur
  const createUser = async (userData: Partial<User> & { password?: string }) => {
    try {
      console.log("🔄 Tentative de création utilisateur:", { ...userData, password: userData.password ? '[MASQUÉ]' : undefined });
      const userDataWithSiteId = { ...userData, siteId };

      const response = await fetch(`/api/sharedServices/utilisateurs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userDataWithSiteId),
      });
      const responseData = await response.json();
      console.log("📥 Réponse API:", responseData);
      if (response.ok) {
        console.log("✅ Utilisateur créé avec succès");
        // S'assurer que l'utilisateur a un ID cohérent
        const normalizedUser = {
          ...responseData,
          id: responseData.id || responseData._id?.toString() || `temp-${Date.now()}`
        };
        
        setUsers((prev) => [...prev, normalizedUser]);
        setStats(calculateStats([...users, normalizedUser]));
        setError(""); // Réinitialiser l'erreur
        
        // Envoyer un email avec les identifiants si l'option est activée et qu'un mot de passe a été fourni
        if (sendWelcomeEmail && userData.password && userData.email) {
          try {
            console.log("📧 Envoi de l'email de bienvenue...");
            await sendWelcomeEmailWithCredentials(userData.email, userData.firstName || '', userData.password);
            console.log("✅ Email de bienvenue envoyé avec succès");
          } catch (emailError) {
            console.error("❌ Erreur lors de l'envoi de l'email de bienvenue:", emailError);
            // Ne pas bloquer la création si l'email échoue, mais informer l'utilisateur
            setError("Utilisateur créé avec succès, mais l'envoi de l'email a échoué. Veuillez contacter l'utilisateur manuellement.");
          }
        } else if (sendWelcomeEmail && (!userData.password || !userData.email)) {
          console.log("⚠️ Email de bienvenue non envoyé : mot de passe ou email manquant");
        } else {
          console.log("📧 Email de bienvenue désactivé par l'administrateur");
        }
        
        return true;
      } else {
        console.error("❌ Erreur API:", responseData);
        // Gestion des erreurs détaillées
        if (responseData.details) {
          if (Array.isArray(responseData.details)) {
            // Erreurs de validation multiples
            setError(`${responseData.error}: ${responseData.details.join(', ')}`);
          } else {
            // Erreur simple avec détail
            setError(`${responseData.error}: ${responseData.details}`);
          }
        } else {
          // Erreur simple
          setError(responseData.error || `Erreur ${response.status}: ${response.statusText}`);
        }
        
        return false;
      }
    } catch (error) {
      console.error("❌ Erreur lors de la création:", error);
      setError(
        error instanceof Error ? `Erreur de connexion: ${error.message}` : "Erreur de connexion"
      );
      return false;
    }
  };

  // Fonction pour modifier un utilisateur
  const updateUser = async (userId: string, userData: Partial<User>) => {
    try {
      const response = await fetch(
        `/api/sharedServices/utilisateurs/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
        }
      );
      if (response.ok) {
        const updatedUser = await response.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? updatedUser : u))
        );
        setStats(
          calculateStats(users.map((u) => (u.id === userId ? updatedUser : u)))
        );
        setShowEditModal(false);
        setSelectedUser(null);
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Erreur ${response.status}: ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Erreur lors de la modification:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Erreur lors de la modification"
      );
      return false;
    }
  };

  // Fonction pour supprimer un utilisateur
  const deleteUser = async (userId: string) => {
    try {
      const response = await fetch(
        `/api/sharedServices/utilisateurs/${userId}`,
        {
          method: "DELETE",
        }
      );
      if (response.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setStats(calculateStats(users.filter((u) => u.id !== userId)));
        setShowDeleteModal(false);
        setSelectedUser(null);
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

  // Fonction pour récupérer le nom du site
  const fetchSiteName = async () => {
    if (!siteId) {
      setSiteName("Majoli");
      return;
    }

    try {
      const response = await fetch(`/api/sites/${siteId}`);
      if (response.ok) {
        const data = await response.json();
        setSiteName(data.name || "Majoli");
      } else {
        // Fallback si l'API ne fonctionne pas
        setSiteName(siteId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du nom du site:", error);
      // Fallback en cas d'erreur
      setSiteName(siteId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
    }
  };

  // Fonction pour envoyer un email de bienvenue avec les identifiants
  const sendWelcomeEmailWithCredentials = async (email: string, firstName: string, password: string) => {
    try {
      // Utiliser le nom du site récupéré depuis l'API
      const currentSiteName = siteName || "Majoli";
      
      const emailData = {
        to: email,
        subject: `Vos identifiants de connexion - ${currentSiteName}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Bienvenue sur ${currentSiteName} !</h2>
            
            <p>Bonjour ${firstName || "Client"},</p>
            
            <p>Votre compte a été créé avec succès sur notre plateforme. Voici vos identifiants de connexion :</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
              <p><strong>Email :</strong> ${email}</p>
              <p><strong>Mot de passe :</strong> ${password}</p>
            </div>
            
            <p><strong>Important :</strong> Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe lors de votre première connexion.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/login" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Se connecter
              </a>
            </div>
            
            <p>Si vous avez des questions ou besoin d'aide, n'hésitez pas à nous contacter.</p>
            
            <p>Cordialement,<br>L'équipe ${currentSiteName}</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              Cet email a été envoyé automatiquement. Veuillez ne pas y répondre.
            </p>
          </div>
        `,
        fromName: `Support ${currentSiteName}`,
        siteId: siteId
      };

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

      console.log("Email de bienvenue avec identifiants envoyé avec succès à:", email);
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email de bienvenue:", error);
      throw error;
    }
  };

  // Filtrer et trier les utilisateurs
  const filteredAndSortedUsers = users
    .filter((user) => {
      const matchesSearch =
        (user.firstName?.toLowerCase() || "").includes(
          searchTerm.toLowerCase()
        ) ||
        (user.lastName?.toLowerCase() || "").includes(
          searchTerm.toLowerCase()
        ) ||
        (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === "all" || user.role === filterRole;
      const matchesStatus =
        filterStatus === "all" || user.status === filterStatus;

      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "name":
          aValue = `${a.firstName || ""} ${a.lastName || ""}`;
          bValue = `${b.firstName || ""} ${b.lastName || ""}`;
          break;
        case "email":
          aValue = a.email;
          bValue = b.email;
          break;
        case "role":
          aValue = a.role;
          bValue = b.role;
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "lastLogin":
          aValue = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          bValue = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          break;
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  // Pagination
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const paginatedUsers = filteredAndSortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  // Debug: vérifier les IDs uniques
  useEffect(() => {
    const ids = paginatedUsers.map(user => user.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      console.warn("⚠️ IDs dupliqués détectés:", ids);
    }
    if (ids.some(id => !id)) {
      console.warn("⚠️ IDs manquants détectés:", paginatedUsers.filter(user => !user.id));
    }
  }, [paginatedUsers]);
  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "editor":
        return "bg-blue-100 text-blue-800";
      case "viewer":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4" />;
      case "inactive":
        return <XCircle className="h-4 w-4" />;
      case "pending":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleRefresh = () => {
    fetchUsers();
  };

  return (
    <div className="p-6" data-type="service">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Gestion des Utilisateurs
            </h2>
            <p className="text-gray-600">
              Interface de gestion pour les utilisateurs, rôles et permissions.
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Utilisateurs
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Actifs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.active}
                </p>
                <p className="text-xs text-gray-500">Comptes créés</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Administrateurs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.byRole.admin || 0}
                </p>
                <p className="text-xs text-gray-500">Accès complet</p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Utilisateurs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.byRole.user || 0}
                </p>
                <p className="text-xs text-gray-500">Accès limité</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="space-y-4">
            {/* Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
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
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Actualiser
            </button>
            <button
              onClick={() => {
                console.log("🔄 Ouverture modal création");
                // Réinitialiser le formulaire et les erreurs
                setNewUserData({
                  firstName: "",
                  lastName: "",
                  email: "",
                  phone: "",
                  role: "user",
                  password: "",
                  status: "active",
                });
                  setSendWelcomeEmail(true); // Réinitialiser l'option d'envoi d'email
                setError(""); // Important: réinitialiser l'erreur
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Nouvel Utilisateur
            </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filtres :</span>
              </div>
              
              {/* Role Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Rôle :</label>
                                 <select
                   value={filterRole}
                   onChange={(e) => setFilterRole(e.target.value)}
                   className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                 >
                   <option value="all">Tous les rôles</option>
                   <option value="admin">Administrateurs</option>
                   <option value="user">Utilisateurs</option>
                 </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Statut :</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actifs</option>
                  <option value="inactive">Inactifs</option>
                  <option value="pending">En attente</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Trier par :</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="createdAt">Date de création</option>
                  <option value="name">Nom</option>
                  <option value="email">Email</option>
                  <option value="role">Rôle</option>
                  <option value="status">Statut</option>
                  <option value="lastLogin">Dernière connexion</option>
                </select>
              </div>

              {/* Sort Order */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Ordre :</label>
                <button
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  {sortOrder === "asc" ? "Croissant" : "Décroissant"}
                </button>
              </div>

              {/* Clear Filters */}
              {(filterRole !== "all" || filterStatus !== "all" || searchTerm) && (
                <button
                  onClick={() => {
                    setFilterRole("all");
                    setFilterStatus("all");
                    setSearchTerm("");
                    setSortBy("createdAt");
                    setSortOrder("desc");
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                >
                  <XCircle className="w-4 h-4" />
                  Effacer les filtres
                </button>
              )}
            </div>

            {/* Active Filters Display */}
            {(filterRole !== "all" || filterStatus !== "all") && (
              <div className="flex flex-wrap gap-2">
                                 {filterRole !== "all" && (
                   <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                     Rôle: {filterRole === "admin" ? "Administrateurs" : "Utilisateurs"}
                     <button
                       onClick={() => setFilterRole("all")}
                       className="ml-1 hover:text-blue-600"
                     >
                       <XCircle className="w-3 h-3" />
                     </button>
                   </span>
                 )}
                {filterStatus !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    Statut: {filterStatus === "active" ? "Actifs" : filterStatus === "inactive" ? "Inactifs" : "En attente"}
                    <button
                      onClick={() => setFilterStatus("all")}
                      className="ml-1 hover:text-green-600"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Liste des Utilisateurs ({filteredAndSortedUsers.length})
              {isLoading && (
                <span className="text-sm text-gray-500 ml-2">
                  - Chargement...
                </span>
              )}
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {paginatedUsers.map((user, index) => (
              <div key={user.id || `user-${index}`} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <img
                      className="w-12 h-12 rounded-full object-cover"
                      src={
                        user.avatar ||
                        `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=random`
                      }
                      alt={`${user.firstName} ${user.lastName}`}
                    />
                  </div>

                  {/* Contenu */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(user.status)}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            user.status
                          )}`}
                        >
                          {user.status === "active" && "Actif"}
                          {user.status === "inactive" && "Inactif"}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(
                          user.role
                        )}`}
                      >
                        {user.role === "admin" && "Administrateur"}
                        {user.role === "user" && "Utilisateur"}
                      </span>
                    </div>

                    <div className="mb-2">
                      <h4 className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </h4>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      {user.phone && (
                        <p className="text-sm text-gray-500 flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {user.phone}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          Créé le {formatDate(user.createdAt)}
                        </p>
                        {user.lastLogin && (
                          <p className="text-sm text-gray-600">
                            Dernière connexion: {formatDate(user.lastLogin)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditModal(true);
                          }}
                          className="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors font-medium"
                          title="Modifier l'utilisateur"
                        >
                          <Edit className="w-4 h-4 mr-1 inline" />
                          Modifier
                        </button>
                        {user.role !== 'admin' && (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          className="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors font-medium"
                          title="Supprimer l'utilisateur"
                        >
                          <Trash2 className="w-4 h-4 mr-1 inline" />
                          Supprimer
                        </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredAndSortedUsers.length === 0 && !isLoading && (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun utilisateur trouvé
              </h3>
              <p className="text-gray-500">
                Aucun utilisateur ne correspond à vos critères de recherche.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="p-8 text-center">
              <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Chargement des utilisateurs...
              </h3>
              <p className="text-gray-500">
                Récupération des utilisateurs depuis l'API.
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
                    filteredAndSortedUsers.length
                  )}{" "}
                  sur {filteredAndSortedUsers.length} utilisateurs
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

      {/* Modal de création d'utilisateur */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Nouvel Utilisateur
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
              <form className="space-y-4 modal-create-user-form" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prénom *
                    </label>
                    <Input
                      type="text"
                      name="firstName"
                      placeholder="Prénom"
                      value={newUserData.firstName}
                      onChange={(e) =>
                        setNewUserData((prev) => ({
                          ...prev,
                          firstName: e.target.value,
                        }))
                      }
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom *
                    </label>
                    <Input
                      type="text"
                      name="lastName"
                      placeholder="Nom"
                      value={newUserData.lastName}
                      onChange={(e) =>
                        setNewUserData((prev) => ({
                          ...prev,
                          lastName: e.target.value,
                        }))
                      }
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="email@exemple.com"
                    value={newUserData.email}
                    onChange={(e) =>
                      setNewUserData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe *
                  </label>
                  <Input
                    type="password"
                    name="password"
                    placeholder="Mot de passe"
                    value={newUserData.password}
                    onChange={(e) =>
                      setNewUserData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <Input
                    type="tel"
                    name="phone"
                    placeholder="+33 1 23 45 67 89"
                    value={newUserData.phone}
                    onChange={(e) =>
                      setNewUserData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rôle *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    name="role"
                    value={newUserData.role}
                    onChange={(e) =>
                      setNewUserData((prev) => ({
                        ...prev,
                        role: e.target.value as "admin" | "user",
                      }))
                    }
                    required
                  >
                    <option value="user">Utilisateur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
                 <div className="flex items-center space-x-2">
                   <input
                     type="checkbox"
                     id="sendWelcomeEmail"
                     checked={sendWelcomeEmail}
                     onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                     className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                   />
                   <label htmlFor="sendWelcomeEmail" className="text-sm font-medium text-gray-700">
                     Envoyer un email de bienvenue avec les identifiants
                   </label>
                 </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  console.log("🔄 Fermeture modal création (annulation)");
                  setShowCreateModal(false);
                  setError(""); // Réinitialiser l'erreur
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  try {
                    setIsCreatingUser(true);
                    setError("");
                    // Récupérer les valeurs réelles des champs (gère l'autocomplétion)
                    const form = document.querySelector('.modal-create-user-form') as HTMLFormElement;
                    const formData = new FormData(form);
                    // Construire l'objet utilisateur avec les vraies valeurs
                    const actualUserData = {
                      firstName: (formData.get('firstName') as string)?.trim() || newUserData.firstName,
                      lastName: (formData.get('lastName') as string)?.trim() || newUserData.lastName,
                      email: (formData.get('email') as string)?.trim() || newUserData.email,
                      password: (formData.get('password') as string) || newUserData.password,
                      phone: (formData.get('phone') as string)?.trim() || newUserData.phone,
                      role: (formData.get('role') as "admin" | "user") || newUserData.role,
                      status: 'active' as const
                    };

                    console.log("🔍 Données récupérées:", { 
                      ...actualUserData, 
                      password: actualUserData.password ? '[MASQUÉ]' : 'VIDE',
                      sendWelcomeEmail
                    });
                    // Validation des champs requis avec les vraies valeurs
                    if (!actualUserData.firstName) {
                      setError("Le prénom est requis");
                      return;
                    }
                    if (!actualUserData.lastName) {
                      setError("Le nom est requis");
                      return;
                    }
                    if (!actualUserData.email) {
                      setError("L'email est requis");
                      return;
                    }
                    if (!actualUserData.password) {
                      setError("Le mot de passe est requis");
                      return;
                    }

                    const success = await createUser(actualUserData);
                    if (success) {
                      // Réinitialiser le formulaire
                      setNewUserData({
                        firstName: "",
                        lastName: "",
                        email: "",
                        phone: "",
                        role: "user",
                        password: "",
                        status: "active",
                      });
                      setSendWelcomeEmail(true);
                      setShowCreateModal(false);
                      setError("");
                    }
                  } catch (error) {
                    console.error("Erreur lors de la création:", error);
                    setError("Erreur inattendue lors de la création");
                  } finally {
                    setIsCreatingUser(false);
                  }
                }}
                disabled={isCreatingUser}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreatingUser ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
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

      {/* Modal de modification d'utilisateur */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Modifier l'utilisateur
              </h3>
            </div>
            <div className="px-6 py-4">
              <form className="space-y-4 modal-edit-user-form">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prénom
                    </label>
                    <Input
                      type="text"
                      name="firstName"
                      defaultValue={selectedUser.firstName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom
                    </label>
                    <Input
                      type="text"
                      name="lastName"
                      defaultValue={selectedUser.lastName}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    name="email"
                    defaultValue={selectedUser.email}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <Input
                    type="tel"
                    name="phone"
                    defaultValue={selectedUser.phone}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rôle
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    name="role"
                    defaultValue={selectedUser.role}
                  >
                    <option value="user">Utilisateur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statut
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    name="status"
                    defaultValue={selectedUser.status}
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                  </select>
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  try {
                    // Récupérer les valeurs du formulaire
                    const form = document.querySelector(
                      ".modal-edit-user-form"
                    ) as HTMLFormElement;
                    const formData = new FormData(form);
                    const updatedUser = {
                      firstName: formData.get("firstName") as string,
                      lastName: formData.get("lastName") as string,
                      email: formData.get("email") as string,
                      phone: formData.get("phone") as string,
                      role: formData.get("role") as "admin" | "user",
                      status: formData.get("status") as "active" | "inactive",
                    };
                    const success = await updateUser(
                      selectedUser.id,
                      updatedUser
                    );
                    if (success) {
                      setShowEditModal(false);
                      setSelectedUser(null);
                      fetchUsers();
                    }
                  } catch (error) {
                    setError("Erreur lors de la modification");
                  }
                }}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suppression d'utilisateur */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Supprimer l'utilisateur
              </h3>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center space-x-3 mb-4">
                <img
                  className="h-12 w-12 rounded-full object-cover"
                  src={
                    selectedUser.avatar ||
                    `https://ui-avatars.com/api/?name=${selectedUser.firstName}+${selectedUser.lastName}&background=random`
                  }
                  alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette
                action est irréversible.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  try {
                    const success = await deleteUser(selectedUser.id);
                    if (success) {
                      setShowDeleteModal(false);
                      setSelectedUser(null);
                      fetchUsers();
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
