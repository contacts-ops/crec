import { useState, useEffect } from 'react';

export interface SiteConfig {
  siteId: string;
  stripe?: {
    isConfigured: boolean;
    isTestMode: boolean;
    testPublicKey?: string;
    testSecretKey?: string;
    livePublicKey?: string;
    liveSecretKey?: string;
  };
  googleCalendar?: {
    isConfigured: boolean;
  };
  email?: {
    isConfigured: boolean;
  };
  general?: {
    siteName?: string;
    contactEmail?: string;
    phoneNumber?: string;
    address?: string;
  };
}

export const useSiteConfig = (siteId: string) => {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    if (!siteId) {
      console.log("❌ Pas de siteId fourni");
      setLoading(false);
      return;
    }

    try {
      console.log("🔄 (reload) Chargement configuration site pour siteId:", siteId);
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/sharedServices/site-config?siteId=${siteId}`);
      console.log("📡 (reload) Response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("📦 (reload) Configuration reçue:", data);
      console.log("🔍 (reload) DEBUG Stripe config:", data.config?.stripe);
      
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error('❌ (reload) Erreur lors de la récupération de la configuration:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [siteId]);

  const saveConfig = async (configType: string, configData: any) => {
    try {
      console.log(`💾 Sauvegarde configuration ${configType}...`);
      setLoading(true);
      setError(null);

      const response = await fetch('/api/sharedServices/site-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId,
          configType,
          configData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      const data = await response.json();
      console.log(`✅ Configuration ${configType} sauvegardée:`, data);
      
      // Rafraîchir la configuration
      const currentConfig = config || {
        siteId,
        stripe: { isConfigured: false, isTestMode: true },
        googleCalendar: { isConfigured: false },
        email: { isConfigured: false },
        general: {}
      };
      
      setConfig({
        ...currentConfig,
        [configType]: configData
      });
      
      return true;
    } catch (err) {
      console.error(`❌ Erreur saveConfig ${configType}:`, err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { 
    config, 
    loading, 
    error, 
    saveConfig,
    reload 
  };
}; 