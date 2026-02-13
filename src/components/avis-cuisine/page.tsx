"use client";

import React, { useState, useEffect, useRef } from "react";
import { GoogleFontLoader } from "@/components/bande/google-font-loader";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useSiteLink } from "@/hooks/use-site-link";
import { useSiteId } from "@/hooks/use-site-id";
import Image from "next/image";
import Link from "next/link";

interface AvisCuisineReview {
  id: number;
  name: string;
  text: string;
  rating: number;
  cardType: "A" | "B";
  avatarUrl?: string;
  role?: string;
  dateRelative?: string;
  dateISO?: string;
}

interface AvisCuisineProps {
  backgroundColor: string;
  cardTypeAColor: string;
  cardTypeBColor: string;
  buttonBackgroundColor: string;
  textColor: string;
  textOnDarkColor: string;
  starColorOnLight: string;
  starColorOnDark: string;
  fontFamily: string;
  secondaryFontFamily: string;
  titleText: string;
  googleBadgeText: string;
  reviewsCountText: string;
  reviews: AvisCuisineReview[];
  mediaUrl1?: string;
  mediaAlt1?: string;
  mediaType1?: string;
  buttonText?: string;
  buttonHref?: string;
  dataSource?: "mock" | "google" | "serpapi";
  apiKey?: string;
  placeId?: string;
  reviewsLimit?: number;
  ratingValue?: number;
  ratingCount?: number;
}

const clampRating = (value?: number) => {
  if (typeof value !== "number" || isNaN(value)) return 5;
  return Math.max(0, Math.min(5, Math.round(value)));
};

// Calcule une date relative lisible ("il y a X jours/mois/ans") à partir d'une date ISO
function getRelativeDate(dateString?: string): string | undefined {
  if (!dateString) return undefined;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return undefined;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return "hier";
  if (diffDays < 7) return `il y a ${diffDays} jours`;
  if (diffDays < 30) {
    const w = Math.floor(diffDays / 7);
    return `il y a ${w} semaine${w > 1 ? 's' : ''}`;
  }
  if (diffDays < 365) {
    const m = Math.floor(diffDays / 30);
    return `il y a ${m} mois`;
  }
  const y = Math.floor(diffDays / 365);
  return `il y a ${y} an${y > 1 ? 's' : ''}`;
}

