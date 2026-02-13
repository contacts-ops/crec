"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSiteLink } from "@/hooks/use-site-link";
import { GoogleFontLoader } from "@/components/bande/google-font-loader";


interface TermesConditionsProps {
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  titleColor?: string;
  subTitleColor?: string;
  fontFamily?: string;
  backgroundColor?: string;

  pageTitle?: string;
  backToHomeText?: string;
  backToHomeUrl?: string;

  siteName?: string;
  siteUrl?: string;

  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companySiren?: string;
  companyLegalForm?: string;
  companyShareCapital?: string;
  companyRcsCity?: string;
  companyVatNumber?: string;
  publicationDirector?: string;
  hostName?: string;
  hostAddress?: string;
  hostPhone?: string;

  // Labels éditables pour les champs légaux
  sirenLabel?: string;
  legalFormLabel?: string;
  shareCapitalLabel?: string;
  vatLabel?: string;
  publicationDirectorLabel?: string;
  hostSectionTitle?: string;
  hostNameLabel?: string;
  hostAddressLabel?: string;
  hostPhoneLabel?: string;

  introductionTitle?: string;
  introductionContent?: string;

  definitionsTitle?: string;
  definitionsContent?: string;

  acceptanceTitle?: string;
  acceptanceContent?: string;

  siteAccessTitle?: string;
  siteAccessContent?: string;

  userObligationsTitle?: string;
  userObligationsContent?: string;

  intellectualPropertyTitle?: string;
  intellectualPropertyContent?: string;

  personalDataTitle?: string;
  personalDataContent?: string;

  cookiesTitle?: string;
  cookiesContent?: string;

  limitationOfLiabilityTitle?: string;
  limitationOfLiabilityContent?: string;

  externalLinksTitle?: string;
  externalLinksContent?: string;

  changesTitle?: string;
  changesContent?: string;

  applicableLawTitle?: string;
  applicableLawContent?: string;

  contactTitle?: string;
  contactContent?: string;

  lastUpdateText?: string;
  lastUpdateDate?: string;

  // Lien vers la politique de confidentialité
  privacyPolicyLinkText?: string;
  privacyPolicyLinkUrl?: string;


  // Optional paragraphs
  optionalParagraph1Title?: string;
  optionalParagraph1Content?: string;
  optionalParagraph2Title?: string;
  optionalParagraph2Content?: string;
  optionalParagraph3Title?: string;
  optionalParagraph3Content?: string;
  optionalParagraph4Title?: string;
  optionalParagraph4Content?: string;
  optionalParagraph5Title?: string;
  optionalParagraph5Content?: string;
  optionalParagraph6Title?: string;
  optionalParagraph6Content?: string;

  paddingTop?: string;
  paddingBottom?: string;
}

