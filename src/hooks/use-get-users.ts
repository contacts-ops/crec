// /hooks/use-get-users.ts

import { useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUsersStore } from "@/store/users";

export const useGetUsers = () => {
  const { toast } = useToast();
  const { users, loading, error, fetchUsers } = useUsersStore();

  const refetch = useCallback(async () => {
    await fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (!users.length && !loading) {
      fetchUsers();
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

  return { users, loading, error, refetch };
};


