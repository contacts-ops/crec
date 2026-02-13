"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUsersStore } from "@/store/users";
import { MemberType } from "@/components/team/TeamMemberForm";

export function useCreateUser() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addUser: addFromStore } = useUsersStore();

    const createUser = useCallback(async (form: {
        firstName: string;
        lastName: string;
        email: string;
        role: MemberType;
        password?: string;
    }) => {
        if (!form) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(form),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || "Erreur");
            toast({ title: "Succès", description: "Compte créé." });
            addFromStore(body.user);
        } catch (err: unknown) {
            const errorMessage =
                err instanceof Error ? err.message : "Une erreur est survenue";
            toast({
                title: "Erreur",
                description: errorMessage,
                variant: "destructive",
            });

        } finally {
            setLoading(false);
        }
    }, [addFromStore, toast]);

    return { createUser, loading, error };
};
