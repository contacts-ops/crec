"use client";

import React from "react";
import { GoogleFontLoader } from "@/components/bande/google-font-loader";
import Image from "next/image";

interface AboutCrecProps {
  fontFamily?: string;
  titleColor?: string;
  titleText?: string;
  paragraph1?: string;
  paragraph2?: string;
  textColor?: string;
  backgroundColor?: string;
  mediaUrl1?: string;
  mediaAlt1?: string;
  mediaType1?: string;
}

const AboutCrec: React.FC<AboutCrecProps> = ({
  fontFamily = "Inter",
  titleColor = "#1A202C",
  titleText = "À propos de nous",
  paragraph1 = "Le cabinet CREC, fondé et dirigé par **Slim Ben Mansour**, est bien plus qu'un simple cabinet comptable. Nous sommes le partenaire stratégique des entrepreneurs qui souhaitent allier rigueur administrative et ambition de croissance.",
  paragraph2 = "Notre philosophie est simple : la comptabilité ne doit plus être une contrainte, mais un outil de pilotage. En combinant expertise humaine et outils digitaux, nous redonnons aux dirigeants leur ressource la plus précieuse : le temps.",
  textColor = "#4A5568",
  backgroundColor = "#FFFFFF",
  mediaUrl1 = "",
  mediaAlt1 = "Cabinet CREC - Expertise comptable",
  mediaType1 = "video",
}) => {
  const titleStyle = {
    fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined,
    color: titleColor,
  } as React.CSSProperties;

  const textStyle = {
    fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined,
    color: textColor,
  } as React.CSSProperties;

  const renderParagraph = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} style={{ fontWeight: 700 }}>
          {part}
        </strong>
      ) : (
        part
      )
    );
  };

  return (
    <>
      <GoogleFontLoader fontName={fontFamily || ""} />
      <section
        className="w-full py-16 md:py-20 overflow-hidden"
        style={{ backgroundColor }}
        data-component="true"
        data-id="about-crec"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            {/* Left column - Text content */}
            <div className="w-full lg:w-1/2 space-y-6">
              {/* Champs cachés éditables */}
              <div data-editable="true" data-id="-fontFamily" data-label="Police" data-type="font" style={{ display: "none" }}>
                {fontFamily}
              </div>
              <div data-editable="true" data-id="-titleColor" data-label="Couleur du titre" data-type="color" style={{ display: "none" }}>
                {titleColor}
              </div>
              <div data-editable="true" data-id="-textColor" data-label="Couleur du texte" data-type="color" style={{ display: "none" }}>
                {textColor}
              </div>
              <div data-editable="true" data-id="-backgroundColor" data-label="Couleur de fond" data-type="color" style={{ display: "none" }}>
                {backgroundColor}
              </div>
              <div data-editable="true" data-id="-mediaUrl1" data-label="Vidéo/Image" data-type="media" style={{ display: "none" }}>
                {mediaUrl1}
              </div>
              <div data-editable="true" data-id="-mediaAlt1" data-label="Texte alternatif média" data-type="text" style={{ display: "none" }}>
                {mediaAlt1}
              </div>
              <div data-editable="true" data-id="-mediaType1" data-label="Type média" data-type="string" style={{ display: "none" }}>
                {mediaType1}
              </div>

              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight"
                style={titleStyle}
                data-editable="true"
                data-id="-titleText"
                data-label="Titre"
              >
                {titleText}
              </h2>

              <p
                className="text-base md:text-lg leading-relaxed"
                style={{ ...textStyle, lineHeight: 1.7 }}
                data-editable="true"
                data-id="-paragraph1"
                data-label="Premier paragraphe"
              >
                {renderParagraph(paragraph1)}
              </p>

              <p
                className="text-base md:text-lg leading-relaxed"
                style={{ ...textStyle, lineHeight: 1.7 }}
                data-editable="true"
                data-id="-paragraph2"
                data-label="Deuxième paragraphe"
              >
                {renderParagraph(paragraph2)}
              </p>
            </div>

            {/* Right column - Video container */}
            <div className="w-full lg:w-1/2">
              <div
                className="relative rounded-xl overflow-hidden shadow-lg"
                style={{ boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)" }}
              >
                <div className="relative w-full aspect-[4/3] overflow-hidden rounded-xl">
                  {mediaUrl1 && mediaUrl1.trim() !== "" ? (
                    mediaType1 === "video" ? (
                      <>
                        <video
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="w-full h-full object-cover"
                          preload="metadata"
                        >
                          <source src={mediaUrl1} type="video/mp4" />
                          <source src={mediaUrl1} type="video/webm" />
                          <source src={mediaUrl1} type="video/ogg" />
                          Votre navigateur ne supporte pas la lecture de vidéos.
                        </video>
                        <div className="absolute inset-0 pointer-events-none" />
                      </>
                    ) : (
                      <>
                        <Image
                          src={mediaUrl1}
                          alt={mediaAlt1}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          width={800}
                          height={600}
                        />
                        <div className="absolute inset-0 pointer-events-none"  />
                      </>
                    )
                  ) : (
                    <div className="w-full h-full bg-neutral-400 flex items-center justify-center">
                      <span className="text-white text-sm">Média non configuré</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AboutCrec;
