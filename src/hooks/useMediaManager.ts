import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSiteLink } from './use-site-link';

export interface MediaItem {
  _id: string;
  siteId: string;
  pageId?: string;
  componentId: string;
  componentName: string;
  componentType: string;
  pageName?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  fileName: string;
  fileSize: number;
  mimeType: string;
  title?: string;
  description?: string;
  altText?: string;
  fieldId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFilters {
  mediaType: string;
  componentId: string;
  pageId: string;
  isActive: string;
  search: string;
}

export interface MediaPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface MediaResponse {
  success: boolean;
  media: MediaItem[];
  pagination: MediaPagination;
}

export function useMediaManager(siteId: string) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<MediaFilters>({
    mediaType: '',
    componentId: '',
    pageId: '',
    isActive: '',
    search: ''
  });
  const [pagination, setPagination] = useState<MediaPagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const { toast } = useToast();
  const { transformLink } = useSiteLink();
  // Charger les médias
  const loadMedia = useCallback(async (customFilters?: Partial<MediaFilters>, customPagination?: Partial<MediaPagination>) => {
    setLoading(true);
    try {
      const currentFilters = { ...filters, ...customFilters };
      const currentPagination = { ...pagination, ...customPagination };

      const params = new URLSearchParams({
        page: currentPagination.page.toString(),
        limit: currentPagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(currentFilters).filter(([_, value]) => value !== '')
        )
      });

      const response = await fetch(`/api/${transformLink(`/media?${params}`)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ siteId }),
      });
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des médias');
      }

      const data: MediaResponse = await response.json();
      setMedia(data.media);
      setPagination(data.pagination);
      
      // Mettre à jour les filtres et pagination si des valeurs personnalisées ont été passées
      if (customFilters) {
        setFilters(prev => ({ ...prev, ...customFilters }));
      }
      if (customPagination) {
        setPagination(prev => ({ ...prev, ...customPagination }));
      }

      return data;
    } catch (error) {
      console.error('Erreur lors du chargement des médias:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les médias",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [siteId, filters, pagination, toast]);

  // Appliquer des filtres
  const applyFilters = useCallback(async (newFilters: Partial<MediaFilters>) => {
    await loadMedia(newFilters, { page: 1 });
  }, [loadMedia]);

  // Changer de page
  const changePage = useCallback(async (page: number) => {
    await loadMedia(undefined, { page });
  }, [loadMedia]);

  // Supprimer des médias
  const deleteMedia = useCallback(async (mediaIds: string[]) => {
    try {
      const response = await fetch(`/api/${transformLink('/media')}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mediaIds, siteId }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      const result = await response.json();
      toast({
        title: "Succès",
        description: `${result.deletedCount} média(x) supprimé(s)`,
      });

      // Recharger les médias
      await loadMedia();
      return result;
    } catch (error) {
      console.error('Erreur lors de la suppression des médias:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les médias",
        variant: "destructive",
      });
      throw error;
    }
  }, [siteId, loadMedia, toast]);

  // Nettoyer tous les médias du site
  const cleanupAllMedia = useCallback(async () => {
    try {
      const response = await fetch(`/api/${transformLink('/cleanup-media')}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ siteId }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du nettoyage');
      }

      const result = await response.json();
      toast({
        title: "Succès",
        description: result.message || "Nettoyage terminé",
      });

      // Vider la liste des médias
      setMedia([]);
      setPagination(prev => ({ ...prev, total: 0, pages: 0 }));
      return result;
    } catch (error) {
      console.error('Erreur lors du nettoyage des médias:', error);
      toast({
        title: "Erreur",
        description: "Impossible de nettoyer les médias",
        variant: "destructive",
      });
      throw error;
    }
  }, [siteId, toast]);

  // Rechercher des médias
  const searchMedia = useCallback(async (searchTerm: string) => {
    await applyFilters({ search: searchTerm });
  }, [applyFilters]);

  // Filtrer par type de média
  const filterByType = useCallback(async (mediaType: string) => {
    await applyFilters({ mediaType });
  }, [applyFilters]);

  // Filtrer par composant
  const filterByComponent = useCallback(async (componentId: string) => {
    await applyFilters({ componentId });
  }, [applyFilters]);

  // Filtrer par page
  const filterByPage = useCallback(async (pageId: string) => {
    await applyFilters({ pageId });
  }, [applyFilters]);

  // Filtrer par statut
  const filterByStatus = useCallback(async (isActive: string) => {
    await applyFilters({ isActive });
  }, [applyFilters]);

  // Réinitialiser tous les filtres
  const resetFilters = useCallback(async () => {
    const resetFilters: MediaFilters = {
      mediaType: '',
      componentId: '',
      pageId: '',
      isActive: '',
      search: ''
    };
    await loadMedia(resetFilters, { page: 1 });
  }, [loadMedia]);

  // Charger les médias au montage
  useEffect(() => {
    if (siteId) {
      loadMedia();
    }
  }, [siteId, loadMedia]);

  return {
    // État
    media,
    loading,
    filters,
    pagination,
    
    // Actions
    loadMedia,
    applyFilters,
    changePage,
    deleteMedia,
    cleanupAllMedia,
    searchMedia,
    filterByType,
    filterByComponent,
    filterByPage,
    filterByStatus,
    resetFilters,
    
    // Utilitaires
    hasMedia: media.length > 0,
    totalMedia: pagination.total,
    currentPage: pagination.page,
    totalPages: pagination.pages,
    canGoNext: pagination.page < pagination.pages,
    canGoPrevious: pagination.page > 1,
  };
}
