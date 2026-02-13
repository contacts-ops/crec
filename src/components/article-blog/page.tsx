"use client";

import React, { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Copy,
  Edit,
  Trash,
  Link as LinkIcon,
  Facebook,
  Linkedin,
} from "lucide-react";
import { useBlogArticle } from "@/hooks/use-blog-articles";
import { useSiteLink } from "@/hooks/use-site-link";

interface ArticleBlogProps {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  titleColor: string;
  fontFamily: string;
  secondaryFontFamily: string;
  backgroundColor: string;
  paddingTop?: string;
  paddingBottom?: string;
}

const ArticleBlogContent: React.FC<ArticleBlogProps> = ({
  primaryColor = "#0A6251",
  secondaryColor = "#F9FAFB",
  textColor = "#374151",
  titleColor = "#0A6251",
  fontFamily = "serif",
  secondaryFontFamily = "Poppins",
  backgroundColor = "#FFFFFF",
  paddingTop = "",
  paddingBottom = "",
}) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // Prefer slug from pathname (/blog-page/<slug>), fallback to ?slug=
  const slugFromPath = React.useMemo(() => {
    if (!pathname) return null;
    const match = pathname.match(/\/(?:blog-page)\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [pathname]);
  const slug = slugFromPath || searchParams.get("slug");
  // Extract Mongo ObjectId (24-hex) from the slug suffix if present
  const id = React.useMemo(() => {
    if (!slug) return "";
    const match = slug.match(/[a-fA-F0-9]{24}$/);
    return match ? match[0] : "";
  }, [slug]);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [isAdmin] = useState(false);
  // Utiliser le hook pour récupérer l'article
  const { article: blog, loading, error } = useBlogArticle(id || "");
  // Utiliser le hook de transformation de lien dès le début pour respecter l'ordre des Hooks
  const {transformLink} = useSiteLink();
  // Déterminer le lien de retour selon le domaine
  const getBlogLink = React.useMemo(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      // Si on est sur blog.majoli.io, retourner à l'accueil
      if (hostname === "blog.majoli.io") {
        return "/";
      }
    }
    return "/blog";
  }, []);
  // Set page title from article title
  useEffect(() => {
    if (blog?.title && typeof document !== "undefined") {
      document.title = blog.title;
    }
  }, [blog?.title]);
  const handleCopyLink = () => {
    if (typeof window !== "undefined" && navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      const response = await fetch(`/api/blog/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        // Rediriger vers la liste des blogs ou l'accueil selon le domaine
        if (typeof window !== "undefined") {
          const redirectPath = getBlogLink;
          window.location.href = redirectPath;
        }
      } else {
        console.error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }
  };

  const handleEdit = () => {
    if (!id) return;
    // Rediriger vers la page d'édition
    if (typeof window !== "undefined") {
      window.location.href = `/edit-blog?id=${id}`;
    }
  };

  const getTagColor = (keyword: string) => {
    const colors = [
      "bg-yellow-200",
      "bg-green-200",
      "bg-blue-200",
      "bg-purple-200",
      "bg-pink-200",
      "bg-indigo-200",
    ];
    const index = keyword.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Fonction pour déterminer si le fond est sombre/noir (doit être avant les retours anticipés pour respecter l'ordre des hooks)
  const isDarkBackground = React.useMemo(() => {
    if (!backgroundColor) return false;
    
    // Convertir hex en RGB
    let r = 0, g = 0, b = 0;
    
    // Gérer les formats hex (3 ou 6 caractères)
    if (backgroundColor.startsWith('#')) {
      const hex = backgroundColor.replace('#', '');
      if (hex.length === 3) {
        // Format court #RGB -> #RRGGBB
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      } else {
        return false;
      }
    } else {
      // Si ce n'est pas un format hex, on considère que ce n'est pas sombre par défaut
      // (on pourrait ajouter la gestion de rgb() mais pour l'instant on se concentre sur hex)
      return false;
    }
    
    // Calculer la luminosité relative (formule standard)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    // Si la luminosité est inférieure à 0.5, le fond est sombre
    return luminance < 0.5;
  }, [backgroundColor]);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de l&apos;article...</p>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl text-red-600 mb-4">Erreur</h2>
          <p className="text-gray-600">{error || "Article non trouvé"}</p>
        </div>
      </div>
    );
  }

  // Couleurs de texte conditionnelles selon le fond
  const textColorClass = isDarkBackground ? "text-white" : "text-gray-600";
  const titleColorClass = isDarkBackground ? "text-white" : "text-black";
  const metadataColorClass = isDarkBackground ? "text-gray-300" : "text-gray-600";
  const borderColorClass = isDarkBackground ? "border-gray-700" : "border-gray-200";
  const tagTextColor = isDarkBackground ? "text-white" : "text-black";

  // Traiter le contenu pour gérer les balises [ml] et styliser les liens
  const processedContent = blog.content
    .replace(/\[ml\]/g, '<span class="text-yellow-600 font-bold">')
    .replace(/\[\/ml\]/g, "</span>")
    .replace(
      /<a /g,
      `<a class="text-[${primaryColor}] hover:text-white font-bold transition-colors" `
    );
  const titleStyle = {
    fontFamily: fontFamily ? `'${fontFamily}', serif` : undefined,
    color: isDarkBackground ? "#FFFFFF" : undefined,
  };

  const textStyle = {
    fontFamily: secondaryFontFamily
      ? `'${secondaryFontFamily}', sans-serif`
      : undefined,
    color: isDarkBackground ? "#FFFFFF" : undefined,
  };
  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{ 
        backgroundColor: backgroundColor, 
        paddingTop: paddingTop || undefined, 
        paddingBottom: paddingBottom || undefined 
      }}
      data-component="true"
      data-id="article-blog"
    >
      {/* Hidden elements for editable colors */}
      <div
        data-editable="true"
        data-id="article-primaryColor"
        data-label="Primary Color"
        style={{ display: "none" }}
      >
        {primaryColor}
      </div>
      <div
        data-editable="true"
        data-id="article-secondaryColor"
        data-label="Secondary color"
        style={{ display: "none" }}
      >
        {secondaryColor}
      </div>
      <div
        data-editable="true"
        data-id="article-textColor"
        data-label="Text color"
        style={{ display: "none" }}
      >
        {textColor}
      </div>
      <div
        data-editable="true"
        data-id="article-titleColor"
        data-label="Title color"
        style={{ display: "none" }}
      >
        {titleColor}
      </div>
      <div
        data-editable="true"
        data-id="article-backgroundColor"
        data-label="Background color"
        style={{ display: "none" }}
      >
        {backgroundColor}
      </div>
      <div
        data-editable="true"
        data-id="-paddingTop"
        data-label="Padding top au-dessus du bloc (en px)"
        data-type="string"
        style={{ display: "none" }}
      >
        {paddingTop || ""}
      </div>
      <div
        data-editable="true"
        data-id="-paddingBottom"
        data-label="Padding bottom en dessous du bloc (en px)"
        data-type="string"
        style={{ display: "none" }}
      >
        {paddingBottom || ""}
      </div>
      <div className="max-w-4xl mx-auto pt-12">
        {/* Fil d'Ariane */}
        <div className={`flex items-center gap-3 mb-8 ${textColorClass}`}>
          <a
            href={transformLink(getBlogLink)}
            className="hover:underline flex items-center gap-2"
          >
            Blog
            <ArrowUpRight size={16} />
          </a>
          {blog.keywords?.[0] && (
            <>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded-xl shadow font-bold ${getTagColor(
                    blog.keywords[0]
                  )} ${tagTextColor}`}
                >
                  {blog.keywords[0].charAt(0).toUpperCase() +
                    blog.keywords[0].slice(1)}
                </span>
                <ArrowUpRight size={16} />
              </div>
            </>
          )}
          <span className={`font-bold ${titleColorClass}`}>{blog.title}</span>
        </div>

        {/* Image principale */}
        {blog.image && (
          <div className="max-w-full mx-auto aspect-video overflow-hidden shadow-lg mb-8 rounded-lg">
            <img
              src={Array.isArray(blog.image) ? blog.image[0] : blog.image}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Mots-clés */}
        {blog.keywords && blog.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {blog.keywords.map((kw, i) => (
              <div
                key={i}
                className={`${tagTextColor} text-sm px-3 py-1 rounded-md ${getTagColor(
                  kw
                )} hover:opacity-80 transition-opacity`}
              >
                {kw}
              </div>
            ))}
          </div>
        )}

        {/* Titre */}
        <h1
          className={`text-3xl md:text-5xl font-bold mb-4 ${titleColorClass} leading-snug`}
          style={titleStyle}
        >
          {blog.title}
        </h1>

        {/* Métadonnées */}
        <div className={`flex items-center gap-6 mb-8 pb-4 border-b ${borderColorClass}`}>
          <div className={`flex items-center gap-2 text-sm ${metadataColorClass}`}>
            <span>
              Dernière modification le{" "}
              {blog.updatedAt
                ? new Date(blog.updatedAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Date inconnue"}
            </span>
          </div>
          <div className={`flex items-center gap-2 text-sm ${metadataColorClass}`}>
            <span>{blog.views} vues</span>
          </div>
        </div>

        {/* Contenu */}
        <div className="prose prose-lg max-w-none pb-12" style={textStyle}>
          <div
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        </div>

        {/* Boutons d'action */}
        <div className={`flex justify-between items-center pb-8 pt-8 border-t ${borderColorClass}`}>
          <div className="flex gap-4">
            {isAdmin && (
              <>
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit size={16} /> Modifier
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash size={16} /> Supprimer
                </button>
              </>
            )}
          </div>

          {/* Boutons de partage */}
          <div className="flex gap-4 items-center">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              title="Copier le lien"
            >
              <LinkIcon size={16} />
              <Copy size={16} />
            </button>

            <button
              onClick={() => setShowSharePopup(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: primaryColor, color: "white" }}
            >
              Partager
            </button>
          </div>
        </div>

        {/* Popup de partage */}
        {showSharePopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Partager l&apos;article</h3>
                <button
                  onClick={() => setShowSharePopup(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex gap-6 justify-center">
                  <button
                    onClick={() => {
                      const href =
                        typeof window !== "undefined"
                          ? window.location.href
                          : "";
                      const url = encodeURIComponent(href);
                      if (typeof window !== "undefined") {
                        window.open(
                          `https://www.facebook.com/sharer/sharer.php?u=${url}`,
                          "_blank"
                        );
                      }
                    }}
                    className="flex items-center justify-center w-12 h-12 bg-[#1877F2] text-white rounded-lg hover:bg-[#166FE5] hover:scale-110 transition-all duration-200"
                    title="Partager sur Facebook"
                  >
                    <Facebook size={20} />
                  </button>

                                     <button
                     onClick={() => {
                       const href =
                         typeof window !== "undefined"
                           ? window.location.href
                           : "";
                       const url = encodeURIComponent(href);
                       if (typeof window !== "undefined") {
                         window.open(
                           `https://twitter.com/intent/tweet?url=${url}`,
                           "_blank"
                         );
                       }
                     }}
                     className="flex items-center justify-center w-12 h-12 bg-black text-white rounded-lg hover:bg-gray-800 hover:scale-110 transition-all duration-200"
                     title="Partager sur X"
                   >
                     <svg
                       width="20"
                       height="20"
                       viewBox="0 0 24 24"
                       fill="currentColor"
                       className="text-white"
                     >
                       <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                     </svg>
                   </button>

                  <button
                    onClick={() => {
                      const href =
                        typeof window !== "undefined"
                          ? window.location.href
                          : "";
                      const url = encodeURIComponent(href);
                      if (typeof window !== "undefined") {
                        window.open(
                          `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
                          "_blank"
                        );
                      }
                    }}
                    className="flex items-center justify-center w-12 h-12 bg-[#0A66C2] text-white rounded-lg hover:bg-[#004182] hover:scale-110 transition-all duration-200"
                    title="Partager sur LinkedIn"
                  >
                    <Linkedin size={20} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={
                      typeof window !== "undefined" ? window.location.href : ""
                    }
                    readOnly
                    className="flex-1 px-3 py-2 border rounded-lg bg-gray-50"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: primaryColor, color: "white" }}
                  >
                    <Copy size={16} /> Copier
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>
        {`

        .blog-content img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 2rem auto;
          border-radius: 8px;
        }

        .blog-content h1, .blog-content h2, .blog-content h3,
        .blog-content h4, .blog-content h5, .blog-content h6 {
          line-height: 1.2;
          margin-top: 2rem;
          margin-bottom: 0.5rem;
          font-weight: bold;
          color: ${isDarkBackground ? "#FFFFFF" : "inherit"};
        }

        .blog-content h1 {
          font-size: 2rem;
          margin-top: 2rem;
        }

        .blog-content h2 {
          font-size: 1.75rem;
        }

        .blog-content h3 {
          font-size: 1.5rem;
        }

        .blog-content h4 {
          font-size: 1.25rem;
        }

        .blog-content h5 {
          font-size: 1.125rem;
        }

        .blog-content h6 {
          font-size: 1rem;
        }

        .blog-content p {
          line-height: 1.6;
          margin-bottom: 0.3rem;
          color: ${isDarkBackground ? "#FFFFFF" : "inherit"};
        }

        .blog-content p strong {
          font-weight: 700;
        }

        .blog-content ul, .blog-content ol {
          margin: 1rem 0;
          padding-left: 1.5rem;
          list-style-position: outside;
        }

        .blog-content ul {
          list-style: none; /* remove native bullets */
        }

        .blog-content ol {
          list-style-type: decimal;
        }

        .blog-content li {
          align-items: center;
          margin-bottom: 0.3rem;
          line-height: 1.2;
          gap: 0.5rem;
          color: ${isDarkBackground ? "#FFFFFF" : "inherit"};
        }

        .blog-content li::before {
          content: "•";
          color: ${primaryColor};
          font-size: 1.25rem;
          font-weight: bold;
          line-height: 1.2;
          margin-right: 0.5rem;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .blog-content li {
            flex-wrap: wrap;
          }
        }

        .blog-content a {
          color: ${primaryColor};
          text-decoration: underline;
        }

        .blog-content a:hover {
          opacity: 0.8;
        }

        .blog-content blockquote {
          border-left: 4px solid ${primaryColor};
          padding-left: 1rem;
          margin: 2rem 0;
          font-style: italic;
          color: ${isDarkBackground ? "#E5E7EB" : "#666"};
        }

        .blog-content code {
          background-color: ${isDarkBackground ? "#374151" : "#f3f4f6"};
          color: ${isDarkBackground ? "#FFFFFF" : "inherit"};
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.875rem;
        }

        .blog-content pre {
          background-color: ${isDarkBackground ? "#374151" : "#f3f4f6"};
          color: ${isDarkBackground ? "#FFFFFF" : "inherit"};
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
        }

        .blog-content pre code {
          background-color: transparent;
          padding: 0;
        }
      `}
      </style>
    </div>
  );
};

const ArticleBlog: React.FC<ArticleBlogProps> = (props) => {
  return (
    <Suspense fallback={null}>
      <ArticleBlogContent {...props} />
    </Suspense>
  );
};

export default ArticleBlog;
