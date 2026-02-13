import { useState } from 'react';

interface ContactData {
  name: string;
  firstName: string;
  email: string;
  subject: string;
  message: string;
}

interface Contact {
  _id: string;
  name: string;
  firstName: string;
  email: string;
  subject: string;
  message: string;
  submittedAt: string;
  status: 'new' | 'read' | 'replied';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ContactsListResponse {
  success: boolean;
  data: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ContactAddResponse {
  success: boolean;
  message: string;
  id: string;
  error?: string;
  details?: string;
}

export const useContacts = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour soumettre un contact
  const submitContact = async (contactData: ContactData): Promise<ContactAddResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/contacts/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Récupérer le message d'erreur spécifique de l'API
        const errorMessage = data.error || data.message || 'Erreur lors de l\'envoi';
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

  // Fonction pour récupérer la liste des contacts
  const getContacts = async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<ContactsListResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.status) searchParams.append('status', params.status);
      if (params?.search) searchParams.append('search', params.search);

      const response = await fetch(`/api/contacts/list?${searchParams.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la récupération');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour mettre à jour le statut d'un contact
  const updateContactStatus = async (id: string, status: string, adminNotes?: string, opts?: { action?: 'delete' | 'restore' }): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/contacts/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, adminNotes, action: opts?.action }),
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
    submitContact,
    getContacts,
    updateContactStatus,
  };
}; 