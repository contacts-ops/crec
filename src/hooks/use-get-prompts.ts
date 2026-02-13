import { useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { usePromptsStore } from "@/store/prompts";

export const useGetPrompts = () => {
  const { toast } = useToast();
  const { prompts, loading, error, fetchPrompts } = usePromptsStore();
  
  const refetch = useCallback(async () => {
    await fetchPrompts();
  }, [fetchPrompts]);

  useEffect(() => {
    if (!prompts && !loading) {
      fetchPrompts();
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

  return { prompts, loading, error, refetch };
};
