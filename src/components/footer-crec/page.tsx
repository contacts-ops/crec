"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { GoogleFontLoader } from "@/components/bande/google-font-loader";
import { useSiteLink } from "@/hooks/use-site-link";

export interface FooterCrecProps {
  backgroundColor: string;
  contentBlockBg: string;
  headingColor: string;
  linkColor: string;
  inputBg: string;
  inputTextColor: string;
  inputPlaceholderColor: string;
  buttonBg: string;
  buttonTextColor: string;
  buttonGradientStart: string;
  buttonGradientEnd: string;
  copyrightColor: string;
  fontFamily: string;
  mediaUrl1: string;
  mediaAlt1: string;
  mediaType1: string;
  logoText: string;
  logoSubtext: string;
  navSectionTitle: string;
  link1Text: string;
  link1Href: string;
  link2Text: string;
  link2Href: string;
  link3Text: string;
  link3Href: string;
  link4Text: string;
  link4Href: string;
  link5Text: string;
  link5Href: string;
  legalSectionTitle: string;
  legalLink1Text: string;
  legalLink1Href: string;
  legalLink2Text: string;
  legalLink2Href: string;
  legalLink3Text: string;
  legalLink3Href: string;
  socialSectionTitle: string;
  social1Url: string;
  social2Url: string;
  social3Url: string;
  newsletterTitle: string;
  newsletterDescription: string;
  inputNamePlaceholder: string;
  inputEmailPlaceholder: string;
  newsletterButtonText: string;
  copyrightText: string;
  creditText: string;
}

const isVideoFile = (url?: string) => {
  if (!url) return false;
  return [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"].some((ext) =>
    url.toLowerCase().includes(ext)
  );
};

