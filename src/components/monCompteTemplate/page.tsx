"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ClientProfileTemplate from "../clientProfileTemplate/page";
import ClientInvoiceTemplate from "../clientInvoiceTemplate/page";
import ClientOrdersTemplate from "../clientOrdersTemplate/page";
import ClientCourierTemplate from "../clientCourierTemplate/page";
import ClientEntrepriseTemplate from "../clientEntrepriseTemplate/page";
import {
  Settings,
  User,
  FileText,
  Mail,
  Home,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Building,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { IPagePopulated } from "@/lib/models/types/populated";
import { IBandePopulated } from "@/lib/models/types/populated";
import { useSiteLink } from "@/hooks/use-site-link";

interface MonCompteTemplateProps {
  siteId?: string;
  userId?: string;
  monCompteTitle?: string;
  monCompteSubtitle?: string;
}

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  lastLogin: string;
}

interface PaymentMethod {
  id: string;
  type: "card" | "paypal" | "bank";
  name: string;
  maskedNumber: string;
  expiryDate?: string;
  isDefault: boolean;
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  date: string;
  dueDate: string;
  description: string;
}

interface Message {
  id: string;
  from: string;
  subject: string;
  content: string;
  date: string;
  isRead: boolean;
  priority: "low" | "medium" | "high";
}

interface CompteService {
  id: string;
  name: string;
  icon: React.ReactNode;
  isActive: boolean;
  component?: React.ReactNode;
}

