"use client";

import React from "react";
import Link from "next/link";
import { useSiteLink } from "@/hooks/use-site-link";
import { GoogleFontLoader } from "@/components/bande/google-font-loader";

interface WhychoseCrecProps {
  fontFamily?: string;
  backgroundColor?: string;
  titleColor?: string;
  titleText?: string;
  subheadingColor?: string;
  subheadingText?: string;
  button1Text?: string;
  button1Url?: string;
  button1BgColor?: string;
  button1BorderColor?: string;
  button1TextColor?: string;
  button2Text?: string;
  button2Url?: string;
  button2BgColor?: string;
  button2BorderColor?: string;
  button2TextColor?: string;
}

const WhychoseCrec: React.FC<WhychoseCrecProps> = ({
  fontFamily = "Inter",
  backgroundColor = "#1A51FF",
  titleColor = "#FFFFFF",
  titleText = "Prêt à passer à l'étape supérieure ?",
  subheadingColor = "#FFFFFF",
  subheadingText = "Ne laissez plus l'administratif freiner vos projets.",
  button1Text = "Prendre rendez-vous avec Slim Ben Mansour",
  button1Url = "#",
  button1BgColor = "#FFFFFF",
  button1BorderColor = "#1A51FF",
  button1TextColor = "#1A51FF",
  button2Text = "Demander un devis gratuit",
  button2Url = "#",
  button2BgColor = "#1A51FF",
  button2BorderColor = "#FFFFFF",
  button2TextColor = "#FFFFFF",
}) => {
  const { transformLink } = useSiteLink();
  const titleStyle = {
    fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined,
    color: titleColor,
  } as React.CSSProperties;

  const subheadingStyle = {
    fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined,
    color: subheadingColor,
  } as React.CSSProperties;

  return (
    <>
      <GoogleFontLoader fontName={fontFamily || ""} />
      <section
        className="w-full py-16 md:py-20 overflow-hidden"
        style={{ backgroundColor }}
        data-component="true"
        data-id="whychose-crec"
      >
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 text-center">
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
          <div data-editable="true" data-id="-subheadingColor" data-label="Couleur du sous-titre" data-type="color" style={{ display: "none" }}>
            {subheadingColor}
          </div>
          <div data-editable="true" data-id="-button1Url" data-label="Lien bouton 1" data-type="link" style={{ display: "none" }}>
            {button1Url}
          </div>
          <div data-editable="true" data-id="-button2Url" data-label="Lien bouton 2" data-type="link" style={{ display: "none" }}>
            {button2Url}
          </div>
          <div data-editable="true" data-id="-button1BgColor" data-label="Fond bouton 1" data-type="color" style={{ display: "none" }}>
            {button1BgColor}
          </div>
          <div data-editable="true" data-id="-button1BorderColor" data-label="Bordure bouton 1" data-type="color" style={{ display: "none" }}>
            {button1BorderColor}
          </div>
          <div data-editable="true" data-id="-button1TextColor" data-label="Texte bouton 1" data-type="color" style={{ display: "none" }}>
            {button1TextColor}
          </div>
          <div data-editable="true" data-id="-button2BgColor" data-label="Fond bouton 2" data-type="color" style={{ display: "none" }}>
            {button2BgColor}
          </div>
          <div data-editable="true" data-id="-button2BorderColor" data-label="Bordure bouton 2" data-type="color" style={{ display: "none" }}>
            {button2BorderColor}
          </div>
          <div data-editable="true" data-id="-button2TextColor" data-label="Texte bouton 2" data-type="color" style={{ display: "none" }}>
            {button2TextColor}
          </div>

          <h2
            className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4"
            style={titleStyle}
            data-editable="true"
            data-id="-titleText"
            data-label="Titre"
            data-type="text"
          >
            {titleText}
          </h2>

          <p
            className="text-base md:text-lg mb-8 md:mb-10"
            style={subheadingStyle}
            data-editable="true"
            data-id="-subheadingText"
            data-label="Sous-titre"
            data-type="text"
          >
            {subheadingText}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href={transformLink(button1Url) || "#"}
              className="px-6 py-3 rounded-lg font-medium transition-shadow hover:shadow-lg"
              style={{
                backgroundColor: button1BgColor,
                borderWidth: 2,
                borderStyle: "solid",
                borderColor: button1BorderColor,
                color: button1TextColor,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
              data-editable="true"
              data-id="-button1Text"
              data-label="Texte bouton 1"
              data-type="text"
            >
              {button1Text}
            </Link>
            <Link
              href={transformLink(button2Url) || "#"}
              className="px-6 py-3 rounded-lg font-medium transition-shadow hover:shadow-lg"
              style={{
                backgroundColor: button2BgColor,
                borderWidth: 2,
                borderStyle: "solid",
                borderColor: button2BorderColor,
                color: button2TextColor,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
              data-editable="true"
              data-id="-button2Text"
              data-label="Texte bouton 2"
              data-type="text"
            >
              {button2Text}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default WhychoseCrec;
