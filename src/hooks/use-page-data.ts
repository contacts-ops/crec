import { useState, useEffect } from "react";
import { IPage } from "@/lib/models/Page";
import { eventBus } from "@/lib/utils/eventBus";

interface UsePageDataOptions {
  siteId: string;
  pageSlug: string;
  pollingInterval?: number;
  autoRefresh?: boolean;
}

interface UsePageDataReturn {
  page: IPage | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export const usePageData = ({
  siteId,
  pageSlug,
  pollingInterval = 0,
  autoRefresh = false,
}: UsePageDataOptions): UsePageDataReturn => {
  const [page, setPage] = useState<IPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPageData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/sites/${siteId}/pages/${pageSlug}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Page non trouvée");
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.page) {
        setPage(data.page);
      } else if (data.pages && data.pages.length > 0) {
        // Si on reçoit un tableau, prendre la première page
        setPage(data.pages[0]);
      } else {
        throw new Error("Aucune donnée de page reçue");
      }
    } catch (err) {
      console.error("Erreur lors du chargement de la page:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, [siteId, pageSlug]);

  // Écouter les événements de mise à jour de page
  useEffect(() => {
    const handlePageUpdate = (...args: unknown[]) => {
      const updatedSiteId = args[0] as string;
      const updatedPageSlug = args[1] as string;
      if (updatedSiteId === siteId && updatedPageSlug === pageSlug) {
        fetchPageData();
      }
    };

    const handleSiteUpdate = (...args: unknown[]) => {
      const updatedSiteId = args[0] as string;
      if (updatedSiteId === siteId) {
        fetchPageData();
      }
    };

    // S'abonner aux événements
    eventBus.on('pageUpdate', handlePageUpdate);
    eventBus.on('siteUpdate', handleSiteUpdate);

    // Nettoyer les abonnements
    return () => {
      eventBus.off('pageUpdate', handlePageUpdate);
      eventBus.off('siteUpdate', handleSiteUpdate);
    };
  }, [siteId, pageSlug]);

  useEffect(() => {
    if (!autoRefresh || pollingInterval <= 0) return;

    const interval = setInterval(fetchPageData, pollingInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, pollingInterval, siteId, pageSlug]);

  const refresh = () => {
    fetchPageData();
  };

  return { page, loading, error, refresh };
};
