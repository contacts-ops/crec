// /hooks/use-get-user.ts

import { useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user";

export const useGetUser = (userId: string) => {
  const { toast } = useToast();
  const { user, loading, error, fetchUser } = useUserStore();

  const refetch = useCallback(async ( userId: string ) => {
    if (!userId || userId === "") return;
    await fetchUser(userId);
  }, [fetchUser]);

  useEffect(() => {
    if (!user && !loading && userId && userId !== "") {
      fetchUser(userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Erreur",
        description: error || "Une erreur est survenue",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return { user, loading, error, refetch };
};


