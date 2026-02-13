'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

interface PostHogProviderProps {
  publicKey: string;
  host?: string;
  siteId?: string;
  children: React.ReactNode;
}

export default function PostHogProvider({
  publicKey,
  host = 'https://app.posthog.com',
  siteId,
  children,
}: PostHogProviderProps) {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (!publicKey || !host || !siteId) return;
    
    if (!posthog.__loaded) {
      posthog.init(publicKey, {
        api_host: host,
        capture_pageview: false, // On capture manuellement avec site_id
        capture_pageleave: true,
        autocapture: true,
        loaded: (posthog) => {
          // Définir le site_id comme propriété globale
          posthog.register({
            site_id: siteId,
          });
        },
      });
    } else {
      // Mettre à jour le site_id si déjà chargé
      posthog.register({
        site_id: siteId,
      });
    }
  }, [publicKey, host, siteId]);

  useEffect(() => {
    if (!posthog.__loaded || !siteId) return;
    
    // Capturer la pageview avec le site_id
    posthog.capture('$pageview', {
      $current_url: window.location.href,
      site_id: siteId,
    });
  }, [pathname, search, siteId]);

  return <>{children}</>;
}