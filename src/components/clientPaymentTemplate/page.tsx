"use client";

import { useState, useEffect } from "react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  XCircle
} from "lucide-react";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Charger Stripe (on utilisera les clés publiques du site)
// On ne charge pas Stripe ici car on utilise les clés dynamiques du site

interface ClientPaymentTemplateProps {
  siteId?: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank';
  name: string;
  maskedNumber: string;
  expiryDate?: string;
  isDefault: boolean;
  status: 'active' | 'inactive';
  brand?: string;
  last4?: string;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  description: string;
  paymentMethod: string;
  invoiceId?: string;
}

interface FailedPayment {
  invoiceId: string;
  amount: number;
  currency: string;
  failedAt: string;
  reason?: string;
  attemptCount: number;
}

interface AuthenticatedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  siteId: string;
  phone?: string;
  avatar?: string;
  lastLogin?: string;
  permissions?: string[];
}

// Composant pour le formulaire d'ajout de carte
function AddCardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      // Créer le PaymentMethod
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement)!,
      });
      if (paymentMethodError) {
        setError(paymentMethodError.message || 'Erreur lors de la création du moyen de paiement');
        return;
      }

      // Envoyer le PaymentMethod à notre API
      const response = await fetch('/api/sharedServices/stripe/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'ajout du moyen de paiement');
      }

      onSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de l\'ajout du moyen de paiement');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Informations de la carte
        </label>
        <div className="border border-gray-300 rounded-lg p-3">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          className="bg-black hover:bg-gray-700 !text-white"
          disabled={!stripe || isLoading}
        >
          {isLoading ? 'Ajout...' : 'Ajouter la carte'}
        </Button>
      </div>
    </form>
  );
}

