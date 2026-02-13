"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAbonnements } from "@/hooks/use-abonnements";
import { useSiteConfig } from "@/hooks/use-site-config";
import StripeConfigModal from "./StripeConfigModal";
import {
  Building,
  Package,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Euro,
  Calendar,
  Tag,
  CreditCard,
  Zap,
  Loader2,
  ExternalLink
} from "lucide-react";

interface AdminAbonnementTemplateProps {
  siteId?: string;
  editableElements?: {
    [key: string]: string;
  };
}

export default function AdminAbonnementTemplate({
  siteId,
  editableElements = {}
}: AdminAbonnementTemplateProps) {
  
  const [activeTab, setActiveTab] = useState<'domiciliation' | 'location'>('domiciliation');
  const [editingAbonnement, setEditingAbonnement] = useState<any>(null);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(0);
  const [showAbonnementForm, setShowAbonnementForm] = useState(false);
  const [showStripeConfig, setShowStripeConfig] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [success, setSuccess] = useState<string>("");
  const { config: siteConfig, reload: reloadSiteConfig, saveConfig } = useSiteConfig(siteId || "");
  let isTestMode = true;
  // Calculer isTestMode une seule fois
  if (window.location.hostname === 'localhost') {
    isTestMode = true;
  } else {
    isTestMode = siteConfig?.stripe?.isTestMode ?? true;
  }
  const {
    abonnements,
    loading: abonnementsLoading,
    error: abonnementsError,
    createAbonnement,
    updateAbonnement,
    deleteAbonnement,
    refreshAbonnement
  } = useAbonnements(siteId || "");
  // Fonction pour obtenir le statut détaillé de la configuration Stripe
  const getStripeStatus = () => {
    if (!siteConfig?.stripe?.isConfigured) {
      return { configured: false, mode: null, label: "Non configuré" };
    }
    
    // isTestMode est déjà calculé au niveau du composant
    return {
      configured: true,
      mode: isTestMode ? "test" : "production",
      label: `Stripe ${isTestMode ? "TEST" : "PRODUCTION"}`
    };
  };

  const getCurrentStripeMode = (): 'test' | 'live' => {
    return isTestMode ? 'test' : 'live';
  };

  const getAbonnementStripeIds = (abonnement: any): { productId?: string; priceId?: string } => {
    const mode = getCurrentStripeMode();
    if (mode === 'test') {
      return {
        productId: abonnement.stripeProductIdTest || abonnement.stripeProductId,
        priceId: abonnement.stripePriceIdTest || abonnement.stripePriceId,
      };
    }
    return {
      productId: abonnement.stripeProductIdLive || abonnement.stripeProductId,
      priceId: abonnement.stripePriceIdLive || abonnement.stripePriceId,
    };
  };

  // Fonction pour créer automatiquement un produit Stripe
  const createStripeProduct = async (abonnementId: string, isAutomatic: boolean = false) => {
    const stripeStatus = getStripeStatus();
    if (!stripeStatus.configured) {
      return false;
    }

    try {
      console.log(`🔄 Création ${isAutomatic ? 'automatique' : 'manuelle'} du produit Stripe avec les clés configurées...`);
      const response = await fetch("/api/sharedServices/stripe/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          abonnementId,
          siteId,
          useStoredKeys: true, // Utiliser les clés stockées
          mode: getCurrentStripeMode()
        }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Produit Stripe créé avec succès:", data);
        return true;
      } else {
        const errorData = await response.json();
        console.error("❌ Erreur création produit Stripe:", errorData);
        alert(`Erreur lors de la création du produit Stripe: ${errorData.error || 'Erreur inconnue'}`);
        return false;
      }
    } catch (err) {
      console.error("❌ Erreur lors de la création du produit Stripe:", err);
      alert(`Erreur lors de la création du produit Stripe: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      return false;
    }
  };

  // Fonction pour mettre à jour un produit Stripe
  const updateStripeProduct = async (abonnementId: string, abonnementData: any) => {
    const stripeStatus = getStripeStatus();
    if (!stripeStatus.configured) {
      return false;
    }

    try {
      console.log("🔄 Mise à jour du produit Stripe avec les clés configurées...");
      const response = await fetch("/api/sharedServices/stripe/products", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          abonnementId,
          siteId,
          useStoredKeys: true, // Utiliser les clés stockées
          mode: getCurrentStripeMode()
        }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Produit Stripe mis à jour avec succès:", data);
        return true;
      } else {
        const errorData = await response.json();
        console.error("❌ Erreur mise à jour produit Stripe:", errorData);
        alert(`Erreur lors de la mise à jour du produit Stripe: ${errorData.error || 'Erreur inconnue'}`);
        return false;
      }
    } catch (err) {
      console.error("❌ Erreur lors de la mise à jour du produit Stripe:", err);
      alert(`Erreur lors de la mise à jour du produit Stripe: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      return false;
    }
  };

  const handleAbonnementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAbonnement) return;

          // Filtrer les caractéristiques vides avant la sauvegarde
      // Calculer le prix facturé HT en fonction de la durée à partir du prix mensuel HT saisi
      const multiplier = editingAbonnement.duree === 'mensuel' ? 1
        : editingAbonnement.duree === 'trimestriel' ? 3
        : editingAbonnement.duree === 'semestriel' ? 6
        : editingAbonnement.duree === 'annuel' ? 12
        : 1;

      const computedTotalHt = Number((Number(monthlyPrice || 0) * multiplier).toFixed(2));
      const abonnementToSave = {
        ...editingAbonnement,
        prix: computedTotalHt,
        caracteristiques: editingAbonnement.caracteristiques?.filter((carac: string) => carac.trim() !== '') || []
      };

    try {
      let result;
      const isNewAbonnement = !abonnementToSave._id;

      if (abonnementToSave._id) {
        result = await updateAbonnement(abonnementToSave._id, abonnementToSave);
      } else {
        result = await createAbonnement(abonnementToSave);
      }

      if (result) {
        setSuccess(abonnementToSave._id ? "Abonnement mis à jour avec succès" : "Abonnement créé avec succès");
        // Si c'est un nouvel abonnement et que Stripe est configuré, créer automatiquement le produit Stripe
        if (isNewAbonnement && result._id) {
          const stripeStatus = getStripeStatus();
          if (stripeStatus.configured) {
            
            // Délai court pour permettre à l'utilisateur de voir le message initial
            setTimeout(async () => {
              const stripeCreated = await createStripeProduct(result._id, true);
              if (stripeCreated) {
                setSuccess("Abonnement créé avec succès et produit Stripe créé automatiquement");
                // Rafraîchir l'abonnement pour récupérer les IDs Stripe
                await refreshAbonnement(result._id);
              } else {
                setSuccess("Abonnement créé avec succès mais échec de la création du produit Stripe");
              }
            }, 500);
          } else {
            setSuccess("Abonnement créé avec succès (Stripe non configuré)");
          }
        }
        
        // Si c'est une mise à jour d'un abonnement existant qui a un produit Stripe
        if (!isNewAbonnement && abonnementToSave._id) {
          const originalAbonnement = abonnements.find(ab => ab._id === abonnementToSave._id);
          if (originalAbonnement?.stripeProductId) {
            const stripeStatus = getStripeStatus();
            if (stripeStatus.configured) {
              // Délai court pour permettre à l'utilisateur de voir le message initial
              setTimeout(async () => {
                const stripeUpdated = await updateStripeProduct(abonnementToSave._id!, abonnementToSave);
                if (stripeUpdated) {
                  setSuccess("Abonnement et produit Stripe mis à jour avec succès");
                  // Rafraîchir l'abonnement pour récupérer les nouvels IDs Stripe
                  await refreshAbonnement(abonnementToSave._id!);
                } else {
                  setSuccess("Abonnement mis à jour avec succès mais échec de la mise à jour du produit Stripe");
                }
              }, 500);
            } else {
              setSuccess("Abonnement mis à jour avec succès (Stripe non configuré)");
            }
          }
        }
        
        setEditingAbonnement(null);
        setShowAbonnementForm(false);
        setTimeout(() => setSuccess(""), 5000);
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de l\'abonnement:', err);
      setSuccess("Erreur lors de la sauvegarde de l'abonnement");
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const handleDeleteAbonnement = async (id: string) => {
    // Trouver l'abonnement à supprimer pour vérifier s'il a un produit Stripe
    const abonnementToDelete = abonnements.find(ab => ab._id?.toString() === id);
    let confirmMessage = "Êtes-vous sûr de vouloir supprimer cet abonnement ?";
    if (abonnementToDelete?.stripeProductId) {
      confirmMessage += "\n\n⚠️ Cet abonnement est lié à un produit Stripe. Le produit Stripe sera supprimé définitivement de Stripe.";
    }
    
    if (confirm(confirmMessage)) {
      try {
        // Si l'abonnement a un produit Stripe, le supprimer d'abord
        if (abonnementToDelete?.stripeProductId) {
          const stripeStatus = getStripeStatus();
          if (stripeStatus.configured) {
            try {
              const response = await fetch(`/api/sharedServices/stripe/products/${abonnementToDelete.stripeProductId}`, {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  siteId,
                  useStoredKeys: true // Utiliser les clés stockées
                }),
              });
              if (!response.ok) {
                const errorData = await response.json();
                alert(`Erreur lors de la suppression du produit Stripe: ${errorData.error || 'Erreur inconnue'}`);
              }
            } catch (err) {
              alert(`Erreur lors de la suppression du produit Stripe: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
            }
          }
        }
        
        // Supprimer l'abonnement local
        const success = await deleteAbonnement(id);
        if (success) {
          if (abonnementToDelete?.stripeProductId) {
            setSuccess("Abonnement supprimé avec succès et produit Stripe supprimé définitivement");
          } else {
            setSuccess("Abonnement supprimé avec succès");
          }
          setTimeout(() => setSuccess(""), 3000);
        }
      } catch (err) {
        console.error('Erreur lors de la suppression de l\'abonnement:', err);
      }
    }
  };

  const openAbonnementForm = (abonnement?: any) => {
    const defaultCaracteristiques = abonnement?.type === 'location_bureaux' ? [
      "Bureau meublé",
      "Accès 24h/24",
      "WiFi inclus",
      "Salle de réunion"
    ] : [
      "Domiciliation commerciale",
      "Boîte aux lettres personnelles",
      "Réception et tri du courrier",
      "Notification de courrier"
    ];

    const initial = abonnement || {
      nom: "",
      description: "",
      prix: 0,
      duree: "mensuel",
      type: "domiciliation",
      actif: true,
      caracteristiques: defaultCaracteristiques
    };

    // Initialiser le prix mensuel à partir du prix stocké et de la durée
    const factor = initial.duree === 'mensuel' ? 1
      : initial.duree === 'trimestriel' ? 3
      : initial.duree === 'semestriel' ? 6
      : initial.duree === 'annuel' ? 12
      : 1;
    const initialMonthly = factor > 0 ? Number((Number(initial.prix || 0) / factor).toFixed(2)) : 0;

    setEditingAbonnement(initial);
    setMonthlyPrice(initialMonthly);
    setShowAbonnementForm(true);
  };

  const handleStripeConfigured = async () => {
    setSuccess("Configuration Stripe mise à jour");
    // Rafraîchir la config globale pour refléter le mode dans le badge
    await reloadSiteConfig();
    setTimeout(() => setSuccess(""), 3000);
  };

  // Filtrer l'affichage selon le mode (ne montrer que les produits du mode courant)
  console.log('🔍 Debug filtrage:', { isTestMode, siteConfig: siteConfig?.stripe });
  const abonnementsForDisplay = abonnements.filter((ab) => {
    const modeFlag = (ab as any).stripeMode as 'test' | 'live' | undefined;
    console.log('🔍 Abonnement:', { nom: ab.nom, stripeMode: modeFlag, isTestMode });
    if (modeFlag) {
      const shouldShow = isTestMode ? modeFlag === 'test' : modeFlag === 'live';
      console.log('🔍 Should show (avec stripeMode):', shouldShow);
      return shouldShow;
    }
    // Fallback si ancien abonnement sans flag: déduire via présence d'ID
    const shouldShow = isTestMode ? Boolean((ab as any).stripeProductIdTest) : Boolean((ab as any).stripeProductIdLive);
    console.log('🔍 Should show (fallback):', shouldShow);
    return shouldShow;
  });
  console.log('🔍 Abonnements filtrés:', abonnementsForDisplay.map(ab => ({ nom: ab.nom, stripeMode: (ab as any).stripeMode })));
  const handleToggleStripeMode = async (checked: boolean) => {
    if (!siteId) return;
    // Conserver les clés existantes des deux modes si disponibles
    const stripe = siteConfig?.stripe || { isConfigured: false, isTestMode: true } as any;
    const payload = {
      isTestMode: checked,
      isConfigured: stripe.isConfigured ?? true,
      testPublicKey: stripe.testPublicKey || "",
      testSecretKey: stripe.testSecretKey || "",
      livePublicKey: stripe.livePublicKey || "",
      liveSecretKey: stripe.liveSecretKey || "",
    };
    const ok = await saveConfig('stripe', payload);
    if (ok) {
      await reloadSiteConfig();
      setSuccess(checked ? "Stripe en mode TEST" : "Stripe en mode PRODUCTION");
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  return (
    <div className="p-6" data-type="service">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Gestion des Abonnements
              </h2>
              <p className="text-gray-600">
                Gérez vos abonnements de domiciliation et location de bureaux.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {(() => {
                const stripeStatus = getStripeStatus();
                if (stripeStatus.configured) {
                  return (
                    <Badge 
                      variant="default" 
                      className={`${
                        stripeStatus.mode === 'test' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {stripeStatus.label}
                    </Badge>
                  );
                }
                return null;
              })()}
              {/* Switch Test/Production */}
              <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                <span className="text-xs text-gray-600">Mode test</span>
                <Switch
                  id="stripe-mode-toggle"
                  checked={isTestMode}
                  onCheckedChange={handleToggleStripeMode}
                />
              </div>
              <Button
                onClick={() => {
                  const s = getStripeStatus();
                  const url = `https://dashboard.stripe.com${s.mode === 'test' ? '/test' : ''}`;
                  window.open(url, '_blank', 'noopener');
                }}
                variant="solidGray"
              >
                <ExternalLink className="w-4 h-4" />
                Ouvrir Stripe Dashboard
              </Button>
              <Button
                onClick={() => setShowStripeConfig(true)}
                variant="solidGray"
              >
                <CreditCard className="w-4 h-4" />
                Configuration Stripe
              </Button>
            </div>
          </div>
          
          {abonnementsError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">Erreur: {abonnementsError}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          <div className="flex justify-between items-center mb-4">

            <Button
              onClick={() => openAbonnementForm()}
              variant="solidGray"
            >
              <Plus className="w-4 h-4" />
              Ajouter un abonnement
            </Button>
          </div>

          {abonnementsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Chargement des abonnements...</span>
            </div>
          ) : (
            abonnementsForDisplay.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                Chargement des abonnements...
            </div>
          ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {abonnementsForDisplay.filter(abonnement => {
                 if (activeTab === 'domiciliation') {
                   return abonnement.type === 'domiciliation';
                 } else if (activeTab === 'location') {
                   return abonnement.type === 'location_bureaux';
                 }
                 return false;
                               }).map((abonnement) => (
                 <div key={abonnement._id?.toString()} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{abonnement.nom}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openAbonnementForm(abonnement)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAbonnement(abonnement._id?.toString() || '')}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {(() => {
                        const ids = getAbonnementStripeIds(abonnement);
                        return ids.productId ? (
                        <button
                          onClick={() => {
                            const s = getStripeStatus();
                            const url = `https://dashboard.stripe.com${s.mode === 'test' ? '/test' : ''}/products/${ids.productId}`;
                            window.open(url, '_blank', 'noopener');
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Ouvrir le produit Stripe"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  
                  {abonnement.description && (
                    <p className="text-gray-600 text-sm mb-2">{abonnement.description}</p>
                  )}
                  
                  {abonnement.caracteristiques && abonnement.caracteristiques.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Caractéristiques :</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {abonnement.caracteristiques.slice(0, 3).map((caracteristique: string, index: number) => (
                          <li key={index} className="flex items-start gap-1">
                            <span className="text-gray-500 mt-1">•</span>
                            <span>{caracteristique}</span>
                          </li>
                        ))}
                        {abonnement.caracteristiques.length > 3 && (
                          <li className="text-gray-400 italic">
                            +{abonnement.caracteristiques.length - 3} autres...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold text-gray-900">
                        {Number(abonnement?.prix ?? 0).toFixed(2)}€ HT
                      </span>
                      <span className="text-sm text-gray-600">
                        {(() => {
                          const totalHt = Number(abonnement?.prix ?? 0);
                          const monthly = abonnement.duree === "mensuel"
                            ? totalHt
                            : abonnement.duree === "trimestriel"
                              ? totalHt / 3
                              : abonnement.duree === "semestriel"
                                ? totalHt / 6
                                : abonnement.duree === "annuel"
                                  ? totalHt / 12
                                  : totalHt;
                          return `${monthly.toFixed(2)}€/mois`;
                        })()}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 capitalize">
                      {abonnement.duree}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    {(() => {
                      const ids = getAbonnementStripeIds(abonnement);
                      return ids.productId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          <CheckCircle className="inline w-3 h-3" />
                          Produit Stripe ({getCurrentStripeMode() === 'test' ? 'Test' : 'Live'})
                      </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                          <AlertCircle className="inline w-3 h-3" />
                          Pas de produit Stripe ({getCurrentStripeMode() === 'test' ? 'Test' : 'Live'})
                      </span>
                      );
                    })()}
                    {abonnement.actif ? (
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        Actif
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                        Inactif
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            )
          )}
        </div>

        {/* Abonnement Form Modal */}
        <Dialog open={showAbonnementForm} onOpenChange={setShowAbonnementForm}>
          <DialogContent className="w-[95vw] max-w-[520px] sm:max-w-[640px] md:max-w-[720px] lg:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAbonnement?._id ? "Modifier l'abonnement" : "Ajouter un abonnement"}
              </DialogTitle>
              <DialogDescription>
                {editingAbonnement?._id 
                  ? "Modifiez les informations de l'abonnement."
                  : "Ajoutez un nouvel abonnement à votre catalogue."
                }
              </DialogDescription>
            </DialogHeader>
            
            {/* Alerte pour rappeler les bonnes pratiques */}
            {!editingAbonnement?._id && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">💡 Recommandation pour une offre complète :</p>
                                         <p className="mb-2">Pour offrir le meilleur choix à vos clients, il est recommandé de créer <strong>4 versions</strong> de chaque abonnement :</p>
                     <ul className="list-disc list-inside space-y-1 text-xs">
                       <li><strong>Mensuel</strong> : pour les clients qui veulent tester</li>
                       <li><strong>Trimestriel</strong> : pour les clients qui s'engagent à court terme (économies de 5-10%)</li>
                       <li><strong>Semestriel</strong> : pour les clients qui s'engagent (économies de 10-15%)</li>
                       <li><strong>Annuel</strong> : pour les clients fidèles (économies de 20-25%)</li>
                     </ul>
                    <p className="mt-2 text-xs text-blue-600">Le composant de paiement affichera automatiquement les prix par mois pour faciliter la comparaison.</p>
                  </div>
                </div>
              </div>
            )}
            <form onSubmit={handleAbonnementSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nom">Nom</Label>
                  <Input
                    id="nom"
                    value={editingAbonnement?.nom || ""}
                    onChange={(e) => setEditingAbonnement({ ...editingAbonnement, nom: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select 
                    value={editingAbonnement?.type || "domiciliation"} 
                    onValueChange={(value) => {
                      // Mettre à jour les caractéristiques par défaut selon le type
                      const defaultCaracteristiques = value === 'location_bureaux' ? [
                        "Bureau meublé",
                        "Accès 24h/24",
                        "WiFi inclus",
                        "Salle de réunion"
                      ] : [
                        "Domiciliation commerciale",
                        "Boîte aux lettres personnelles",
                        "Réception et tri du courrier",
                        "Notification de courrier"
                      ];
                      
                      setEditingAbonnement({ 
                        ...editingAbonnement, 
                        type: value,
                        caracteristiques: editingAbonnement.caracteristiques?.length > 0 
                          ? editingAbonnement.caracteristiques 
                          : defaultCaracteristiques
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                                         <SelectContent>
                       <SelectItem value="domiciliation">Domiciliation</SelectItem>
                       <SelectItem value="location_bureaux">Location de bureau</SelectItem>
                     </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingAbonnement?.description || ""}
                  onChange={(e) => setEditingAbonnement({ ...editingAbonnement, description: e.target.value })}
                  rows={3}
                  placeholder="Description courte de l'abonnement (optionnel)"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Caractéristiques de l'abonnement</Label>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultCaracteristiques = editingAbonnement?.type === 'location_bureaux' ? [
                        "Bureau meublé",
                        "Accès 24h/24",
                        "WiFi inclus",
                        "Salle de réunion",
                        "Accueil téléphonique",
                        "Services de conciergerie"
                      ] : [
                        "Domiciliation commerciale",
                        "Boîte aux lettres personnelles",
                        "Réception et tri du courrier",
                        "Notification de courrier",
                        "Scan de l'enveloppe (en option)",
                        "Scan du contenu (en option)",
                        "Réexpédition des originaux chaque mois (en option)",
                        "Frais d'affranchissement inclus (en option)"
                      ];
                      setEditingAbonnement({ 
                        ...editingAbonnement, 
                        caracteristiques: defaultCaracteristiques
                      });
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Charger les exemples
                  </button>
                </div>
                <div className="space-y-2">
                  {editingAbonnement?.caracteristiques?.map((caracteristique: string, index: number) => (
                    <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Input
                        value={caracteristique}
                        onChange={(e) => {
                          const newCaracteristiques = [...(editingAbonnement.caracteristiques || [])];
                          newCaracteristiques[index] = e.target.value;
                          setEditingAbonnement({ 
                            ...editingAbonnement, 
                            caracteristiques: newCaracteristiques 
                          });
                        }}
                        placeholder="Ex: Domiciliation commerciale"
                      />
                      <Button
                        type="button"
                        variant="solidGray"
                        size="sm"
                        onClick={() => {
                          const newCaracteristiques = editingAbonnement.caracteristiques.filter((_: string, i: number) => i !== index);
                          setEditingAbonnement({ 
                            ...editingAbonnement, 
                            caracteristiques: newCaracteristiques 
                          });
                        }}
                        className=""
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="solidGray"
                    onClick={() => {
                      const newCaracteristiques = [...(editingAbonnement.caracteristiques || []), ""];
                      setEditingAbonnement({ 
                        ...editingAbonnement, 
                        caracteristiques: newCaracteristiques 
                      });
                    }}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une caractéristique
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Ajoutez les caractéristiques qui seront affichées avec des puces dans l'offre
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prixMensuel">Prix mensuel HT (€ / mois)</Label>
                  <Input
                    id="prixMensuel"
                    type="number"
                    step="0.01"
                    value={Number.isFinite(monthlyPrice) ? monthlyPrice : 0}
                    onChange={(e) => setMonthlyPrice(parseFloat(e.target.value) || 0)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ce montant est hors taxes. Les taxes seront ajoutées par Stripe lors du paiement.
                  </p>
                  <p className="text-xs text-gray-700 mt-1">
                    {(() => {
                      const m = editingAbonnement?.duree === 'mensuel' ? 1
                        : editingAbonnement?.duree === 'trimestriel' ? 3
                        : editingAbonnement?.duree === 'semestriel' ? 6
                        : editingAbonnement?.duree === 'annuel' ? 12
                        : 1;
                      const total = Number(((monthlyPrice || 0) * m).toFixed(2));
                      const unite = editingAbonnement?.duree === 'mensuel' ? '/mois'
                        : editingAbonnement?.duree === 'trimestriel' ? '/trimestre'
                        : editingAbonnement?.duree === 'semestriel' ? '/semestre'
                        : '/an';
                      return `Total facturé HT: ${total}€ ${unite}`;
                    })()}
                  </p>
                </div>
                <div>
                  <Label htmlFor="duree">Durée</Label>
                  <Select 
                    value={editingAbonnement?.duree || "mensuel"} 
                    onValueChange={(value) => setEditingAbonnement({ ...editingAbonnement, duree: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une durée" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensuel">Mensuel</SelectItem>
                      <SelectItem value="trimestriel">Trimestriel</SelectItem>
                      <SelectItem value="semestriel">Semestriel</SelectItem>
                      <SelectItem value="annuel">Annuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="actif"
                  checked={editingAbonnement?.actif || false}
                  onCheckedChange={(checked) => setEditingAbonnement({ ...editingAbonnement, actif: checked })}
                />
                <Label htmlFor="actif">Actif</Label>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="solidGray" onClick={() => setShowAbonnementForm(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="solidGray">
                  {editingAbonnement?._id ? "Modifier" : "Ajouter"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de configuration Stripe */}
        <StripeConfigModal
          isOpen={showStripeConfig}
          onClose={() => setShowStripeConfig(false)}
          siteId={siteId}
          onStripeConfigured={handleStripeConfigured}
        />
      </div>
    </div>
  );
} 