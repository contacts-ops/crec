// /hooks/use-get-page.ts

import { useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { usePageStore } from '@/store/page';
import { eventBus } from '@/lib/utils/eventBus';

export const useGetPage = (siteId: string, pageSlug: string): {
    page: any;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
} => {
    const { toast } = useToast();
    const { page, loading, error, fetchPage } = usePageStore();

    const refetch = useCallback(async () => {
        await fetchPage(siteId, pageSlug);
    }, [fetchPage, siteId, pageSlug]);

    useEffect(() => {
        if (siteId && pageSlug && !loading && page?.siteId !== siteId && page?.slug !== pageSlug) {
            fetchPage(siteId, pageSlug);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteId, pageSlug]);

    useEffect(() => {
        if (error) {
            toast({
                title: "Erreur",
                description: error || "Une erreur est survenue",
                variant: "destructive",
            });
        }
    }, [error, toast]);

    useEffect(() => {

        const handlePageUpdate = (...args: unknown[]) => {
            const updatedSiteId = args[0] as string;
            const updatedPageSlug = args[1] as string;
            if (updatedSiteId === siteId && updatedPageSlug === pageSlug) {
                fetchPage(siteId, pageSlug);
            }
        };

        const handleSiteUpdate = (...args: unknown[]) => {
            const updatedSiteId = args[0] as string;
            if (updatedSiteId === siteId) {
                fetchPage(siteId, pageSlug);
            }
        };

        eventBus.on('pageUpdate', handlePageUpdate);
        eventBus.on('siteUpdate', handleSiteUpdate);

        // Nettoyer les abonnements
        return () => {
            eventBus.off('pageUpdate', handlePageUpdate);
            eventBus.off('siteUpdate', handleSiteUpdate);
        };
    }, [siteId, pageSlug]);

    return { page, loading, error, refetch };
};


