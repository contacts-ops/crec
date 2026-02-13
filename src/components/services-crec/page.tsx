"use client";

import React, { useMemo } from "react";
import { GoogleFontLoader } from "@/components/bande/google-font-loader";

const defaultIconPaie = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    <path d="M12 12v4" /><path d="M10 18h4" />
  </svg>
);
const defaultIconDocument = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" /><path d="M9 15l2 2 4-4" />
  </svg>
);
const defaultIconShield = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const defaultIconBriefcase = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);
export interface ServicesCrecProps {
  fontFamily: string;
  title: string;
  subtitle: string;
  titleColor: string;
  subtitleColor: string;
  cardBgColor: string;
  cardBorderColor: string;
  cardTitleColor: string;
  cardDescriptionColor: string;
  iconBgColor: string;
  iconColor: string;
  mediaUrl1: string;
  mediaAlt1: string;
  mediaType1: string;
  mediaUrl2: string;
  mediaAlt2: string;
  mediaType2: string;
  mediaUrl3: string;
  mediaAlt3: string;
  mediaType3: string;
  mediaUrl4: string;
  mediaAlt4: string;
  mediaType4: string;
  card1Title: string;
  card1Description: string;
  card2Title: string;
  card2Description: string;
  card3Title: string;
  card3Description: string;
  card4Title: string;
  card4Description: string;
}

