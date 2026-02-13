"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { GoogleFontLoader } from "@/components/bande/google-font-loader";
import { useSiteLink } from "@/hooks/use-site-link";

export interface ExpertiseCrecProps {
  backgroundColor: string;
  titleColor: string;
  title: string;
  fontFamily: string;
  cardContentBg: string;
  cardTextColor: string;
  buttonBg: string;
  buttonIconColor: string;
  imagePlaceholderBg: string;
  mediaUrl1: string;
  mediaAlt1: string;
  mediaType1: string;
  mediaUrl2: string;
  mediaAlt2: string;
  mediaType2: string;
  mediaUrl3: string;
  mediaAlt3: string;
  mediaType3: string;
  card1Title: string;
  card1Description: string;
  card1Href: string;
  card1BandId: string;
  card2Title: string;
  card2Description: string;
  card2Href: string;
  card2BandId: string;
  card3Title: string;
  card3Description: string;
  card3Href: string;
  card3BandId: string;
}

const isVideoFile = (url?: string) => {
  if (!url) return false;
  return [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"].some((ext) =>
    url.toLowerCase().includes(ext)
  );
};

const ArrowRightIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color }}>
    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ExpertiseCrec: React.FC<ExpertiseCrecProps> = ({
  backgroundColor = "#F8F8F8",
  titleColor = "#001F5C",
  title = "Notre expertise au service de votre croissance",
  fontFamily = "Inter",
  cardContentBg = "#284D8F",
  cardTextColor = "#FFFFFF",
  buttonBg = "#FFFFFF",
  buttonIconColor = "#284D8F",
  imagePlaceholderBg = "#E5E7EB",
  mediaUrl1 = "",
  mediaAlt1 = "Expertise Comptable",
  mediaType1 = "image",
  mediaUrl2 = "",
  mediaAlt2 = "Accompagnement Juridique",
  mediaType2 = "image",
  mediaUrl3 = "",
  mediaAlt3 = "Gestion sociale",
  mediaType3 = "image",
  card1Title = "Expertise Comptable",
  card1Description = "Nous gérons vos comptes et vos impôts. Vous avez l'esprit tranquille et une comptabilité toujours en règle. Concentrez-vous sur l'essentiel : la croissance de votre entreprise.",
  card1Href = "/nos-services",
  card1BandId = "",
  card2Title = "Accompagnement Juridique",
  card2Description = "Nous vous aidons pour toutes les formalités de votre société, de la création aux contrats, pour protéger votre activité. Profitez d'un conseil sur mesure pour sécuriser chacun de vos engagements.",
  card2Href = "/nos-services",
  card2BandId = "",
  card3Title = "Gestion sociale",
  card3Description = "Nous nous occupons des fiches de paie et de vos salariés. Vous gagnez du temps sur toute la partie administrative. Garantissez la conformité de vos déclarations et le respect du droit du travail.",
  card3Href = "/nos-services",
  card3BandId = "",
}) => {
  const { transformLink } = useSiteLink();
  const textStyle = useMemo(
    () => ({ fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined }),
    [fontFamily]
  );
  const cards = [
    {
      mediaUrl: mediaUrl1,
      mediaAlt: mediaAlt1,
      mediaType: mediaType1,
      cardTitle: card1Title,
      cardDescription: card1Description,
      cardHref: card1Href,
      cardBandId: card1BandId,
    },
    {
      mediaUrl: mediaUrl2,
      mediaAlt: mediaAlt2,
      mediaType: mediaType2,
      cardTitle: card2Title,
      cardDescription: card2Description,
      cardHref: card2Href,
      cardBandId: card2BandId,
    },
    {
      mediaUrl: mediaUrl3,
      mediaAlt: mediaAlt3,
      mediaType: mediaType3,
      cardTitle: card3Title,
      cardDescription: card3Description,
      cardHref: card3Href,
      cardBandId: card3BandId,
    },
  ];

  return (
    <>
      <GoogleFontLoader fontName={fontFamily || ""} />

      {/* Hidden editable props */}
      <div style={{ display: "none" }} data-editable="true" data-id="-backgroundColor" data-label="Couleur de fond" data-type="string">{backgroundColor}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-titleColor" data-label="Couleur du titre" data-type="string">{titleColor}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-title" data-label="Titre section" data-type="text">{title || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-fontFamily" data-label="Police" data-type="font">{fontFamily || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-cardContentBg" data-label="Couleur fond cartes" data-type="string">{cardContentBg}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-cardTextColor" data-label="Couleur texte cartes" data-type="string">{cardTextColor}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-buttonBg" data-label="Couleur bouton" data-type="string">{buttonBg}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-buttonIconColor" data-label="Couleur icône bouton" data-type="string">{buttonIconColor}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-imagePlaceholderBg" data-label="Couleur fond placeholder image" data-type="string">{imagePlaceholderBg}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaUrl1" data-label="Image carte 1" data-type="media">{mediaUrl1 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaAlt1" data-label="Alt image carte 1" data-type="text">{mediaAlt1 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaType1" data-label="Type média carte 1" data-type="text">{mediaType1 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaUrl2" data-label="Image carte 2" data-type="media">{mediaUrl2 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaAlt2" data-label="Alt image carte 2" data-type="text">{mediaAlt2 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaType2" data-label="Type média carte 2" data-type="text">{mediaType2 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaUrl3" data-label="Image carte 3" data-type="media">{mediaUrl3 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaAlt3" data-label="Alt image carte 3" data-type="text">{mediaAlt3 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaType3" data-label="Type média carte 3" data-type="text">{mediaType3 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card1Title" data-label="Titre carte 1" data-type="text">{card1Title || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card1Description" data-label="Description carte 1" data-type="text">{card1Description || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card1Href" data-label="Lien carte 1" data-type="text">{card1Href || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card1BandId" data-label="ID bande cible carte 1" data-type="text">{card1BandId || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card2Title" data-label="Titre carte 2" data-type="text">{card2Title || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card2Description" data-label="Description carte 2" data-type="text">{card2Description || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card2Href" data-label="Lien carte 2" data-type="text">{card2Href || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card2BandId" data-label="ID bande cible carte 2" data-type="text">{card2BandId || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card3Title" data-label="Titre carte 3" data-type="text">{card3Title || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card3Description" data-label="Description carte 3" data-type="text">{card3Description || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card3Href" data-label="Lien carte 3" data-type="text">{card3Href || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-card3BandId" data-label="ID bande cible carte 3" data-type="text">{card3BandId || ""}</div>

      <section
        className="w-full py-12 md:py-16 lg:py-20 px-4 md:px-6 lg:px-8"
        style={{ backgroundColor, ...textStyle }}
        data-component="true"
        data-id="expertise-crec"
      >
        <div className="w-full max-w-[1200px] mx-auto">
          <h2
            className="font-bold mb-8 md:mb-10 lg:mb-12"
            style={{ color: titleColor, fontSize: 26, ...textStyle }}
          >
            {title}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 justify-items-center">
            {cards.map((card, index) => {
              const linkHref = card.cardBandId && card.cardBandId.trim() !== ""
                ? `#${card.cardBandId.trim()}`
                : transformLink(card.cardHref);
              return (
              <article
                key={index}
                className="flex flex-col rounded-xl overflow-hidden w-full max-w-[510px] flex-shrink-0"
                style={{ backgroundColor: cardContentBg }}
              >
                {/* Partie image + dégradé ; titre et flèche positionnés sur le dégradé (pas sur le bleu) */}
                <div className="relative flex-shrink-0 overflow-hidden h-[270px] lg:flex-none" style={{ width: "100%", backgroundColor: imagePlaceholderBg }}>
                  {card.mediaUrl && card.mediaUrl.trim() !== "" ? (
                    (card.mediaType === "video" || isVideoFile(card.mediaUrl)) ? (
                      <video
                        src={card.mediaUrl}
                        className="absolute inset-0 w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        aria-label={card.mediaAlt}
                      />
                    ) : (
                      <Image
                        src={card.mediaUrl}
                        alt={card.mediaAlt}
                        fill
                        className="object-cover"
                        sizes="510px"
                      />
                    )
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ backgroundColor: cardContentBg }}
                    >
                      <span className="text-xs opacity-70" style={{ color: cardTextColor }}>Image {index + 1}</span>
                    </div>
                  )}
                  {/* Dégradé entre image et zone texte (sans trait visible) */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
                    style={{
                      background: `linear-gradient(to bottom, transparent, ${cardContentBg})`,
                    }}
                  />
                  {/* Titre + flèche sur le dégradé, en bas de l'image */}
                  <div className="absolute inset-x-0 bottom-0 px-4 pb-3 pt-8 flex items-center gap-2">
                    <h3
                      className="font-bold flex-1 min-w-0"
                      style={{ color: cardTextColor, fontSize: 20, ...textStyle }}
                    >
                      {card.cardTitle}
                    </h3>
                    <Link
                      href={linkHref}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-90 flex-shrink-0"
                      style={{ backgroundColor: buttonBg }}
                      aria-label={`Aller vers ${card.cardTitle}`}
                    >
                      <span style={{ color: buttonIconColor }}>
                        <ArrowRightIcon color={buttonIconColor} />
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Partie bleue : description uniquement (pas de bordure / trait) */}
                <div className="flex flex-col flex-1 p-4 md:p-5 min-w-0 border-0">
                  <p
                    className="text-xs md:text-sm leading-relaxed"
                    style={{ color: cardTextColor, ...textStyle }}
                  >
                    {card.cardDescription}
                  </p>
                </div>
              </article>
            );})}
          </div>
        </div>
      </section>
    </>
  );
};

export default ExpertiseCrec;
