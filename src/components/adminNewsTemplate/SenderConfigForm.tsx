"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Mail, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SenderConfigFormProps {
  siteId: string
}

interface SenderConfig {
  desiredFromEmail: string
  domainStatus: "verified" | "unverified" | "unknown"
}

export default function SenderConfigForm({ siteId }: SenderConfigFormProps) {
  const [config, setConfig] = useState<SenderConfig>({
    desiredFromEmail: "",
    domainStatus: "unknown",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const fetchConfig = async () => {
    try {
      const response = await fetch(`/api/services/newsletter/admin/sendgrid/site-sender-config?siteId=${siteId}`, {
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        credentials: "include",
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setConfig({
            desiredFromEmail: data.senderConfig?.desiredFromEmail || "",
            domainStatus: data.senderConfig?.domainStatus || "unknown",
          })
        } else {
          setError(data.error || "Erreur lors du chargement de la configuration")
        }
      } else {
        setError("Erreur lors du chargement de la configuration")
      }
    } catch (error) {
      console.error("Erreur lors du chargement de la configuration:", error)
      setError("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    if (!config.desiredFromEmail || !config.desiredFromEmail.includes("@")) {
      setError("Veuillez saisir une adresse email valide")
      return
    }

    setSaving(true)
    setError("")
    setSuccess("")
    
    try {
      const response = await fetch(`/api/services/newsletter/admin/sendgrid/site-sender-config?siteId=${siteId}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        credentials: "include",
        body: JSON.stringify({
          desiredFromEmail: config.desiredFromEmail,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSuccess(data.message || "Configuration sauvegardée avec succès")
          await fetchConfig() // Refresh to get updated status
        } else {
          setError(data.error || "Erreur lors de la sauvegarde")
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Erreur lors de la sauvegarde" }))
        setError(errorData.error || "Erreur lors de la sauvegarde")
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
      setError("Erreur de connexion")
    } finally {
      setSaving(false)
    }
  }

  const checkDomain = async () => {
    if (!config.desiredFromEmail || !config.desiredFromEmail.includes("@")) {
      setError("Format d'email invalide")
      return
    }

    const emailParts = config.desiredFromEmail.split("@")
    if (emailParts.length !== 2) {
      setError("Format d'email invalide")
      return
    }

    const domain = emailParts[1]?.trim()
    if (!domain || domain === "") {
      setError("Domaine invalide")
      return
    }

    setChecking(true)
    setError("")

    try {
      const url = `/api/services/newsletter/admin/sendgrid/verify-domain?domain=${encodeURIComponent(domain)}`
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        credentials: "include",
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setConfig((prev) => ({
            ...prev,
            domainStatus: data.verified ? "verified" : "unverified",
          }))
          
          if (data.verified) {
            setSuccess("Domaine vérifié avec succès dans SendGrid")
          } else {
            setError("Domaine non vérifié dans SendGrid")
          }
        } else {
          setError(data.error || "Erreur lors de la vérification")
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Erreur lors de la vérification" }))
        setError(errorData.error || "Erreur lors de la vérification du domaine")
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du domaine:", error)
      setError("Erreur de connexion")
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [siteId])

  if (loading) {
    return <div className="p-4">Chargement...</div>
  }

  const getDomainStatusBadge = () => {
    switch (config.domainStatus) {
      case "verified":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Domaine vérifié
          </Badge>
        )
      case "unverified":
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Domaine non vérifié
          </Badge>
        )
      default:
        return <Badge variant="outline">Statut inconnu</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Configuration de l'expéditeur
        </CardTitle>
        <CardDescription>Configurez l'adresse d'expédition pour les newsletters de ce site</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error and Success Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="fromEmail">Email de l'expéditeur</Label>
          <div className="flex gap-2">
            <Input
              id="fromEmail"
              type="email"
              placeholder="newsletter@monsite.com"
              value={config.desiredFromEmail}
              onChange={(e) => setConfig((prev) => ({ ...prev, desiredFromEmail: e.target.value }))}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={checkDomain}
              disabled={!config.desiredFromEmail || !config.desiredFromEmail.includes("@") || checking}
            >
              {checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Vérifier"}
            </Button>
          </div>
          {config.desiredFromEmail && <div className="flex items-center gap-2 mt-2">{getDomainStatusBadge()}</div>}
        </div>

        {config.domainStatus === "unverified" && config.desiredFromEmail && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Le domaine <strong>{config.desiredFromEmail.split("@")[1]}</strong> n'est pas vérifié dans SendGrid. 
              Contactez l'équipe hub.majoli.io pour suivre les étapes de vérification de votre domaine.
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={saveConfig} disabled={saving} className="w-full">
          {saving ? "Sauvegarde en cours..." : "Enregistrer"}
        </Button>
      </CardContent>
    </Card>
  )
}
