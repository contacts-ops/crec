"use client";

import React from "react";
import Link from "next/link";
import { useSiteLink } from "@/hooks/use-site-link";

interface SiteLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  children: React.ReactNode;
}

const SiteLink: React.FC<SiteLinkProps> = ({ href, children, ...props }) => {
  const { transformLink } = useSiteLink();

  const transformedHref = transformLink(href);

  // Détecter si c'est un lien externe (http, https, mailto, tel)
  const isExternal = 
    transformedHref.startsWith("http://") ||
    transformedHref.startsWith("https://") ||
    transformedHref.startsWith("mailto:") ||
    transformedHref.startsWith("tel:");

  // Pour les liens externes, utiliser une balise <a> normale
  if (isExternal) {
    return (
      <a href={transformedHref} {...props}>
        {children}
      </a>
    );
  }

  // Pour les liens internes, utiliser Link de Next.js avec prefetch
  return (
    <Link href={transformedHref} prefetch={true} {...props}>
      {children}
    </Link>
  );
};

export { SiteLink };
