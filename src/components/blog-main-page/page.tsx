"use client"

import type React from "react"
import { ArrowUpRight, Calendar, User, Eye } from "lucide-react"
import { useBlogArticles } from "@/hooks/use-blog-articles"
import {GoogleFontLoader} from "@/components/bande/google-font-loader";

interface BlogMainPageProps {
  primaryColor: string
  secondaryColor: string 
  textColor: string
  titleColor: string
  fontFamily: string
  secondaryFontFamily: string
  title: string
  subtitle: string
  useApi?: boolean
  limit?: number
}


const BlogMainPage: React.FC<BlogMainPageProps> = ({
  primaryColor = "#0A6251",
  secondaryColor = "#F9FAFB", 
  textColor = "#374151",
  titleColor = "#0A6251",
  fontFamily = "serif",
  secondaryFontFamily = "Poppins",
  title = "Blog",
  subtitle = "Découvrez nos derniers articles sur le droit pénal et la défense juridique",
  useApi = true,
  limit = 12,
}) => {
  const titleStyle = {
    fontFamily: fontFamily ? `'${fontFamily}', serif` : undefined,
  }

  const textStyle = {
    fontFamily: secondaryFontFamily ? `'${secondaryFontFamily}', sans-serif` : undefined,
  }

  // Utiliser le hook pour récupérer les articles depuis l'API
  const { articles, loading, error } = useBlogArticles({
    limit: useApi ? limit : undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  // Afficher un état de chargement si les données sont en cours de chargement
  if (loading) {
    return (
      <>
        <GoogleFontLoader fontName={fontFamily || ""} />
        <GoogleFontLoader fontName={secondaryFontFamily || ""} />
        <section
          className="w-full py-16 md:py-20 lg:py-24 overflow-hidden relative"
          style={{ fontFamily: secondaryFontFamily, backgroundColor: secondaryColor }} 
          data-component="true"
          data-id="blog-main-page"
        >
          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12 md:mb-16">
              <div className="flex items-center mb-6">
                <div className="w-1 h-16 mr-6 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                <div className="border-2 px-8 py-4 bg-white inline-block" style={{ borderColor: primaryColor }}>
                  <h2
                    className="text-2xl md:text-3xl lg:text-4xl font-bold"
                    style={{ ...titleStyle, color: titleColor }}
                  >
                    {title}
                  </h2>
                </div>
              </div>
              <p className="text-lg text-gray-600 max-w-3xl" style={textStyle}>
                {subtitle}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10 xl:gap-12 items-stretch">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex flex-col bg-white rounded-lg shadow-lg overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-gray-200"></div>
                  <div className="flex flex-col flex-1 p-6">
                    <div className="flex-1">
                      <div className="h-6 bg-gray-300 rounded mb-3"></div>
                      <div className="h-4 bg-gray-300 rounded mb-2"></div>
                      <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
                      <div className="flex items-center space-x-4">
                        <div className="h-4 bg-gray-300 rounded w-20"></div>
                        <div className="h-4 bg-gray-300 rounded w-24"></div>
                        <div className="h-4 bg-gray-300 rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </>
    );
  }

  // Afficher une erreur s'il y a une erreur
  if (error) {
    return (
      <>
        <GoogleFontLoader fontName={fontFamily || ""} />
        <GoogleFontLoader fontName={secondaryFontFamily || ""} />
        <section
          className="w-full py-16 md:py-20 lg:py-24 overflow-hidden relative"
          style={{ fontFamily: secondaryFontFamily, backgroundColor: secondaryColor }} 
          data-component="true"
          data-id="blog-main-page"
        >
          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-xl text-red-600 mb-4">Erreur lors du chargement des articles</h2>
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <GoogleFontLoader fontName={fontFamily || ""} />
      <GoogleFontLoader fontName={secondaryFontFamily || ""} />

      <section
        className="w-full py-16 md:py-20 lg:py-24 overflow-hidden relative"
        style={{ fontFamily: secondaryFontFamily, backgroundColor: secondaryColor }} 
        data-component="true"
        data-id="blog-main-page"
      >
        {/* Hidden elements for editable colors */}
        <div
          data-editable="true"
          data-id="blog-primaryColor"
          data-label="Primary Color"
          style={{ display: "none" }}
        >
          {primaryColor}
        </div>
        <div
          data-editable="true"
          data-id="blog-secondaryColor"
          data-label="Secondary color"
          style={{ display: "none" }}
        >
          {secondaryColor}
        </div>
        <div data-editable="true" data-id="blog-textColor" data-label="Text color" style={{ display: "none" }}>
          {textColor}
        </div>
        <div data-editable="true" data-id="blog-titleColor" data-label="Title color" style={{ display: "none" }}>
          {titleColor}
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Title */}
          <div className="mb-12 md:mb-16">
            <div className="flex items-center mb-6">
              <div className="w-1 h-16 mr-6 rounded-full" style={{ backgroundColor: primaryColor }}></div>
              <div className="border-2 px-8 py-4 bg-white inline-block" style={{ borderColor: primaryColor }}>
                <h2
                  className="text-2xl md:text-3xl lg:text-4xl font-bold"
                  style={{ ...titleStyle, color: titleColor }}
                  data-editable="true"
                  data-id="blog-title"
                  data-label="Title"
                >
                  {title}
                </h2>
              </div>
            </div>
            <p 
              className="text-lg text-gray-600 max-w-3xl" 
              style={textStyle}
              data-editable="true"
              data-id="blog-subtitle"
              data-label="Subtitle"
            >
              {subtitle}
            </p>
          </div>

          {/* Article Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10 xl:gap-12 items-stretch">
            {articles.map((article, index) => (
              <div
                key={article._id}
                className="flex flex-col bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:transform hover:scale-[1.02] cursor-pointer group"
                onClick={() => window.open(`/blog-page?id=${article._id}`, "_self")}
                data-editable="true"
                data-id={`blog-article-${index}-url`}
                data-label={`Article ${index + 1} link`}
                data-type="link"
              >
                {/* Image */}
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={article.image && article.image.length > 0 ? article.image[0] : "/componentsImage/last-articles/blog1.png"}
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    data-editable="true"
                    data-id={`blog-article-${index}-image`}
                    data-label={`Article ${index + 1} image`}
                    data-type="image"
                  />
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 p-6">
                  <div className="flex-1">
                    <h3
                      className="text-lg md:text-xl font-bold mb-3 leading-tight group-hover:text-opacity-90 transition-colors duration-200"
                      style={titleStyle}
                      data-editable="true"
                      data-id={`blog-article-${index}-title`}
                      data-label={`Article ${index + 1} title`}
                    >
                      {article.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed opacity-90 mb-4"
                      style={textStyle}
                      data-editable="true"
                      data-id={`blog-article-${index}-summary`}
                      data-label={`Article ${index + 1} summary`}
                    >
                      {article.content
                        ? (article.content.length > 150 ? article.content.substring(0, 150) + '...' : article.content)
                        : ''}
                    </p>

                    {/* Article Meta */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <User size={12} />
                          <span style={textStyle}>Gabriel Delcourt</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar size={12} />
                          <span style={textStyle}>
                            {new Date(article.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye size={12} />
                        <span style={textStyle}>{article.views} vues</span>
                      </div>
                    </div>

                    {/* Keywords */}
                    {article.keywords && article.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {article.keywords.slice(0, 3).map((keyword, keywordIndex) => (
                          <span
                            key={keywordIndex}
                            className="px-2 py-1 text-xs rounded-full"
                            style={{ 
                              backgroundColor: `${primaryColor}20`, 
                              color: primaryColor 
                            }}
                            style={textStyle}
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* CTA Section */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        <span
                          className="text-sm font-medium"
                          style={{ ...textStyle, color: primaryColor }}
                          data-editable="true"
                          data-id={`blog-article-${index}-ctaText`}
                          data-label={`Article ${index + 1} CTA text`}
                        >
                          Lire l'article
                        </span>
                        <ArrowUpRight
                          size={16}
                          className="transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1"
                          style={{ color: primaryColor }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {articles.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-4" style={{ ...titleStyle, color: titleColor }}>
                Aucun article disponible
              </h3>
              <p className="text-gray-600" style={textStyle}>
                Aucun article n'a été publié pour le moment. Revenez bientôt !
              </p>
            </div>
          )}
        </div>

        {/* Hidden editable fonts */}
        <div
          data-editable="true"
          data-id="blog-fontFamily"
          data-label="Primary font (Titles)"
          data-type="font"
          style={{ display: "none" }} 
        >
          {fontFamily || ""}
        </div>
        <div
          data-editable="true"
          data-id="blog-secondaryFontFamily"
          data-label="Secondary font (Body text)"
          data-type="font"
          style={{ display: "none" }} 
        >
          {secondaryFontFamily || ""}
        </div>
      </section>
    </>
  )
}

export default BlogMainPage