const FooterCrec: React.FC<FooterCrecProps> = ({
  backgroundColor = "#33363B",
  contentBlockBg = "#FFFFFF",
  headingColor = "#1A2D5C",
  linkColor = "#555C66",
  inputBg = "#E8E8E8",
  inputTextColor = "#33363B",
  inputPlaceholderColor = "#555C66",
  buttonBg = "#1A2D5C",
  buttonTextColor = "#FFFFFF",
  buttonGradientStart = "#1A2D5C",
  buttonGradientEnd = "#2E4A7C",
  copyrightColor = "#9CA3AF",
  fontFamily = "Inter",
  mediaUrl1 = "",
  mediaAlt1 = "Logo",
  mediaType1 = "image",
  logoText = "CREJ",
  logoSubtext = "EXPERTS COMPTABLES",
  navSectionTitle = "Navigations",
  link1Text = "Accueil",
  link1Href = "/",
  link2Text = "Nos Services",
  link2Href = "/nos-services",
  link3Text = "Actualités",
  link3Href = "/actualites",
  link4Text = "Nous sommes",
  link4Href = "/nous-sommes",
  link5Text = "Nous contacter",
  link5Href = "/contact",
  legalSectionTitle = "Liens légaux",
  legalLink1Text = "Politique de confidentialité",
  legalLink1Href = "/politique-de-confidentialite",
  legalLink2Text = "Mentions légales",
  legalLink2Href = "/mentions-legales",
  legalLink3Text = "Termes et conditions",
  legalLink3Href = "/termes-et-conditions",
  socialSectionTitle = "Réseaux Sociaux",
  social1Url = "",
  social2Url = "",
  social3Url = "",
  newsletterTitle = "Inscrivez-vous pour connaître les dernières nouveautés",
  newsletterDescription = "Inscrivez-vous à notre newsletter pour ne pas rater nos offres exclusives.",
  inputNamePlaceholder = "Jacques DUPONT",
  inputEmailPlaceholder = "mail@mail.com",
  newsletterButtonText = "S'inscrire à la newsletter",
  copyrightText = "Copyright 2026 CREC Tous droits réservés.",
  creditText = "Made By Majoli.io with ❤️",
}) => {
  const { transformLink } = useSiteLink();
  const textStyle = useMemo(
    () => ({ fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined }),
    [fontFamily]
  );
  const navLinks = [
    { text: link1Text, href: link1Href },
    { text: link2Text, href: link2Href },
    { text: link3Text, href: link3Href },
    { text: link4Text, href: link4Href },
    { text: link5Text, href: link5Href },
  ];

  const legalLinks = [
    { text: legalLink1Text, href: legalLink1Href },
    { text: legalLink2Text, href: legalLink2Href },
    { text: legalLink3Text, href: legalLink3Href },
  ];

  return (
    <>
      <GoogleFontLoader fontName={fontFamily || ""} />

      {/* Couleur placeholder (::placeholder ne peut pas être défini en inline, on utilise une classe) */}
      <style dangerouslySetInnerHTML={{ __html: `.footer-crec-newsletter-input::placeholder { color: ${inputPlaceholderColor || "#555C66"} !important; }` }} />

      {/* Hidden editable props */}
      <div style={{ display: "none" }} data-editable="true" data-id="-backgroundColor" data-label="Couleur de fond" data-type="string">{backgroundColor}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-contentBlockBg" data-label="Couleur bloc contenu" data-type="string">{contentBlockBg}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-headingColor" data-label="Couleur des titres" data-type="string">{headingColor}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-linkColor" data-label="Couleur des liens" data-type="string">{linkColor}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-inputBg" data-label="Couleur fond champs" data-type="string">{inputBg}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-inputTextColor" data-label="Couleur texte champs" data-type="string">{inputTextColor}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-inputPlaceholderColor" data-label="Couleur placeholder" data-type="string">{inputPlaceholderColor}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-buttonBg" data-label="Couleur bouton newsletter" data-type="string">{buttonBg}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-buttonTextColor" data-label="Couleur texte bouton" data-type="string">{buttonTextColor}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-buttonGradientStart" data-label="Couleur début dégradé bouton newsletter" data-type="string">{buttonGradientStart}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-buttonGradientEnd" data-label="Couleur fin dégradé bouton newsletter" data-type="string">{buttonGradientEnd}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-copyrightColor" data-label="Couleur copyright" data-type="string">{copyrightColor}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-fontFamily" data-label="Police" data-type="font">{fontFamily || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaUrl1" data-label="Logo (image)" data-type="media">{mediaUrl1 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaAlt1" data-label="Alt logo" data-type="text">{mediaAlt1 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaType1" data-label="Type logo" data-type="text">{mediaType1 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-logoText" data-label="Texte logo (si pas d'image)" data-type="text">{logoText || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-logoSubtext" data-label="Sous-texte logo" data-type="text">{logoSubtext || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-navSectionTitle" data-label="Titre section navigations" data-type="text">{navSectionTitle || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-link1Text" data-label="Lien 1 - Texte" data-type="text">{link1Text || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-link1Href" data-label="Lien 1 - URL" data-type="text">{link1Href || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-link2Text" data-label="Lien 2 - Texte" data-type="text">{link2Text || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-link2Href" data-label="Lien 2 - URL" data-type="text">{link2Href || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-link3Text" data-label="Lien 3 - Texte" data-type="text">{link3Text || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-link3Href" data-label="Lien 3 - URL" data-type="text">{link3Href || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-link4Text" data-label="Lien 4 - Texte" data-type="text">{link4Text || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-link4Href" data-label="Lien 4 - URL" data-type="text">{link4Href || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-link5Text" data-label="Lien 5 - Texte" data-type="text">{link5Text || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-link5Href" data-label="Lien 5 - URL" data-type="text">{link5Href || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-legalSectionTitle" data-label="Titre liens légaux" data-type="text">{legalSectionTitle || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-legalLink1Text" data-label="Lien légal 1 - Texte" data-type="text">{legalLink1Text || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-legalLink1Href" data-label="Lien légal 1 - URL" data-type="text">{legalLink1Href || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-legalLink2Text" data-label="Lien légal 2 - Texte" data-type="text">{legalLink2Text || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-legalLink2Href" data-label="Lien légal 2 - URL" data-type="text">{legalLink2Href || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-legalLink3Text" data-label="Lien légal 3 - Texte" data-type="text">{legalLink3Text || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-legalLink3Href" data-label="Lien légal 3 - URL" data-type="text">{legalLink3Href || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-socialSectionTitle" data-label="Titre réseaux sociaux" data-type="text">{socialSectionTitle || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-social1Url" data-label="URL LinkedIn" data-type="text">{social1Url || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-social2Url" data-label="URL Facebook" data-type="text">{social2Url || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-social3Url" data-label="URL Instagram" data-type="text">{social3Url || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-newsletterTitle" data-label="Titre newsletter" data-type="text">{newsletterTitle || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-newsletterDescription" data-label="Description newsletter" data-type="text">{newsletterDescription || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-inputNamePlaceholder" data-label="Placeholder nom" data-type="text">{inputNamePlaceholder || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-inputEmailPlaceholder" data-label="Placeholder email" data-type="text">{inputEmailPlaceholder || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-newsletterButtonText" data-label="Texte bouton newsletter" data-type="text">{newsletterButtonText || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-copyrightText" data-label="Texte copyright" data-type="text">{copyrightText || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-creditText" data-label="Texte crédit" data-type="text">{creditText || ""}</div>

      <footer
        className="w-full py-8 md:py-12 lg:py-16 px-4 md:px-6 lg:px-10 xl:px-12"
        style={{ backgroundColor, ...textStyle }}
        data-component="true"
        data-id="footer-crec"
      >
        <div className="w-full max-w-[1200px] lg:max-w-[1400px] xl:max-w-[1600px] mx-auto">
          {/* Bloc blanc contenu principal : logo au-dessus, puis 4 colonnes ; plus large sur grand écran */}
          <div
            className="w-full rounded-xl p-6 md:p-8 lg:p-12 xl:p-16 mb-6 flex flex-col gap-8 lg:gap-10"
            style={{ backgroundColor: contentBlockBg }}
          >
            {/* Ligne 1 : Logo seul */}
            <Link href={transformLink("/")} className="flex flex-col flex-shrink-0 w-full max-w-[280px] sm:max-w-[340px] lg:max-w-[377px]">
              {mediaUrl1 && mediaUrl1.trim() !== "" && (mediaType1 === "video" || isVideoFile(mediaUrl1)) ? (
                <video src={mediaUrl1} className="w-full h-auto object-contain" style={{ aspectRatio: "377/94" }} autoPlay loop muted playsInline aria-label={mediaAlt1} />
              ) : mediaUrl1 && mediaUrl1.trim() !== "" ? (
                <Image src={mediaUrl1} alt={mediaAlt1} width={377} height={94} className="w-full h-auto object-contain object-left" />
              ) : (
                <div className="flex flex-col leading-tight py-2" style={{ color: headingColor, ...textStyle }}>
                  <span className="text-2xl md:text-3xl font-bold tracking-tight">{logoText}</span>
                  <span className="text-xs uppercase tracking-wider opacity-90" style={{ color: linkColor }}>{logoSubtext}</span>
                </div>
              )}
            </Link>

            {/* Ligne 2 : 4 colonnes sur grand écran ; newsletter plus large (1.25fr) ; espacement régulier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.25fr] items-start gap-8 lg:gap-x-14 xl:gap-x-16 lg:gap-y-0">
            {/* Colonne 1 : Navigations */}
            <div className="flex flex-col gap-4 min-w-0">
              <h3 className="text-sm lg:text-base font-bold uppercase tracking-wide min-h-[1.25rem]" style={{ color: headingColor, ...textStyle }}>{navSectionTitle}</h3>
              <nav className="flex flex-col gap-2">
                {navLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={transformLink(item.href)}
                    className="text-sm lg:text-base transition-opacity hover:opacity-80"
                    style={{ color: linkColor, ...textStyle }}
                  >
                    {item.text}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Colonne 2 : Liens légaux */}
            <div className="flex flex-col gap-4 min-w-0">
              <h3 className="text-sm lg:text-base font-bold uppercase tracking-wide min-h-[1.25rem]" style={{ color: headingColor, ...textStyle }}>{legalSectionTitle}</h3>
              <nav className="flex flex-col gap-2">
                {legalLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={transformLink(item.href)}
                    className="text-sm lg:text-base transition-opacity hover:opacity-80"
                    style={{ color: linkColor, ...textStyle }}
                  >
                    {item.text}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Colonne 3 : Réseaux sociaux (SVG inline) - icônes toujours affichées */}
            <div className="flex flex-col gap-4 min-w-0">
              <h3 className="text-sm lg:text-base font-bold uppercase tracking-wide min-h-[1.25rem]" style={{ color: headingColor, ...textStyle }}>{socialSectionTitle}</h3>
              <div className="flex items-center gap-4 lg:gap-5">
                {(social1Url && social1Url.trim() !== "" ? (
                  <a href={social1Url} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-80" aria-label="LinkedIn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: headingColor }}>
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" fill="currentColor"/>
                    </svg>
                  </a>
                ) : (
                  <span className="inline-flex" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: headingColor }}>
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" fill="currentColor"/>
                    </svg>
                  </span>
                ))}
                {(social2Url && social2Url.trim() !== "" ? (
                  <a href={social2Url} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-80" aria-label="Facebook">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: headingColor }}>
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="currentColor"/>
                    </svg>
                  </a>
                ) : (
                  <span className="inline-flex" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: headingColor }}>
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="currentColor"/>
                    </svg>
                  </span>
                ))}
                {(social3Url && social3Url.trim() !== "" ? (
                  <a href={social3Url} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-80" aria-label="Instagram">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: headingColor }}>
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" fill="currentColor"/>
                    </svg>
                  </a>
                ) : (
                  <span className="inline-flex" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: headingColor }}>
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" fill="currentColor"/>
                    </svg>
                  </span>
                ))}
              </div>
            </div>

            {/* Colonne 4 : Newsletter (colonne élargie sur grand écran) */}
            <div className="flex flex-col gap-4 lg:gap-5 min-w-0">
              <h3 className="text-sm lg:text-base font-bold uppercase tracking-wide min-h-[1.25rem] leading-snug" style={{ color: headingColor, ...textStyle }}>{newsletterTitle}</h3>
              <p className="text-sm lg:text-base" style={{ color: linkColor, ...textStyle }}>{newsletterDescription}</p>
              <form className="flex flex-col gap-3 lg:gap-4 w-full lg:max-w-md" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="text"
                  placeholder={inputNamePlaceholder}
                  className="footer-crec-newsletter-input w-full px-4 py-3 lg:px-5 lg:py-4 rounded-lg text-sm lg:text-base border-0 outline-none focus:ring-2 focus:ring-offset-0"
                  style={{ backgroundColor: inputBg, color: inputTextColor, ...textStyle }}
                  aria-label="Nom"
                />
                <input
                  type="email"
                  placeholder={inputEmailPlaceholder}
                  className="footer-crec-newsletter-input w-full px-4 py-3 lg:px-5 lg:py-4 rounded-lg text-sm lg:text-base border-0 outline-none focus:ring-2 focus:ring-offset-0"
                  style={{ backgroundColor: inputBg, color: inputTextColor, ...textStyle }}
                  aria-label="Email"
                />
                <button
                  type="submit"
                  className="w-full py-3 lg:py-4 rounded-lg text-sm lg:text-base font-medium transition-opacity hover:opacity-90"
                  style={{
                    background: (buttonGradientStart && buttonGradientEnd && buttonGradientStart.trim() !== "" && buttonGradientEnd.trim() !== "")
                      ? `linear-gradient(to right, ${buttonGradientStart}, ${buttonGradientEnd})`
                      : buttonBg,
                    color: buttonTextColor,
                    ...textStyle,
                  }}
                >
                  {newsletterButtonText}
                </button>
              </form>
            </div>
            </div>
          </div>

          {/* Bande : copyright à gauche, Made By Majoli tout à droite ; coeur noir */}
          <div
            className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 py-4 text-xs"
            style={{ color: copyrightColor, ...textStyle }}
          >
            <span className="text-center sm:text-left">{copyrightText}</span>
            <span className="text-center sm:text-right">
              {creditText.includes("❤️") ? (
                <>
                  {creditText.split("❤️")[0]}
                  <span style={{ color: "#000000" }}>❤️</span>
                  {creditText.split("❤️")[1] || ""}
                </>
              ) : (
                creditText
              )}
            </span>
          </div>
        </div>
      </footer>
    </>
  );
};

export default FooterCrec;