export default function TermesConditions({
  primaryColor = "#447991",
  textColor = "#000000",
  fontFamily = "Josefin Sans",
  backgroundColor = "#FDFBF5",

  pageTitle = "Conditions Générales d’Utilisation",
  backToHomeText = "Retour à la page",
  backToHomeUrl = "/",

  siteName = "Coach Immobilier",
  siteUrl = "",

  companyName = "Coach Immobilier",
  companyAddress = "32 Rue de Capelé d'Ox 31600 Muret",
  companyPhone = "06 76 73 40 36",
  companyEmail = "contact@vendresansagenceenfrance.fr",
  companySiren = "910600790",

  introductionTitle = "Introduction",
  introductionContent = "Le site Coach Immobilier propose des services d’accompagnement et de conseil en investissement et gestion immobilière. L’accès et l’utilisation du Site impliquent l’acceptation pleine et entière des présentes conditions. Les informations et contenus fournis sont de nature générale et pédagogique; ils ne constituent ni un conseil juridique, fiscal ou financier personnalisé, ni une intermédiation immobilière.",

  definitionsTitle = "Définitions",
  definitionsContent = "‘Site’ désigne la plateforme de Coach Immobilier et ses sous-domaines. ‘Utilisateur’ désigne toute personne qui accède au Site. ‘Prestations’ désignent les services de coaching, d’audit, de formation et de mise à disposition d’outils proposés par l’Éditeur. L’Éditeur n’est pas une agence immobilière et n’agit pas en qualité d’intermédiaire dans des transactions.",

  acceptanceTitle = "Acceptation des conditions",
  acceptanceContent = "En utilisant le Site et/ou en sollicitant les Prestations, l’Utilisateur reconnaît avoir lu et compris les présentes conditions et les accepte sans réserve. L’Éditeur peut les modifier à tout moment; la version applicable est celle publiée au jour de la consultation.",

  siteAccessTitle = "Accès au site",
  siteAccessContent = "Le Site est accessible 24/7, sous réserve des opérations de maintenance et des cas de force majeure. L’Éditeur s’efforce d’assurer la disponibilité mais ne garantit pas l’absence d’interruptions ou d’erreurs.",

  userObligationsTitle = "Obligations de l’utilisateur",
  userObligationsContent = "L’Utilisateur s’engage à fournir des informations exactes, à utiliser le Site conformément aux lois en vigueur et à ne pas porter atteinte à son bon fonctionnement. Les décisions d’investissement et de gestion immobilière relèvent de la seule responsabilité de l’Utilisateur, qui demeure tenu de réaliser ses propres vérifications (juridiques, fiscales, techniques, financières).",

  intellectualPropertyTitle = "Propriété intellectuelle",
  intellectualPropertyContent = "Les contenus, méthodes, modèles, checklists, vidéos et supports mis à disposition par l’Éditeur sont protégés par la législation sur la propriété intellectuelle. Toute reproduction, diffusion ou réutilisation, totale ou partielle, sans autorisation écrite préalable est interdite.",

  personalDataTitle = "Données personnelles",
  personalDataContent = "Des données peuvent être collectées (ex.: formulaire de contact, prise de rendez-vous, inscription à une newsletter) pour fournir les Prestations. Les traitements sont effectués conformément au RGPD. Vous disposez de droits d’accès, de rectification, d’effacement, d’opposition et de limitation. Contactez-nous pour exercer vos droits.",

  cookiesTitle = "Cookies",
  cookiesContent = "Le Site peut utiliser des cookies techniques nécessaires à son fonctionnement et, le cas échéant, des cookies de mesure d’audience (ex. Google Analytics) soumis à votre consentement. Vous pouvez gérer vos préférences depuis le bandeau cookies lorsqu’il est affiché.",

  limitationOfLiabilityTitle = "Limitation de responsabilité",
  limitationOfLiabilityContent = "Les Prestations sont des actions de conseil et de coaching; elles ne constituent ni une intermédiation immobilière, ni une garantie de résultat (rentabilité, financement, plus-value, occupation, etc.). L’Éditeur ne peut être tenu responsable des décisions prises par l’Utilisateur, ni des conséquences liées au marché, aux tiers, à la fiscalité, à la réglementation ou aux aléas techniques et financiers.",

  externalLinksTitle = "Liens externes",
  externalLinksContent = "Des liens vers des sites tiers peuvent être proposés (simulateurs, administrations, partenaires). L’Éditeur n’exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur disponibilité, leur contenu et leurs pratiques.",

  changesTitle = "Modifications des conditions",
  changesContent = "L’Éditeur peut modifier les présentes conditions et les Prestations proposées (contenus, formats, disponibilités). Les modifications s’appliquent dès leur publication en ligne et ne sont pas rétroactives.",

  applicableLawTitle = "Droit applicable et juridiction compétente",
  applicableLawContent = "Les présentes conditions sont régies par le droit français. À défaut de résolution amiable, tout litige sera soumis aux tribunaux compétents du ressort du siège de l’Éditeur.",

  contactTitle = "Contact",
  contactContent = "Pour toute question ou demande liée aux présentes conditions ou à nos Prestations de coaching immobilier, contactez-nous :",

  lastUpdateText = "Dernière mise à jour :",
  lastUpdateDate = "17 septembre 2025",

  privacyPolicyLinkText = "politique de confidentialité",
  privacyPolicyLinkUrl = "/politique-de-confidentialite",
  
  companyLegalForm = "",
  companyShareCapital = "",
  companyRcsCity = "",
  companyVatNumber = "",
  publicationDirector = "",
  hostName = "",
  hostAddress = "",
  hostPhone = "",
  sirenLabel = "SIREN :",
  legalFormLabel = "Forme juridique :",
  shareCapitalLabel = "Capital social :",
  vatLabel = "TVA intracom :",
  publicationDirectorLabel = "Directeur de la publication :",
  hostSectionTitle = "Hébergeur",
  hostNameLabel = "Nom :",
  hostAddressLabel = "Adresse :",
  hostPhoneLabel = "Téléphone :",



  optionalParagraph1Title = "",
  optionalParagraph1Content = "",
  optionalParagraph2Title = "",
  optionalParagraph2Content = "",
  optionalParagraph3Title = "",
  optionalParagraph3Content = "",
  optionalParagraph4Title = "",
  optionalParagraph4Content = "",
  optionalParagraph5Title = "",
  optionalParagraph5Content = "",
  optionalParagraph6Title = "",
  optionalParagraph6Content = "",

  paddingTop = "",
  paddingBottom = "",
}: TermesConditionsProps) {
  const { transformLink } = useSiteLink();
  const fontsToLoad: string[] = [];
  if (fontFamily && fontFamily.trim()) fontsToLoad.push(fontFamily);
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <>
      <GoogleFontLoader fontName={fontFamily} />

      <div
        style={{
          backgroundColor: backgroundColor,
          color: textColor,
          minHeight: "100vh",
          fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined,
          paddingTop: paddingTop || undefined,
          paddingBottom: paddingBottom || undefined,
        }}
        data-component="true"
        data-id="termes-conditions"
      >
        {/* Variables éditables (cachées) */}
        <div data-editable="true" data-id="-paddingTop" data-label="Padding top (ex: 60px)" data-type="string" style={{ display: "none" }}>{paddingTop || ""}</div>
        <div data-editable="true" data-id="-paddingBottom" data-label="Padding bottom (ex: 60px)" data-type="string" style={{ display: "none" }}>{paddingBottom || ""}</div>
        <div data-editable="true" data-id="component-backgroundColor" data-label="Couleur d'arrière-plan" style={{ display: "none" }}>{backgroundColor}</div>
        <div data-editable="true" data-id="termes-conditions-component-primaryColor" data-label="Couleur primaire" style={{ display: "none" }}>{primaryColor}</div>
        <div data-editable="true" data-id="component-textColor" data-label="Couleur du texte" style={{ display: "none" }}>{textColor}</div>
        <div data-editable="true" data-id="component-fontFamily" data-label="Police des titres" data-type="font" style={{ display: "none" }}>{fontFamily}</div>

        <motion.div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8" variants={containerVariants} initial="hidden" animate="visible">
          {/* Bouton retour */}
          <motion.div variants={itemVariants} className="mb-8">
            <button
              type="button"
              onClick={() => (typeof window !== 'undefined' ? window.history.back() : null)}
              className="inline-flex items-center text-sm font-medium"
              style={{ color: primaryColor }}
              data-editable="true"
              data-id="termes-conditions-component-backToHomeUrl"
              data-label="URL retour accueil"
              data-type="link"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span data-editable="true" data-id="termes-conditions-component-backToHomeText" data-label="Texte retour accueil">{backToHomeText}</span>
            </button>
          </motion.div>

          {/* Titre principal */}
          <motion.h1 variants={itemVariants} className="text-4xl font-bold mb-8 text-center" style={{ color: primaryColor, fontFamily: fontFamily }}>
            <span data-editable="true" data-id="termes-conditions-component-pageTitle" data-label="Titre de la page">{pageTitle}</span>
          </motion.h1>

          {/* Contenu T&C */}
          <motion.div variants={containerVariants} className="space-y-8" style={{ color: textColor }}>
            {/* Introduction */}
            <motion.section variants={itemVariants}>
              <h2 className="text-2xl font-semibold mb-4 text-justify" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-introductionTitle" data-label="Titre introduction">{introductionTitle}</h2>
              <p className="text-justify" data-editable="true" data-id="component-introductionContent" data-label="Contenu introduction">{introductionContent}</p>
            </motion.section>

            {/* Définitions */}
            <motion.section variants={itemVariants}>
              <h2 className="text-2xl font-semibold mb-4 text-justify" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-definitionsTitle" data-label="Titre définitions">{definitionsTitle}</h2>
              <p className="text-justify" data-editable="true" data-id="component-definitionsContent" data-label="Contenu définitions">{definitionsContent}</p>
            </motion.section>

            {/* Acceptation */}
            <motion.section variants={itemVariants}>
              <h2 className="text-2xl font-semibold mb-4 text-justify" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-acceptanceTitle" data-label="Titre acceptation">{acceptanceTitle}</h2>
              <p className="text-justify" data-editable="true" data-id="component-acceptanceContent" data-label="Contenu acceptation">{acceptanceContent}</p>
            </motion.section>

            {/* Accès au site */}
            <motion.section variants={itemVariants}>
              <h2 className="text-2xl font-semibold mb-4 text-justify" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-siteAccessTitle" data-label="Titre accès au site">{siteAccessTitle}</h2>
              <p className="text-justify" data-editable="true" data-id="component-siteAccessContent" data-label="Contenu accès au site">{siteAccessContent}</p>
            </motion.section>

            {/* Obligations utilisateur */}
            <motion.section variants={itemVariants}>
              <h2 className="text-2xl font-semibold mb-4 text-justify" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-userObligationsTitle" data-label="Titre obligations utilisateur">{userObligationsTitle}</h2>
              <p className="text-justify" data-editable="true" data-id="component-userObligationsContent" data-label="Contenu obligations utilisateur">{userObligationsContent}</p>
            </motion.section>

            {/* Propriété intellectuelle */}
            <motion.section variants={itemVariants}>
              <h2 className="text-2xl font-semibold mb-4 text-justify" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-intellectualPropertyTitle" data-label="Titre propriété intellectuelle">{intellectualPropertyTitle}</h2>
              <p className="text-justify" data-editable="true" data-id="component-intellectualPropertyContent" data-label="Contenu propriété intellectuelle">{intellectualPropertyContent}</p>
            </motion.section>

            {/* Données personnelles */}
            <motion.section variants={itemVariants}>
              <h2 className="text-2xl font-semibold mb-4 text-justify" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-personalDataTitle" data-label="Titre données personnelles">{personalDataTitle}</h2>
              <p className="text-justify" data-editable="true" data-id="component-personalDataContent" data-label="Contenu données personnelles">{personalDataContent}</p>
              <p className="mt-2 text-justify" data-editable="true" data-id="component-newsletterLegalNote" data-label="Note communications & lien politique">
                <span data-editable="true" data-id="component-newsletterLegalNoteText" data-label="Texte note">
                  En soumettant un formulaire (contact ou rendez‑vous), vous pouvez recevoir nos communications (newsletter, informations). Vous pouvez vous désinscrire à tout moment via le lien prévu dans chaque e‑mail. Pour plus de détails, consultez notre
                </span>{" "}
                <a
                  href={transformLink(privacyPolicyLinkUrl)}
                  className="underline"
                  data-type="link"
                  data-editable="true"
                  data-id="component-newsletterPolicyLink"
                  data-label="Lien politique de confidentialité"
                  style={{ color: primaryColor }}
                >
                  {privacyPolicyLinkText}
                </a>.
              </p>
            </motion.section>

            {/* Cookies */}
            <motion.section variants={itemVariants}>
              <h2 className="text-2xl font-semibold mb-4 text-justify" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-cookiesTitle" data-label="Titre cookies">{cookiesTitle}</h2>
              <p className="text-justify" data-editable="true" data-id="component-cookiesContent" data-label="Contenu cookies">{cookiesContent}</p>
            </motion.section>

            {/* Limitation de responsabilité */}
            <motion.section variants={itemVariants}>
              <h2 className="text-2xl font-semibold mb-4 text-justify" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-limitationOfLiabilityTitle" data-label="Titre limitation de responsabilité">{limitationOfLiabilityTitle}</h2>
              <p className="text-justify" data-editable="true" data-id="component-limitationOfLiabilityContent" data-label="Contenu limitation de responsabilité">{limitationOfLiabilityContent}</p>
            </motion.section>

            {/* Liens externes */}
            <motion.section variants={itemVariants}>
             <h2 className="text-2xl font-semibold mb-4 text-justify" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-externalLinksTitle" data-label="Titre liens externes">{externalLinksTitle}</h2>
              <p className="text-justify" data-editable="true" data-id="component-externalLinksContent" data-label="Contenu liens externes">{externalLinksContent}</p>
            </motion.section>

            {/* Modifications */}
            <motion.section variants={itemVariants}>
              <h2 className="text-2xl font-semibold mb-4 text-justify" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-changesTitle" data-label="Titre modifications">{changesTitle}</h2>
              <p className="text-justify" data-editable="true" data-id="component-changesContent" data-label="Contenu modifications">{changesContent}</p>
            </motion.section>

            {/* Droit applicable */}
            <motion.section variants={itemVariants}>
              <h2 className="text-2xl font-semibold mb-4 text-justify" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-applicableLawTitle" data-label="Titre droit applicable">{applicableLawTitle}</h2>
              <p className="text-justify" data-editable="true" data-id="component-applicableLawContent" data-label="Contenu droit applicable">{applicableLawContent}</p>
            </motion.section>



            {optionalParagraph1Title && optionalParagraph1Content && (
    <motion.section variants={itemVariants}>
      <h2 className="text-2xl font-semibold mb-4" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-optionalParagraph1Title" data-label="Titre paragraphe optionnel 1">{optionalParagraph1Title}</h2>
      <p data-editable="true" data-id="component-optionalParagraph1Content" data-label="Contenu paragraphe optionnel 1">{optionalParagraph1Content}</p>
    </motion.section>
  )}

  {optionalParagraph2Title && optionalParagraph2Content && (
    <motion.section variants={itemVariants}>
      <h2 className="text-2xl font-semibold mb-4" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-optionalParagraph2Title" data-label="Titre paragraphe optionnel 2">{optionalParagraph2Title}</h2>
      <p data-editable="true" data-id="component-optionalParagraph2Content" data-label="Contenu paragraphe optionnel 2">{optionalParagraph2Content}</p>
    </motion.section>
  )}

  {optionalParagraph3Title && optionalParagraph3Content && (
    <motion.section variants={itemVariants}>
      <h2 className="text-2xl font-semibold mb-4" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-optionalParagraph3Title" data-label="Titre paragraphe optionnel 3">{optionalParagraph3Title}</h2>
      <p data-editable="true" data-id="component-optionalParagraph3Content" data-label="Contenu paragraphe optionnel 3">{optionalParagraph3Content}</p>
    </motion.section>
  )}

  {optionalParagraph4Title && optionalParagraph4Content && (
    <motion.section variants={itemVariants}>
      <h2 className="text-2xl font-semibold mb-4" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-optionalParagraph4Title" data-label="Titre paragraphe optionnel 4">{optionalParagraph4Title}</h2>
      <p data-editable="true" data-id="component-optionalParagraph4Content" data-label="Contenu paragraphe optionnel 4">{optionalParagraph4Content}</p>
    </motion.section>
  )}

  {optionalParagraph5Title && optionalParagraph5Content && (
    <motion.section variants={itemVariants}>
      <h2 className="text-2xl font-semibold mb-4" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-optionalParagraph5Title" data-label="Titre paragraphe optionnel 5">{optionalParagraph5Title}</h2>
      <p data-editable="true" data-id="component-optionalParagraph5Content" data-label="Contenu paragraphe optionnel 5">{optionalParagraph5Content}</p>
    </motion.section>
  )}

  {optionalParagraph6Title && optionalParagraph6Content && (
    <motion.section variants={itemVariants}>
      <h2 className="text-2xl font-semibold mb-4" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-optionalParagraph6Title" data-label="Titre paragraphe optionnel 6">{optionalParagraph6Title}</h2>
      <p data-editable="true" data-id="component-optionalParagraph6Content" data-label="Contenu paragraphe optionnel 6">{optionalParagraph6Content}</p>
    </motion.section>
  )}

            {/* Contact */}
            <motion.section variants={itemVariants}>
              <h2 className="text-2xl font-semibold mb-4 text-justify" style={{ color: primaryColor, fontFamily: fontFamily }} data-editable="true" data-id="component-contactTitle" data-label="Titre contact">{contactTitle}</h2>
              <p className="mb-4 text-justify" data-editable="true" data-id="component-contactContent" data-label="Contenu contact">{contactContent}</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="mb-1 text-justify"><span data-editable="true" data-type="text" data-id="component-companyName" data-label="Nom de l'entreprise">{companyName}</span></p>
                <p className="mb-1 text-justify"><span data-editable="true" data-type="text" data-id="component-companyAddress" data-label="Adresse de l'entreprise">{companyAddress}</span></p>
                <p className="mb-1 text-justify"><span data-editable="true" data-type="text" data-id="component-companyPhone" data-label="Téléphone de l'entreprise">{companyPhone}</span></p>
                <p className="mb-1 text-justify"><span data-editable="true" data-type="text" data-id="component-companyEmail" data-label="Email de l'entreprise">{companyEmail}</span></p>
                <p className="mb-1 text-justify"><span data-editable="true" data-type="text" data-id="component-sirenLabel" data-label="Label SIREN">{sirenLabel}</span> <span data-editable="true" data-type="text" data-id="component-companySiren" data-label="SIREN de l'entreprise">{companySiren}</span></p>
                {companyLegalForm && (
                  <p className="mb-1 text-justify"><span data-editable="true" data-type="text" data-id="component-legalFormLabel" data-label="Label forme juridique">{legalFormLabel}</span> <span data-editable="true" data-type="text" data-id="component-companyLegalForm" data-label="Forme juridique">{companyLegalForm}</span></p>
                )}
                {companyShareCapital && (
                  <p className="mb-1 text-justify"><span data-editable="true" data-type="text" data-id="component-shareCapitalLabel" data-label="Label capital social">{shareCapitalLabel}</span> <span data-editable="true" data-type="text" data-id="component-companyShareCapital" data-label="Capital social">{companyShareCapital}</span></p>
                )}
                {companyVatNumber && (
                  <p className="mb-1 text-justify"><span data-editable="true" data-type="text" data-id="component-vatLabel" data-label="Label TVA">{vatLabel}</span> <span data-editable="true" data-type="text" data-id="component-companyVatNumber" data-label="Numéro de TVA intracom">{companyVatNumber}</span></p>
                )}
                {publicationDirector && (
                  <p className="mb-1 text-justify"><span data-editable="true" data-type="text" data-id="component-publicationDirectorLabel" data-label="Label directeur de la publication">{publicationDirectorLabel}</span> <span data-editable="true" data-type="text" data-id="component-publicationDirector" data-label="Directeur de la publication">{publicationDirector}</span></p>
                )}
                {(hostName || hostAddress || hostPhone) && (
                  <div className="mt-3">
                    <p className="mb-1 font-semibold text-justify" data-editable="true" data-type="text" data-id="component-hostSectionTitle" data-label="Titre section hébergeur">{hostSectionTitle}</p>
                    {hostName && (
                      <p className="mb-1 text-justify"><span data-editable="true" data-type="text" data-id="component-hostNameLabel" data-label="Label nom hébergeur">{hostNameLabel}</span> <span data-editable="true" data-type="text" data-id="component-hostName" data-label="Nom de l'hébergeur">{hostName}</span></p>
                    )}
                    {hostAddress && (
                      <p className="mb-1 text-justify"><span data-editable="true" data-type="text" data-id="component-hostAddressLabel" data-label="Label adresse hébergeur">{hostAddressLabel}</span> <span data-editable="true" data-type="text" data-id="component-hostAddress" data-label="Adresse de l'hébergeur">{hostAddress}</span></p>
                    )}
                    {hostPhone && (
                      <p className="mb-0 text-justify"><span data-editable="true" data-type="text" data-id="component-hostPhoneLabel" data-label="Label téléphone hébergeur">{hostPhoneLabel}</span> <span data-editable="true" data-type="text" data-id="component-hostPhone" data-label="Téléphone de l'hébergeur">{hostPhone}</span></p>
                    )}
                  </div>
                )}
              </div>
            </motion.section>

            {/* Dernière mise à jour */}
            <motion.div variants={itemVariants} className="text-sm text-gray-500 mt-8 pt-4 border-t text-justify">
              <span data-editable="true" data-type="text" data-id="component-lastUpdateText" data-label="Texte dernière mise à jour">{lastUpdateText}</span>{" "}
              <span data-editable="true" data-type="text" data-id="component-lastUpdateDate" data-label="Date dernière mise à jour">{lastUpdateDate}</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}


