"use client";

import React, { useMemo, useState, FormEvent } from "react";
import { GoogleFontLoader } from "@/components/bande/google-font-loader";
import { useSiteId } from "@/hooks/use-site-id";

export interface PhoneCrecProps {
  fontFamily: string;
  title1: string;
  title2: string;
  subtitle: string;
  title1Color: string;
  title2Color: string;
  subtitleColor: string;
  backgroundColor: string;
  inputPlaceholderName: string;
  inputPlaceholderPhone: string;
  inputBgColor: string;
  buttonArrowColor: string;
  mediaUrl1: string;
  mediaAlt1: string;
}

const PhoneCrec: React.FC<PhoneCrecProps> = ({
  fontFamily = "Inter",
  title1 = "Besoin d'un conseil ?",
  title2 = "Entrez votre numéro et on s'occupe du reste.",
  subtitle = "Un expert vous recontacte dans les plus brefs délais",
  title1Color = "#FFFFFF",
  title2Color = "#FFFFFF",
  subtitleColor = "#FFFFFF",
  backgroundColor = "#1E3A5F",
  inputPlaceholderName = "Nom",
  inputPlaceholderPhone = "(+216) 71 324 567",
  inputBgColor = "#E8E8E8",
  buttonArrowColor = "#2C4270",
  mediaUrl1 = "",
  mediaAlt1 = "Fond bandeau conseil",
}) => {
  const siteId = useSiteId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const textStyle = useMemo(
    () => ({ fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined }),
    [fontFamily]
  );
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setMessage("Veuillez remplir le nom et le numéro.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const url = siteId
        ? `/api/sharedServices/phone?siteId=${encodeURIComponent(siteId)}`
        : "/api/sharedServices/phone";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          siteId: siteId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMessage(data.message || "Demande envoyée.");
        setStatus("success");
        setName("");
        setPhone("");
      } else {
        setMessage(data.error || "Erreur lors de l'envoi.");
        setStatus("error");
      }
    } catch {
      setMessage("Erreur de connexion.");
      setStatus("error");
    }
  };

  const hasBg = mediaUrl1 && mediaUrl1.trim() !== "";
  const aspectRatio = "1576 / 363";

  return (
    <>
      <GoogleFontLoader fontName={fontFamily || ""} />

      {/* Éléments cachés pour édition MajoliHub - strict minimum */}
      <div style={{ display: "none" }} data-editable="true" data-id="-fontFamily" data-label="Police" data-type="font">{fontFamily || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-title1" data-label="Titre 1" data-type="text">{title1 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-title2" data-label="Titre 2" data-type="text">{title2 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-subtitle" data-label="Sous-titre" data-type="text">{subtitle || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-title1Color" data-label="Couleur titre 1" data-type="string">{title1Color || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-title2Color" data-label="Couleur titre 2" data-type="string">{title2Color || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-subtitleColor" data-label="Couleur sous-titre" data-type="string">{subtitleColor || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-inputPlaceholderName" data-label="Placeholder nom" data-type="text">{inputPlaceholderName || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-inputPlaceholderPhone" data-label="Placeholder tél" data-type="text">{inputPlaceholderPhone || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-inputBgColor" data-label="Couleur champs" data-type="string">{inputBgColor || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-backgroundColor" data-label="Couleur de fond" data-type="string">{backgroundColor || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-buttonArrowColor" data-label="Couleur flèche" data-type="string">{buttonArrowColor || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaUrl1" data-label="Image de fond" data-type="media">{mediaUrl1 || ""}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-mediaAlt1" data-label="Alt image" data-type="text">{mediaAlt1 || ""}</div>

      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-10 xl:px-12 p-6" style={textStyle}>
        <div className="w-full max-w-[1200px] lg:max-w-[1400px] xl:max-w-[1600px] mx-auto">
          <section
            className="relative w-full overflow-hidden rounded-2xl md:rounded-xl flex min-h-0 isolate min-h-[200px] sm:min-h-[220px] md:min-h-0"
            style={{
              aspectRatio,
              ...textStyle,
            }}
          >
            {/* Téléphone : fond coloré uniquement, bords bien arrondis */}
            <div
              className="absolute inset-0 z-0 rounded-2xl md:rounded-xl pointer-events-none md:hidden"
              style={{ backgroundColor: backgroundColor || "#1E3A5F" }}
            />
            {/* Desktop : image si fournie, sinon fond coloré */}
            {hasBg ? (
              <div className="absolute inset-0 z-0 rounded-xl overflow-hidden hidden md:block">
                <img
                  src={mediaUrl1}
                  alt={mediaAlt1}
                  className="absolute inset-0 w-full h-full object-cover block pointer-events-none"
                  style={{ objectFit: "cover" }}
                />
              </div>
            ) : (
              <div
                className="absolute inset-0 z-0 rounded-xl pointer-events-none hidden md:block"
                style={{ backgroundColor: backgroundColor || "#1E3A5F" }}
              />
            )}

            <div className="relative z-10 w-full h-full min-h-0 overflow-hidden flex flex-col md:flex-row md:items-start md:justify-between gap-2 sm:gap-3 lg:gap-4 m-4 sm:m-5 md:m-6 lg:m-8 xl:m-12 box-border">
              <div className="flex-shrink-0 min-w-0 w-full md:max-w-[calc(100%-1rem)]">
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold leading-tight mb-0.5 md:mb-1" style={{ color: title1Color, ...textStyle }}>
                  {title1}
                </h2>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-normal leading-tight mb-1 md:mb-2" style={{ color: title2Color, ...textStyle }}>
                  {title2}
                </p>
                <p className="text-xs sm:text-sm mb-2 sm:mb-3 md:mb-4" style={{ color: subtitleColor, ...textStyle }}>
                  {subtitle}
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                  <div className="flex rounded-md overflow-hidden border-0 w-full sm:w-auto sm:max-w-[160px] md:max-w-[180px] lg:max-w-[200px]" style={{ backgroundColor: inputBgColor }}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={inputPlaceholderName}
                      className="flex-1 min-w-0 w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm border-0 bg-transparent outline-none focus:ring-2 focus:ring-offset-0 text-gray-800 placeholder-gray-500"
                      style={{ ...textStyle }}
                    />
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 transition-opacity hover:opacity-80 disabled:opacity-50 bg-transparent"
                      style={{ color: buttonArrowColor }}
                      aria-label="Envoyer"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex rounded-md overflow-hidden border-0 w-full sm:w-auto sm:max-w-[180px] md:max-w-[200px] lg:max-w-[220px]" style={{ backgroundColor: inputBgColor }}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={inputPlaceholderPhone}
                      className="flex-1 min-w-0 w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm border-0 bg-transparent outline-none focus:ring-2 focus:ring-offset-0 text-gray-800 placeholder-gray-500"
                      style={{ ...textStyle }}
                    />
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 transition-opacity hover:opacity-80 disabled:opacity-50 bg-transparent"
                      style={{ color: buttonArrowColor }}
                      aria-label="Envoyer"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  </div>
                </form>

                {status === "success" && message && (
                  <p className="mt-2 text-xs" style={{ color: "#90EE90" }}>{message}</p>
                )}
                {status === "error" && message && (
                  <p className="mt-2 text-xs" style={{ color: "#FFB6B6" }}>{message}</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default PhoneCrec;
