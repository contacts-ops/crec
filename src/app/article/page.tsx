import { Metadata } from 'next';
import { Suspense } from 'react';
import HeaderCrecWrapper from '@/components/header-crec/HeaderCrecWrapper';
import ArticleBlogWrapper from '@/components/article-blog/ArticleBlogWrapper';
import FooterCrecWrapper from '@/components/footer-crec/FooterCrecWrapper';

export const metadata: Metadata = {
  title: 'Article',
  description: "",
};

export default function ArticlePage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <HeaderCrecWrapper {...{ "contactTextColor": "#FFFFFF", "navTextColor": "#243b76", "fontFamily": "Outfit", "mediaUrl1": "https://majoli-hub-images-s3.s3.eu-north-1.amazonaws.com/header-crec--mediaUrl1-1770822255223-yuc4h4we83l.png", "mediaAlt1": "Logo", "mediaType1": "image", "logoText": "JREJ", "logoSubtext": "EXPERTS COMPTABLES", "phoneNumber": "(+216) 71 78 40 07", "email": "s.bmansour@cabinet-amci.com", "link1Text": "Accueil", "link1Href": "/", "link2Text": "Nos services", "link2Href": "/nos-services", "link3Text": "Actualités", "link3Href": "/actualites", "link4Text": "Nous sommes", "link4Href": "/nous-sommes", "ctaButtonText": "Nous contacter", "ctaButtonHref": "/contact", "buttonGradientStart": "#1E3A5F", "buttonGradientEnd": "#2E5A8A", "buttonTextColor": "#FFFFFF", "activeLinkUnderlineColor": "#243b76", "mediaUrl0": "" }} />
    <ArticleBlogWrapper {...{ "primaryColor": "#FE505D", "secondaryColor": "#FFFFFF", "textColor": "#FFFFFF", "titleColor": "#FE505D", "backgroundColor": "#151A1B", "fontFamily": "DM Sans", "secondaryFontFamily": "Work Sans", "paddingTop": "", "paddingBottom": "", "filArianeColor": "#4B5563", "blogTitle": "#1F2937", "secondaryBlogTitle": "#000000", "separatorColor": "#E5E7EB", "lastModificationDateColor": "#4B5563", "viewsColor": "#4B5563", "shareTextButtonColor": "#FFFFFF" }} />
    <FooterCrecWrapper {...{ "backgroundColor": "#E5E7EB", "contentBlockBg": "#FFFFFF", "headingColor": "#243b76", "linkColor": "#243b76", "inputBg": "#E8E8E8", "inputTextColor": "#33363B", "inputPlaceholderColor": "#555C66", "buttonBg": "#1A2D5C", "buttonTextColor": "#FFFFFF", "buttonGradientStart": "#1A2D5C", "buttonGradientEnd": "#2E4A7C", "copyrightColor": "#9CA3AF", "fontFamily": "Inter", "mediaUrl1": "https://majoli-hub-images-s3.s3.eu-north-1.amazonaws.com/footer-crec--mediaUrl1-1770822156976-hnzg044zg2.png", "mediaAlt1": "Logo", "mediaType1": "image", "logoText": "CREJ", "logoSubtext": "EXPERTS COMPTABLES", "navSectionTitle": "Navigations", "link1Text": "Accueil", "link1Href": "/", "link2Text": "Nos Services", "link2Href": "/nos-services", "link3Text": "Actualités", "link3Href": "/actualites", "link4Text": "Nous sommes", "link4Href": "/nous-sommes", "link5Text": "Nous contacter", "link5Href": "/contact", "legalSectionTitle": "Liens légaux", "legalLink1Text": "Politique de confidentialité", "legalLink1Href": "/politique-de-confidentialite", "legalLink2Text": "Mentions légales", "legalLink2Href": "/mentions-legales", "legalLink3Text": "Termes et conditions", "legalLink3Href": "/termes-et-conditions", "socialSectionTitle": "Réseaux Sociaux", "social1Url": "", "social2Url": "", "social3Url": "", "newsletterTitle": "Inscrivez-vous pour connaître les dernières nouveautés", "newsletterDescription": "Inscrivez-vous à notre newsletter pour ne pas rater nos offres exclusives.", "inputNamePlaceholder": "Jacques DUPONT", "inputEmailPlaceholder": "mail@mail.com", "newsletterButtonText": "S'inscrire à la newsletter", "copyrightText": "Copyright 2026 CREC Tous droits réservés.", "creditText": "Made By Majoli.io with ❤️", "mediaUrl0": "" }} />
      </Suspense>
    </div>
  );
}