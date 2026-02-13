import { useState, useEffect } from 'react';

interface Page {
  id: string;
  pageId: string;
  name: string;
  slug: string;
  isHome: boolean;
  isPublished: boolean;
  lastUpdated: string;
  components: Array<{
    id: string;
    name: string;
    type: string;
    thumbnail: string;
  }>;
}

interface UseSitePagesReturn {
  pages: Page[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useSitePages = (siteId: string): UseSitePagesReturn => {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/sites/${siteId}/pages`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des pages');
      }

      const data = await response.json();
      setPages(data.pages || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des pages:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (siteId) {
      fetchPages();
    }
  }, [siteId]);

  return {
    pages,
    loading,
    error,
    refresh: fetchPages,
  };
};
