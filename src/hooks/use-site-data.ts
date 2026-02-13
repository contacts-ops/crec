import { useState, useEffect, useCallback } from 'react';
import { ISite } from '@/lib/models/Site';
import { eventBus, EVENTS } from '@/lib/utils/eventBus';

interface UseSiteDataOptions {
  siteId: string;
  pollingInterval?: number;
  autoRefresh?: boolean;
}

export function useSiteData({
  siteId,
  pollingInterval = 1000,
  autoRefresh = true
}: UseSiteDataOptions) {
  const [site, setSite] = useState<ISite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [lastKnownUpdate, setLastKnownUpdate] = useState<string | null>(null);

  const fetchSiteData = useCallback(async (forceRefresh = false) => {
    try {
      
      if (!forceRefresh) {
        setLoading(true);
      }
      setError(null);

      // Ajouter un timestamp pour éviter le cache
      const timestamp = Date.now();

      const response = await fetch(`/api/sites/${siteId}/data?t=${timestamp}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.site) {
        // Vérifier si les données ont vraiment changé
        const currentUpdate = data.site.lastUpdated;
        
        if (forceRefresh || currentUpdate !== lastKnownUpdate) {
          console.log('🔄 useSiteData: Mise à jour des données du site');
          setSite(data.site);
          setLastUpdate(Date.now());
          setLastKnownUpdate(currentUpdate);
          console.log('✅ useSiteData: Données mises à jour avec succès');
        } else {
          console.log('⏭️ useSiteData: Pas de changement détecté, pas de mise à jour');
        }
      } else {
        throw new Error(data.error || "Erreur lors du chargement du site");
      }
    } catch (err) {
      console.error("❌ useSiteData: Erreur lors du chargement du site:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [siteId, lastKnownUpdate]);

  // Charger les données initiales
  useEffect(() => {
    if (siteId) {
      fetchSiteData();
    }
  }, [siteId, fetchSiteData]);

  // Écouter les événements de mise à jour
  useEffect(() => {
    const handleSiteUpdate = (...args: unknown[]) => {
      const updatedSiteId = args[0] as string;
      if (updatedSiteId === siteId) {
        // Rafraîchissement immédiat sans délai
        fetchSiteData(true);
      }
    };

    // S'abonner aux événements de mise à jour
    eventBus.on(EVENTS.SITE_UPDATE, handleSiteUpdate);
    console.log(`🔄 useSiteData: Écoute des événements activée pour ${siteId}`);

    return () => {
      eventBus.off(EVENTS.SITE_UPDATE, handleSiteUpdate);
      console.log(`🔄 useSiteData: Écoute des événements désactivée pour ${siteId}`);
    };
  }, [siteId, fetchSiteData]);

  // Polling pour les mises à jour en temps réel
  useEffect(() => {
    if (!siteId || !autoRefresh) return;

    const interval = setInterval(() => {
      fetchSiteData();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [siteId, autoRefresh, pollingInterval, fetchSiteData]);

  // Fonction pour forcer une mise à jour
  const refresh = useCallback(() => {
    console.log('🔄 useSiteData: Rafraîchissement forcé');
    fetchSiteData(true);
  }, [fetchSiteData]);

  return {
    site,
    loading,
    error,
    lastUpdate,
    refresh,
    refetch: fetchSiteData
  };
}