const AvisCuisine: React.FC<AvisCuisineProps> = ({
  backgroundColor = "#FFFFFF",
  cardTypeAColor = "#F3F3F3",
  cardTypeBColor = "#122D42",
  buttonBackgroundColor = "#F4F4F4",
  textColor = "#1A1A1A",
  textOnDarkColor = "#FFFFFF",
  starColorOnLight = "#000000",
  starColorOnDark = "#FFFFFF",
  fontFamily = "Inter",
  secondaryFontFamily = "Bodoni",
  titleText = "Nos Avis Client",
  googleBadgeText = "Noté 5/5 sur",
  reviewsCountText = "Basé sur 35 avis",
  reviews = [],
  mediaUrl1,
  mediaAlt1 = "",
  mediaType1 = "image",
  buttonText = "Laissez un avis",
  buttonHref = "#",
  dataSource = "mock",
  apiKey,
  placeId,
  reviewsLimit = 20,
  ratingValue = 5,
  ratingCount = 35,
}) => {
  const { transformLink } = useSiteLink();
  const siteId = useSiteId();
  const isMobile = useIsMobile();
  const sliderRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  // État pour les avis chargés depuis l'API et les stats agrégées
  const [apiReviews, setApiReviews] = useState<AvisCuisineReview[]>([]);
  const [apiStats, setApiStats] = useState<{ totalReviews: number; averageRating: number; source: string }>({
    totalReviews: ratingCount,
    averageRating: ratingValue,
    source: "Données locales",
  });
  const [isLoading, setIsLoading] = useState(false);
  // Détecter si on est sur tablette (entre 768px et 1024px)
  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    const checkTablet = () => {
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    checkTablet();
    window.addEventListener("resize", checkTablet);
    return () => window.removeEventListener("resize", checkTablet);
  }, []);
  // Charger les avis depuis l'API si configuré
  useEffect(() => {
    const fetchReviews = async () => {
      if (dataSource !== "mock" && (!apiKey || !placeId)) {
        setApiReviews([]);
        setApiStats({ totalReviews: ratingCount, averageRating: ratingValue, source: "Configuration incomplète" });
        return;
      }

      if (dataSource === "mock") {
        setApiReviews([]);
        setApiStats({ totalReviews: ratingCount, averageRating: ratingValue, source: "Données locales" });
        return;
      }

      if (!siteId) {
        setApiReviews([]);
        setApiStats({ totalReviews: ratingCount, averageRating: ratingValue, source: "Site non initialisé" });
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteId,
            placeId,
            limit: reviewsLimit,
            forceRefresh: true,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const filtered = (data.reviews || []).filter((rev: any) =>
          typeof rev.testimonial === "string" && rev.testimonial.trim().length > 0 &&
          !rev.testimonial.includes("NO QUERY SPECIFIED") &&
          !rev.testimonial.includes("EXAMPLE REQUEST")
        );
        const mapped: AvisCuisineReview[] = filtered.map((rev: any, idx: number) => {
          const epochSeconds = Number(rev.time);
          const hasEpoch = !isNaN(epochSeconds) && epochSeconds > 100000;
          const dateISO = hasEpoch ? new Date(epochSeconds * 1000).toISOString() : (rev.date ? String(rev.date) : undefined);
          const dateRelative = (rev.relative_time_description || rev.relativeTime || rev.timeDescription || rev.timeAgo) ? String(rev.relative_time_description || rev.relativeTime || rev.timeDescription || rev.timeAgo) : undefined;
          return {
            id: idx + 1000,
            name: String(rev.by || rev.author || ""),
            text: String(rev.testimonial || ""),
            rating: clampRating(Number(rev.rating)),
            cardType: idx % 2 === 0 ? "A" : "B",
            avatarUrl: String(rev.imgSrc || rev.authorImage || ""),
            role: "",
            dateISO,
            dateRelative,
          };
        });
        // Filtrer pour ne garder que les avis avec 4 étoiles et plus
        const filteredByRating = mapped.filter(r => r.rating >= 4);
        // Trier par date (les plus récents en premier)
        const sortedByDate = filteredByRating.sort((a, b) => {
          const dateA = a.dateISO ? new Date(a.dateISO).getTime() : 0;
          const dateB = b.dateISO ? new Date(b.dateISO).getTime() : 0;
          // Si pas de date, mettre à la fin
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          // Tri décroissant (plus récent en premier)
          return dateB - dateA;
        });
        setApiReviews(sortedByDate);
        setApiStats({
          totalReviews: data.totalReviews ?? ratingCount,
          averageRating: data.averageRating ?? ratingValue,
          source: data.source ?? "API",
        });
      } catch (e) {
        console.error("Erreur chargement avis:", e);
        setApiReviews([]);
        setApiStats({ totalReviews: ratingCount, averageRating: ratingValue, source: "Erreur de chargement" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource, apiKey, placeId, reviewsLimit, siteId]);
  // Utiliser les avis de l'API si disponibles, sinon les avis statiques
  const displayReviews = apiReviews.length > 0 ? apiReviews : reviews;
  const displayRatingValue = apiReviews.length > 0 ? apiStats.averageRating : ratingValue;
  const displayRatingCount = apiReviews.length > 0 ? apiStats.totalReviews : ratingCount;

  // Formattage relatif en FR (fallback si aucune dateRelative fournie par l'API)
  const toRelative = (isoString: string): string | undefined => {
    if (!isoString) return undefined;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return undefined;
    const now = Date.now();
    const diffSec = Math.floor((now - d.getTime()) / 1000);
    if (diffSec < 0) return undefined;
    const minute = 60;
    const hour = 60 * minute;
    const day = 24 * hour;
    const month = 30 * day;
    const year = 365 * day;
    if (diffSec < minute) return "il y a quelques secondes";
    if (diffSec < hour) {
      const m = Math.floor(diffSec / minute);
      return `il y a ${m} minute${m > 1 ? 's' : ''}`;
    }
    if (diffSec < day) {
      const h = Math.floor(diffSec / hour);
      return `il y a ${h} heure${h > 1 ? 's' : ''}`;
    }
    if (diffSec < month) {
      const dcount = Math.floor(diffSec / day);
      return `il y a ${dcount} jour${dcount > 1 ? 's' : ''}`;
    }
    if (diffSec < year) {
      const mo = Math.floor(diffSec / month);
      return `il y a ${mo} mois`;
    }
    const y = Math.floor(diffSec / year);
    return `il y a ${y} an${y > 1 ? 's' : ''}`;
  };
  
  const getDisplayDate = (r: AvisCuisineReview): string | undefined => {
    return r?.dateRelative || (r?.dateISO ? toRelative(r.dateISO) : undefined);
  };

  // Calculer la largeur d'une carte selon la taille d'écran
  const getCardWidth = () => {
    if (isMobile) return 280 + 12; // 280px + gap 12px
    if (isTablet) return 300 + 16; // 300px + gap 16px
    return 320 + 20; // 320px + gap 20px
  };

  // Animation automatique du slider avec défilement infini continu
  useEffect(() => {
    if (displayReviews.length === 0 || !sliderRef.current) return;

    const cardWidth = getCardWidth();
    const totalWidth = cardWidth * displayReviews.length;

    const interval = setInterval(() => {
      setScrollPosition((prev) => {
        const newPos = prev + 0.5; // Vitesse de défilement
        // Réinitialiser de manière invisible quand on atteint la fin de la première série
        // On réinitialise avant d'atteindre totalWidth pour éviter le saut visible
        if (newPos >= totalWidth) {
          return newPos - totalWidth; // Réinitialiser à la position relative dans la première série
        }
        return newPos;
      });
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [displayReviews.length, isMobile, isTablet]);
  // Appliquer la position de scroll sans transition pour une animation continue fluide
  useEffect(() => {
    if (sliderRef.current) {
      // Pas de transition CSS pour éviter toute interruption dans l'animation
      sliderRef.current.style.transition = "none";
      sliderRef.current.style.transform = `translateX(-${scrollPosition}px)`;
    }
  }, [scrollPosition]);
  // Fonction pour rendre les étoiles
  const renderStars = (rating: number, isDark: boolean) => {
    const stars = [];
    const starColor = isDark ? "#FFFFFF" : starColorOnLight;
    for (let i = 0; i < 5; i++) {
      stars.push(
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={i < rating ? starColor : "none"}
          stroke={starColor}
          strokeWidth="2"
          style={{ color: starColor }}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    }
    return stars;
  };

  // Styles pour les polices
  const titleStyle = {
    fontFamily: secondaryFontFamily ? `'${secondaryFontFamily}', serif` : undefined,
  } as React.CSSProperties;

  const textStyle = {
    fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined,
  } as React.CSSProperties;


  return (
    <>
      <GoogleFontLoader fontName={fontFamily || ""} />
      <GoogleFontLoader fontName={secondaryFontFamily || ""} />
      
      {/* Éléments cachés pour exposer les couleurs et médias */}
      <div style={{ display: "none" }}>
        <div data-editable="true" data-id="-backgroundColor" data-label="Couleur de fond" data-type="color" style={{ backgroundColor }} />
        <div data-editable="true" data-id="-cardTypeAColor" data-label="Couleur carte type A" data-type="color" style={{ backgroundColor: cardTypeAColor }} />
        <div data-editable="true" data-id="-cardTypeBColor" data-label="Couleur carte type B" data-type="color" style={{ backgroundColor: cardTypeBColor }} />
        <div data-editable="true" data-id="-buttonBackgroundColor" data-label="Couleur fond boutons" data-type="color" style={{ backgroundColor: buttonBackgroundColor }} />
        <div data-editable="true" data-id="-textColor" data-label="Couleur texte clair" data-type="color" style={{ color: textColor }} />
        <div data-editable="true" data-id="-textOnDarkColor" data-label="Couleur texte sur fond sombre" data-type="color" style={{ color: textOnDarkColor }} />
        <div data-editable="true" data-id="-starColorOnLight" data-label="Couleur étoiles sur fond clair" data-type="color" style={{ color: starColorOnLight }} />
        <div data-editable="true" data-id="-starColorOnDark" data-label="Couleur étoiles sur fond sombre" data-type="color" style={{ color: starColorOnDark }} />
        {mediaUrl1 && (
          <div data-editable="true" data-id="-mediaUrl1" data-label="Logo Google" data-type="media">
            {mediaType1 === "image" ? (
              <Image src={mediaUrl1} alt={mediaAlt1} width={100} height={100} />
            ) : (
              <video src={mediaUrl1} />
            )}
          </div>
        )}
        {/* Éléments cachés - Service Avis */}
        <div style={{ display: "none" }} data-editable="true" data-id="-dataSource" data-type="service" data-label="Source des avis" data-enum="mock,google,serpapi" data-enum-labels="mock:Données factices,google:Google My Business,serpapi:SERPAPI">
          {dataSource}
        </div>
        <div style={{ display: "none" }} data-editable="true" data-id="-apiKey" data-type="service" data-label="Clé API (Google)" data-visible-if="dataSource:google">
          {apiKey || ""}
        </div>
        <div style={{ display: "none" }} data-editable="true" data-id="-placeId" data-type="service" data-label="Place ID (Google)" data-visible-if="dataSource:google">
          {placeId || ""}
        </div>
        <div style={{ display: "none" }} data-editable="true" data-id="-reviewsLimit" data-type="service" data-label="Nombre d'avis">
          {String(reviewsLimit)}
        </div>
        <div style={{ display: "none" }} data-editable="true" data-id="-ratingValue" data-label="Note moyenne">
          {String(displayRatingValue)}
        </div>
        <div style={{ display: "none" }} data-editable="true" data-id="-ratingCount" data-label="Nombre d'avis">
          {String(displayRatingCount)}
        </div>
      </div>

      <section
        style={{ backgroundColor }}
        className="pt-6 lg:pt-4 pb-6"
      >
        <div className="w-full">
          {/* En-tête de section */}
            <header className="text-center mb-8 md:mb-10 lg:mb-12">
            <h2
              data-editable="true"
              data-id="-titleText"
              data-label="Titre principal"
              data-type="text"
              className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-5 leading-tight"
              style={{
                ...titleStyle,
                color: textColor,
              }}
            >
              <span style={{ fontFamily: `'${fontFamily}', sans-serif`, fontWeight: "bold" }}>
                {titleText.split(" ")[0]}{" "}
              </span>
              <span style={{ fontFamily: `'${secondaryFontFamily}', serif`, fontStyle: "italic" }}>
                {titleText.split(" ").slice(1).join(" ")}
              </span>
            </h2>

            <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
              {/* Étoiles */}
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill={starColorOnLight}
                    style={{ color: starColorOnLight }}
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <span
                className="text-sm md:text-base font-medium"
                style={{
                  ...textStyle,
                  color: textColor,
                }}
              >
                {googleBadgeText}
              </span>
              {mediaUrl1 ? (
                <div
                  data-editable="true"
                  data-id="-mediaUrl1"
                  data-label="Logo Google"
                  data-type="media"
                  className="inline-block ml-1"
                >
                  {mediaType1 === "image" ? (
                    <Image
                      src={mediaUrl1}
                      alt={mediaAlt1 || "Google"}
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  ) : (
                    <video src={mediaUrl1} width={24} height={24} autoPlay loop muted />
                  )}
                </div>
              ) : (
                <div className="inline-block ml-1 align-middle">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                </div>
              )}
            </div>

            <p
              className="text-sm md:text-base font-medium"
              style={{
                ...textStyle,
                color: textColor,
              }}
            >
              {reviewsCountText.includes("35") ? `Basé sur ${displayRatingCount} avis` : reviewsCountText}
            </p>
          </header>

          {/* Slider d'avis */}
          <div className="relative mb-1 md:mb-2 overflow-hidden pb-16 md:pb-5 min-h-[400px] md:min-h-[500px] lg:min-h-[600px]">
            <div
              ref={sliderRef}
              className="flex gap-3 md:gap-4 lg:gap-5 w-fit will-change-transform items-start"
            >
              {/* Dupliquer les cartes plusieurs fois pour l'effet infini continu */}
              {[...displayReviews, ...displayReviews, ...displayReviews].map((review, index) => {
                // Alterner automatiquement entre blanc (A) et bleu (B) basé sur l'index global
                // Index pair (0, 2, 4...) = blanc, index impair (1, 3, 5...) = bleu
                const isDark = index % 2 === 1;
                const cardBg = isDark ? (cardTypeBColor || "#122D42") : (cardTypeAColor || "#F3F3F3");
                const cardTextColor = isDark ? (textOnDarkColor || "#FFFFFF") : (textColor || "#1A1A1A");
                const starColor = isDark ? (starColorOnDark || "#FFFFFF") : (starColorOnLight || "#000000");
                // Position verticale : cartes blanches en haut, cartes bleues en bas
                const isBottom = isDark;

                return (
                  <div
                    key={`${review.id}-${index}`}
                    className="w-[280px] md:w-[300px] lg:w-[320px] h-[240px] md:h-[260px] lg:h-[280px] rounded p-4 md:p-5 lg:p-6 flex flex-col box-border"
                    style={{
                      backgroundColor: cardBg,
                      boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.15)" : "0 4px 12px rgba(0,0,0,0.1)",
                      transform: isBottom ? (isMobile ? "translateY(150px)" : isTablet ? "translateY(180px)" : "translateY(210px)") : (isMobile ? "translateY(-5px)" : "translateY(-10px)"),
                      zIndex: isDark ? 2 : 1,
                      border: isDark ? "none" : "1px solid rgba(0,0,0,0.05)",
                    }}
                  >
                    {/* Avatar et nom */}
                    <div className="flex items-center gap-3 mb-4">
                      {review.avatarUrl ? (
                        <img
                          src={review.avatarUrl}
                          alt={review.name}
                          width={40}
                          height={40}
                          className="rounded-full object-cover object-top"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src.includes('lh3.googleusercontent.com') && !(target as any).dataset?.retried) {
                              (target as any).dataset = { ...(target as any).dataset, retried: 'true' };
                              target.src = target.src.split('=')[0];
                            } else {
                              target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ccc'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E`;
                              (target.style as any).backgroundColor = '#eee';
                            }
                          }}
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                          style={{
                            backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)",
                            color: cardTextColor,
                          }}
                        >
                          {review.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span
                          className="text-xs md:text-sm lg:text-base font-semibold"
                          style={{
                            ...textStyle,
                            color: cardTextColor,
                          }}
                        >
                          {review.name}
                        </span>
                        {review.role && (
                          <span
                            className="text-xs opacity-60"
                            style={{
                              ...textStyle,
                              color: cardTextColor,
                            }}
                          >
                            {review.role}
                          </span>
                        )}
                        {getDisplayDate(review) && (
                          <span
                            className="text-xs opacity-60"
                            style={{
                              ...textStyle,
                              color: cardTextColor,
                            }}
                          >
                            {getDisplayDate(review)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Étoiles */}
                    <div className="flex gap-1 mb-4">
                      {renderStars(review.rating, isDark)}
                    </div>

                    {/* Texte de l'avis */}
                    <p
                      className="text-xs md:text-sm lg:text-sm leading-relaxed flex-1 overflow-hidden"
                      style={{
                        ...textStyle,
                        color: cardTextColor,
                      }}
                    >
                      {review.text}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Bouton "Laissez un avis" */}
            <div className="flex justify-center absolute bottom-0 md:bottom-6 w-full">
              <Link
                href={transformLink(buttonHref)}
                className="inline-flex items-center justify-center px-6 py-3 md:px-8 md:py-4 rounded-full font-medium transition-all duration-300 hover:scale-105 shadow-md"
                style={{
                  backgroundColor: buttonBackgroundColor,
                  color: textColor,
                  fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined,
                }}
                data-editable="true"
                data-id="-buttonHref"
                data-label="Lien bouton"
                data-type="link"
              >
                <span
                  data-editable="true"
                  data-id="-buttonText"
                  data-label="Texte bouton"
                  className="text-sm md:text-base"
                >
                  {buttonText}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AvisCuisine;