const ServicesCrec: React.FC<ServicesCrecProps> = ({
  fontFamily = "Inter",
  title = "Gestion Sociale & RH : Valorisez votre capital humain.",
  subtitle = "La gestion des salariés est l'un des aspects les plus complexes pour un dirigeant. Notre pôle social prend en charge l'intégralité du cycle de vie de vos collaborateurs. De l'embauche avec la rédaction des contrats de travail à la sortie du salarié, nous sécurisons chaque étape juridique. Nous réalisons vos bulletins de paie avec une précision rigoureuse et télé-déclarons l'ensemble de vos cotisations sociales (Urssaf, retraites, prévoyance). Au-delà de l'administratif, nous vous conseillons sur votre stratégie RH et l'optimisation des rémunérations pour fidéliser vos talents.",
  titleColor = "#1A2D5C",
  subtitleColor = "#333333",
  cardBgColor = "#FFFFFF",
  cardBorderColor = "#E5E7EB",
  cardTitleColor = "#1A2D5C",
  cardDescriptionColor = "#333333",
  iconBgColor = "#1A2D5C",
  iconColor = "#FFFFFF",
  mediaUrl1 = "",
  mediaAlt1 = "Icône Paie",
  mediaType1 = "image",
  mediaUrl2 = "",
  mediaAlt2 = "Icône Contrats",
  mediaType2 = "image",
  mediaUrl3 = "",
  mediaAlt3 = "Icône Audit",
  mediaType3 = "image",
  mediaUrl4 = "",
  mediaAlt4 = "Icône Conseil",
  mediaType4 = "image",
  card1Title = "Paie & Déclarations",
  card1Description = "Bulletins de paie conformes et télédéclarations sociales automatisées.",
  card2Title = "Contrats de travail",
  card2Description = "Rédaction et sécurisation juridique de tous vos contrats.",
  card3Title = "Audit social",
  card3Description = "Diagnostic complet de votre conformité sociale et RH.",
  card4Title = "Conseil en droit du travail",
  card4Description = "Accompagnement stratégique sur vos décisions RH complexes.",
}) => {
  const textStyle = useMemo(
    () => ({ fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined }),
    [fontFamily]
  );
  const hasIcon = (url: string) => url && url.trim() !== "";

  const cards = [
    {
      title: card1Title,
      description: card1Description,
      mediaUrl: mediaUrl1,
      mediaAlt: mediaAlt1,
      defaultIcon: defaultIconPaie,
    },
    {
      title: card2Title,
      description: card2Description,
      mediaUrl: mediaUrl2,
      mediaAlt: mediaAlt2,
      defaultIcon: defaultIconDocument,
    },
    {
      title: card3Title,
      description: card3Description,
      mediaUrl: mediaUrl3,
      mediaAlt: mediaAlt3,
      defaultIcon: defaultIconShield,
    },
    {
      title: card4Title,
      description: card4Description,
      mediaUrl: mediaUrl4,
      mediaAlt: mediaAlt4,
      defaultIcon: defaultIconBriefcase,
    },
  ];

  return (
    <>
      <GoogleFontLoader fontName={fontFamily || ""} />

      {/* Éléments cachés pour édition MajoliHub */}
      <div style={{ display: "none" }} data-editable="true" data-id="-fontFamily" data-label="Police" data-type="font">{fontFamily || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-title" data-label="Titre" data-type="text">{title || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-subtitle" data-label="Paragraphe" data-type="text">{subtitle || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-titleColor" data-label="Couleur titre" data-type="string">{titleColor || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-subtitleColor" data-label="Couleur paragraphe" data-type="string">{subtitleColor || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-cardBgColor" data-label="Couleur fond cartes" data-type="string">{cardBgColor || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-cardBorderColor" data-label="Couleur bordure cartes" data-type="string">{cardBorderColor || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-cardTitleColor" data-label="Couleur titre carte" data-type="string">{cardTitleColor || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-cardDescriptionColor" data-label="Couleur texte carte" data-type="string">{cardDescriptionColor || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-iconBgColor" data-label="Couleur fond icône" data-type="string">{iconBgColor || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-iconColor" data-label="Couleur icône" data-type="string">{iconColor || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaUrl1" data-label="Carte 1 - Icône (URL)" data-type="string">{mediaUrl1 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaAlt1" data-label="Carte 1 - Texte alternatif icône" data-type="text">{mediaAlt1 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaUrl2" data-label="Carte 2 - Icône (URL)" data-type="string">{mediaUrl2 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaAlt2" data-label="Carte 2 - Texte alternatif icône" data-type="text">{mediaAlt2 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaUrl3" data-label="Carte 3 - Icône (URL)" data-type="string">{mediaUrl3 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaAlt3" data-label="Carte 3 - Texte alternatif icône" data-type="text">{mediaAlt3 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaUrl4" data-label="Carte 4 - Icône (URL)" data-type="string">{mediaUrl4 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaAlt4" data-label="Carte 4 - Texte alternatif icône" data-type="text">{mediaAlt4 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card1Title" data-label="Carte 1 - Titre" data-type="text">{card1Title || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card1Description" data-label="Carte 1 - Description" data-type="text">{card1Description || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card2Title" data-label="Carte 2 - Titre" data-type="text">{card2Title || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card2Description" data-label="Carte 2 - Description" data-type="text">{card2Description || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card3Title" data-label="Carte 3 - Titre" data-type="text">{card3Title || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card3Description" data-label="Carte 3 - Description" data-type="text">{card3Description || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card4Title" data-label="Carte 4 - Titre" data-type="text">{card4Title || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card4Description" data-label="Carte 4 - Description" data-type="text">{card4Description || ""}</div>

      <section className="w-full px-3 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-8 sm:py-10 md:py-14 lg:py-16" style={textStyle}>
        <div className="w-full max-w-[1200px] lg:max-w-[1400px] xl:max-w-[1600px] mx-auto">
          <header className="mb-6 sm:mb-8 md:mb-10 lg:mb-12 max-w-4xl">
            <h2
              className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-3 sm:mb-4 md:mb-6"
              style={{ color: titleColor, ...textStyle }}
            >
              {title}
            </h2>
            <p
              className="text-xs sm:text-base leading-relaxed"
              style={{ color: subtitleColor, ...textStyle }}
            >
              {subtitle}
            </p>
          </header>

          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {cards.map((card, index) => (
              <div
                key={index}
                className="flex flex-col rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 h-full min-h-0"
                style={{
                  backgroundColor: cardBgColor,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: cardBorderColor,
                  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)",
                  ...textStyle,
                }}
              >
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 mb-3 sm:mb-4 [&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-6 sm:[&>svg]:h-6 md:[&>svg]:w-7 md:[&>svg]:h-7"
                  style={{ backgroundColor: iconBgColor, color: iconColor }}
                >
                  {hasIcon(card.mediaUrl) ? (
                    <img
                      src={card.mediaUrl}
                      alt={card.mediaAlt || ""}
                      className="w-[60%] h-[60%] min-w-[20px] min-h-[20px] max-w-[28px] max-h-[28px] sm:max-w-[32px] sm:max-h-[32px] md:max-w-[36px] md:max-h-[36px] object-contain"
                    />
                  ) : (
                    card.defaultIcon
                  )}
                </div>
                <h3
                  className="text-sm sm:text-base md:text-lg font-bold leading-tight mb-1.5 sm:mb-2"
                  style={{ color: cardTitleColor, ...textStyle }}
                >
                  {card.title}
                </h3>
                <p
                  className="text-xs sm:text-sm text-left leading-relaxed flex-1"
                  style={{ color: cardDescriptionColor, ...textStyle }}
                >
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default ServicesCrec;
