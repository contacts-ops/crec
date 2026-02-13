/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Ce fichier est généré automatiquement par scripts/generate-shared-component-manifest.mjs
// Ne pas modifier manuellement.

import type { ComponentType } from "react";
import { toPascalCase } from "@/lib/to-pascal-case";

export type SharedComponentModule = {
    default: ComponentType<Record<string, unknown>>;
};

export type SharedComponentLoader = () => Promise<SharedComponentModule>;

export const sharedComponentLoaders = {
    "about-coach": () => import("@/_sharedComponents/about-coach/page"),
    "about-section-arch": () => import("@/_sharedComponents/about-section-arch/page"),
    "about-toiture": () => import("@/_sharedComponents/about-toiture/page"),
    "about-us-idf": () => import("@/_sharedComponents/about-us-idf/page"),
    "about-video-levage": () => import("@/_sharedComponents/about-video-levage/page"),
    "accordeon": () => import("@/_sharedComponents/accordeon/page"),
    "admin-contact": () => import("@/_sharedComponents/admin-contact/page"),
    "admin-formulaires": () => import("@/_sharedComponents/admin-formulaires/page"),
    "adminAbonnementTemplate": () => import("@/_sharedComponents/adminAbonnementTemplate/page"),
    "adminAnalyticsTemplate": () => import("@/_sharedComponents/adminAnalyticsTemplate/page"),
    "adminAvisTemplate": () => import("@/_sharedComponents/adminAvisTemplate/page"),
    "adminBlogTemplate": () => import("@/_sharedComponents/adminBlogTemplate/page"),
    "adminChatbotTemplate": () => import("@/_sharedComponents/adminChatbotTemplate/page"),
    "adminContactTemplate": () => import("@/_sharedComponents/adminContactTemplate/page"),
    "adminCourrierTemplate": () => import("@/_sharedComponents/adminCourrierTemplate/page"),
    "adminEcommerceTemplate": () => import("@/_sharedComponents/adminEcommerceTemplate/page"),
    "adminEntrepriseTemplate": () => import("@/_sharedComponents/adminEntrepriseTemplate/page"),
    "adminFormTemplate": () => import("@/_sharedComponents/adminFormTemplate/page"),
    "adminMediaTemplate": () => import("@/_sharedComponents/adminMediaTemplate/page"),
    "adminNewsTemplate": () => import("@/_sharedComponents/adminNewsTemplate/page"),
    "adminPaiementTemplate": () => import("@/_sharedComponents/adminPaiementTemplate/page"),
    "adminPhoneTemplate": () => import("@/_sharedComponents/adminPhoneTemplate/page"),
    "adminRdvTemplate": () => import("@/_sharedComponents/adminRdvTemplate/page"),
    "adminShowcase": () => import("@/_sharedComponents/adminShowcase/page"),
    "adminTemplate": () => import("@/_sharedComponents/adminTemplate/page"),
    "adminUsersTemplate": () => import("@/_sharedComponents/adminUsersTemplate/page"),
    "adminVentesTemplate": () => import("@/_sharedComponents/adminVentesTemplate/page"),
    "ark-banner-strip": () => import("@/_sharedComponents/ark-banner-strip/page"),
    "article-blog": () => import("@/_sharedComponents/article-blog/page"),
    "article-template": () => import("@/_sharedComponents/article-template/page"),
    "article-luxiko": () => import("@/_sharedComponents/article-luxiko/page"),
    "articles-you-might-like": () => import("@/_sharedComponents/articles-you-might-like/page"),
    "avis-apmi": () => import("@/_sharedComponents/avis-apmi/page"),
    "avis-delcourt": () => import("@/_sharedComponents/avis-delcourt/page"),
    "avis-levage": () => import("@/_sharedComponents/avis-levage/page"),
    "balloon-banner-idf": () => import("@/_sharedComponents/balloon-banner-idf/page"),
    "blog-coach": () => import("@/_sharedComponents/blog-coach/page"),
    "blog-hero": () => import("@/_sharedComponents/blog-hero/page"),
    "blog-main-page": () => import("@/_sharedComponents/blog-main-page/page"),
    "borne-photo-idf": () => import("@/_sharedComponents/borne-photo-idf/page"),
    "bureaux-price": () => import("@/_sharedComponents/bureaux-price/page"),
    "BureauxSalles": () => import("@/_sharedComponents/BureauxSalles/page"),
    "BureauxSallesReunion": () => import("@/_sharedComponents/BureauxSallesReunion/page"),
    "call-to-action-arch": () => import("@/_sharedComponents/call-to-action-arch/page"),
    "carroussel": () => import("@/_sharedComponents/carroussel/page"),
    "categorie-levage": () => import("@/_sharedComponents/categorie-levage/page"),
    "category-apmi": () => import("@/_sharedComponents/category-apmi/page"),
    "cgv-levage": () => import("@/_sharedComponents/cgv-levage/page"),
    "chatbot": () => import("@/_sharedComponents/chatbot/page"),
    "chatbotCrisp": () => import("@/_sharedComponents/chatbotCrisp/page"),
    "choisir-apmi": () => import("@/_sharedComponents/choisir-apmi/page"),
    "clientCourierTemplate": () => import("@/_sharedComponents/clientCourierTemplate/page"),
    "clientEntrepriseTemplate": () => import("@/_sharedComponents/clientEntrepriseTemplate/page"),
    "clientInvoiceTemplate": () => import("@/_sharedComponents/clientInvoiceTemplate/page"),
    "clientPaymentTemplate": () => import("@/_sharedComponents/clientPaymentTemplate/page"),
    "clientProfileTemplate": () => import("@/_sharedComponents/clientProfileTemplate/page"),
    "comparaison-offres": () => import("@/_sharedComponents/comparaison-offres/page"),
    "complement-ares": () => import("@/_sharedComponents/complement-ares/page"),
    "competence-shuffle-grid": () => import("@/_sharedComponents/competence-shuffle-grid/page"),
    "contact-form": () => import("@/_sharedComponents/contact-form/page"),
    "contact-levage": () => import("@/_sharedComponents/contact-levage/page"),
    "contact-luxiko": () => import("@/_sharedComponents/contact-luxiko/page"),
    "contenu-levage": () => import("@/_sharedComponents/contenu-levage/page"),
    "dom-entreprise": () => import("@/_sharedComponents/dom-entreprise/page"),
    "dom-price": () => import("@/_sharedComponents/dom-price/page"),
    "espace-ensemble-dom": () => import("@/_sharedComponents/espace-ensemble-dom/page"),
    "espace-propice-dom": () => import("@/_sharedComponents/espace-propice-dom/page"),
    "estimation-coach": () => import("@/_sharedComponents/estimation-coach/page"),
    "etsi-coach": () => import("@/_sharedComponents/etsi-coach/page"),
    "evenement-dom": () => import("@/_sharedComponents/evenement-dom/page"),
    "expertise-apmi": () => import("@/_sharedComponents/expertise-apmi/page"),
    "expertise-crec": () => import("@/_sharedComponents/expertise-crec/page"),
    "expertises-coach": () => import("@/_sharedComponents/expertises-coach/page"),
    "faq-idf": () => import("@/_sharedComponents/faq-idf/page"),
    "faq-lawyer": () => import("@/_sharedComponents/faq-lawyer/page"),
    "faq-levage": () => import("@/_sharedComponents/faq-levage/page"),
    "famille1-luxiko": () => import("@/_sharedComponents/famille1-luxiko/page"),
    "famille2-luxiko": () => import("@/_sharedComponents/famille2-luxiko/page"),
    "famille3-luxiko": () => import("@/_sharedComponents/famille3-luxiko/page"),
    "first-service": () => import("@/_sharedComponents/first-service/page"),
    "footer-apmi": () => import("@/_sharedComponents/footer-apmi/page"),
    "footer-ares": () => import("@/_sharedComponents/footer-ares/page"),
    "footer-blancavenue": () => import("@/_sharedComponents/footer-blancavenue/page"),
    "footer-arche": () => import("@/_sharedComponents/footer-arche/page"),
    "footer-coach": () => import("@/_sharedComponents/footer-coach/page"),
    "footer-config-001": () => import("@/_sharedComponents/footer-config-001/page"),
    "footer-crec": () => import("@/_sharedComponents/footer-crec/page"),
    "footer-levage": () => import("@/_sharedComponents/footer-levage/page"),
    "footer-luxiko": () => import("@/_sharedComponents/footer-luxiko/page"),
    "footer-toiture": () => import("@/_sharedComponents/footer-toiture/page"),
    "form-coach": () => import("@/_sharedComponents/form-coach/page"),
    "form-dom": () => import("@/_sharedComponents/form-dom/page"),
    "form-toiture": () => import("@/_sharedComponents/form-toiture/page"),
    "gallery-idf": () => import("@/_sharedComponents/gallery-idf/page"),
    "guideTemplate": () => import("@/_sharedComponents/guideTemplate/page"),
    "header-apmi": () => import("@/_sharedComponents/header-apmi/page"),
    "header-arche": () => import("@/_sharedComponents/header-arche/page"),
    "header-avocat": () => import("@/_sharedComponents/header-avocat/page"),
    "header-coach": () => import("@/_sharedComponents/header-coach/page"),
    "header-crec": () => import("@/_sharedComponents/header-crec/page"),
    "hero-crec": () => import("@/_sharedComponents/hero-crec/page"),
    "header-idfselphy": () => import("@/_sharedComponents/header-idfselphy/page"),
    "header-toiture": () => import("@/_sharedComponents/header-toiture/page"),
    "hero-accordeon-dynamique": () => import("@/_sharedComponents/hero-accordeon-dynamique/page"),
    "hero-ares": () => import("@/_sharedComponents/hero-ares/page"),
    "hero-apmi": () => import("@/_sharedComponents/hero-apmi/page"),
    "hero-majoli": () => import("@/_sharedComponents/hero-majoli/page"),
    "header-majoli": () => import("@/_sharedComponents/header-majoli/page"),
    "hero-arch": () => import("@/_sharedComponents/hero-arch/page"),
    "hero-coach": () => import("@/_sharedComponents/hero-coach/page"),
    "hero-dom": () => import("@/_sharedComponents/hero-dom/page"),
    "hero-home-idf": () => import("@/_sharedComponents/hero-home-idf/page"),
    "hero-idf": () => import("@/_sharedComponents/hero-idf/page"),
    "hero-lawyer-banner": () => import("@/_sharedComponents/hero-lawyer-banner/page"),
    "hero-levage": () => import("@/_sharedComponents/hero-levage/page"),
    "hero-testimonials-clients": () => import("@/_sharedComponents/hero-testimonials-clients/page"),
    "hero-video-coach": () => import("@/_sharedComponents/hero-video-coach/page"),
    "hero-video-expertise": () => import("@/_sharedComponents/hero-video-expertise/page"),
    "histoireArche": () => import("@/_sharedComponents/histoireArche/page"),
    "info-banner": () => import("@/_sharedComponents/info-banner/page"),
    "info-services": () => import("@/_sharedComponents/info-services/page"),
    "InfoCards": () => import("@/_sharedComponents/InfoCards/page"),
    "informations-levage": () => import("@/_sharedComponents/informations-levage/page"),
    "last-articles": () => import("@/_sharedComponents/last-articles/page"),
    "last-realisations": () => import("@/_sharedComponents/last-realisations/page"),
    "levage-header": () => import("@/_sharedComponents/levage-header/page"),
    "listing-produits": () => import("@/_sharedComponents/listing-produits/page"),
    "locations-apmi": () => import("@/_sharedComponents/locations-apmi/page"),
    "loginTemplate": () => import("@/_sharedComponents/loginTemplate/page"),
    "magasinage-coach": () => import("@/_sharedComponents/magasinage-coach/page"),
    "map-contact-dom": () => import("@/_sharedComponents/map-contact-dom/page"),
    "mentions-legales": () => import("@/_sharedComponents/mentions-legales/page"),
    "mentions-legales-ecommerce": () => import("@/_sharedComponents/mentions-legales-ecommerce/page"),
    "mobile-toiture": () => import("@/_sharedComponents/mobile-toiture/page"),
    "monCompteTemplate": () => import("@/_sharedComponents/monCompteTemplate/page"),
    "most-read-articles": () => import("@/_sharedComponents/most-read-articles/page"),
    "navbar-modern": () => import("@/_sharedComponents/navbar-modern/page"),
    "NewslatterLevage": () => import("@/_sharedComponents/NewslatterLevage/page"),
    "newsletter-apmi": () => import("@/_sharedComponents/newsletter-apmi/page"),
    "newsletter-dom": () => import("@/_sharedComponents/newsletter-dom/page"),
    "NotreCommunaute": () => import("@/_sharedComponents/NotreCommunaute/page"),
    "offres-immo": () => import("@/_sharedComponents/offres-immo/page"),
    "OffresBureaux": () => import("@/_sharedComponents/OffresBureaux/page"),
    "our-additional-options": () => import("@/_sharedComponents/our-additional-options/page"),
    "paiement-abonnements_v2": () => import("@/_sharedComponents/paiement-abonnements_v2/page"),
    "penal-defense": () => import("@/_sharedComponents/penal-defense/page"),
    "phone-crec": () => import("@/_sharedComponents/phone-crec/page"),
    "phototheque": () => import("@/_sharedComponents/phototheque/page"),
    "plus-detail": () => import("@/_sharedComponents/plus-detail/page"),
    "politique-confidentialite": () => import("@/_sharedComponents/politique-confidentialite/page"),
    "politique-ecommerce": () => import("@/_sharedComponents/politique-ecommerce/page"),
    "pricing-packages-idf": () => import("@/_sharedComponents/pricing-packages-idf/page"),
    "processus-3-etapes": () => import("@/_sharedComponents/processus-3-etapes/page"),
    "processus-coach": () => import("@/_sharedComponents/processus-coach/page"),
    "product-details-page": () => import("@/_sharedComponents/product-details-page/page"),
    "promotion-blancavenue": () => import("@/_sharedComponents/promotion-blancavenue/page"),
    "projects-arch": () => import("@/_sharedComponents/projects-arch/page"),
    "projets-toiture": () => import("@/_sharedComponents/projets-toiture/page"),
    "promesseArche": () => import("@/_sharedComponents/promesseArche/page"),
    "quote-levage": () => import("@/_sharedComponents/quote-levage/page"),
    "rdv-calendar": () => import("@/_sharedComponents/rdv-calendar/page"),
    "rejoignez-idf": () => import("@/_sharedComponents/rejoignez-idf/page"),
    "reservation-dom": () => import("@/_sharedComponents/reservation-dom/page"),
    "resetPasswordTemplate": () => import("@/_sharedComponents/resetPasswordTemplate/page"),
    "services-crec": () => import("@/_sharedComponents/services-crec/page"),
    "services-section-idf": () => import("@/_sharedComponents/services-section-idf/page"),
    "servicesArche": () => import("@/_sharedComponents/servicesArche/page"),
    "similar-product": () => import("@/_sharedComponents/similar-product/page"),
    "stats": () => import("@/_sharedComponents/stats/page"),
    "stats-arche": () => import("@/_sharedComponents/stats-arche/page"),
    "stripe-diagnostics": () => import("@/_sharedComponents/stripe-diagnostics/page"),
    "team-levage": () => import("@/_sharedComponents/team-levage/page"),
    "temoignages-coach": () => import("@/_sharedComponents/temoignages-coach/page"),
    "termes-conditions": () => import("@/_sharedComponents/termes-conditions/page"),
    "vendre-coach": () => import("@/_sharedComponents/vendre-coach/page"),
    "vendre-particuliers": () => import("@/_sharedComponents/vendre-particuliers/page"),
    "video-hero": () => import("@/_sharedComponents/video-hero/page"),
    "VideoShowcase": () => import("@/_sharedComponents/VideoShowcase/page"),
    "who-iam-coach": () => import("@/_sharedComponents/who-iam-coach/page"),
    "why-choose-me": () => import("@/_sharedComponents/why-choose-me/page"),
} as const;

export type SharedComponentId = keyof typeof sharedComponentLoaders;

const normalizeKey = (key: string) => key.trim();

export const getSharedComponentLoader = (id: string | null | undefined) => {
    if (!id) {
        return undefined;
    }

    const directKey = normalizeKey(id);
    if (directKey in sharedComponentLoaders) {
        return sharedComponentLoaders[directKey];
    }

    const pascalKey = toPascalCase(directKey);
    if (pascalKey in sharedComponentLoaders) {
        return sharedComponentLoaders[pascalKey as SharedComponentId];
    }

    return undefined;
};

export const loadSharedComponentModule = async (id: string) => {
    const loader = getSharedComponentLoader(id);
    if (!loader) {
        throw new Error(`Composant partagé "${id}" introuvable dans le manifest`);
    }

    return loader();
};
