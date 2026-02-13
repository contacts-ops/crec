import { useState } from 'react';

export interface FormDomData {
  // Étape 1
  street?: string;
  suite?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  email?: string;
  phone?: string;
  firstName?: string; // utilisé pour particuliers et auto-complétion
  lastName?: string;
  // Étape 2
  legalForm?: string;
  companyName?: string;
  ceoFirstName?: string;
  ceoMiddleName?: string;
  ceoLastName?: string;
  ceoGender?: 'female' | 'male';
  companyCreated?: string;
  // Champs pour l'attestation
  birthDate?: string; // Date de naissance du dirigeant
  birthPlace?: string; // Lieu de naissance du dirigeant
  nationality?: string; // Nationalité du dirigeant
  activity?: string; // Activité principale de l'entreprise
  // Legacy single-file fields (toujours acceptés mais non utilisés côté UI)
  idCardFile?: string | null;
  domicileProofFile?: string | null;
  // Nouveaux champs multi-fichiers (URLs S3)
  idCardFiles?: (File | string)[];
  domicileProofFiles?: (File | string)[];
  kbisFiles?: (File | string)[];
  // Signature
  signature?: string; // Base64 de la signature du client
  // NOUVEAUX CHAMPS : Type de domiciliation et SIRET
  domiciliationType?: 'creation' | 'changement';
  currentSiret?: string;
  // Abonnement / produit
  abonnementId?: string;
  abonnementType?: string;
  stripePriceId?: string;
  // Métadonnées de suivi et contexte
  status?: string; // e.g., 'draft', 'submitted'
  currentStep?: number;
  siteId?: string | null;
  ipAddress?: string;
}

interface FormulairesListResponse {
  success: boolean;
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface FormulairesAddResponse {
  success: boolean;
  message: string;
  id: string;
  error?: string;
  details?: string;
}

export const useFormDom = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour soumettre un formulaire
  const submitForm = async (formData: FormDomData): Promise<FormulairesAddResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/formulaires/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Récupérer le message d'erreur spécifique de l'API
        const errorMessage = data.error || data.message || 'Erreur lors de la soumission';
        const errorDetails = data.details || '';
        
        // Stocker l'erreur pour l'affichage
        setError(errorDetails || errorMessage);
        
        // Retourner l'objet d'erreur avec les détails
        return {
          success: false,
          message: errorMessage,
          error: errorMessage,
          details: errorDetails,
          id: ''
        };
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
        id: ''
      };
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour récupérer la liste des formulaires
  const getFormulaires = async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    siteId?: string;
  }): Promise<FormulairesListResponse | null> => {
    console.log("🔄 Hook getFormulaires appelé avec params:", params);
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.status) searchParams.append('status', params.status);
      if (params?.search) searchParams.append('search', params.search);
      if (params?.siteId) searchParams.append('siteId', params.siteId);

      const url = `/api/formulaires/list?${searchParams.toString()}`;
      console.log("📡 Appel API:", url);

      const response = await fetch(url);
      console.log("📊 Réponse API:", response.status, response.statusText);

      const data = await response.json();
      console.log("📦 Données API reçues:", data);

      if (!response.ok) {
        console.error("❌ Erreur API:", data);
        throw new Error(data.error || 'Erreur lors de la récupération');
      }

      console.log("✅ Données API valides, retour:", data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error("❌ Erreur dans getFormulaires:", errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
      console.log("🏁 Hook getFormulaires terminé");
    }
  };

  // Fonction pour mettre à jour le statut d'un formulaire
  const updateFormStatus = async (id: string, status: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/formulaires/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    submitForm,
    getFormulaires,
    updateFormStatus,
  };
}; 