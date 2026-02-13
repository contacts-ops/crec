"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2, CreditCard, Loader2, Settings, Truck } from "lucide-react"
import { useSiteId } from "@/hooks/use-site-id"

interface EcommerceConfig {
  environment: "development" | "production"
  isConfigured: boolean
  hasTestKeys: boolean
  hasLiveKeys: boolean
  testPublicKey?: string
  livePublicKey?: string
}

// Form state: numeric fields as string so inputs can be empty and typing doesn't force 0
interface DeliveryOptionsForm {
  standardBase: string
  standardPerItem: string
  expressBase: string
  expressPerItem: string
  pickupCost: string
  deliveryOptionsTitle: string
  standardDelivery: string
  standardPrice: string
  standardDelay: string
  expressDelivery: string
  expressPrice: string
  expressDelay: string
  pickupLabel: string
  pickupDelay: string
}

export default function ConfigAdmin() {
  const siteId = useSiteId()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
  const [config, setConfig] = useState<EcommerceConfig | null>(null)

  // Form state
  const [environment, setEnvironment] = useState<"development" | "production">("development")
  const [testPublicKey, setTestPublicKey] = useState("")
  const [testSecretKey, setTestSecretKey] = useState("")
  const [livePublicKey, setLivePublicKey] = useState("")
  const [liveSecretKey, setLiveSecretKey] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("")

  // Config sub-tab: "stripe" | "delivery"
  const [configSubTab, setConfigSubTab] = useState<"stripe" | "delivery">("stripe")

  // Delivery options state
  const [deliveryLoading, setDeliveryLoading] = useState(true)
  const [deliverySaving, setDeliverySaving] = useState(false)
  const [deliveryError, setDeliveryError] = useState<string>("")
  const [deliverySuccess, setDeliverySuccess] = useState<string>("")
  const [delivery, setDelivery] = useState<DeliveryOptionsForm>({
    standardBase: "160",
    standardPerItem: "80",
    expressBase: "300",
    expressPerItem: "160",
    pickupCost: "0",
    deliveryOptionsTitle: "",
    standardDelivery: "",
    standardPrice: "",
    standardDelay: "",
    expressDelivery: "",
    expressPrice: "",
    expressDelay: "",
    pickupLabel: "",
    pickupDelay: "",
  })

  // Load current config
  useEffect(() => {
    const loadConfig = async () => {
      if (!siteId) return

      try {
        setLoading(true)
        setError("")

        const response = await fetch(`/api/services/ecommerce/admin/config?siteId=${siteId}`, {
          credentials: "include",
        })

        if (!response.ok) {
          throw new Error("Erreur lors du chargement de la configuration")
        }

        const data = await response.json()

        if (data.success && data.config) {
          setConfig(data.config)
          setEnvironment(data.config.environment || "development")
        }
      } catch (err: any) {
        console.error("Error loading config:", err)
        setError(err.message || "Erreur lors du chargement de la configuration")
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [siteId])

  // Load delivery options
  useEffect(() => {
    const loadDelivery = async () => {
      if (!siteId) return
      try {
        setDeliveryLoading(true)
        setDeliveryError("")
        const response = await fetch(`/api/services/ecommerce/admin/settings/delivery?siteId=${siteId}`, {
          credentials: "include",
        })
        if (!response.ok) throw new Error("Erreur lors du chargement des options de livraison")
        const data = await response.json()
        if (data.success && data.delivery) {
          const d = data.delivery
          setDelivery({
            standardBase: String(d.standardBase ?? 160),
            standardPerItem: String(d.standardPerItem ?? 80),
            expressBase: String(d.expressBase ?? 300),
            expressPerItem: String(d.expressPerItem ?? 160),
            pickupCost: String(d.pickupCost ?? 0),
            deliveryOptionsTitle: d.deliveryOptionsTitle ?? "",
            standardDelivery: d.standardDelivery ?? "",
            standardPrice: d.standardPrice ?? "",
            standardDelay: d.standardDelay ?? "",
            expressDelivery: d.expressDelivery ?? "",
            expressPrice: d.expressPrice ?? "",
            expressDelay: d.expressDelay ?? "",
            pickupLabel: d.pickupLabel ?? "",
            pickupDelay: d.pickupDelay ?? "",
          })
        }
      } catch (err: any) {
        console.error("Error loading delivery:", err)
        setDeliveryError(err.message || "Erreur lors du chargement des options de livraison")
      } finally {
        setDeliveryLoading(false)
      }
    }
    loadDelivery()
  }, [siteId])

  const handleSave = async () => {
    if (!siteId) {
      setError("SiteId manquant")
      return
    }

    // Validate required fields based on environment
    if (environment === "development") {
      if (!testPublicKey || !testSecretKey) {
        setError("Les clés de test (publique et secrète) sont requises pour le mode développement")
        return
      }
    } else {
      if (!livePublicKey || !liveSecretKey) {
        setError("Les clés de production (publique et secrète) sont requises pour le mode production")
        return
      }
    }

    try {
      setSaving(true)
      setError("")
      setSuccess("")

      const response = await fetch("/api/services/ecommerce/admin/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(siteId ? { "x-site-id": siteId } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          siteId,
          environment,
          testPublicKey: environment === "development" ? testPublicKey : undefined,
          testSecretKey: environment === "development" ? testSecretKey : undefined,
          livePublicKey: environment === "production" ? livePublicKey : undefined,
          liveSecretKey: environment === "production" ? liveSecretKey : undefined,
          webhookSecret: webhookSecret || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de la sauvegarde")
      }

      setSuccess(data.message || "Configuration sauvegardée avec succès")
      
      // Reload config
      const reloadResponse = await fetch(`/api/services/ecommerce/admin/config?siteId=${siteId}`, {
        credentials: "include",
      })
      if (reloadResponse.ok) {
        const reloadData = await reloadResponse.json()
        if (reloadData.success && reloadData.config) {
          setConfig(reloadData.config)
        }
      }

      // Clear form after successful save
      if (environment === "development") {
        setTestPublicKey("")
        setTestSecretKey("")
      } else {
        setLivePublicKey("")
        setLiveSecretKey("")
      }
      setWebhookSecret("")
    } catch (err: any) {
      console.error("Error saving config:", err)
      setError(err.message || "Erreur lors de la sauvegarde de la configuration")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDelivery = async () => {
    if (!siteId) {
      setDeliveryError("SiteId manquant")
      return
    }
    // Validate numeric fields: must be empty or a valid number >= 0
    const numericFields = [
      { key: "standardBase", label: "Livraison standard – base", value: delivery.standardBase },
      { key: "standardPerItem", label: "Livraison standard – par article", value: delivery.standardPerItem },
      { key: "expressBase", label: "Livraison express – base", value: delivery.expressBase },
      { key: "expressPerItem", label: "Livraison express – par article", value: delivery.expressPerItem },
      { key: "pickupCost", label: "Retrait – coût", value: delivery.pickupCost },
    ] as const
    for (const { label, value } of numericFields) {
      const trimmed = value.trim()
      if (trimmed === "") continue
      const num = parseFloat(trimmed)
      if (Number.isNaN(num) || num < 0) {
        setDeliveryError(`« ${label} » : veuillez entrer un nombre valide (≥ 0).`)
        setDeliverySuccess("")
        return
      }
    }
    try {
      setDeliverySaving(true)
      setDeliveryError("")
      setDeliverySuccess("")
      const response = await fetch("/api/services/ecommerce/admin/settings/delivery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        credentials: "include",
        body: JSON.stringify({
          siteId,
          standardBase: parseFloat(delivery.standardBase) || 0,
          standardPerItem: parseFloat(delivery.standardPerItem) || 0,
          expressBase: parseFloat(delivery.expressBase) || 0,
          expressPerItem: parseFloat(delivery.expressPerItem) || 0,
          pickupCost: parseFloat(delivery.pickupCost) || 0,
          deliveryOptionsTitle: delivery.deliveryOptionsTitle || undefined,
          standardDelivery: delivery.standardDelivery || undefined,
          standardPrice: delivery.standardPrice || undefined,
          standardDelay: delivery.standardDelay || undefined,
          expressDelivery: delivery.expressDelivery || undefined,
          expressPrice: delivery.expressPrice || undefined,
          expressDelay: delivery.expressDelay || undefined,
          pickupLabel: delivery.pickupLabel || undefined,
          pickupDelay: delivery.pickupDelay || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de la sauvegarde")
      }
      setDeliverySuccess(data.message || "Options de livraison enregistrées")
    } catch (err: any) {
      console.error("Error saving delivery:", err)
      setDeliveryError(err.message || "Erreur lors de la sauvegarde des options de livraison")
    } finally {
      setDeliverySaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configuration E-commerce
        </h3>
        <p className="text-sm text-gray-600">
          Paiement (Stripe) et options de livraison pour ce site.
        </p>
      </div>

      {/* Sub-tabs: Stripe | Livraison */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setConfigSubTab("stripe")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
            configSubTab === "stripe"
              ? "border-black text-black"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Stripe (paiement)
        </button>
        <button
          type="button"
          onClick={() => setConfigSubTab("delivery")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
            configSubTab === "delivery"
              ? "border-black text-black"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <Truck className="w-4 h-4" />
          Livraison
        </button>
      </div>

      {/* Stripe tab content */}
      {configSubTab === "stripe" && (
        <>
      {/* Status Alert */}
      {config && (
        <div
          className={`p-4 rounded-lg border ${
            config.isConfigured
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-yellow-50 border-yellow-200 text-yellow-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {config.isConfigured ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <div>
              <p className="font-medium">
                {config.isConfigured
                  ? "Configuration complète"
                  : "Configuration incomplète"}
              </p>
              <p className="text-sm mt-1">
                {config.isConfigured
                  ? `Mode ${config.environment === "development" ? "développement" : "production"} configuré`
                  : "Veuillez configurer votre environnement"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{success}</span>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        {/* Environment Selection */}
        <div>
          <Label htmlFor="environment" className="text-base font-medium">
            Environnement
          </Label>
          <p className="text-sm text-gray-600 mb-3">
            Sélectionnez l'environnement pour lequel vous souhaitez configurer les clés Stripe.
          </p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="environment"
                value="development"
                checked={environment === "development"}
                onChange={(e) => setEnvironment(e.target.value as "development" | "production")}
                className="w-4 h-4"
              />
              <span>Développement (Test)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="environment"
                value="production"
                checked={environment === "production"}
                onChange={(e) => setEnvironment(e.target.value as "development" | "production")}
                className="w-4 h-4"
              />
              <span>Production (Live)</span>
            </label>
          </div>
        </div>

        {/* Test Keys (Development) */}
        {environment === "development" && (
          <div className="space-y-4 border-t pt-6">
            <h4 className="font-medium text-gray-900">Clés Stripe de Test</h4>
            <div className="space-y-4">
              <div>
                <Label htmlFor="testPublicKey">Clé Publique de Test (pk_test_...)</Label>
                <Input
                  id="testPublicKey"
                  type="text"
                  placeholder="pk_test_..."
                  value={testPublicKey}
                  onChange={(e) => setTestPublicKey(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="testSecretKey">Clé Secrète de Test (sk_test_...)</Label>
                <Input
                  id="testSecretKey"
                  type="password"
                  placeholder="sk_test_..."
                  value={testSecretKey}
                  onChange={(e) => setTestSecretKey(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Live Keys (Production) */}
        {environment === "production" && (
          <div className="space-y-4 border-t pt-6">
            <h4 className="font-medium text-gray-900">Clés Stripe de Production</h4>
            <div className="space-y-4">
              <div>
                <Label htmlFor="livePublicKey">Clé Publique de Production (pk_live_...)</Label>
                <Input
                  id="livePublicKey"
                  type="text"
                  placeholder="pk_live_..."
                  value={livePublicKey}
                  onChange={(e) => setLivePublicKey(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="liveSecretKey">Clé Secrète de Production (sk_live_...)</Label>
                <Input
                  id="liveSecretKey"
                  type="password"
                  placeholder="sk_live_..."
                  value={liveSecretKey}
                  onChange={(e) => setLiveSecretKey(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Webhook Secret (Optional) */}
        <div className="border-t pt-6">
          <Label htmlFor="webhookSecret">Secret Webhook (optionnel)</Label>
          <p className="text-sm text-gray-600 mb-2">
            Utilisé pour valider les événements webhook Stripe. Optionnel mais recommandé.
          </p>
          <Input
            id="webhookSecret"
            type="password"
            placeholder="whsec_..."
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </div>
      </div>

      {/* Info Box (Stripe) */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note :</strong> Ces clés sont spécifiques au module e-commerce et sont stockées séparément de la configuration Stripe partagée.
          Chaque site e-commerce peut avoir ses propres clés Stripe.
        </p>
      </div>
        </>
      )}

      {/* Delivery tab content */}
      {configSubTab === "delivery" && (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Options de livraison
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Définissez les tarifs et libellés des options de livraison (livraison standard, express, retrait). Ces valeurs sont utilisées côté serveur pour le calcul des frais ; le client ne peut pas les modifier.
        </p>

        {deliveryError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{deliveryError}</span>
          </div>
        )}
        {deliverySuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{deliverySuccess}</span>
          </div>
        )}

        {deliveryLoading ? (
          <div className="flex items-center justify-center py-8 border border-gray-200 rounded-lg bg-gray-50">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-base font-medium">Livraison standard – base (€ HT)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="160"
                  value={delivery.standardBase}
                  onChange={(e) => setDelivery((d) => ({ ...d, standardBase: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-base font-medium">Livraison standard – par article (€ HT)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="80"
                  value={delivery.standardPerItem}
                  onChange={(e) => setDelivery((d) => ({ ...d, standardPerItem: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-base font-medium">Livraison express – base (€ HT)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="300"
                  value={delivery.expressBase}
                  onChange={(e) => setDelivery((d) => ({ ...d, expressBase: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-base font-medium">Livraison express – par article (€ HT)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="160"
                  value={delivery.expressPerItem}
                  onChange={(e) => setDelivery((d) => ({ ...d, expressPerItem: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-base font-medium">Retrait – coût (€ HT)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={delivery.pickupCost}
                  onChange={(e) => setDelivery((d) => ({ ...d, pickupCost: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Libellés affichés (optionnel)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Titre de la section livraison</Label>
                  <Input
                    placeholder="Nos options de livraison"
                    value={delivery.deliveryOptionsTitle}
                    onChange={(e) => setDelivery((d) => ({ ...d, deliveryOptionsTitle: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Libellé livraison standard</Label>
                  <Input
                    placeholder="Livraison standard"
                    value={delivery.standardDelivery}
                    onChange={(e) => setDelivery((d) => ({ ...d, standardDelivery: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Prix affiché standard (ex. À partir de 160,00 € HT)</Label>
                  <Input
                    placeholder="À partir de 160,00 € HT"
                    value={delivery.standardPrice}
                    onChange={(e) => setDelivery((d) => ({ ...d, standardPrice: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Délai standard</Label>
                  <Input
                    placeholder="3-5 jours ouvrés"
                    value={delivery.standardDelay}
                    onChange={(e) => setDelivery((d) => ({ ...d, standardDelay: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Libellé livraison express</Label>
                  <Input
                    placeholder="Livraison Express"
                    value={delivery.expressDelivery}
                    onChange={(e) => setDelivery((d) => ({ ...d, expressDelivery: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Prix affiché express</Label>
                  <Input
                    placeholder="À partir de 300,00 € HT"
                    value={delivery.expressPrice}
                    onChange={(e) => setDelivery((d) => ({ ...d, expressPrice: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Délai express</Label>
                  <Input
                    placeholder="1 jour ouvré"
                    value={delivery.expressDelay}
                    onChange={(e) => setDelivery((d) => ({ ...d, expressDelay: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Libellé retrait</Label>
                  <Input
                    placeholder="Retrait en entrepôt (Lyon)"
                    value={delivery.pickupLabel}
                    onChange={(e) => setDelivery((d) => ({ ...d, pickupLabel: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Délai retrait</Label>
                  <Input
                    placeholder="Disponible sous 24h"
                    value={delivery.pickupDelay}
                    onChange={(e) => setDelivery((d) => ({ ...d, pickupDelay: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleSaveDelivery}
                disabled={deliverySaving}
                className="min-w-[180px]"
              >
                {deliverySaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer les options de livraison"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  )
}

