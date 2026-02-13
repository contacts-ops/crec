"use client";

import React, { useState, useMemo } from "react";
import { FiMenu, FiX, FiPhone, FiMail } from "react-icons/fi";
import { useSiteLink } from "@/hooks/use-site-link";
import { usePathname } from "next/navigation";
import { GoogleFontLoader } from "@/components/bande/google-font-loader";
import Link from "next/link";
import Image from "next/image";

const HEADER_TOP_BAR_COLOR = "#1E3A5F";

interface HeaderCrecProps {
  contactTextColor: string;
  navTextColor: string;
  fontFamily: string;
  mediaUrl1: string;
  mediaAlt1: string;
  mediaType1: string;
  logoText: string;
  logoSubtext: string;
  phoneNumber: string;
  email: string;
  link1Text: string;
  link1Href: string;
  link2Text: string;
  link2Href: string;
  link3Text: string;
  link3Href: string;
  link4Text: string;
  link4Href: string;
  ctaButtonText: string;
  ctaButtonHref: string;
  buttonGradientStart: string;
  buttonGradientEnd: string;
  buttonTextColor: string;
  activeLinkUnderlineColor: string;
}

const isVideoFile = (url?: string) => {
  if (!url) return false;
  return [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"].some((ext) =>
    url.toLowerCase().includes(ext)
  );
};

