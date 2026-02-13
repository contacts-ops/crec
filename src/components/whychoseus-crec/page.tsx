"use client";

import React from "react";
import { GoogleFontLoader } from "@/components/bande/google-font-loader";

interface WhychoseusCrecProps {
  fontFamily?: string;
  backgroundColor?: string;
  titleColor?: string;
  titleText?: string;
  headingColor?: string;
  textColor?: string;
  feature1Title?: string;
  feature1Description?: string;
  feature1IconBg?: string;
  feature1IconColor?: string;
  feature2Title?: string;
  feature2Description?: string;
  feature2IconBg?: string;
  feature2IconColor?: string;
  feature3Title?: string;
  feature3Description?: string;
  feature3IconBg?: string;
  feature3IconColor?: string;
}

const WhychoseusCrec: React.FC<WhychoseusCrecProps> = ({
  fontFamily = "Inter",
  backgroundColor = "#FFFFFF",
  titleColor = "#1A202C",
  titleText = "Pourquoi choisir CREC ?",
  headingColor = "#1A202C",
  textColor = "#4A5568",
  feature1Title = "Liberté Totale",
  feature1Description = "\"Nous nous occupons de vos papiers, vous vous concentrez sur votre business.\" C'est notre promesse quotidienne.",
  feature1IconBg = "#E0F2FE",
  feature1IconColor = "#2B6CB0",
  feature2Title = "Proximité Digitale",
  feature2Description = "Grâce à nos outils collaboratifs, vous suivez votre activité en temps réel. Slim et son équipe restent disponibles pour des conseils personnalisés, en physique ou en visio.",
  feature2IconBg = "#D4F7DD",
  feature2IconColor = "#38A169",
  feature3Title = "Réactivité",
  feature3Description = "Dans le monde des affaires, chaque minute compte. Le cabinet CREC s'engage à répondre à vos interrogations avec agilité et précision.",
  feature3IconBg = "#EADBF9",
  feature3IconColor = "#805AD5",
}) => {
  const titleStyle = {
    fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined,
    color: titleColor,
  } as React.CSSProperties;

  const headingStyle = {
    fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined,
    color: headingColor,
  } as React.CSSProperties;

  const textStyle = {
    fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined,
    color: textColor,
  } as React.CSSProperties;

  const features = [
    {
      title: feature1Title,
      description: feature1Description,
      iconBg: feature1IconBg,
      iconColor: feature1IconColor,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      id: "-feature1",
    },
    {
      title: feature2Title,
      description: feature2Description,
      iconBg: feature2IconBg,
      iconColor: feature2IconColor,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      id: "-feature2",
    },
    {
      title: feature3Title,
      description: feature3Description,
      iconBg: feature3IconBg,
      iconColor: feature3IconColor,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      id: "-feature3",
    },
  ];

  return (
    <>
      <GoogleFontLoader fontName={fontFamily || ""} />
      <section
        className="w-full py-16 md:py-20 overflow-hidden"
        style={{ backgroundColor }}
        data-component="true"
        data-id="whychoseus-crec"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          {/* Champs cachés éditables */}
          <div data-editable="true" data-id="-fontFamily" data-label="Police" data-type="font" style={{ display: "none" }}>
            {fontFamily}
          </div>
          <div data-editable="true" data-id="-backgroundColor" data-label="Couleur de fond" data-type="color" style={{ display: "none" }}>
            {backgroundColor}
          </div>
          <div data-editable="true" data-id="-titleColor" data-label="Couleur du titre" data-type="color" style={{ display: "none" }}>
            {titleColor}
          </div>
          <div data-editable="true" data-id="-headingColor" data-label="Couleur des sous-titres" data-type="color" style={{ display: "none" }}>
            {headingColor}
          </div>
          <div data-editable="true" data-id="-textColor" data-label="Couleur du texte" data-type="color" style={{ display: "none" }}>
            {textColor}
          </div>
          <div data-editable="true" data-id="-feature1IconBg" data-label="Couleur fond rond icône 1" data-type="color" style={{ display: "none" }}>
            {feature1IconBg}
          </div>
          <div data-editable="true" data-id="-feature1IconColor" data-label="Couleur icône 1" data-type="color" style={{ display: "none" }}>
            {feature1IconColor}
          </div>
          <div data-editable="true" data-id="-feature2IconBg" data-label="Couleur fond rond icône 2" data-type="color" style={{ display: "none" }}>
            {feature2IconBg}
          </div>
          <div data-editable="true" data-id="-feature2IconColor" data-label="Couleur icône 2" data-type="color" style={{ display: "none" }}>
            {feature2IconColor}
          </div>
          <div data-editable="true" data-id="-feature3IconBg" data-label="Couleur fond rond icône 3" data-type="color" style={{ display: "none" }}>
            {feature3IconBg}
          </div>
          <div data-editable="true" data-id="-feature3IconColor" data-label="Couleur icône 3" data-type="color" style={{ display: "none" }}>
            {feature3IconColor}
          </div>

          <h2
            className="text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16"
            style={titleStyle}
            data-editable="true"
            data-id="-titleText"
            data-label="Titre principal"
            data-type="text"
          >
            {titleText}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 lg:gap-16">
            {features.map((feature) => (
              <div key={feature.id} className="flex flex-col items-center text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
                  style={{ backgroundColor: feature.iconBg, color: feature.iconColor }}
                >
                  {feature.icon}
                </div>
                <h3
                  className="text-xl font-bold mb-4"
                  style={headingStyle}
                  data-editable="true"
                  data-id={`${feature.id}Title`}
                  data-label={`Titre ${feature.id.replace("-", "")}`}
                  data-type="text"
                >
                  {feature.title}
                </h3>
                <p
                  className="text-base leading-relaxed"
                  style={{ ...textStyle, lineHeight: 1.6 }}
                  data-editable="true"
                  data-id={`${feature.id}Description`}
                  data-label={`Description ${feature.id.replace("-", "")}`}
                  data-type="text"
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default WhychoseusCrec;
