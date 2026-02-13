"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Settings,
  Mail,
  MessageSquare,
  Star,
  Users,
  BarChart3,
  Home,
  CreditCard,
  BookOpen,
  Calendar,
  Building,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  LogOut,
  ExternalLink,
  Image,
  Grid,
  Package,
  ShoppingCart,
  Phone,
} from "lucide-react";
import AdminAvisTemplate from "../adminAvisTemplate/page";
import AdminPaiementTemplate from "../adminPaiementTemplate/page";
import AdminBlogTemplate from "../adminBlogTemplate/page";
import AdminNewsTemplate from "../adminNewsTemplate/page";
import AdminContactTemplate from "../adminContactTemplate/page";
import AdminRdvTemplate from "../adminRdvTemplate/page";
import AdminUsersTemplate from "../adminUsersTemplate/page";
import AdminAnalyticsTemplate from "../adminAnalyticsTemplate/page";
import AdminMediaTemplate from "../adminMediaTemplate/page";
import AdminEntrepriseTemplate from "../adminEntrepriseTemplate/page";
import AdminAbonnementTemplate from "../adminAbonnementTemplate/page";
import AdminShowcase from "../adminShowcase/page";
import AdminCourrierTemplate from "../adminCourrierTemplate/page";
import AdminEcommerceTemplate from "../adminEcommerceTemplate/page" // Test ecommerce
//import AdminPhoneTemplate from "../adminPhoneTemplate/page";


import FormulairesAdmin from "../admin-formulaires/page";
import { useSiteLink } from "@/hooks/use-site-link";
import { IPagePopulated } from "@/lib/models/types/populated";
import { IBandePopulated } from "@/lib/models/types/populated";

interface AdminTemplateProps {
  siteId?: string;
  adminTitle?: string;
  adminSubtitle?: string;
}

interface Component {
  id: string;
  originalId?: string;
  name: string;
  type: string;
  service?: string;
  thumbnail: string;
  isImported: boolean;
  props: Record<string, unknown>;
}

interface AdminService {
  id: string;
  name: string;
  icon: React.ReactNode;
  isActive: boolean;
  component?: React.ReactNode;
}

