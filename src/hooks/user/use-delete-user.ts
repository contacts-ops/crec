"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUsersStore } from "@/store/users";

/**
 * Hook to delete a site by its siteId via the API.
 * Handles loading state, toasts, and success callback.
 */
export function useDeleteUser() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { deleteUser: deleteFromStore } = useUsersStore();

    const deleteUser = useCallback(async (userId: string) => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `/api/auth/users/${userId}`,
                {
                    method: "DELETE",
                    credentials: "include",
                }
            );
            const body = await res.json();
            if (!res.ok)
                throw new Error(
                    body.error || "Erreur lors de la suppression."
                );
            toast({ title: "Succès", description: "Compte supprimé." });
            deleteFromStore(userId);
        } catch (err: unknown) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "Une erreur est survenue";
            toast({
                title: "Erreur",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [deleteFromStore, toast]);

    return { deleteUser, loading, error };
};