const HeaderCrec: React.FC<HeaderCrecProps> = ({
  contactTextColor = "#FFFFFF",
  navTextColor = "#FFFFFF",
  fontFamily = "Inter",
  mediaUrl1 = "",
  mediaAlt1 = "Logo",
  mediaType1 = "image",
  logoText = "JREJ",
  logoSubtext = "EXPERTS COMPTABLES",
  phoneNumber = "(+216) 71 78 40 07",
  email = "s.bmansour@cabinet-amci.com",
  link1Text = "Accueil",
  link1Href = "/",
  link2Text = "Nos services",
  link2Href = "/nos-services",
  link3Text = "Actualités",
  link3Href = "/actualites",
  link4Text = "Nous sommes",
  link4Href = "/nous-sommes",
  ctaButtonText = "Nous contacter",
  ctaButtonHref = "/contact",
  buttonGradientStart = "#1E3A5F",
  buttonGradientEnd = "#2E5A8A",
  buttonTextColor = "#FFFFFF",
  activeLinkUnderlineColor = "rgba(255,255,255,0.7)",
}) => {
  const { transformLink } = useSiteLink();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const textStyle = useMemo(
    () => ({ fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined }),
    [fontFamily]
  );
  const isLinkActive = (href: string) => {
    const resolved = transformLink(href);
    if (resolved === "/" || resolved === "") return pathname === "/" || pathname === "" || pathname.endsWith("/");
    return pathname === resolved || pathname.endsWith(resolved);
  };

  const linkItems = [
    { text: link1Text, href: link1Href },
    { text: link2Text, href: link2Href },
    { text: link3Text, href: link3Href },
    { text: link4Text, href: link4Href },
  ];

  return (
    <>
      <GoogleFontLoader fontName={fontFamily || ""} />

      {/* Hidden editable props */}
      <div style={{ display: "none" }} data-editable="true" data-id="-contactTextColor" data-label="Couleur texte numéro et email" data-type="string">{contactTextColor}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-navTextColor" data-label="Couleur texte nav (bande)" data-type="string">{navTextColor}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-fontFamily" data-type="font" data-label="Police">{fontFamily || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaUrl1" data-label="Logo (image)" data-type="media">{mediaUrl1 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaAlt1" data-label="Alt logo" data-type="text">{mediaAlt1 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaType1" data-label="Type logo" data-type="text">{mediaType1 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-logoText" data-label="Texte logo (si pas d'image)" data-type="text">{logoText || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-logoSubtext" data-label="Sous-texte logo" data-type="text">{logoSubtext || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-phoneNumber" data-label="Téléphone" data-type="text">{phoneNumber || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-email" data-label="Email" data-type="text">{email || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-link1Text" data-label="Lien 1 - Texte" data-type="text">{link1Text || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-link1Href" data-label="Lien 1 - URL" data-type="text">{link1Href || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-link2Text" data-label="Lien 2 - Texte" data-type="text">{link2Text || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-link2Href" data-label="Lien 2 - URL" data-type="text">{link2Href || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-link3Text" data-label="Lien 3 - Texte" data-type="text">{link3Text || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-link3Href" data-label="Lien 3 - URL" data-type="text">{link3Href || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-link4Text" data-label="Lien 4 - Texte" data-type="text">{link4Text || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-link4Href" data-label="Lien 4 - URL" data-type="text">{link4Href || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-ctaButtonText" data-label="Texte bouton CTA" data-type="text">{ctaButtonText || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-ctaButtonHref" data-label="URL bouton CTA" data-type="text">{ctaButtonHref || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-buttonGradientStart" data-label="Couleur début dégradé bouton" data-type="string">{buttonGradientStart || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-buttonGradientEnd" data-label="Couleur fin dégradé bouton" data-type="string">{buttonGradientEnd || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-buttonTextColor" data-label="Couleur texte bouton" data-type="string">{buttonTextColor || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-activeLinkUnderlineColor" data-label="Couleur soulignement lien actif" data-type="string">{activeLinkUnderlineColor || ""}</div>

      <header className="w-full absolute top-0 left-0 z-50" style={{ backgroundColor: "transparent" }} data-component="true" data-id="header-crec">
        {/* Barre du haut : fond bleu ; mobile = colonne (tél puis email), desktop = ligne à droite */}
        <div
          className="w-full py-2.5 px-4 md:px-8 flex flex-col md:flex-row md:justify-end md:items-center gap-2 md:gap-6 items-end"
          style={{ backgroundColor: HEADER_TOP_BAR_COLOR }}
        >
          <a
            href={`tel:${phoneNumber.replace(/[^\d+]/g, "")}`}
            className="flex items-center gap-2 text-sm md:text-base"
            style={{ color: contactTextColor, ...textStyle }}
          >
            <FiPhone size={16} />
            <span>{phoneNumber}</span>
          </a>
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-2 text-sm md:text-base"
            style={{ color: contactTextColor, ...textStyle }}
          >
            <FiMail size={16} />
            <span>{email}</span>
          </a>
        </div>

        {/* Bande principale : fond transparent, logo | liens | bouton dégradé */}
        <div className="w-full py-4 px-4 md:px-8 flex items-center justify-between relative overflow-hidden backdrop-blur-sm" style={{ backgroundColor: "transparent" }}>
          <div className="relative z-10 flex items-center justify-between w-full">
            {/* Logo : image ou texte JREJ / EXPERTS COMPTABLES */}
            <Link href={transformLink("/")} className="flex items-center gap-2 flex-shrink-0">
              {mediaUrl1 && mediaUrl1.trim() !== "" && (mediaType1 === "video" || isVideoFile(mediaUrl1)) ? (
                <video src={mediaUrl1} className="h-10 md:h-12 object-contain" autoPlay loop muted playsInline aria-label={mediaAlt1} />
              ) : mediaUrl1 && mediaUrl1.trim() !== "" ? (
                <Image src={mediaUrl1} alt={mediaAlt1} width={120} height={48} className="h-10 md:h-12 w-auto object-contain" />
              ) : (
                <div className="flex flex-col leading-tight" style={{ color: navTextColor, ...textStyle }}>
                  <span className="text-xl md:text-2xl font-bold tracking-tight">{logoText}</span>
                  <span className="text-[10px] md:text-xs uppercase tracking-wider opacity-90">{logoSubtext}</span>
                </div>
              )}
            </Link>

            {/* Liens centrés - soulignement pour le lien actif */}
            <nav className="hidden md:flex items-center justify-center gap-6 lg:gap-8 flex-1">
              {linkItems.map((item) => (
                <Link
                  key={item.href}
                  href={transformLink(item.href)}
                  className="pb-1 border-b-2 border-transparent text-sm md:text-base transition-opacity hover:opacity-80"
                  style={{
                    color: navTextColor,
                    ...textStyle,
                    borderBottomColor: isLinkActive(item.href) ? activeLinkUnderlineColor : "transparent",
                  }}
                >
                  {item.text}
                </Link>
              ))}
            </nav>

            {/* Bouton CTA avec dégradé bleu, coins arrondis */}
            <div className="hidden md:block flex-shrink-0">
              <Link
                href={transformLink(ctaButtonHref)}
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-[5px] transition-opacity hover:opacity-90"
                style={{
                  background: buttonGradientStart && buttonGradientEnd
                    ? `linear-gradient(to right, ${buttonGradientStart}, ${buttonGradientEnd})`
                    : HEADER_TOP_BAR_COLOR,
                  color: buttonTextColor,
                  ...textStyle,
                }}
              >
                {ctaButtonText}
              </Link>
            </div>

            <button
              type="button"
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ color: navTextColor }}
              aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>

        {/* Menu mobile : pleine page, liens centrés */}
        {isMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md" style={{ backgroundColor: "transparent" }}>
            <nav className="relative z-10 flex flex-col items-center justify-center gap-6 py-8">
              {linkItems.map((item) => (
                <Link
                  key={item.href}
                  href={transformLink(item.href)}
                  className="py-2 text-lg text-center"
                  style={{ color: navTextColor, ...textStyle }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.text}
                </Link>
              ))}
              <Link
                href={transformLink(ctaButtonHref)}
                className="inline-flex items-center justify-center px-6 py-3 mt-2 text-sm font-medium rounded-[5px]"
                style={{
                  background: buttonGradientStart && buttonGradientEnd
                    ? `linear-gradient(to right, ${buttonGradientStart}, ${buttonGradientEnd})`
                    : HEADER_TOP_BAR_COLOR,
                  color: buttonTextColor,
                  ...textStyle,
                }}
                onClick={() => setIsMenuOpen(false)}
              >
                {ctaButtonText}
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};

export default HeaderCrec;
