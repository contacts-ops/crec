"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Save,
  RefreshCw,
  Camera,
  Shield,
  CheckCircle,
  AlertCircle,
  LogIn,
  Building,
  MapPin,
  FileText,
  Clock,
  Eye,
  EyeOff
} from "lucide-react";

interface ClientProfileTemplateProps {
  siteId?: string;
  userId?: string;
}

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: 'active' | 'inactive';
  role: 'admin' | 'user';
  siteId: string;
  lastLogin?: string;
  permissions: string[];
}

interface DomiciliationForm {
  id: string;
  companyName: string;
  directorName: string;
  directorFirstName: string;
  email: string;
  phone: string;
  street: string;
  suite?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  selectedAbonnementPrix?: number;
  abonnementType?: string;
}

interface InvoiceStats {
  total: number;
  totalAmount: number;
  paid: number;
  pending: number;
  overdue: number;
}

export default function ClientProfileTemplate({
  siteId,
  userId
}: ClientProfileTemplateProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);
  const [domiciliationForm, setDomiciliationForm] = useState<DomiciliationForm | null>(null);
  const [invoiceStats, setInvoiceStats] = useState<InvoiceStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  // Charger les données du profil utilisateur connecté
  const loadProfile = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/sharedServices/auth/me", {
        credentials: "include"
      });
      if (response.ok) {
        const userData = await response.json();
        setProfile(userData);
        setLocalProfile(userData);
        setIsAuthenticated(true);
        // Charger les statistiques des factures pour vérifier les impayés
        await loadInvoiceStats();
        // Charger le dernier formulaire de domiciliation
        await loadDomiciliationForm(userData.email);
      } else if (response.status === 401) {
        // Utilisateur non connecté en tant qu'Utilisateur
        setIsAuthenticated(false);
        setProfile(null);
        setLocalProfile(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors du chargement du profil");
      }
    } catch (error) {
      console.error("Erreur lors du chargement du profil:", error);
      setError(error instanceof Error ? error.message : "Erreur lors du chargement du profil");
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger le dernier formulaire de domiciliation
  const loadDomiciliationForm = async (userEmail: string) => {
    try {
      const response = await fetch(`/api/formulaires?email=${encodeURIComponent(userEmail)}&limit=1&sort=createdAt:desc`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        if (data.formulaires && data.formulaires.length > 0) {
          setDomiciliationForm(data.formulaires[0]);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement du formulaire de domiciliation:", error);
    }
  };

  // Charger les statistiques des factures
  const loadInvoiceStats = async () => {
    try {
      const response = await fetch("/api/sharedServices/invoices", {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setInvoiceStats(data.stats || null);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques des factures:", error);
    }
  };

  // Gérer les changements de champs
  const handleInputChange = (field: string, value: any) => {
    if (!localProfile) return;
    
    console.log(`🔄 Modification champ ${field}:`, value);
    const updatedProfile = {
      ...localProfile,
      [field]: value
    };
    
    setLocalProfile(updatedProfile);
  };

  // Sauvegarder les modifications
  const handleSave = async () => {
    if (!localProfile?.id) return;

    // Validation des mots de passe si modification
    if (passwordForm.newPassword && passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Les nouveaux mots de passe ne correspondent pas");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const updateData: any = {
        firstName: localProfile.firstName,
        lastName: localProfile.lastName,
        email: localProfile.email,
        phone: localProfile.phone
      };

      // Ajouter les mots de passe seulement s'ils sont fournis
      if (passwordForm.currentPassword && passwordForm.newPassword) {
        updateData.currentPassword = passwordForm.currentPassword;
        updateData.newPassword = passwordForm.newPassword;
      }

      const response = await fetch(`/api/sharedServices/utilisateurs/${localProfile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      if (response.ok) {
        const updatedUser = await response.json();
        setProfile(updatedUser);
        setLocalProfile(updatedUser);
        setSuccess("Profil mis à jour avec succès");
        // Réinitialiser les champs de mot de passe
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      setError(error instanceof Error ? error.message : "Erreur lors de la mise à jour");
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    // Recharger les données
    window.location.reload();
  };

  useEffect(() => {
    loadProfile();
  }, []);
  if (isLoading && !localProfile) {
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
            Vous devez être connecté en tant qu'utilisateur du site pour accéder à votre profil.
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

  if (!localProfile) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Profil non trouvé</h3>
          <p className="text-gray-500">Impossible de charger les informations du profil</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-type="service">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Mon Profil
            </h2>
            <p className="text-gray-600">
              Gérez vos informations personnelles et paramètres de compte.
            </p>
            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">
                  <AlertCircle className="inline w-4 h-4 mr-1" />
                  <strong>Erreur :</strong> {error}
                </p>
              </div>
            )}
            {success && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">
                  <CheckCircle className="inline w-4 h-4 mr-1" />
                  <strong>Succès :</strong> {success}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Sauvegarder
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Statut du compte</p>
                <p className="text-2xl font-bold text-gray-900">
                  {invoiceStats?.overdue && invoiceStats.overdue > 0 ? 'Impayé' : (localProfile?.status === 'active' ? 'Actif' : 'Inactif')}
                </p>
                {invoiceStats?.overdue && invoiceStats.overdue > 0 && (
                  <p className="text-sm text-red-600 font-medium">
                    {invoiceStats.overdue} facture(s) en retard
                  </p>
                )}
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                invoiceStats?.overdue && invoiceStats.overdue > 0 ? 'bg-red-100' : 'bg-blue-100'
              }`}>
                {invoiceStats?.overdue && invoiceStats.overdue > 0 ? (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <User className="w-5 h-5 text-blue-600" />
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rôle</p>
                <p className="text-2xl font-bold text-gray-900">
                  {localProfile?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Dernière connexion</p>
                <p className="text-lg font-bold text-gray-900">
                  {localProfile?.lastLogin ? new Date(localProfile.lastLogin).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Jamais connecté'}
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="space-y-6">
          {/* Informations personnelles */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Informations personnelles
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  value={localProfile.firstName || ""}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="Votre prénom"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  value={localProfile.lastName || ""}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Votre nom"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={localProfile.email || ""}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="votre@email.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={localProfile.phone || ""}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+33 1 23 45 67 89"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Changement de mot de passe */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Changer le mot de passe
            </h3>
            <p className="text-sm text-gray-600 mb-4">Laissez vide si vous ne souhaitez pas changer votre mot de passe</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <div className="relative mt-1">
                  <Input
                    id="currentPassword"
                    type={showPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    placeholder="Mot de passe actuel"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  placeholder="Nouveau mot de passe"
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  placeholder="Confirmer le nouveau mot de passe"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section Domiciliation */}
        {domiciliationForm && (
          <>
            <Separator className="my-8" />
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Building className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Dernier formulaire de domiciliation</h3>
                <Badge variant={domiciliationForm.status === 'approved' ? 'default' : 'secondary'}>
                  {domiciliationForm.status === 'approved' ? 'Approuvé' : 'En attente'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Informations de l'entreprise */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Entreprise
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-500">Nom de l'entreprise</Label>
                      <p className="text-sm font-medium">{domiciliationForm.companyName}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Dirigeant</Label>
                      <p className="text-sm font-medium">{domiciliationForm.directorFirstName} {domiciliationForm.directorName}</p>
                    </div>
                    {domiciliationForm.selectedAbonnementPrix && (
                      <div>
                        <Label className="text-xs text-gray-500">Abonnement</Label>
                        <p className="text-sm font-medium">{domiciliationForm.selectedAbonnementPrix}€ / {domiciliationForm.abonnementType}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Contact
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-500">Email</Label>
                      <p className="text-sm font-medium">{domiciliationForm.email}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Téléphone</Label>
                      <p className="text-sm font-medium">{domiciliationForm.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Adresse */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Adresse
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-500">Adresse complète</Label>
                      <p className="text-sm font-medium">
                        {domiciliationForm.street}
                        {domiciliationForm.suite && `, ${domiciliationForm.suite}`}
                        <br />
                        {domiciliationForm.postalCode} {domiciliationForm.city}
                        <br />
                        {domiciliationForm.state}, {domiciliationForm.country}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informations de date */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Créé le {new Date(domiciliationForm.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>ID: {domiciliationForm.id}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 