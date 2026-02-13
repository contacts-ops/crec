// /hooks/use-get-site.ts

import { useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useSiteStore } from '@/store/site';

export const useGetSite = (siteId: string) => {
    const { toast } = useToast();
    const { site, loading, error, fetchSite } = useSiteStore();
    
    const refetch = useCallback(async (siteId: string) => {
        await fetchSite(siteId);
    }, [fetchSite]);

    useEffect(() => {
        if (!site && !loading) {
            fetchSite(siteId);
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

    return { site, loading, error, refetch };
};