export default function AdminTemplate({
  siteId,
  adminTitle = "Administration",
  adminSubtitle = "Gestion du site",
}: AdminTemplateProps) {
  const [activeService, setActiveService] = useState<string | null>(null);
  const [activeServices, setActiveServices] = useState<Set<string>>(new Set());
  const [hasAvisComponents, setHasAvisComponents] = useState(false);
  const [hasPaiementComponents, setHasPaiementComponents] = useState(false);
  const [hasBlogComponents, setHasBlogComponents] = useState(false);
  const [hasNewsComponents, setHasNewsComponents] = useState(false);
  const [hasContactComponents, setHasContactComponents] = useState(false);
  const [hasRdvComponents, setHasRdvComponents] = useState(false);
  const [hasEcommerceComponents, setHasEcommerceComponents] = useState(false)

  const [hasMediaComponents, setHasMediaComponents] = useState(false);
  const [hasPhotothequeComponents, setHasPhotothequeComponents] = useState(false);
  const [hasAnalyticsComponents, setHasAnalyticsComponents] = useState(false);
  const [hasDomiciliationService, setHasDomiciliationService] = useState(false);
  const [hasShowcaseComponents, setHasShowcaseComponents] = useState(false);
  const [hasPhoneComponents, setHasPhoneComponents] = useState(false);
  const [domiciliationSubMenuOpen, setDomiciliationSubMenuOpen] = useState(false);
  const [paiementSubMenuOpen, setPaiementSubMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const {transformLink} = useSiteLink();
  // À l'ouverture, on peut forcer un service particulier via l'URL,
  // par exemple /admin?service=ecommerce pour ouvrir directement l'onglet e‑commerce.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const serviceFromUrl = params.get("service");
    if (!serviceFromUrl) return;

    // Si on demande explicitement l'e‑commerce, on attend que la détection
    // des composants ait confirmé sa présence (hasEcommerceComponents).
    if (serviceFromUrl === "ecommerce") {
      if (hasEcommerceComponents) {
        setActiveService("ecommerce");
      }
      // Si le service n'est pas encore détecté, on laisse la détection
      // ultérieure éventuellement ajuster l'UI, sans forcer l'état.
      return;
    }

    // Pour les autres services, on applique directement la valeur.
    setActiveService(serviceFromUrl);
  }, [hasEcommerceComponents]);
  // Fonction de déconnexion
  const handleLogout = async () => {
    try {
      // Déconnexion via l'API
      await fetch("/api/sharedServices/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      // Supprimer les données d'authentification du localStorage
      localStorage.removeItem("authToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userId");
      // Rediriger vers la page d'accueil du site
      window.location.href = transformLink("/");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      // En cas d'erreur, forcer la déconnexion côté client
      localStorage.removeItem("authToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userId");
      window.location.href = transformLink("/");
    }
  };


  // Fonction de retour vers la page d'accueil
  const handleGoHome = () => {
    window.location.href = transformLink("/");
  };

  // Services admin disponibles
  const adminServices: AdminService[] = [
    {
      id: "newsletter",
      name: "Newsletter",
      icon: <Mail className="w-5 h-5" />,
      isActive: false,
    },
    {
      id: "avis",
      name: "Avis Clients",
      icon: <Star className="w-5 h-5" />,
      isActive: false,
    },
    {
      id: "contact",
      name: "Messages Contact",
      icon: <MessageSquare className="w-5 h-5" />,
      isActive: false,
    },
    {
      id: "users",
      name: "Utilisateurs",
      icon: <Users className="w-5 h-5" />,
      isActive: true,
    },
    {
      id: "analytics",
      name: "Analytics",
      icon: <BarChart3 className="w-5 h-5" />,
      isActive: true,
    },
    {
      id: "phototheque",
      name: "Médiathèque",
      icon: <Image className="w-5 h-5" />,
      isActive: false,
    },
    {
      id: "domiciliation",
      name: "Domiciliation",
      icon: <Building className="w-5 h-5" />,
      isActive: false,
    },
    {
      id: "pricing",
      name: "Paiement",
      icon: <CreditCard className="w-5 h-5" />,
      isActive: false,
    },
    {
      id: "blog",
      name: "Blog",
      icon: <BookOpen className="w-5 h-5" />,
      isActive: false,
    },

    {
      id: "rdv",
      name: "Prise de RDV",
      icon: <Calendar className="w-5 h-5" />,
      isActive: false,
    },
    {
      id: "showcase",
      name: "Produits",
      icon: <Package className="w-5 h-5" />,
      isActive: false,
    },
    {
      id: "ecommerce",
      name: "E-commerce",
      icon: <ShoppingCart className="w-5 h-5" />,
      isActive: false,
    },
    {
      id: "phone",
      name: "Numéros (conseil)",
      icon: <Phone className="w-5 h-5" />,
      isActive: false,
    },
  ];

  // Fonction pour détecter les services actifs
  const detectActiveServices = async () => {
    if (!siteId) {
      // Mode démo : activer tous les services par défaut
      console.log("🔄 Mode démo : activation des services par défaut");
      setHasAvisComponents(true);
      setHasPaiementComponents(true);
      setHasBlogComponents(true);
      setHasNewsComponents(true);
      setHasContactComponents(true);
      setHasRdvComponents(true);
      setHasPhotothequeComponents(true);
      setHasAnalyticsComponents(true);
      setHasDomiciliationService(true);
      setHasShowcaseComponents(true);
      setHasPhoneComponents(true);
      console.log("✅ Tous les services activés en mode démo, y compris domiciliation");
      return;
    }

    try {
      const response = await fetch(`/api/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ siteId: siteId }),
        credentials: 'include'
      });
      if (!response.ok) {
        console.error("Erreur lors du chargement des pages:", response.status, response.statusText);
        if (response.status === 401) {
          // Non authentifié: rediriger vers login du site courant
          const currentUrl = window.location.href;
          const loginUrl = currentUrl.replace('/admin', '/login');
          window.location.href = loginUrl;
        }
        return;
      }
       
      const data = await response.json();
      const pages = data.pages || [] as IPagePopulated[];
      console.log("Pages #######################:", pages);
      const detectedServices = new Set<string>();
      let hasAvis = false;
      let hasPaiement = false;
      let hasBlog = false;
      let hasNews = false;
      let hasContact = false;
      let hasRdv = false;
      let hasEcommerce = false;

      let hasAnalytics = false;
      let hasPhototheque = false;
      let hasDomiciliation = false;
      let hasShowcase = false;
      let hasPhone = false;
      // Parcourir toutes les pages et leurs composants
      pages.forEach((page: IPagePopulated) => {
        if (page.bandes && Array.isArray(page.bandes)) {
          page.bandes.forEach((bande: IBandePopulated) => {
            // Détecter les composants avis
            if (
              bande.service === "avis" ||
              (bande.abstractBandeId?.service && bande.abstractBandeId.service.includes("avis")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.includes("avis")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.toLowerCase().includes("avis")) ||
              bande.abstractBandeId?.originalId === "avis-delcourt" ||
              bande.abstractBandeId?.originalId === "delevouy"
            ) {
              hasAvis = true;
              detectedServices.add("avis");
            }

            // Détecter les composants paiement
            if (
              bande.service === "pricing" ||
              (bande.abstractBandeId?.service && bande.abstractBandeId.service.includes("paiement")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.includes("paiement")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.toLowerCase().includes("paiement")) ||
              bande.abstractBandeId?.originalId === "paiement-dom"
            ) {
              hasPaiement = true;
              detectedServices.add("pricing");
              console.log("Composant paiement détecté");
            }

            // Détecter les composants blog
            if (
              bande.service === "blog" ||
              (bande.abstractBandeId?.service && bande.abstractBandeId.service.includes("blog")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.includes("blog")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.toLowerCase().includes("blog")) ||
              bande.abstractBandeId?.originalId === "blog-hero" ||
              bande.abstractBandeId?.originalId === "last-articles" ||
              bande.abstractBandeId?.originalId === "most-read-articles"
            ) {
              hasBlog = true;
              detectedServices.add("blog");
              console.log("Composant blog détecté");
            }

            // Détecter les composants newsletter
            if (
              bande.service === "newsletter" ||
              (bande.abstractBandeId?.service && bande.abstractBandeId.service.includes("newsletter")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.includes("newsletter")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.toLowerCase().includes("newsletter")) ||
              bande.abstractBandeId?.originalId === "newsletter-dom" ||
              bande.abstractBandeId?.originalId === "footer-cuisine"
            ) {
              hasNews = true;
              detectedServices.add("newsletter");
              console.log("Composant newsletter détecté");
            }

            console.log(bande.abstractBandeId?.service);
            // Détection contact (stricte)
            if (
              bande.service === "contact" ||
              (bande.abstractBandeId?.service && bande.abstractBandeId.service.includes("contact")) ||
              bande.abstractBandeId?.originalId === "contact-form" ||
              bande.abstractBandeId?.originalId === "contact-cuisine" ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.toLowerCase().includes("contact-cuisine"))
            ) {
              hasContact = true;
              detectedServices.add("contact");
              console.log("Composant contact (strict) détecté");
            }

            // Détecter les composants rdv
            if (
              bande.service === "rdv" ||
              (bande.abstractBandeId?.service && bande.abstractBandeId.service.includes("rdv")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.includes("rdv")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.toLowerCase().includes("rdv")) ||
              bande.abstractBandeId?.originalId === "rdv-calendar"
            ) {
              hasRdv = true;
              detectedServices.add("rdv");
              console.log("Composant rdv détecté");
            }
            
            // detect ecommerce
            if (
              bande.service === "ecommerce" ||
              (bande.abstractBandeId?.service && bande.abstractBandeId.service.includes("ecommerce")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.includes("ecommerce")) ||
              (bande.abstractBandeId?.originalId &&
                bande.abstractBandeId.originalId.toLowerCase().includes("ecommerce")) ||
              bande.abstractBandeId?.originalId === "products-list" ||
              bande.abstractBandeId?.originalId === "categories-list"
            ) {
              hasEcommerce = true
              detectedServices.add("ecommerce")
              console.log("Composant e-commerce détecté")
            }

            // Détecter les services "domiciliation"
            if (
              bande.service === "domiciliation" ||
              (bande.abstractBandeId?.service && bande.abstractBandeId.service.includes("domiciliation")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.includes("domiciliation")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.toLowerCase().includes("domiciliation")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.includes("dom-")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.toLowerCase().includes("dom-")) ||
              bande.abstractBandeId?.originalId === "dom-entreprise" ||
              bande.abstractBandeId?.originalId === "dom-price" ||
              bande.abstractBandeId?.originalId === "paiement-dom" ||
              bande.abstractBandeId?.originalId === "newsletter-dom" ||
              bande.abstractBandeId?.originalId === "form-dom" ||
              bande.abstractBandeId?.originalId === "footer-dom" ||
              bande.abstractBandeId?.originalId === "hero-dom" ||
              bande.abstractBandeId?.originalId === "espace-ensemble-dom" ||
              bande.abstractBandeId?.originalId === "espace-propice-dom" ||
              bande.abstractBandeId?.originalId === "evenement-dom" ||
              bande.abstractBandeId?.originalId === "rejoignez-dom" ||
              bande.abstractBandeId?.originalId === "reservation-dom"
            ) {
              hasDomiciliation = true;
              detectedServices.add("domiciliation");
            }

            // Détecter les autres services
            if (bande.service) {
              detectedServices.add(bande.service);
            }

            // Détecter les composants users
            if (
              bande.service === "users" ||
              (bande.abstractBandeId?.service && bande.abstractBandeId.service.includes("users")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.includes("users")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.toLowerCase().includes("users"))
            ) {
              detectedServices.add("users");
            }

            // Détection médiathèque (stricte)
            if (
              bande.service === "phototheque" ||
              (bande.abstractBandeId?.service && bande.abstractBandeId.service.includes("phototheque")) ||
              bande.abstractBandeId?.originalId === "phototheque" ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.toLowerCase().includes("phototheque")) ||
              bande.abstractBandeId?.originalId === "mediatheque" ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.toLowerCase().includes("mediatheque"))
            ) {
              hasPhototheque = true;
              detectedServices.add("phototheque");
            }

            // Détecter les composants showcase
            if (
              bande.service === "showcase" ||
              (bande.abstractBandeId?.service && bande.abstractBandeId.service.includes("showcase")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.includes("showcase")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.toLowerCase().includes("showcase"))
            ) {
              hasShowcase = true;
              detectedServices.add("showcase");
            }

            // detect phone
            if (
              bande.service === "phone" ||
              (bande.abstractBandeId?.service && bande.abstractBandeId.service.includes("phone")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.includes("phone")) ||
              (bande.abstractBandeId?.originalId && bande.abstractBandeId.originalId.toLowerCase().includes("phone"))
            ) {
              hasPhone = true;
              detectedServices.add("phone");
              console.log("Composant phone détecté");
            }
          });
        }
      });
      setActiveServices(detectedServices);
      setHasAvisComponents(hasAvis);
      setHasPaiementComponents(hasPaiement);
      setHasBlogComponents(hasBlog);
      setHasNewsComponents(hasNews);
      setHasContactComponents(hasContact);
      setHasRdvComponents(hasRdv);
      setHasEcommerceComponents(hasEcommerce)
      setHasPhoneComponents(hasPhone);
      setHasMediaComponents(hasPhototheque);
      setHasAnalyticsComponents(hasAnalytics);
      setHasPhotothequeComponents(hasPhototheque);
      setHasDomiciliationService(hasDomiciliation);
      setHasShowcaseComponents(hasShowcase);
    } catch (error) {
      console.error("Erreur lors de la détection des services:", error);
    }
  };

  // Vérifier l'authentification de l'utilisateur et le rôle admin
  const checkAuthentication = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/sharedServices/auth/me", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        if (data?.role === "admin") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          setError("Accès réservé aux administrateurs");
          // Rediriger vers l'espace client si l'utilisateur n'est pas admin
          const currentUrl = window.location.href;
          const espaceClientUrl = currentUrl.replace(
            "/admin",
            "/espace-client"
          );
          window.location.href = espaceClientUrl;
          return;
        }
      } else if (response.status === 401) {
        setIsAuthenticated(false);
        // Rediriger vers la page de connexion avec le siteId
        const currentUrl = window.location.href;
        const loginUrl = currentUrl.replace("/admin", "/login");
        window.location.href = loginUrl;
      } else {
        setIsAuthenticated(false);
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

  // Charger les services actifs au montage du composant
  useEffect(() => {
    checkAuthentication();
    detectActiveServices();
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        detectActiveServices();
      }
    };

    const handleStorageChange = () => {
      detectActiveServices();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [siteId]);
  const handleServiceClick = (serviceId: string) => {
    if (serviceId === "domiciliation") {
      setDomiciliationSubMenuOpen(!domiciliationSubMenuOpen);
      // Si on ouvre le sous-menu et qu'aucune sous-catégorie n'est sélectionnée, sélectionner automatiquement la première
      if (!domiciliationSubMenuOpen && !activeService?.startsWith("domiciliation-")) {
        setActiveService("domiciliation-clients"); // Sélectionner automatiquement la première sous-catégorie
      }
    } else if (serviceId === "pricing") {
      setPaiementSubMenuOpen(!paiementSubMenuOpen);
      // Si on ouvre le sous-menu et qu'aucune sous-catégorie n'est sélectionnée, sélectionner automatiquement la première
      if (!paiementSubMenuOpen && !activeService?.startsWith("pricing-")) {
        setActiveService("pricing-all"); // Sélectionner automatiquement la première sous-catégorie
      }
    } else {
      setActiveService(activeService === serviceId ? null : serviceId);
      setDomiciliationSubMenuOpen(false);
      setPaiementSubMenuOpen(false);
    }
  };

  const handleDomiciliationSubMenuClick = (subServiceId: string) => {
    console.log("🔄 Changement activeService vers:", subServiceId);
    setActiveService(subServiceId);
    // Ne pas fermer le menu pour permettre la navigation
    // setDomiciliationSubMenuOpen(false);
  };

  const handlePaiementSubMenuClick = (subServiceId: string) => {
    console.log("🔄 Changement activeService Paiement vers:", subServiceId);
    setActiveService(subServiceId);
    // Ne pas fermer le menu pour permettre la navigation
    // setPaiementSubMenuOpen(false);
  };

  // Mettre à jour l'état actif des services
  const updatedAdminServices = adminServices.map((service) => ({
    ...service,
    isActive:
      service.id === "users"
        ? true
        : service.id === "analytics"
        ? true
        : service.id === "avis"
        ? hasAvisComponents
        : service.id === "pricing"
        ? hasPaiementComponents
        : service.id === "blog"
        ? hasBlogComponents
        : service.id === "newsletter"
        ? hasNewsComponents
        : service.id === "contact"
        ? hasContactComponents
        : service.id === "rdv"
        ? hasRdvComponents
        : service.id === "ecommerce"
        ? hasEcommerceComponents
        : service.id === "phototheque"
        ? hasPhotothequeComponents
        : service.id === "domiciliation"
        ? hasDomiciliationService
        : service.id === "showcase"
        ? hasShowcaseComponents
        : service.id === "phone"
        ? hasPhoneComponents
        : activeServices.has(service.id),
  }));
  // Tri alphabétique des services par nom (insensible à la casse, locale fr)
  const sortedAdminServices = [...updatedAdminServices].sort((a, b) =>
    a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
  );
  // Rendu du contenu selon le service actif
  const renderServiceContent = () => {
    if (activeService === "avis" && hasAvisComponents) {
      return <AdminAvisTemplate siteId={siteId} />;
    }

    if (activeService === "pricing" || activeService === "pricing-all") {
      console.log("📋 Rendu AdminPaiementTemplate avec defaultView='all'");
      return <AdminPaiementTemplate key="pricing-all" siteId={siteId} defaultView="all" />;
    }

    if (activeService === "pricing-impayes") {
      console.log("📋 Rendu AdminPaiementTemplate avec defaultView='failed'");
      return <AdminPaiementTemplate key="pricing-impayes" siteId={siteId} defaultView="failed" />;
    }

    if (activeService === "blog") {
      return <AdminBlogTemplate hasDomiciliationService={hasDomiciliationService} />;
    }

    if (activeService === "newsletter") {
      return <AdminNewsTemplate />;
    }

    if (activeService === "contact" && hasContactComponents) {
      return <AdminContactTemplate siteId={siteId} />;
    }

    if (activeService === "rdv" && hasRdvComponents) {
      return <AdminRdvTemplate />;
    }

    if (activeService === "ecommerce" && hasEcommerceComponents) {
      return <AdminEcommerceTemplate />;
    }

    //if (activeService === "phone" && hasPhoneComponents) {
      //return <AdminPhoneTemplate siteId={siteId} />;
    //}

    if (activeService === "users") {
      return <AdminUsersTemplate siteId={siteId} />;
    }

    if (activeService === "analytics") {
      return <AdminAnalyticsTemplate siteId={siteId} />;
    }

    if (activeService === "phototheque" && hasPhotothequeComponents) {
      return <AdminMediaTemplate siteId={siteId} />;
    }

    // Gestion des sous-menus de domiciliation
    if (activeService === "domiciliation-entreprise") {
      return <AdminEntrepriseTemplate siteId={siteId} />;
    }

    if (activeService === "domiciliation-clients") {
      return <FormulairesAdmin />;
    }

    if (activeService === "domiciliation-config") {
      return <AdminAbonnementTemplate siteId={siteId} />;
    }

    if (activeService === "showcase") {
      return <AdminShowcase siteId={siteId} />;
    }

    if (activeService === "domiciliation-courriers") {
      console.log("🔄 Chargement AdminCourrierTemplate avec siteId:", siteId);
      return <AdminCourrierTemplate siteId={siteId} />;
    }

    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {updatedAdminServices.find((s) => s.id === activeService)?.name}
          </h2>
          <p className="text-gray-600">
            Interface de gestion pour{" "}
            {updatedAdminServices
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
      <div className="w-72 bg-white border-r border-gray-200 shadow-lg flex-shrink-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1
                  className="text-lg font-semibold text-gray-900"
                  data-editable="true"
                  data-id="admin-title"
                >
                  {adminTitle}
                </h1>
                <p
                  className="text-sm text-gray-500"
                  data-editable="true"
                  data-id="admin-subtitle"
                >
                  {adminSubtitle}
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
                    ? "bg-gray-800 text-white hover:bg-gray-800 hover:text-white"
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
                  Services
                </h3>
                {sortedAdminServices
                  .filter((service) => service.isActive)
                  .map((service) => (
                    <div key={service.id}>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start gap-3 mb-1 px-4 py-2 ${
                          activeService === service.id ||
                          (service.id === "domiciliation" &&
                            activeService?.startsWith("domiciliation-")) ||
                          (service.id === "pricing" &&
                            activeService?.startsWith("pricing-"))
                            ? "bg-gray-800 text-white hover:bg-gray-800 hover:text-white"
                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                        onClick={() => handleServiceClick(service.id)}
                      >
                        {service.icon}
                        <span className="flex-1 text-left">{service.name}</span>
                        {service.id === "domiciliation" && (
                          <div className="ml-auto flex-shrink-0">
                            {domiciliationSubMenuOpen ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        )}
                        {service.id === "pricing" && (
                          <div className="ml-auto flex-shrink-0">
                            {paiementSubMenuOpen ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        )}
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      </Button>

                      {/* Sous-menu de domiciliation */}
                      {service.id === "domiciliation" &&
                        domiciliationSubMenuOpen &&
                        hasDomiciliationService && (
                          <div className="ml-10 space-y-1">
                            {[
                              { id: "domiciliation-entreprise", label: "Configuration de l'entreprise" },
                              { id: "domiciliation-clients", label: "Entreprises Clientes" },
                              { id: "domiciliation-config", label: "Abonnements" },
                              { id: "domiciliation-courriers", label: "Courriers" },
                            ]
                              .sort((a, b) => a.label.localeCompare(b.label, "fr", { sensitivity: "base" }))
                              .map((item) => (
                                <Button
                                  key={item.id}
                                  variant="ghost"
                                  size="sm"
                                  className={`w-11/12 justify-start gap-2 text-xs ${
                                    activeService === item.id
                                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800 font-medium"
                                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                                  }`}
                                  onClick={() => handleDomiciliationSubMenuClick(item.id)}
                                >
                                  <span className="flex-1 text-left">{item.label}</span>
                                  {activeService === item.id && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                  )}
                                </Button>
                              ))}
                          </div>
                        )}

                      {/* Sous-menu de paiement */}
                      {service.id === "pricing" &&
                        paiementSubMenuOpen &&
                        hasPaiementComponents && (
                          <div className="ml-10 space-y-1">
                            {[
                              { id: "pricing-all", label: "Tous les paiements" },
                              { id: "pricing-impayes", label: "Impayés" },
                            ]
                              .sort((a, b) => a.label.localeCompare(b.label, "fr", { sensitivity: "base" }))
                              .map((item) => (
                                <Button
                                  key={item.id}
                                  variant="ghost"
                                  size="sm"
                                  className={`w-11/12 justify-start gap-2 text-xs ${
                                    activeService === item.id
                                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800 font-medium"
                                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                                  }`}
                                  onClick={() => handlePaiementSubMenuClick(item.id)}
                                >
                                  <span className="flex-1 text-left">{item.label}</span>
                                  {activeService === item.id && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                  )}
                                </Button>
                              ))}
                          </div>
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
                  Majoli Hub Admin
                </div>
              </div>
            </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1">
        {/* Messages d'erreur */}
        {error && (
          <div className="m-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-800">{error}</span>
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
                  Bienvenue dans l'interface d'administration de votre site.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedAdminServices
                    .filter((service) => service.isActive)
                    .map((service) => (
                      <div
                        key={service.id}
                        className="p-4 rounded-lg border-2 border-green-300 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-colors cursor-pointer"
                        onClick={() => handleServiceClick(service.id)}
                        style={{
                          cursor: "pointer",
                          opacity: 1,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-200">
                            {service.icon}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {service.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Actif
                            </p>
                          </div>
                        </div>
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
