"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export const useDeleteFavicon = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deleteFavicon = useCallback(async (siteId: string) => {
        if (!siteId) return;
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/sites/delete-favicon`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ siteId }),
        });
        if (!response.ok) {
            const data = await response.json();
            setError(data.error || "Erreur lors de la suppression");
            toast({ title: "Erreur", description: data.error || "Erreur lors de la suppression", variant: "destructive" });
        } else {
            toast({ title: "Favicon supprimé", description: "Le favicon a été supprimé avec succès" });
        }
        setLoading(false);
    }, []);

    return { deleteFavicon, loading, error };
}