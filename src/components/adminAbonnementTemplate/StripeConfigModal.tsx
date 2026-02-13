"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSiteConfig } from "@/hooks/use-site-config";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Settings,
  Zap
} from "lucide-react";

interface StripeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId?: string;
  onStripeConfigured?: () => void;
}

export default function StripeConfigModal({
  isOpen,
  onClose,
  siteId,
  onStripeConfigured
}: StripeConfigModalProps) {
  const [testPublicKey, setTestPublicKey] = useState("");
  const [testSecretKey, setTestSecretKey] = useState("");
  const [livePublicKey, setLivePublicKey] = useState("");
  const [liveSecretKey, setLiveSecretKey] = useState("");
  // Simplified modal: no local mode switch; testing is per-section
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { config: siteConfig, loading: configLoading, saveConfig } = useSiteConfig(siteId || "");
  // Charger la configuration existante
  useEffect(() => {
    if (siteConfig && isOpen) {
      // On ne charge pas les clés sensibles depuis la base de données
      // L'utilisateur devra les re-saisir à chaque fois
      setTestPublicKey(siteConfig.stripe?.testPublicKey || "");
      setTestSecretKey(siteConfig.stripe?.testSecretKey || "");
      setLivePublicKey(siteConfig.stripe?.livePublicKey || "");
      setLiveSecretKey(siteConfig.stripe?.liveSecretKey || "");
    }
  }, [siteConfig, isOpen]);
  // Statut affichage
  const isStripeConfigured = Boolean(siteConfig?.stripe?.testSecretKey || siteConfig?.stripe?.liveSecretKey);
  const isTestModeConfigured = Boolean(siteConfig?.stripe?.testSecretKey);
  const isLiveModeConfigured = Boolean(siteConfig?.stripe?.liveSecretKey);
  // Fonction pour obtenir le statut détaillé
  // Removed complex status label; we show simple per-mode chips instead

  const handleSave = async () => {
    if (!siteId) {
      setError("SiteId manquant");
      return;
    }

    // Pas d'obligation d'avoir les 2 blocs remplis; on peut enregistrer partiellement

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const success = await saveConfig('stripe', {
        testPublicKey,
        testSecretKey,
        livePublicKey,
        liveSecretKey,
        // Ne pas modifier isTestMode ici: c'est le switch de la page qui le gère
        isConfigured: Boolean(testSecretKey || liveSecretKey)
      });
      if (success) {
        setSuccess("Configuration Stripe sauvegardée avec succès");
        // Appeler le callback si fourni
        if (onStripeConfigured) {
          onStripeConfigured();
        }

        // Fermer le modal après 2 secondes
        setTimeout(() => {
          onClose();
          setSuccess(null);
        }, 2000);
      } else {
        setError("Erreur lors de la sauvegarde");
      }

    } catch (err) {
      console.error("Erreur lors de la sauvegarde:", err);
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async (mode: 'test' | 'live') => {
    // Test per-mode with matching secret
    const secretToTest = mode === 'test' ? testSecretKey : liveSecretKey;
    if (!secretToTest) {
      setError("Clé secrète Stripe requise pour tester la connexion");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/sharedServices/stripe/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stripeSecretKey: secretToTest,
          isTestMode: mode === 'test'
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors du test de connexion");
      }

      setSuccess("Connexion Stripe testée avec succès");
    } catch (err) {
      console.error("Erreur lors du test:", err);
      setError(err instanceof Error ? err.message : "Erreur lors du test de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Configuration Stripe
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statut simple */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${isTestModeConfigured ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>Test: {isTestModeConfigured ? 'configuré' : 'manquant'}</Badge>
            <Badge className={`${isLiveModeConfigured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>Production: {isLiveModeConfigured ? 'configuré' : 'manquant'}</Badge>
            <span className="ml-auto text-xs text-gray-500">Les champs restent vides pour la sécurité.</span>
          </div>

          {/* Mode de test */}
          {/* Mode actuel: retiré pour simplifier la modal */}

          {/* Clés Stripe */}
          {/* Clés Stripe */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Clés Mode Test</h4>
              <div>
                <Label htmlFor="stripe-public-key-test">Clé publique Test</Label>
                <Input
                  id="stripe-public-key-test"
                  type="password"
                  placeholder="pk_test_..."
                  value={testPublicKey}
                  onChange={(e) => setTestPublicKey(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="stripe-secret-key-test">Clé secrète Test</Label>
                <Input
                  id="stripe-secret-key-test"
                  type="password"
                  placeholder="sk_test_..."
                  value={testSecretKey}
                  onChange={(e) => setTestSecretKey(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Clés Mode Production</h4>
              <div>
                <Label htmlFor="stripe-public-key-live">Clé publique Production</Label>
                <Input
                  id="stripe-public-key-live"
                  type="password"
                  placeholder="pk_live_..."
                  value={livePublicKey}
                  onChange={(e) => setLivePublicKey(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="stripe-secret-key-live">Clé secrète Production</Label>
                <Input
                  id="stripe-secret-key-live"
                  type="password"
                  placeholder="sk_live_..."
                  value={liveSecretKey}
                  onChange={(e) => setLiveSecretKey(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Test de connexion simplifié */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="solidGray"
              onClick={() => handleTestConnection('test')}
              disabled={isLoading || !testSecretKey}
              className="flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Tester TEST
            </Button>
            <Button
              variant="solidGray"
              onClick={() => handleTestConnection('live')}
              disabled={isLoading || !liveSecretKey}
              className="flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Tester PRODUCTION
            </Button>
          </div>

          {/* Messages d'erreur/succès */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Informations */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Instructions
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Récupérez vos clés API dans votre dashboard Stripe</li>
              <li>• Utilisez le mode test pour les développements</li>
              <li>• Configurez les webhooks pour les notifications</li>
              <li>• Testez la connexion avant de sauvegarder</li>
            </ul>
            <Button
              variant="link"
              className="p-0 h-auto text-blue-600 mt-2"
              onClick={() => window.open("https://dashboard.stripe.com/apikeys", "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Accéder au dashboard Stripe
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="solidGray" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isLoading || (
                // Exiger au moins un bloc complet (test OU live)
                (!testPublicKey || !testSecretKey) && (!livePublicKey || !liveSecretKey)
              )
            }
            variant="solidGray"
            className="flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {isStripeConfigured ? "Mettre à jour" : "Sauvegarder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 