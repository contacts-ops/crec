// /hooks/use-get-pages.ts

import { useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { usePagesStore } from '@/store/pages';

export const useGetPages = (siteId: string) => {
    const { toast } = useToast();
    const pages = usePagesStore((state) => state.pages);
    const loading = usePagesStore((state) => state.loading);
    const error = usePagesStore((state) => state.error);
    const fetchPages = usePagesStore((state) => state.fetchPages);
    const refetch = useCallback(async () => {
        await fetchPages(siteId);
    }, [fetchPages]);

    useEffect(() => {
        if (!pages?.length && !loading) {
            fetchPages(siteId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteId]);

    useEffect(() => {
        if (error) {
            toast({
                title: "Erreur",
                description: error || "Une erreur est survenue",
                variant: "destructive",
            });
        }
    }, [error, toast]);

    return { pages, loading, error, refetch };
};