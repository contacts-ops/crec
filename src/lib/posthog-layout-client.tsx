'use client';

import { useEffect, useMemo, useState } from 'react';
import PostHogProvider from '@/lib/posthog-provider';
import { useSiteId } from '@/hooks/use-site-id';
import { usePathname } from 'next/navigation';

interface PostHogConfig {
  isConfigured: boolean;
  publicKey?: string | null;
  projectId?: string | null;
  host?: string;
}

export default function PostHogLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteId = useSiteId();
  const pathname = usePathname();
  const [config, setConfig] = useState<PostHogConfig>({ isConfigured: false });
  const [isLoading, setIsLoading] = useState(true);

  // Fallback: extraire le siteId de l'URL si le contexte est vide (utile en local)
  const derivedSiteId = useMemo(() => {
    if (siteId) return siteId;
    try {
      if (!pathname) return null;
      const parts = pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('sites');
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
      if (parts.length > 0 && parts[0] !== 'app' && parts[0] !== 'sites') return parts[0];
    } catch (e) {
      console.warn('🔍 DEBUG - derive siteId failed from pathname', pathname, e);
    }
    return null;
  }, [siteId, pathname]);

  useEffect(() => {
    const loadConfig = async () => {
      if (!derivedSiteId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/analytics/${derivedSiteId}/posthog/config`);
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        } else {
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la config PostHog:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [siteId, derivedSiteId]);

  // Si pas de siteId utilisable ou config encore en chargement, on laisse passer
  if (!derivedSiteId || isLoading || !config.isConfigured || !config.publicKey) {
    console.log('🔍 DEBUG - PostHogLayoutClient: early return (missing data)', {
      derivedSiteId,
      isLoading,
      isConfigured: config.isConfigured,
      hasPublicKey: !!config.publicKey,
    });
    return <>{children}</>;
  }

  return (
    <PostHogProvider
      publicKey={config.publicKey}
      host={config.host || 'https://app.posthog.com'}
      siteId={derivedSiteId}
    >
      {children}
    </PostHogProvider>
  );
}
