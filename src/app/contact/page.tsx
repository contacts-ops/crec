import { Metadata } from 'next';
import { Suspense } from 'react';
import HeaderCrecWrapper from '@/components/header-crec/HeaderCrecWrapper';
import ContactLevageWrapper from '@/components/contact-levage/ContactLevageWrapper';
import FooterCrecWrapper from '@/components/footer-crec/FooterCrecWrapper';

export const metadata: Metadata = {
  title: 'Contact',
  description: "",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <HeaderCrecWrapper {...{ "contactTextColor": "#FFFFFF", "navTextColor": "#1E3A5F", "fontFamily": "Inter", "mediaUrl1": "https://majoli-hub-images-s3.s3.eu-north-1.amazonaws.com/header-crec--mediaUrl1-1770729764737-v1vd5foaie.png", "mediaAlt1": "Logo", "mediaType1": "image", "logoText": "CREC", "logoSubtext": "EXPERTS COMPTABLES", "phoneNumber": "(+216) 71 78 40 07", "email": "s.bmansour@cabinet-amci.com", "link1Text": "Accueil", "link1Href": "/", "link2Text": "Nos services", "link2Href": "/nos-services", "link3Text": "Actualités", "link3Href": "/actualites", "link4Text": "Nous sommes", "link4Href": "/nous-sommes", "ctaButtonText": "Nous contacter", "ctaButtonHref": "/contact", "buttonGradientStart": "#1E3A5F", "buttonGradientEnd": "#2E5A8A", "buttonTextColor": "#FFFFFF", "activeLinkUnderlineColor": "#243B76", "mediaAlt0": "", "mediaType0": "image", "mediaUrl0": "" }} />
    <ContactLevageWrapper {...{ "primaryColor": "#243B76", "secondaryColor": "#243B76", "textColor": "#FFFFFF", "backgroundColor": "#f9fafb", "fontFamily": "Outfit", "secondaryFontFamily": "Outfit", "title": "Contactez-nous", "submitButtonText": "Envoyer", "nameLabel": "Nom", "phoneLabel": "Téléphone", "emailLabel": "E-mail", "messageLabel": "Message", "phone": "(+216) 71 784 007", "email": "s.bmansour@cabinet-amci.com", "addressLine1": "4, Rue du Kenya. 3 ème étage ", "addressLine2": "1002 Tunis Belvédère.", "contact1IconType": "Mail", "contact2IconType": "Phone", "contact3IconType": "MapPin", "iconColor": "#243B76", "mediaUrl0": "" }} />
    <FooterCrecWrapper {...{ "backgroundColor": "#f9fafb", "contentBlockBg": "#FFFFFF", "headingColor": "#1A2D5C", "linkColor": "#243B76", "inputBg": "#E8E8E8", "inputTextColor": "#33363B", "inputPlaceholderColor": "#555C66", "buttonBg": "#1A2D5C", "buttonTextColor": "#FFFFFF", "buttonGradientStart": "#1A2D5C", "buttonGradientEnd": "#2E4A7C", "copyrightColor": "#9CA3AF", "fontFamily": "Inter", "mediaUrl1": "https://majoli-hub-images-s3.s3.eu-north-1.amazonaws.com/footer-crec--mediaUrl1-1770736450259-ppa7z0pgwhp.png", "mediaAlt1": "Logo", "mediaType1": "image", "logoText": "CREJ", "logoSubtext": "EXPERTS COMPTABLES", "navSectionTitle": "Navigations", "link1Text": "Accueil", "link1Href": "/", "link2Text": "Nos Services", "link2Href": "/nos-services", "link3Text": "Actualités", "link3Href": "/actualites", "link4Text": "Nous sommes", "link4Href": "/nous-sommes", "link5Text": "Nous contacter", "link5Href": "/contact", "legalSectionTitle": "Liens légaux", "legalLink1Text": "Politique de confidentialité", "legalLink1Href": "/politique-de-confidentialite", "legalLink2Text": "Mentions légales", "legalLink2Href": "/mentions-legales", "legalLink3Text": "Termes et conditions", "legalLink3Href": "/termes-et-conditions", "socialSectionTitle": "Réseaux Sociaux", "social1Url": "", "social2Url": "", "social3Url": "", "newsletterTitle": "Inscrivez-vous pour connaître les dernières nouveautés", "newsletterDescription": "Inscrivez-vous à notre newsletter pour ne pas rater nos offres exclusives.", "inputNamePlaceholder": "Jacques DUPONT", "inputEmailPlaceholder": "mail@mail.com", "newsletterButtonText": "S'inscrire à la newsletter", "copyrightText": "Copyright 2026 CREC Tous droits réservés.", "creditText": "Made By Majoli.io with ❤️", "mediaUrl0": "" }} />
      </Suspense>
    </div>
  );
}