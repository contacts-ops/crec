"use client";

import React from "react";
import Image from "next/image";
import { GoogleFontLoader } from "@/components/bande/google-font-loader";

export interface QuisommesnousTarifsProps {
  // Couleurs
  backgroundColor: string;
  rightBoxBackgroundColor: string;
  titleColor: string;
  textColor: string;
  // Polices
  fontFamily: string;
  titleFontFamily: string;
  // Médias
  mediaUrl1: string; // Image de gauche
  mediaAlt1: string;
  mediaType1: string;
  // Contenu
  title: string;
  paragraph1: string;
  paragraph2: string;
  // Padding
  paddingTop?: string;
  paddingBottom?: string;
}

const QuisommesnousTarifs: React.FC<QuisommesnousTarifsProps> = ({
  backgroundColor = "#FFFFFF",
  rightBoxBackgroundColor = "#2D5F4F",
  titleColor = "#FFD700",
  textColor = "#FFFFFF",
  fontFamily = "DM Sans",
  titleFontFamily = "Playfair Display",
  mediaUrl1 = "",
  mediaAlt1 = "Traitement laser",
  mediaType1 = "image",
  title = "Qui sommes-nous ?",
  paragraph1 = "Studio Laser Santé est un centre spécialisé dans l'épilation définitive. Fondé par une infirmière diplômée, nous utilisons la technologie avancée Alexandrite & Nd:YAG pour tous types de peaux avec une précision médicale.",
  paragraph2 = "Notre approche privilégie le bien-être de nos clients, un confort optimal et l'utilisation de la technologie de refroidissement cryogénique pour une expérience agréable et sécurisée. Venez profiter de l'excellence technique dans une atmosphère calme et apaisante.",
  paddingTop = "",
  paddingBottom = "",
}) => {
  const fontStyle = fontFamily ? (`'${fontFamily}', sans-serif` as const) : undefined;
  const titleFontStyle = titleFontFamily ? (`'${titleFontFamily}', serif` as const) : undefined;

  return (
    <div id="quisommesnous">
      <GoogleFontLoader fontName={fontFamily || ""} />
      <GoogleFontLoader fontName={titleFontFamily || ""} />

      <section
        className="relative w-full overflow-hidden mx-auto flex flex-col items-center justify-center"
        style={{
          fontFamily: fontStyle,
          backgroundColor: backgroundColor,
          paddingTop: paddingTop || undefined,
          paddingBottom: paddingBottom || undefined,
        }}
      >
        {/* Conteneur principal avec max-width 1626px */}
        <div className="w-full max-w-[1626px] mx-auto px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-stretch" style={{ minHeight: "400px" }}>
            {/* Image/Vidéo de gauche - Colonnes 1 à 7 */}
            <div className="col-span-1 md:col-span-7 relative w-full overflow-hidden h-[400px] md:h-[500px] mx-auto" style={{ borderRadius: "32px", height: "100%" }}>
              {mediaUrl1 && mediaType1 === "image" && (
                <Image
                  src={mediaUrl1}
                  alt={mediaAlt1}
                  width={941}
                  height={569}
                  style={{
                    objectFit: "cover",
                    borderRadius: "32px",
                    height: "100%",
                    width: "100%",
                    minWidth: "100%",
                    transform: "scale(1.1)",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
                  }}
                  className="w-full h-full"
                />
              )}
              {mediaUrl1 && mediaType1 === "video" && (
                <video
                  src={mediaUrl1}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{
                    borderRadius: "32px",
                    transform: "scale(1.1)",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
                  }}
                />
              )}
            </div>

            {/* Boîte de texte de droite - Colonnes 8 à 12 */}
            <div className="col-span-1 md:col-span-5 flex items-center justify-center w-full h-[400px] md:h-[500px] mt-4 md:mt-0">
              <div
                className="p-4 sm:p-6 md:p-8 lg:p-10 w-full h-full md:max-w-[667px]"
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  height: "100%",
                  backgroundColor: rightBoxBackgroundColor,
                  borderRadius: "32px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <h2
                  className="mb-4 sm:mb-6"
                  style={{
                    color: titleColor,
                    fontFamily: titleFontStyle,
                    fontSize: "clamp(20px, 2.5vw, 32px)",
                    fontWeight: 700,
                  }}
                >
                  {title}
                </h2>

                <p
                  className="mb-4"
                  style={{
                    color: textColor,
                    fontFamily: fontStyle,
                    fontSize: "clamp(14px, 1.5vw, 16px)",
                    lineHeight: "1.6",
                    fontWeight: 400,
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  {paragraph1}
                </p>

                <p
                  className="mb-0"
                  style={{
                    color: textColor,
                    fontFamily: fontStyle,
                    fontSize: "clamp(14px, 1.5vw, 16px)",
                    lineHeight: "1.6",
                    fontWeight: 400,
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  {paragraph2}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Éléments cachés pour l'édition MajoliHub */}
        <div style={{ display: "none" }}>
          {/* Couleurs */}
          <div data-editable="true" data-id="-backgroundColor" data-label="Couleur de fond" data-type="color">
            {backgroundColor}
          </div>
          <div data-editable="true" data-id="-rightBoxBackgroundColor" data-label="Couleur fond boîte droite" data-type="color">
            {rightBoxBackgroundColor}
          </div>
          <div data-editable="true" data-id="-titleColor" data-label="Couleur titre" data-type="color">
            {titleColor}
          </div>
          <div data-editable="true" data-id="-textColor" data-label="Couleur texte" data-type="color">
            {textColor}
          </div>
          {/* Polices */}
          <div data-editable="true" data-id="-fontFamily" data-label="Police principale" data-type="font">
            {fontFamily}
          </div>
          <div data-editable="true" data-id="-titleFontFamily" data-label="Police des titres" data-type="font">
            {titleFontFamily}
          </div>
          {/* Médias */}
          <div data-editable="true" data-id="-mediaUrl1" data-label="Image de gauche" data-type="media">
            {mediaUrl1}
          </div>
          <div data-editable="true" data-id="-mediaAlt1" data-label="Texte alternatif image gauche" data-type="text">
            {mediaAlt1}
          </div>
          <div data-editable="true" data-id="-mediaType1" data-label="Type média image gauche" data-type="text">
            {mediaType1}
          </div>
          {/* Contenu */}
          <div data-editable="true" data-id="-title" data-label="Titre" data-type="text">
            {title}
          </div>
          <div data-editable="true" data-id="-paragraph1" data-label="Paragraphe 1" data-type="text">
            {paragraph1}
          </div>
          <div data-editable="true" data-id="-paragraph2" data-label="Paragraphe 2" data-type="text">
            {paragraph2}
          </div>
          {/* Padding */}
          <div data-editable="true" data-id="-paddingTop" data-label="Padding top au-dessus du bloc (en px, ex: '60px')" data-type="string">
            {paddingTop || ""}
          </div>
          <div data-editable="true" data-id="-paddingBottom" data-label="Padding bottom en dessous du bloc (en px, ex: '60px')" data-type="string">
            {paddingBottom || ""}
          </div>
        </div>
      </section>
    </div>
  );
};

export default QuisommesnousTarifs;


