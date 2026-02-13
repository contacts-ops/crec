import type { Metadata } from "next";
import seoConfig from "@/lib/seo/config.json";

/**
 * Force une URL absolue (https://) afin que Next puisse générer correctement la balise.
 */
const normalizeUrl = (value?: string | null): string | undefined => {
  if (!value || !value.trim()) {
    return undefined;
  }

  const trimmed = value.trim();
  const prefixed = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(prefixed);
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
};

/**
 * Complète les chemins relatifs (/image.png) avec l’URL de base.
 */
const resolveWithBaseUrl = (path?: string | null, baseUrl?: string): string | undefined => {
  if (!path || !path.trim() || !baseUrl) {
    return undefined;
  }

  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return undefined;
  }
};

const derivedBaseUrl =
  normalizeUrl(process.env.NEXT_PUBLIC_APP_URL) ??
  normalizeUrl(process.env.VERCEL_URL) ??
  normalizeUrl(seoConfig.baseUrl) ??
  "http://localhost:3000";

const ogImage = resolveWithBaseUrl(seoConfig.socialImage, derivedBaseUrl);

export const defaultSeo = {
  applicationName: seoConfig.applicationName,
  title: seoConfig.defaultTitle,
  description: seoConfig.defaultDescription,
  baseUrl: derivedBaseUrl,
  canonical: derivedBaseUrl,
  ogImage: ogImage ?? derivedBaseUrl,
  brandColors: seoConfig.brandColors,
  icons: seoConfig.icons,
};

/**
 * Génère les métadonnées par défaut utilisées par le layout racine.
 */
export const buildDefaultMetadata = (): Metadata => {
  const metadata: Metadata = {
    metadataBase: new URL(defaultSeo.baseUrl),
    title: {
      default: defaultSeo.title,
      template: `%s | ${defaultSeo.applicationName}`,
    },
    description: defaultSeo.description,
    applicationName: defaultSeo.applicationName,
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: defaultSeo.title,
      description: defaultSeo.description,
      url: defaultSeo.baseUrl,
      siteName: defaultSeo.applicationName,
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
            },
          ]
        : undefined,
      locale: "fr_FR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: defaultSeo.title,
      description: defaultSeo.description,
      images: ogImage ? [ogImage] : undefined,
    }
  };

  if (defaultSeo.icons?.favicon || defaultSeo.icons?.appleTouch) {
    metadata.icons = {
      icon: defaultSeo.icons?.favicon,
      apple: defaultSeo.icons?.appleTouch,
    };
  }

  return metadata;
};

