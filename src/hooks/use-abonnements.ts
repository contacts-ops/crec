import { useState, useEffect, useRef } from 'react';
import { IAbonnement } from '@/lib/models/Abonnement';

type UseAbonnementsOptions = {
  type?: string;
  duree?: string;
  stripeMode?: 'test' | 'live';
  actif?: boolean;
};

export const useAbonnements = (siteId: string, options: UseAbonnementsOptions = {}) => {
  const [abonnements, setAbonnements] = useState<IAbonnement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchKey = useRef<string | null>(null);
  const { type, duree, stripeMode, actif } = options;

  useEffect(() => {
    const controller = new AbortController();

    const fetchAbonnements = async () => {
      if (!siteId) {
        setLoading(false);
        return;
      }

      const fetchKey = `${siteId}|${type || ''}|${duree || ''}|${stripeMode || ''}|${actif === undefined ? 'undefined' : actif}`;

      // Évite les refetch inutiles quand les paramètres n'ont pas changé
      if (lastFetchKey.current === fetchKey && abonnements.length > 0) {
        setLoading(false);
        return;
      }
      lastFetchKey.current = fetchKey;

      const controller = new AbortController();

      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({ siteId });
        if (type) params.append('type', type);
        if (duree) params.append('duree', duree);
        if (stripeMode) params.append('stripeMode', stripeMode);
        if (actif !== undefined) params.append('actif', String(actif));

        const response = await fetch(`/api/sharedServices/abonnements?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des abonnements');
        }
        const data = await response.json();
        setAbonnements(data);
      } catch (err) {
        // Ignore les erreurs dues à l'annulation
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        console.error('❌ Erreur lors de la récupération des abonnements:', err);
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchAbonnements();
    return () => controller.abort();
  }, [siteId, type, duree, stripeMode, actif]);

  const createAbonnement = async (abonnementData: Partial<IAbonnement>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/sharedServices/abonnements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...abonnementData, siteId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création');
      }

      const newAbonnement = await response.json();
      setAbonnements(prev => [...prev, newAbonnement]);
      return newAbonnement;
    } catch (err) {
      console.error('❌ Erreur createAbonnement:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateAbonnement = async (id: string, abonnementData: Partial<IAbonnement>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/sharedServices/abonnements/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(abonnementData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }

      const updatedAbonnement = await response.json();
      setAbonnements(prev => prev.map(abonnement => 
        abonnement._id?.toString() === id ? updatedAbonnement : abonnement
      ));
      return updatedAbonnement;
    } catch (err) {
      console.error('❌ Erreur updateAbonnement:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteAbonnement = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/sharedServices/abonnements/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }

      setAbonnements(prev => prev.filter(abonnement => abonnement._id?.toString() !== id));
      return true;
    } catch (err) {
      console.error('❌ Erreur deleteAbonnement:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshAbonnement = async (id: string) => {
    try {
      const response = await fetch(`/api/sharedServices/abonnements/${id}`);
      
      if (response.ok) {
        const refreshedAbonnement = await response.json();
        setAbonnements(prev => prev.map(abonnement => 
          abonnement._id?.toString() === id ? refreshedAbonnement : abonnement
        ));
        return refreshedAbonnement;
      }
    } catch (err) {
      console.error('❌ Erreur refreshAbonnement:', err);
    }
    return null;
  };

  return { 
    abonnements, 
    loading, 
    error, 
    createAbonnement, 
    updateAbonnement, 
    deleteAbonnement,
    refreshAbonnement
  };
};