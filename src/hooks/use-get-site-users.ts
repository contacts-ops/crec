// /hooks/use-get-site-users.ts

import { useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSiteUsersStore } from "@/store/site-users";

export const useGetSiteUsers = (siteId: string) => {
  const { toast } = useToast();
  const { usersBySiteId, loadingBySiteId, errorBySiteId, fetchSiteUsers } = useSiteUsersStore();

  const users = usersBySiteId[siteId] || [];
  const loading = Boolean(loadingBySiteId[siteId]);
  const error = errorBySiteId[siteId] || null;

  const refetch = useCallback(async () => {
    await fetchSiteUsers(siteId);
  }, [fetchSiteUsers, siteId]);

  useEffect(() => {
    if (!users.length && !loading && siteId && siteId !== "" && siteId !== null && siteId !== undefined) {
      fetchSiteUsers(siteId);
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

  return { users, loading, error, refetch };
};


