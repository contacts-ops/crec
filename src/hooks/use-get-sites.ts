// /hooks/use-get-sites.ts

import { useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useSitesStore } from '@/store/sites';

export const useGetSites = () => {
    const { toast } = useToast();
    const { sites, loading, error, fetchSites } = useSitesStore();
    const refetch = useCallback(async () => {
        await fetchSites();
    }, [fetchSites]);

    useEffect(() => {
        if (!sites?.length && !loading) {
            fetchSites();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (error) {
            toast({
                title: "Erreur",
                description: error || "Une erreur est survenue",
                variant: "destructive",
            });
        }
    }, [error, toast]);

    return { sites, loading, error, refetch };
};