import { useContext, useCallback } from "react";
import { createContext } from "react";

interface LinkContextType {
  siteId: string;
  transformInternalLink?: (href: string) => string;
}

const LinkContext = createContext<LinkContextType | null>(null);

export const useSiteLink = () => {
  const context = useContext(LinkContext);

  const transformLink = useCallback(
    (href: string | undefined | null): string => {
      if (!href) return "/";

      // Lien déjà absolu (http, https, mailto, tel)
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return href;
      }

      // Détection mode preview (hub.majoli / localhost)
      const isPreviewMode =
        typeof window !== "undefined" &&
        (window.location.hostname.includes("hub.majoli") ||
          window.location.hostname.includes("localhost") ||
          window.location.hostname.includes("127.0.0.1"));

      // Lien interne commençant par /
      const isInternal =
        href.startsWith("/") && !href.startsWith("//");

      if (isPreviewMode && context && isInternal) {
        const sitePrefix = `/sites/${context.siteId}`;

        // Si le lien contient déjà le préfixe, on ne le duplique pas
        if (href.startsWith(sitePrefix)) {
          return href;
        }

        // Eventuel transformeur interne custom
        if (context.transformInternalLink) {
          return context.transformInternalLink(href);
        }

        return `${sitePrefix}${href}`;
      }

      // Mode live ou pas de contexte → on renvoie tel quel
      return href;
    },
    [context]
  );

  return {
    transformLink,
    siteId: "e64668ea-2a54-4a8d-8fd0-0744e429c51a",
    isInSiteContext: !!context,
  };
};

export { LinkContext };