export default function MonCompteTemplate({
  siteId,
  userId,
  monCompteTitle = "Mon Compte",
  monCompteSubtitle = "Gestion de votre compte",
}: MonCompteTemplateProps) {
  const { transformLink } = useSiteLink();
  const [activeService, setActiveService] = useState<string | null>(null);
  const [activeServices, setActiveServices] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  // Fonction de déconnexion
  const handleLogout = async () => {
    try {
      // Déconnexion via l'API
      await fetch("/api/sharedServices/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    window.location.href = transformLink("/");
  };

  // Fonction de retour vers la page d'accueil
  const handleGoHome = () => {
    window.location.href = transformLink("/");
  };

  // États pour détecter les services actifs
  const [hasInvoiceComponents, setHasInvoiceComponents] = useState(false);
  const [hasDomiciliationComponents, setHasDomiciliationComponents] =
    useState(false);
  const [hasEcommerceComponents, setHasEcommerceComponents] = useState(false);
  const [hasEntrepriseForm, setHasEntrepriseForm] = useState(false);
  // États pour les données utilisateur
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  // Services du compte utilisateur
  const compteServices: CompteService[] = [
    {
      id: "profile",
      name: "Mon Profil",
      icon: <User className="w-5 h-5" />,
      isActive: true, // Toujours actif
    },
    {
      id: "entreprise",
      name: "Mon Entreprise",
      icon: <Building className="w-5 h-5" />,
      isActive: true, // Toujours actif si l'utilisateur a un formulaire de domiciliation
    },
    {
      id: "invoices",
      name: "Mes Factures",
      icon: <FileText className="w-5 h-5" />,
      isActive: false,
    },
    {
      id: "orders",
      name: "Mes Commandes",
      icon: <Settings className="w-5 h-5" />,
      isActive: false,
    },
    {
      id: "courrier",
      name: "Mon Courrier",
      icon: <Mail className="w-5 h-5" />,
      isActive: true,
    },
  ];

  // Fonction pour détecter les services actifs
  const detectActiveServices = async () => {
    if (!siteId) return;
    let response;
    try {
      if (process.env.NODE_ENV === "development") {
        response = await fetch(`/api${transformLink("/pages")}`);
      } else {
        response = await fetch("/api/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId: siteId }),
        });
      }
      if (!response.ok) {
        console.error("Erreur lors du chargement des pages");
        return;
      }

      const data = await response.json();
      const pages = (data.pages || []) as IPagePopulated[];

      const detectedServices = new Set<string>();
      let hasInvoice = false;
      // Par défaut, on ne suppose plus qu'il y a de la domiciliation :
      // elle est activée uniquement si des bandes "domiciliation" sont détectées.
      let hasDomiciliation = false;
      let hasEcommerce = false;

      // Parcourir toutes les pages et leurs composants
      pages.forEach((page: IPagePopulated) => {
        if (page.bandes && Array.isArray(page.bandes)) {
          page.bandes.forEach((bande: IBandePopulated) => {
            // Détecter les composants avec service "pricing" pour les factures
            if (bande.abstractBandeId?.service === "pricing") {
              hasInvoice = true;
              detectedServices.add("invoices");
            }

            // Détecter les composants e‑commerce
            if (
              bande.abstractBandeId?.service === "ecommerce" ||
              (bande.abstractBandeId?.service &&
                bande.abstractBandeId.service
                  .toLowerCase()
                  .includes("ecommerce")) ||
              (bande.abstractBandeId?.originalId &&
                bande.abstractBandeId.originalId
                  .toLowerCase()
                  .includes("ecommerce")) ||
              bande.abstractBandeId?.originalId === "products-list" ||
              bande.abstractBandeId?.originalId === "categories-list"
            ) {
              hasEcommerce = true;
              // Un site e‑commerce dispose toujours au minimum de factures
              hasInvoice = true;
              detectedServices.add("invoices");
              detectedServices.add("orders");
            }

            // Détecter les composants avec service "domiciliation" pour le courrier
            if (bande.abstractBandeId?.service === "domiciliation") {
              hasDomiciliation = true;
              detectedServices.add("courrier");
            }
          });
        }
      });
      setActiveServices(detectedServices);
      setHasInvoiceComponents(hasInvoice);
      // Si le site est e‑commerce, on désactive par défaut l'affichage
      // des blocs purement "domiciliation" dans l'espace client.
      setHasDomiciliationComponents(hasEcommerce ? false : hasDomiciliation);
      setHasEcommerceComponents(hasEcommerce);
    } catch (error) {
      console.error("Erreur lors de la détection des services:", error);
    }
  };

  // Vérifier l'authentification de l'utilisateur
  const checkAuthentication = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/sharedServices/auth/me", {
        credentials: "include",
      });
      if (response.ok) {
        setIsAuthenticated(true);
        if (userId) {
          loadUserData();
        }
      } else if (response.status === 401) {
        setIsAuthenticated(false);
        // Rediriger vers la page de connexion avec le siteId
        const currentUrl = window.location.href;
        const loginUrl = currentUrl.replace("/espace-client", "/login");
        window.location.href = loginUrl;
      } else {
        setIsAuthenticated(false);
        console.log(
          "Erreur lors de la vérification de l'authentification:",
          response.status,
          response.statusText
        );
        setError("Erreur lors de la vérification de l'authentification");
      }
    } catch (error) {
      console.error(
        "Erreur lors de la vérification de l'authentification:",
        error
      );
      setIsAuthenticated(false);
      setError("Erreur de connexion au serveur");
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les données utilisateur
  const loadUserData = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      // Vérifier si l'utilisateur a un formulaire de domiciliation
      const response = await fetch("/api/sharedServices/auth/me", {
        credentials: "include",
      });
      if (response.ok) {
        const userData = await response.json();
        // Charger le formulaire de domiciliation pour vérifier s'il existe
        const formResponse = await fetch(
          `/api/formulaires?email=${encodeURIComponent(userData.email)}&limit=1&sort=createdAt:desc`,
          {
            credentials: "include",
          }
        );
        if (formResponse.ok) {
          const formData = await formResponse.json();
          setHasEntrepriseForm(
            formData.formulaires && formData.formulaires.length > 0
          );
        }
      }

      console.log("Chargement des données utilisateur pour:", userId);
    } catch (error) {
      setError("Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les services actifs au montage du composant et périodiquement
  useEffect(() => {
    checkAuthentication()
      .then(() => {
        loadUserData();
      })
      .then(() => {
        detectActiveServices();
      });
  }, [siteId, userId]);
  const handleServiceClick = (serviceId: string) => {
    setActiveService(activeService === serviceId ? null : serviceId);
  };

  // Mettre à jour l'état actif des services
  const updatedCompteServices = compteServices.map((service) => {
    // Logique "générique" par défaut (service paiement définitivement supprimé)
    let isActive =
      service.id === "profile"
        ? true
        : service.id === "entreprise"
          ? hasDomiciliationComponents
          : service.id === "invoices"
            ? hasInvoiceComponents
            : service.id === "orders"
              ? hasEcommerceComponents
              : service.id === "courrier"
                ? hasDomiciliationComponents
                : activeServices.has(service.id);
    // En contexte e‑commerce :
    // - on force "Mes Commandes" à être disponible,
    // - on force "Mes Factures" à rester non disponible pour que seuls
    //   Profil + Commandes soient vraiment utilisables.
    if (hasEcommerceComponents) {
      if (service.id === "orders") {
        isActive = true;
      }
      if (service.id === "invoices") {
        isActive = false;
      }
    }

    return {
      ...service,
      isActive,
    };
  });
  // Rendu du contenu selon le service actif
  const renderServiceContent = () => {
    if (activeService === "profile") {
      return <ClientProfileTemplate siteId={siteId} userId={userId} />;
    }

    if (activeService === "entreprise" && hasDomiciliationComponents) {
      return <ClientEntrepriseTemplate siteId={siteId} userId={userId} />;
    }

    if (activeService === "invoices" && hasInvoiceComponents) {
      return <ClientInvoiceTemplate siteId={siteId} userId={userId} />;
    }

    if (activeService === "orders" && hasEcommerceComponents) {
      return <ClientOrdersTemplate siteId={siteId} />;
    }

    if (activeService === "courrier" && hasDomiciliationComponents) {
      return <ClientCourierTemplate siteId={siteId} userId={userId} />;
    }

    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {updatedCompteServices.find((s) => s.id === activeService)?.name}
          </h2>
          <p className="text-gray-600">
            Interface de gestion pour{" "}
            {updatedCompteServices
              .find((s) => s.id === activeService)
              ?.name.toLowerCase()}
            .
          </p>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">
              Le composant de gestion pour ce service sera intégré ici.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Afficher un message de chargement si l'authentification est en cours
  if (isLoading && !isAuthenticated) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - toujours ouverte */}
      <div className="w-64 bg-white border-r border-gray-200 shadow-lg flex-shrink-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1
                  className="text-lg font-semibold text-gray-900"
                  data-editable="true"
                  data-id="mon-compte-title"
                >
                  {monCompteTitle}
                </h1>
                <p
                  className="text-sm text-gray-500"
                  data-editable="true"
                  data-id="mon-compte-subtitle"
                >
                  {monCompteSubtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 p-4">
            <nav className="space-y-2">
              {/* Accueil */}
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 ${
                  activeService === null
                    ? "bg-gray-900 text-white hover:bg-gray-900 hover:text-white"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
                onClick={() => setActiveService(null)}
              >
                <Home className="w-5 h-5" />
                <span>Tableau de bord</span>
              </Button>

              {/* Services */}
              <div className="pt-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                  Mon Compte
                </h3>
                {updatedCompteServices.map((service) => (
                  <div key={service.id}>
                    {service.isActive && (
                      <Button
                        variant="ghost"
                        className={`w-full justify-start gap-3 mb-1 ${
                          activeService === service.id
                            ? "bg-gray-900 text-white hover:bg-gray-900 hover:text-white"
                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                        onClick={() => handleServiceClick(service.id)}
                        disabled={!service.isActive}
                      >
                        {service.icon}
                        <span className="flex-1 text-left">{service.name}</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </nav>
          </ScrollArea>

          {/* Footer avec boutons de navigation */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="space-y-1">
              {/* Bouton retour vers la page d'accueil */}
              <Button
                variant="ghost"
                size="sm"
                className="w-11/12 justify-start gap-2 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                onClick={handleGoHome}
              >
                <ExternalLink className="w-4 h-4" />
                <span className="flex-1 text-left">Retour au site</span>
              </Button>

              {/* Bouton de déconnexion */}
              <Button
                variant="ghost"
                size="sm"
                className="w-11/12 justify-start gap-2 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                <span className="flex-1 text-left">Déconnexion</span>
              </Button>

              <div className="text-xs text-gray-500 text-center pt-2">
                Majoli Hub - Mon Compte
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1">
        {/* Messages d'erreur et de succès */}
        {error && (
          <div className="m-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="m-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-green-800">{success}</span>
            </div>
          </div>
        )}

        {/* Zone de contenu */}
        <div className="h-full overflow-auto bg-gray-50">
          {activeService ? (
            renderServiceContent()
          ) : (
            <div className="p-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Tableau de bord
                </h2>
                <p className="text-gray-600 mb-6">
                  Bienvenue dans votre espace personnel. Gérez vos informations,
                  paiements et communications.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {updatedCompteServices.map((service) => (
                    <div
                      key={service.id}
                      className={`${service.isActive ? "block" : "hidden"}`}
                    >
                      {service.isActive && (
                        <div
                          key={service.id}
                          className="pointer p-4 rounded-lg border-2 border-dashed transition-colors cursor-pointer border-green-300 bg-green-50 hover:bg-green-100 hover:border-green-400"
                          onClick={() => handleServiceClick(service.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                service.isActive
                                  ? "bg-green-200"
                                  : "bg-gray-100"
                              }`}
                            >
                              {service.icon}
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">
                                {service.name}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {service.isActive ? "Actif" : "Non configuré"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
