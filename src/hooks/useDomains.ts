import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// Interfaces pour les types de domaines
export interface DomainInfo {
  name: string;
  available: boolean;
  price?: number;
  currency?: string;
  period?: number;
  cartId?: string;
  itemId?: string;
  cartUrl?: string;
}

export interface DomainCheckResponse {
  domains: DomainInfo[];
  totalPrice?: number;
  currency?: string;
}

export interface DomainOrder {
  domain: string;
  period: number;
  contactId?: string;
}

/**
 * Hook personnalisé pour la gestion des domaines
 */
export function useDomains() {
  const [isLoading, setIsLoading] = useState(false);
  const [domainResults, setDomainResults] = useState<DomainInfo[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [existingDomains, setExistingDomains] = useState<string[]>([]);

  /**
   * Vérifie la disponibilité d'un ou plusieurs domaines
   */
  const checkDomainAvailability = useCallback(async (domains: string[]) => {
    try {
      setIsLoading(true);
      const domainsParam = domains.join(',');
      const response = await fetch(`/api/domains?action=check&domains=${encodeURIComponent(domainsParam)}`);

      if (!response.ok) {
        throw new Error('Erreur lors de la vérification des domaines');
      }

      const data: DomainCheckResponse = await response.json();
      setDomainResults(data.domains || []);

      if (data.domains?.length > 0) {
        toast.success(`${data.domains.length} domaine(s) vérifié(s)`);
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la vérification des domaines:', error);
      toast.error('Impossible de vérifier la disponibilité des domaines');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Charge les suggestions de domaines basées sur un nom
   */
  const loadSuggestions = useCallback(async (baseName: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/domains?action=suggestions&baseName=${encodeURIComponent(baseName)}`);

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      return data.suggestions;
    } catch (error) {
      console.error('Erreur lors du chargement des suggestions:', error);
      toast.error('Impossible de charger les suggestions de domaines');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Charge les domaines existants
   */
  const loadExistingDomains = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/domains?action=existing');

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des domaines existants');
      }

      const data = await response.json();
      setExistingDomains(data || []);
      return data;
    } catch (error) {
      console.error('Erreur lors du chargement des domaines existants:', error);
      toast.error('Impossible de charger les domaines existants');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Commande un ou plusieurs domaines
   */
  const orderDomains = useCallback(async (orders: DomainOrder[]) => {
    try {
      setIsLoading(true);

      const orderPromises = orders.map(order =>
        fetch('/api/domains', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'order',
            ...order,
          }),
        })
      );

      const responses = await Promise.all(orderPromises);
      const results = await Promise.all(responses.map(r => r.json()));

      // Vérifier les résultats
      const successCount = results.filter(r => !r.error).length;
      const errorCount = results.filter(r => r.error).length;

      if (successCount > 0) {
        toast.success(`${successCount} domaine(s) commandé(s) avec succès`);

        // Recharger les domaines existants
        await loadExistingDomains();
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} erreur(s) lors de la commande`);
      }

      return results;
    } catch (error) {
      console.error('Erreur lors de la commande des domaines:', error);
      toast.error('Impossible de commander les domaines');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadExistingDomains]);

  /**
   * Configure les DNS d'un domaine
   */
  const configureDNS = useCallback(async (domain: string, records: any[]) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'configure-dns',
          domain,
          records,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la configuration DNS');
      }

      const result = await response.json();
      toast.success('Configuration DNS mise à jour');
      return result;
    } catch (error) {
      console.error('Erreur lors de la configuration DNS:', error);
      toast.error('Impossible de configurer les DNS');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Récupère les informations d'un domaine
   */
  const getDomainInfo = useCallback(async (domain: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/domains?action=info&domain=${encodeURIComponent(domain)}`);

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des informations du domaine');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des informations du domaine:', error);
      toast.error('Impossible de récupérer les informations du domaine');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Récupère les contacts disponibles
   */
  const getContacts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/domains?action=contacts');

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des contacts');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des contacts:', error);
      toast.error('Impossible de récupérer les contacts');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Récupère les commandes en cours
   */
  const getOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/domains?action=orders');

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des commandes');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes:', error);
      toast.error('Impossible de récupérer les commandes');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Réinitialise les résultats
   */
  const resetResults = useCallback(() => {
    setDomainResults([]);
    setSuggestions([]);
  }, []);

  return {
    // États
    isLoading,
    domainResults,
    suggestions,
    existingDomains,

    // Actions
    checkDomainAvailability,
    loadSuggestions,
    loadExistingDomains,
    orderDomains,
    configureDNS,
    getDomainInfo,
    getContacts,
    getOrders,
    resetResults,
  };
}
