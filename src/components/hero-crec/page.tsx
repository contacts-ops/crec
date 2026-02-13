"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { GoogleFontLoader } from "@/components/bande/google-font-loader";
import { useSiteLink } from "@/hooks/use-site-link";

export interface HeroCrecProps {
  textColor: string;
  fontFamily: string;
  backgroundOverlayColor: string;
  backgroundOverlayOpacity: number;
  mediaUrl1: string;
  mediaAlt1: string;
  mediaType1: string;
  mediaUrl2: string;
  mediaAlt2: string;
  mediaType2: string;
  title: string;
  subtitle: string;
  ctaPrimaryText: string;
  ctaPrimaryHref: string;
  ctaSecondaryText: string;
  ctaSecondaryHref: string;
  buttonSecondaryBorderColor: string;
  buttonSecondaryTextColor: string;
  buttonGradientStart: string;
  buttonGradientEnd: string;
}

const hexToRgba = (hex: string, opacity: number): string => {
  if (!hex || !hex.startsWith("#")) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const isVideoFile = (url?: string) => {
  if (!url) return false;
  return [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"].some((ext) =>
    url.toLowerCase().includes(ext)
  );
};

const HeroCrec: React.FC<HeroCrecProps> = ({
  textColor = "#FFFFFF",
  fontFamily = "Inter",
  backgroundOverlayColor = "#1E3A5F",
  backgroundOverlayOpacity = 0.4,
  mediaUrl1 = "",
  mediaAlt1 = "Média de fond",
  mediaType1 = "image",
  mediaUrl2 = "",
  mediaAlt2 = "Décor deux demi-cercles",
  mediaType2 = "image",
  title = "L'expertise comptable au service de votre ambition.",
  subtitle = "Pilotez votre entreprise avec sérénité grâce à un accompagnement stratégique, humain et digital.",
  ctaPrimaryText = "Prendre rendez-vous avec un expert",
  ctaPrimaryHref = "/contact",
  ctaSecondaryText = "Voir nos services",
  ctaSecondaryHref = "/nos-services",
  buttonSecondaryBorderColor = "rgba(255,255,255,0.6)",
  buttonSecondaryTextColor = "#2C3E50",
  buttonGradientStart = "#1E3A5F",
  buttonGradientEnd = "#2E5A8A",
}) => {
  const { transformLink } = useSiteLink();
  const textStyle = useMemo(
    () => ({ fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined }),
    [fontFamily]
  );
  const hasBg = mediaUrl1 && mediaUrl1.trim() !== "";
  const isBgVideo = mediaType1 === "video" || isVideoFile(mediaUrl1);
  const hasSemiCircles = mediaUrl2 && mediaUrl2.trim() !== "";

  return (
    <>
      <GoogleFontLoader fontName={fontFamily || ""} />

      {/* Éléments cachés pour édition MajoliHub */}
      <div style={{ display: "none" }} data-editable="true" data-id="-textColor" data-label="Couleur du texte" data-type="string">
        {textColor}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-fontFamily" data-label="Police" data-type="font">
        {fontFamily || ""}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-backgroundOverlayColor" data-label="Couleur de l'overlay" data-type="string">
        {backgroundOverlayColor || ""}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-backgroundOverlayOpacity" data-label="Opacité de l'overlay" data-type="string">
        {backgroundOverlayOpacity}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaUrl1" data-label="Média de fond" data-type="media">
        {mediaUrl1 || ""}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaAlt1" data-label="Alt image de fond" data-type="text">
        {mediaAlt1 || ""}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaType1" data-label="Type média de fond" data-type="text">
        {mediaType1 || ""}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaUrl2" data-label="Image deux demi-cercles à droite (optionnel)" data-type="media">
        {mediaUrl2 || ""}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaAlt2" data-label="Alt image demi-cercles" data-type="text">
        {mediaAlt2 || ""}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaType2" data-label="Type image demi-cercles" data-type="text">
        {mediaType2 || ""}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-title" data-label="Titre principal" data-type="text">
        {title || ""}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-subtitle" data-label="Sous-titre" data-type="text">
        {subtitle || ""}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-ctaPrimaryText" data-label="Texte bouton principal" data-type="text">
        {ctaPrimaryText || ""}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-ctaPrimaryHref" data-label="Lien bouton principal" data-type="text">
        {ctaPrimaryHref || ""}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-ctaSecondaryText" data-label="Texte bouton secondaire" data-type="text">
        {ctaSecondaryText || ""}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-ctaSecondaryHref" data-label="Lien bouton secondaire" data-type="text">
        {ctaSecondaryHref || ""}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-buttonSecondaryBorderColor" data-label="Bordure bouton secondaire" data-type="string">
        {buttonSecondaryBorderColor || ""}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-buttonSecondaryTextColor" data-label="Couleur texte bouton secondaire" data-type="string">
        {buttonSecondaryTextColor || ""}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-buttonGradientStart" data-label="Couleur début dégradé bouton principal" data-type="string">
        {buttonGradientStart || ""}
      </div>
      <div style={{ display: "none" }} data-editable="true" data-id="-buttonGradientEnd" data-label="Couleur fin dégradé bouton principal" data-type="string">
        {buttonGradientEnd || ""}
      </div>

      <section
        className="relative w-full min-h-[420px] md:min-h-[500px] lg:min-h-[560px] overflow-hidden flex items-center"
        style={{ ...textStyle }}
        data-component="true"
        data-id="hero-crec"
      >
        {/* Image ou vidéo de fond - même bg que sous le header-crec */}
        {hasBg && (
          <div className="absolute inset-0 z-0">
            {isBgVideo ? (
              <video
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                aria-label={mediaAlt1}
              >
                <source src={mediaUrl1} type="video/webm" />
                <source src={mediaUrl1} type="video/mp4" />
              </video>
            ) : (
              <img
                src={mediaUrl1}
                alt={mediaAlt1}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: hexToRgba(backgroundOverlayColor, backgroundOverlayOpacity),
              }}
            />
          </div>
        )}

        {/* Deux demi-cercles : ancrés à droite (right: 0), responsive */}
        {hasSemiCircles && (
          <div
            className="absolute right-0 top-0 z-10 flex items-end justify-end pointer-events-none w-[55%] min-w-[180px] max-w-[420px] sm:w-[48%] sm:max-w-[380px] md:w-[42%] md:max-w-[400px] lg:w-[38%] lg:max-w-[420px] bottom-28 md:bottom-32"
            style={{ right: 0 }}
          >
            <div className="w-full h-[200px] sm:h-[260px] md:h-[320px] lg:h-[360px] max-h-[85vh]">
              {mediaType2 === "video" || isVideoFile(mediaUrl2) ? (
                <video
                  src={mediaUrl2}
                  className="w-full h-full object-contain object-right object-bottom"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label={mediaAlt2}
                />
              ) : (
                <img
                  src={mediaUrl2}
                  alt={mediaAlt2}
                  className="w-full h-full object-contain object-right object-bottom"
                />
              )}
            </div>
          </div>
        )}

        {/* Contenu : titre, sous-titre, boutons */}
        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-4 md:px-6 lg:px-10 py-16 md:py-20 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-xl md:max-w-2xl flex-shrink-0">
            <h1
              className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-white mb-4 md:mb-6"
              style={{ color: textColor, ...textStyle }}
            >
              {title}
            </h1>
            <p
              className="text-base md:text-lg mb-6 md:mb-8 max-w-lg"
              style={{ color: textColor, ...textStyle }}
            >
              {subtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <Link
                href={transformLink(ctaPrimaryHref)}
                className="inline-flex items-center justify-center px-6 py-3 text-sm md:text-base font-medium transition-opacity hover:opacity-90"
                style={{
                  borderRadius: 5,
                  background: `linear-gradient(to bottom, ${buttonGradientStart}, ${buttonGradientEnd})`,
                  color: "#FFFFFF",
                  ...textStyle,
                }}
              >
                {ctaPrimaryText}
              </Link>
              <Link
                href={transformLink(ctaSecondaryHref)}
                className="inline-flex items-center justify-center px-6 py-3 text-sm md:text-base font-medium border transition-opacity hover:opacity-90"
                style={{
                  borderRadius: 5,
                  backgroundColor: "transparent",
                  borderColor: buttonSecondaryBorderColor,
                  color: buttonSecondaryTextColor,
                  ...textStyle,
                }}
              >
                {ctaSecondaryText}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HeroCrec;
