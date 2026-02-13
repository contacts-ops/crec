"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth";

export interface PendingInvitation {
  id: string;
  userId: string;
  siteId: string;
  siteName: string;
  siteDescription: string;
  siteDomain: string;
  siteStatus: string;
  permission: "read" | "write" | "admin";
  invitedAt: string;
  invitedBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export function usePendingInvitations() {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const  isAuthenticated = useAuthStore();

  const fetchInvitations = useCallback(async () => {
    // Ne pas faire la requête si l'utilisateur n'est pas authentifié
    if (!isAuthenticated) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/invitations/pending", {
        credentials: "include",
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      } else {
        setError("Erreur lors du chargement des invitations");
        setInvitations([]);
      }
    } catch {
      setError("Erreur de connexion");
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Se déclencher immédiatement quand l'authentification change
  useEffect(() => {
    if (isAuthenticated) {
      // Délai de 5 secondes pour s'assurer que tout est bien initialisé
      const timer = setTimeout(() => {
        fetchInvitations();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      // Réinitialiser si l'utilisateur se déconnecte
      setInvitations([]);
      setLoading(false);
      setError(null);
    }
  }, [isAuthenticated, fetchInvitations]);

  // Recharger les invitations quand la page devient visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        fetchInvitations();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchInvitations, isAuthenticated]);

  return {
    invitations,
    loading,
    error,
    refresh: fetchInvitations
  };
}
