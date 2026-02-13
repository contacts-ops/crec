import { useState, useEffect } from 'react';

export interface BlogArticle {
  _id: string;
  title: string;
  content: string;
  image: string | string[]; // Supporte les deux formats pour la compatibilité
  keywords: string[];
  views: number;
  siteId: string;
  createdAt: string;
  updatedAt: string;
}

interface UseBlogArticlesOptions {
  limit?: number;
  page?: number;
  skip?: number;
  sortBy?: 'createdAt' | 'views' | 'title';
  sortOrder?: 'asc' | 'desc';
  siteId?: string;
}

export const useBlogArticles = (options: UseBlogArticlesOptions = {}) => {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [pages, setPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { limit, page, skip, sortBy = 'createdAt', sortOrder = 'desc', siteId } = options;

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (siteId) params.set('siteId', siteId);
        if (typeof limit !== 'undefined') params.set('limit', String(limit));
        if (typeof page !== 'undefined') params.set('page', String(page));
        if (typeof skip !== 'undefined') params.set('skip', String(skip));
        const url = `/api/blog${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const json = await response.json();
        
        // Supporter format ancien (array) et nouveau ({ data, pagination })
        let fetched: BlogArticle[] = [];
        let serverTotal: number | null = null;
        let serverPages: number | null = null;

        if (Array.isArray(json)) {
          fetched = json;
          serverTotal = json.length;
        } else if (json && Array.isArray(json.data)) {
          fetched = json.data;
          serverTotal = json.pagination?.total ?? null;
          serverPages = json.pagination?.pages ?? null;
        }
        
        // Si on utilise la pagination serveur (page/skip/limit), ne pas re-trier côté client
        // pour éviter des permutations et doublons inattendus.
        let sortedArticles = [...fetched];
        const isServerPaginated = typeof skip !== 'undefined' || typeof page !== 'undefined';

        if (!isServerPaginated) {
          if (sortBy === 'views') {
            sortedArticles.sort((a, b) => 
              sortOrder === 'asc' ? a.views - b.views : b.views - a.views
            );
          } else if (sortBy === 'title') {
            sortedArticles.sort((a, b) => 
              sortOrder === 'asc' 
                ? a.title.localeCompare(b.title)
                : b.title.localeCompare(a.title)
            );
          } else {
            // Tri par date de création
            sortedArticles.sort((a, b) => {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            });
          }
        }

        // Limiter côté client uniquement si pas de pagination serveur
        if (!isServerPaginated && limit) {
          sortedArticles = sortedArticles.slice(0, limit);
        }

        setArticles(sortedArticles);
        setTotal(serverTotal);
        setPages(serverPages);
      } catch (err) {
        console.error('Erreur lors de la récupération des articles:', err);
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [limit, page, skip, sortBy, sortOrder, siteId]);

  return { articles, total, pages, loading, error };
};

// Hook pour récupérer un article spécifique
export const useBlogArticle = (id: string) => {
  const [article, setArticle] = useState<BlogArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/blog/${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Article non trouvé');
          }
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        setArticle(data);
      } catch (err) {
        console.error('Erreur lors de la récupération de l\'article:', err);
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  return { article, loading, error };
}; 