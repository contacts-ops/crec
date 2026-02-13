"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUsersStore } from "@/store/users";
import { IUser } from "@/lib/models/User";

export function useEditUser() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { updateUser: updateFromStore } = useUsersStore();

    const updateUser = useCallback(async (user: IUser) => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `/api/auth/users/${user._id}`,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(user),
                }
            );
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || "Erreur");
            toast({ title: "Succès", description: "Compte modifié." });
            updateFromStore(user);
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
    }, [updateFromStore, toast]);

    return { updateUser, loading, error };
};
