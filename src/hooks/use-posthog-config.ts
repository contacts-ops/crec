import { useState, useEffect } from 'react';
import { useSiteId } from './use-site-id';

interface PostHogConfig {
  isConfigured: boolean;
  publicKey?: string | null;
  projectId?: string | null;
  host?: string;
}

export const usePostHogConfig = () => {
  const [config, setConfig] = useState<PostHogConfig>({ isConfigured: false });
  const [isLoading, setIsLoading] = useState(true);
  const siteId = useSiteId();

  useEffect(() => {
    if (!siteId) {
      setIsLoading(false);
      return;
    }

    const fetchConfig = async () => {
      try {
        const response = await fetch(`/api/analytics/${siteId}/posthog/config`);
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la config PostHog:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [siteId]);

  return { config, isLoading };
};