export default function ClientPaymentTemplate({
  siteId
}: ClientPaymentTemplateProps) {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const hasLoadedAfterAuthRef = useRef(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<PaymentMethod | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [stripePublishableKey, setStripePublishableKey] = useState<string>("");
  // Récupérer l'utilisateur connecté
  const getCurrentUser = async () => {
    try {
      // Essayer d'abord l'API sharedServices (pour les utilisateurs du CMS)
      let response = await fetch("/api/sharedServices/auth/me", {
        credentials: "include"
      });
      if (!response.ok) {
        // Si ça échoue, essayer l'API auth normale
        response = await fetch("/api/auth/me", {
          credentials: "include"
        });
      }

      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
        console.log('Utilisateur connecté:', userData);
        return userData;
      } else {
        console.error('Erreur d\'authentification:', response.status);
        setError("Vous devez être connecté pour accéder à cette page");
        return null;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      setError("Erreur de connexion au serveur");
      return null;
    }
  };

  // 1) Déclencher l’auth au montage
  useEffect(() => {
    getCurrentUser();
  }, []);
  // 2) Charger les données uniquement après que l’utilisateur soit disponible, et une seule fois
  useEffect(() => {
    if (currentUser && !hasLoadedAfterAuthRef.current) {
      hasLoadedAfterAuthRef.current = true;
      console.log('✅ Utilisateur prêt, chargement des données...');
      // Charger la clé publique Stripe pour le site courant
      if (!stripePublishableKey && currentUser.siteId) {
        getStripePublishableKey(currentUser.siteId);
      }
      loadPaymentMethods();
      loadTransactions();
      loadFailedPayments();
    }
  }, [currentUser]);
  // Récupérer la clé publique Stripe du site
  const getStripePublishableKey = async (siteId: string) => {
    try {
      const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const url = `/api/sharedServices/stripe/get-public-key?siteId=${encodeURIComponent(siteId)}${isLocalhost ? `&isTestMode=true` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setStripePublishableKey(data.publicKey);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la clé Stripe:', error);
    }
  };

  // Charger les moyens de paiement depuis Stripe
  const loadPaymentMethods = async () => {
    if (!currentUser) {
      console.log('❌ Pas d\'utilisateur connecté pour charger les moyens de paiement');
      return;
    }

    console.log(`🔍 Chargement des moyens de paiement pour l'utilisateur: ${currentUser.id}`);
    setIsLoading(true);
    setError("");
    try {
      // Récupérer les moyens de paiement depuis Stripe
      const response = await fetch(`/api/sharedServices/stripe/users/${currentUser.id}/payment-methods`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      console.log(`📡 Réponse API moyens de paiement: ${response.status} ${response.statusText}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erreur API moyens de paiement: ${errorText}`);
        throw new Error(`Erreur lors de la récupération des moyens de paiement: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`📊 Données moyens de paiement reçues:`, data);
      const defaultId = data.defaultPaymentMethodId as string | null;

      const methods: PaymentMethod[] = data.paymentMethods.map((pm: any) => {
        const brand = pm.card?.brand || pm.brand || 'Unknown';
        const last4 = pm.card?.last4 || pm.last4 || (pm.maskedNumber ? pm.maskedNumber.slice(-4) : '****');
        const exp = pm.card ? `${pm.card.exp_month}/${pm.card.exp_year}` : (pm.expiryDate || undefined);
        const method = {
          id: pm.id,
          type: pm.type === 'card' ? 'card' : (pm.type || 'card'),
          name: `${brand.charAt(0).toUpperCase() + brand.slice(1)} **** ${last4}`,
          maskedNumber: pm.maskedNumber || (pm.card ? `**** **** **** ${pm.card.last4}` : (pm.type || 'card')),
          expiryDate: exp,
          isDefault: pm.id === defaultId,
          status: pm.status === 'active' ? 'active' : 'inactive',
          brand,
          last4
        };
        return method;
      });
      console.log(`✅ Moyens de paiement formatés:`, methods);
      setPaymentMethods(methods);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des moyens de paiement:', error);
      setError("Erreur lors du chargement des moyens de paiement");
      setPaymentMethods([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les transactions depuis Stripe
  const loadTransactions = async () => {
    if (!currentUser) {
      console.log('❌ Pas d\'utilisateur connecté pour charger les transactions');
      return;
    }

    console.log(`🔍 Chargement des transactions pour l'utilisateur: ${currentUser.id}`);
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/sharedServices/stripe/users/${currentUser.id}/transactions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      console.log(`📡 Réponse API transactions: ${response.status} ${response.statusText}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erreur API transactions: ${errorText}`);
        throw new Error(`Erreur lors de la récupération des transactions: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`📊 Données transactions reçues:`, data);
      const rawTransactions: Transaction[] = data.transactions.map((t: any) => {
        const brand = t.payment_method_details?.card?.brand || 'Unknown';
        const last4 = t.payment_method_details?.card?.last4 || '****';
        const transaction = {
          id: t.id,
          amount: t.amount / 100, // Stripe en centimes
          currency: t.currency.toUpperCase(),
          status: t.status === 'succeeded' ? 'completed' : t.status === 'pending' ? 'pending' : 'failed',
          date: new Date(t.created * 1000).toISOString(),
          description: t.description || 'Transaction Stripe',
          paymentMethod: `${brand.charAt(0).toUpperCase() + brand.slice(1)} **** ${last4}`,
          invoiceId: t.invoice
        };
        return transaction;
      });
      // Déduplication: garder une seule entrée par (amount, date). Priorité aux entrées avec invoiceId défini
      const dedupMap = new Map<string, Transaction>();
      for (const tx of rawTransactions) {
        const key = `${tx.amount}-${tx.date}`;
        const existing = dedupMap.get(key);
        if (!existing) {
          dedupMap.set(key, tx);
        } else {
          // garder celui avec invoiceId si disponible
          const keep = existing.invoiceId ? existing : tx;
          const candidate = tx.invoiceId ? tx : existing;
          dedupMap.set(key, candidate.invoiceId ? candidate : keep);
        }
      }
      const transactions: Transaction[] = Array.from(dedupMap.values());
      console.log(`✅ Transactions formatées (dédupliquées):`, transactions);
      setTransactions(transactions);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des transactions:', error);
      setError("Erreur lors du chargement des transactions");
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les impayés
  const loadFailedPayments = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/sharedServices/stripe/failed-payments/${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        const failed: FailedPayment[] = data.failedPayments.map((fp: any) => ({
          invoiceId: fp.invoiceId,
          amount: fp.amount / 100,
          currency: fp.currency.toUpperCase(),
          failedAt: fp.failedAt,
          reason: fp.reason,
          attemptCount: fp.attemptCount
        }));
        setFailedPayments(failed);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des impayés:', error);
      setFailedPayments([]);
    }
  };

  const handleAddPaymentMethod = () => {
    // S'assurer que la clé publique est chargée au moment d'ouvrir le modal
    if (currentUser?.siteId && !stripePublishableKey) {
      getStripePublishableKey(currentUser.siteId);
    }
    setShowAddModal(true);
  };

  const handleEditPaymentMethod = (method: PaymentMethod) => {
    setEditingMethod(method);
    setShowEditModal(true);
  };

  const handleDeletePaymentMethod = (method: PaymentMethod) => {
    setItemToDelete(method);
    setShowDeleteModal(true);
  };

  const handleAddSuccess = () => {
    setSuccess("Moyen de paiement ajouté avec succès");
    setShowAddModal(false);
    loadPaymentMethods(); // Recharger les données
  };

  const handleManageSubscription = async () => {
    if (!currentUser) {
      setError("Vous devez être connecté");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await fetch('/api/sharedServices/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création de la session');
      }

      const { url } = await response.json();
      window.location.href = url; // Redirige vers le portail Stripe
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du portail:', error);
      setError(error instanceof Error ? error.message : "Erreur lors de l'ouverture du portail");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMigrateCustomers = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch('/api/sharedServices/stripe/migrate-customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la migration');
      }

      const data = await response.json();
      setSuccess(data.message);
      console.log('Migration terminée:', data);
    } catch (error) {
      console.error('Erreur lors de la migration:', error);
      setError(error instanceof Error ? error.message : "Erreur lors de la migration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete || !currentUser) return;

    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/sharedServices/stripe/users/${currentUser.id}/payment-methods/${itemToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ siteId: currentUser.siteId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }

      setSuccess("Moyen de paiement supprimé avec succès");
      setShowDeleteModal(false);
      setItemToDelete(null);
      loadPaymentMethods(); // Recharger les données
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setError(error instanceof Error ? error.message : "Erreur lors de la suppression");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "pending": return <Clock className="w-4 h-4 text-yellow-500" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "Complété";
      case "pending": return "En attente";
      case "failed": return "Échoué";
      default: return "Inconnu";
    }
  };

  // Si l'utilisateur n'est pas connecté, afficher un message
  if (!currentUser) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Authentification requise</h3>
            <p className="text-gray-500">Vous devez être connecté pour accéder à cette page.</p>
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Mes Paiements
          </h2>
          <p className="text-gray-600">
            Gérez vos moyens de paiement et consultez vos transactions
          </p>
          {error && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {success && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Moyens de paiement</p>
                <p className="text-2xl font-bold text-gray-900">{paymentMethods.length}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Impayés</p>
                <p className="text-2xl font-bold text-gray-900">{failedPayments.length}</p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <Button onClick={handleAddPaymentMethod} className="bg-black hover:bg-gray-700 !text-white">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un moyen de paiement
            </Button>
            {/* <Button 
              onClick={handleManageSubscription} 
              variant="outline" 
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
              disabled={isLoading}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isLoading ? 'Ouverture...' : 'Gérer mon abonnement et mes paiements'}
            </Button>
            <Button 
              onClick={handleMigrateCustomers} 
              variant="outline" 
              className="border-[#EA580C] text-orange-600 hover:bg-orange-50"
              disabled={isLoading}
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              {isLoading ? 'Migration...' : 'Migrer vers Stripe'}
            </Button> */}
          </div>
        </div>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Moyens de paiement */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Moyens de paiement
              </h3>
            </div>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Chargement...</p>
                </div>
              ) : paymentMethods.length > 0 ? (
                paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className={`flex items-center gap-4 ${method.isDefault ? 'bg-black text-white rounded-lg p-3' : ''}`}>
                      <div className={`w-10 h-10 ${method.isDefault ? 'bg-white' : 'bg-gray-100'} rounded-lg flex items-center justify-center`}>
                        <CreditCard className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className={`font-medium ${method.isDefault ? 'text-white' : 'text-gray-900'}`}>{method.name}</h4>
                        <p className={`text-sm ${method.isDefault ? 'text-gray-200' : 'text-gray-500'}`}>{method.maskedNumber}</p>
                        {method.expiryDate && (
                          <p className={`text-xs ${method.isDefault ? 'text-gray-300' : 'text-gray-400'}`}>Expire: {method.expiryDate}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {method.isDefault ? (
                        <Badge variant="default" className="text-xs !bg-white !text-black">Par défaut</Badge>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={async () => {
                            if (!currentUser) return;
                            try {
                              const resp = await fetch(`/api/sharedServices/stripe/users/${currentUser.id}/payment-methods/${method.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ siteId: currentUser.siteId, name: method.name, isDefault: true })
                              });
                              if (!resp.ok) throw new Error('Impossible de définir par défaut');
                              await loadPaymentMethods();
                            } catch (e) {
                              console.error(e);
                              setError('Impossible de définir ce moyen par défaut');
                            }
                          }}
                        >
                          Définir par défaut
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditPaymentMethod(method)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeletePaymentMethod(method)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun moyen de paiement</h3>
                  <p className="text-gray-500">Ajoutez votre premier moyen de paiement pour commencer.</p>
                </div>
              )}
            </div>
          </div>

          {/* Transactions */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Transactions récentes
              </h3>
            </div>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Chargement...</p>
                </div>
              ) : transactions.length > 0 ? (
                transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        {getStatusIcon(transaction.status)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{transaction.description}</h4>
                        <p className="text-sm text-gray-500">{transaction.paymentMethod}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(transaction.date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {transaction.amount.toFixed(2)} {transaction.currency}
                      </p>
                      <Badge className={`text-xs ${getStatusColor(transaction.status)}`}>
                        {getStatusText(transaction.status)}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune transaction</h3>
                  <p className="text-gray-500">Vos transactions apparaîtront ici.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Impayés */}
        {failedPayments.length > 0 && (
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Impayés
              </h3>
            </div>
            <div className="space-y-4">
              {failedPayments.map((failed) => (
                <div key={failed.invoiceId} className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Facture #{failed.invoiceId}</h4>
                      <p className="text-sm text-gray-500">{failed.reason || 'Paiement refusé'}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(failed.failedAt).toLocaleDateString('fr-FR')} - Tentatives: {failed.attemptCount}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">
                      {failed.amount.toFixed(2)} {failed.currency}
                    </p>
                    <Badge className="text-xs bg-red-100 text-red-800">
                      Échoué
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de suppression */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Supprimer le moyen de paiement
            </h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer "{itemToDelete.name}" ? Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                variant="destructive"
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'ajout de moyen de paiement avec Stripe Elements */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Ajouter un moyen de paiement
            </h3>
            {stripePublishableKey ? (
              <Elements stripe={loadStripe(stripePublishableKey)}>
                <AddCardForm 
                  onSuccess={handleAddSuccess}
                  onCancel={() => setShowAddModal(false)}
                />
              </Elements>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Chargement de Stripe...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de modification de moyen de paiement */}
      {showEditModal && editingMethod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Modifier le moyen de paiement
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du moyen de paiement
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Carte Visa"
                  defaultValue={editingMethod.name}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefaultEdit"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  defaultChecked={editingMethod.isDefault}
                />
                <label htmlFor="isDefaultEdit" className="ml-2 text-sm text-gray-700">
                  Définir comme moyen de paiement par défaut
                </label>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                Annuler
              </Button>
              <Button
                className="bg-black hover:bg-gray-700 !text-white"
              >
                Modifier
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 