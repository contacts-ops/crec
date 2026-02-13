"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSitesStore } from "@/store/sites";

/**
 * Hook to delete a site by its siteId via the API.
 * Handles loading state, toasts, and success callback.
 */
export function useDeleteSite(onSuccess?: () => void) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { deleteSite: deleteFromStore } = useSitesStore();

  const deleteSite = useCallback(async (siteId: string) => {
    if (!siteId) return;
    setLoading(true);
    setError(null);
    try {
      const ok = await deleteFromStore(siteId);
      if (!ok) throw new Error("Suppression impossible");

      toast({ title: "Site supprimé", description: "Le site a été supprimé avec succès." });
      onSuccess?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur inconnue";
      setError(message);
      toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [onSuccess, toast]);

  return { deleteSite, loading, error };
}


