"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Send, Palette, Mail, Edit, Trash2, RefreshCw, X, AlertCircle, Zap, Eye } from "lucide-react"
import { debounce } from "lodash"

interface Subscriber {
  _id: string
  email: string
  firstName?: string
  lastName?: string
  fullName?: string
  isActive: boolean
  createdAt: string
  interests?: string[]
  source?: string
}

interface Campaign {
  _id: string
  title: string
  subject: string
  htmlContent: string
  textContent: string
  status: "draft" | "scheduled" | "sending" | "sent" | "failed" | "envoyé"
  createdAt: string
  sentAt?: string
  scheduledAt?: string
  analytics: {
    totalRecipients: number
    successfulSends: number
    failedSends: number
    opens: number
    uniqueOpens: number
    clicks: number
    uniqueClicks: number
    openRate: number
    clickRate: number
    errors: Array<{
      email: string
      error: string
      timestamp: Date
    }>
  }
  targetAudience: {
    allSubscribers: boolean
    interests: string[]
    specificEmails?: string[]
  }
  templateData?: any
  updatedAt: string
  source?: "quick-setup" | "visual-editor"
}

interface PaginatedResponse<T> {
  success: boolean
  data: {
    [key: string]: T[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
  error?: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

interface CampaignManagerProps {
  siteId: string
  onCreateVisualNewsletter: () => void
  onEditTemplate: (templateId: string) => void
  fromAddress?: string
}

export default function CampaignManager({ siteId, onCreateVisualNewsletter, onEditTemplate, fromAddress }: CampaignManagerProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")

  // Campaign statistics
  const [totalCampaigns, setTotalCampaigns] = useState(0)
  const [sentCampaigns, setSentCampaigns] = useState(0)

  // Filters
  const [campaignStatusFilter, setCampaignStatusFilter] = useState("all")

  // Modal states
  const [showQuickSetup, setShowQuickSetup] = useState(false)
  const [showEditCampaign, setShowEditCampaign] = useState(false)
  const [showSendCampaign, setShowSendCampaign] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null)

  // Form states
  const [quickSetupForm, setQuickSetupForm] = useState({
    title: "",
    subject: "",
    textContent: "",
  })

  const [sendAudienceForm, setSendAudienceForm] = useState({
    targetAllSubscribers: true,
    selectedSubscribers: [] as string[],
    targetInterests: [] as string[],
  })

  // Subscriber selection for sending campaigns
  const [availableSubscribers, setAvailableSubscribers] = useState<Subscriber[]>([])
  const [subscriberSearchTerm, setSubscriberSearchTerm] = useState("")
  const [subscriberPagination, setSubscriberPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const [loadingSubscribers, setLoadingSubscribers] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null)

  const itemsPerPage = 10

  // Calculate campaign statistics
  const failedCampaigns = campaigns.filter((c) => c.status === "failed").length

  const updateURL = (newMode: "manager" | "builder" | "analytics", newTemplateId?: string | null) => {
    const url = new URL(window.location.href)
    url.searchParams.set("mode", newMode)

    if (newTemplateId) {
      url.searchParams.set("templateId", newTemplateId)
    } else {
      url.searchParams.delete("templateId")
    }

    window.history.pushState({}, "", url.toString())
  }

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`/api/services/newsletter${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-site-id": siteId,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Erreur de connexion" }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  const fetchCampaigns = async (page = 1, search = "") => {
    try {
      setIsLoading(true)
      setError("")

      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      })

      if (campaignStatusFilter !== "all") {
        params.append("status", campaignStatusFilter)
      }

      const response: PaginatedResponse<Campaign> = await apiCall(`/admin/campaigns?${params}`)

      if (response.success) {
        setCampaigns(response.data.campaigns || [])
        setTotalPages(response.data.pagination.pages)
        setTotalItems(response.data.pagination.total)
        setCurrentPage(page)
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error)
      setError(error instanceof Error ? error.message : "Erreur lors du chargement des campagnes")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const analyticsResponse = await apiCall("/admin/analytics")
      if (analyticsResponse.success) {
        const data = analyticsResponse.data
        setTotalCampaigns(data.totalCampaigns || 0)
        setSentCampaigns(data.totalSent || 0)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const handleModifyQuickSetup = (campaign: Campaign) => {
    setQuickSetupForm({
      title: campaign.title,
      subject: campaign.subject,
      textContent: campaign.templateData?.textContent || "",
    })
    setSelectedCampaign(campaign)
    setShowQuickSetup(true)
  }

  const handleQuickSetup = async () => {
    if (!quickSetupForm.title || !quickSetupForm.subject || !quickSetupForm.textContent) {
      setError("Veuillez remplir tous les champs")
      return
    }

    try {
      setIsLoading(true)
      setError("")

      const response = await fetch("/api/services/newsletter/admin/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({
          title: quickSetupForm.title,
          subject: quickSetupForm.subject,
          textContent: quickSetupForm.textContent,
          htmlContent: `<p>${quickSetupForm.textContent.replace(/\n/g, "</p><p>")}</p>`,
          status: "draft",
          templateData: {
            textContent: quickSetupForm.textContent,
            type: "quick",
          },
          targetAudience: {
            allSubscribers: true,
            interests: [],
            segments: [],
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSuccess("Campagne créée avec succès en tant que brouillon")
          setShowQuickSetup(false)
          setQuickSetupForm({
            title: "",
            subject: "",
            textContent: "",
          })
          await fetchCampaigns(currentPage)
        } else {
          setError(data.error || "Erreur lors de la création de la campagne")
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Erreur réseau" }))
        setError(errorData.error || `Erreur HTTP ${response.status}`)
      }
    } catch (error) {
      console.error("Error creating campaign:", error)
      setError(error instanceof Error ? error.message : "Erreur lors de la création de la campagne")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateQuickCampaign = async () => {
    if (!quickSetupForm.title || !quickSetupForm.subject || !quickSetupForm.textContent) {
      setError("Veuillez remplir tous les champs obligatoires")
      return
    }

    try {
      setIsLoading(true)
      setError("")

      const response = await fetch("/api/services/newsletter/admin/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({
          title: quickSetupForm.title,
          subject: quickSetupForm.subject,
          textContent: quickSetupForm.textContent,
          htmlContent: `<p>${quickSetupForm.textContent.replace(/\n/g, "</p><p>")}</p>`,
          status: "draft",
          templateData: {
            textContent: quickSetupForm.textContent,
            type: "quick",
          },
          targetAudience: {
            allSubscribers: true,
            interests: [],
            segments: [],
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSuccess(data.message || "Campagne créée avec succès")
          setShowQuickSetup(false)
          setQuickSetupForm({
            title: "",
            subject: "",
            textContent: "",
          })
          await fetchCampaigns(currentPage)
        } else {
          setError(data.error || "Erreur lors de la création de la campagne")
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Erreur réseau" }))
        setError(errorData.error || `Erreur HTTP ${response.status}`)
      }
    } catch (error) {
      console.error("Error creating campaign:", error)
      setError(error instanceof Error ? error.message : "Erreur lors de la création de la campagne")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveQuickSetup = async () => {
    try {
      setIsLoading(true)
      setError("")

      const simpleHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${quickSetupForm.subject}</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: Arial, sans-serif; 
              background-color: #f5f5f5; 
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background-color: white; 
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .content { 
              padding: 40px 30px; 
              line-height: 1.6; 
              color: #333;
            }
            .footer { 
              text-align: center; 
              font-size: 12px; 
              color: #666; 
              border-top: 1px solid #eee; 
              margin-top: 20px; 
              padding-top: 20px; 
            }
            .footer a { color: #007bff; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              ${quickSetupForm.textContent.replace(/\n/g, "<br>")}
            </div>
            <div class="footer">
              <p><a href="{{unsubscribeLink}}">Se désabonner</a> | <a href="{{preferencesLink}}">Préférences</a></p>
            </div>
          </div>
          <img src="{{trackingPixelUrl}}" width="1" height="1" style="display:none;" alt="" />
        </body>
        </html>
      `

      const payload = {
        title: quickSetupForm.title,
        subject: quickSetupForm.subject,
        htmlContent: simpleHTML,
        textContent: quickSetupForm.textContent,
        siteId,
        targetAudience: {
          allSubscribers: true,
          interests: [],
          segments: [],
        },
        source: "quick-setup",
        templateData: {
          textContent: quickSetupForm.textContent,
        },
      }

      let response: ApiResponse<{ campaign: Campaign }>

      if (selectedCampaign) {
        response = await apiCall(`/admin/campaigns/${selectedCampaign._id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      } else {
        response = await apiCall("/admin/campaigns", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      }

      if (response.success) {
        setSuccess(selectedCampaign ? "Campagne modifiée avec succès!" : "Campagne créée avec succès!")
        await fetchCampaigns(currentPage)
        setShowQuickSetup(false)
        setSelectedCampaign(null)
        setQuickSetupForm({
          title: "",
          subject: "",
          textContent: "",
        })
      } else {
        setError(response.error || "Erreur lors de la sauvegarde")
      }
    } catch (error) {
      console.error("Error saving quick setup:", error)
      setError("Erreur lors de la sauvegarde")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateCampaign = async () => {
    if (!selectedCampaign) return

    try {
      setIsLoading(true)
      setError("")

      const response = await apiCall(`/admin/campaigns/${selectedCampaign._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: selectedCampaign.title,
          subject: selectedCampaign.subject,
          textContent: selectedCampaign.textContent,
        }),
      })

      if (response.success) {
        setSuccess("Campagne mise à jour avec succès!")
        await fetchCampaigns(currentPage)
        setShowEditCampaign(false)
        setSelectedCampaign(null)
      } else {
        setError(response.error || "Erreur lors de la mise à jour de la campagne")
      }
    } catch (error) {
      console.error("Error updating campaign:", error)
      setError("Erreur lors de la mise à jour de la campagne")
    } finally {
      setIsLoading(false)
    }
  }

  const deleteCampaign = async (campaignId: string) => {
    try {
      const response = await apiCall(`/admin/campaigns/${campaignId}`, {
        method: "DELETE",
      })

      if (response.success) {
        await fetchCampaigns(currentPage)
        await fetchStats()
        setSuccess(response.message || "Campagne supprimée avec succès!")
      } else {
        setError(response.error || "Erreur lors de la suppression de la campagne")
      }
    } catch (error) {
      console.error("Error deleting campaign:", error)
      setError(error instanceof Error ? error.message : "Erreur lors de la suppression de la campagne")
    } finally {
      setShowDeleteConfirm(false)
      setCampaignToDelete(null)
    }
  }

  const handleDeleteCampaign = async () => {
    if (!campaignToDelete) return

    try {
      const response = await apiCall(`/admin/campaigns/${campaignToDelete}`, {
        method: "DELETE",
      })

      if (response.success) {
        await fetchCampaigns(currentPage)
        await fetchStats()
        setShowSuccessMessage(response.message || "Campagne supprimée avec succès!")
        setTimeout(() => setShowSuccessMessage(null), 3000)
      } else {
        setError(response.error || "Erreur lors de la suppression de la campagne")
      }
    } catch (error) {
      console.error("Error deleting campaign:", error)
      setError(error instanceof Error ? error.message : "Erreur lors de la suppression de la campagne")
    } finally {
      setShowDeleteConfirm(false)
      setCampaignToDelete(null)
    }
  }

  const handleSendCampaignAction = async (campaignId: string) => {
    try {
      setIsLoading(true)
      setError("")

      const response = await fetch(`/api/services/newsletter/admin/campaigns/${campaignId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({
          targetAudience: {
            allSubscribers: sendAudienceForm.targetAllSubscribers,
            interests: sendAudienceForm.targetInterests || [],
            segments: [],
            specificEmails: sendAudienceForm.selectedSubscribers || [],
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSuccess(data.message || `Campagne envoyée avec succès à ${data.data?.totalRecipients || 0} destinataires`)
          await fetchCampaigns(currentPage)
          setShowSendCampaign(false)
          setSelectedCampaign(null)
          setSendAudienceForm({
            targetAllSubscribers: true,
            selectedSubscribers: [],
            targetInterests: [],
          })
        } else {
          setError(data.error || "Erreur lors de l'envoi de la campagne")
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Erreur réseau" }))
        setError(errorData.error || `Erreur HTTP ${response.status}`)
      }
    } catch (error) {
      console.error("Error sending campaign:", error)
      setError(error instanceof Error ? error.message : "Erreur lors de l'envoi de la campagne")
    } finally {
      setIsLoading(false)
    }
  }

  const generateCampaignHTML = (campaign: Campaign) => {
    if (campaign.templateData && (campaign.templateData.hasVisualEditor || campaign.templateData.design)) {
      // Visual editor campaign - use the HTML content directly
      return campaign.htmlContent || campaign.textContent || "Contenu non disponible"
    } else {
      // Quick setup campaign - generate formatted HTML
      const content = campaign.textContent || campaign.htmlContent || "Contenu non disponible"
      return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="padding: 20px;">
          <div style="margin-bottom: 20px;">
            <h1 style="color: #333333; font-size: 24px; margin: 0 0 20px 0;">${campaign.title || "Newsletter"}</h1>
          </div>
          <div style="color: #666666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            ${content.replace(/\n/g, "<br>")}
          </div>
          <div style="border-top: 1px solid #eeeeee; padding-top: 20px; margin-top: 30px;">
            <p style="color: #999999; font-size: 12px; text-align: center; margin: 0;">
              Cet email a été envoyé via notre système de newsletter.
            </p>
          </div>
        </div>
      </div>
    `
    }
  }

  const modifyCampaign = (campaignId: string) => {
    // For visual editor campaigns, use the visual editor
    // For quick setup campaigns, use the quick setup editor
    const campaign = campaigns.find(c => c._id === campaignId)
    if (campaign && campaign.templateData && (campaign.templateData.hasVisualEditor || campaign.templateData.design)) {
      // Visual editor campaign - use visual editor
      updateURL("builder", campaignId)
      onEditTemplate(campaignId)
    } else if (campaign) {
      // Quick setup campaign - use quick setup editor
      handleModifyQuickSetup(campaign)
    }
  }

  const loadSubscribersForAudience = async (page = 1, search = "", append = false) => {
    try {
      setLoadingSubscribers(true)
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: subscriberPagination.limit.toString(),
        status: "active",
      })

      if (search.trim()) {
        searchParams.append("search", search.trim())
      }

      const response = await fetch(`/api/services/newsletter/admin/subscribers?${searchParams}`, {
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
      })
      if (response.ok) {
        const data = await response.json()
        const newSubscribers = data.data.subscribers || []

        setAvailableSubscribers((prev) => (append ? [...prev, ...newSubscribers] : newSubscribers))
        setSubscriberPagination({
          page: data.data.pagination.page,
          limit: data.data.pagination.limit,
          total: data.data.pagination.total,
          pages: data.data.pagination.pages,
        })
      }
    } catch (error) {
      console.error("Error loading subscribers:", error)
    } finally {
      setLoadingSubscribers(false)
    }
  }

  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      loadSubscribersForAudience(1, searchTerm, false)
    }, 300),
    [],
  )

  const handleSubscriberSearch = (value: string) => {
    setSubscriberSearchTerm(value)
    debouncedSearch(value)
  }

  const loadMoreSubscribers = () => {
    if (subscriberPagination.page < subscriberPagination.pages && !loadingSubscribers) {
      loadSubscribersForAudience(subscriberPagination.page + 1, subscriberSearchTerm, true)
    }
  }

  useEffect(() => {
    if (siteId) {
      fetchCampaigns(currentPage, searchTerm)
      fetchStats()
    }
  }, [siteId, campaignStatusFilter, currentPage])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1)
      if (siteId) {
        fetchCampaigns(1, searchTerm)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  useEffect(() => {
    if (success || error || showSuccessMessage) {
      const timer = setTimeout(() => {
        setSuccess("")
        setError("")
        setShowSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success, error, showSuccessMessage])

  return (
    <div>
      {success && (
        <div className="fixed top-4 right-4 bg-green-100 text-green-800 p-4 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            {success}
          </div>
        </div>
      )}
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 text-red-800 p-4 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            {error}
          </div>
        </div>
      )}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 bg-green-100 text-green-800 p-4 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            {showSuccessMessage}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Campagnes</p>
              <p className="text-2xl font-bold text-gray-900">{totalCampaigns}</p>
            </div>
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Campagnes Envoyées</p>
              <p className="text-2xl font-bold text-gray-900">{sentCampaigns}</p>
            </div>
            <Send className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Campagnes échouées</p>
              <p className="text-2xl font-bold text-gray-900">{failedCampaigns}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        {fromAddress && (
          <div className="bg-white p-6 rounded-lg border border-gray-200 md:col-span-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Campagnes envoyées depuis <span className="font-semibold">{fromAddress}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          <select
            value={campaignStatusFilter}
            onChange={(e) => setCampaignStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillons</option>
            <option value="sent">Envoyées</option>
            <option value="failed">Échouées</option>
          </select>
          <button
            onClick={() => {
              setQuickSetupForm({
                title: "",
                subject: "",
                textContent: "",
              })
              setSelectedCampaign(null)
              setShowQuickSetup(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Envoi rapide
          </button>
          <button
            onClick={onCreateVisualNewsletter}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Palette className="w-4 h-4" />
            Éditeur Visuel
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Chargement...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campagne
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{campaign.title}</div>
                        <div className="text-sm text-gray-500">{campaign.subject}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          campaign.status === "sent"
                            ? "bg-green-100 text-green-800"
                            : campaign.status === "draft"
                              ? "bg-yellow-100 text-yellow-800"
                              : campaign.status === "sending"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-red-100 text-red-800"
                        }`}
                      >
                        {campaign.status === "sent"
                          ? "Envoyée"
                          : campaign.status === "draft"
                            ? "Brouillon"
                            : campaign.status === "sending"
                              ? "En cours"
                              : "Échouée"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedCampaign(campaign)
                            setShowPreview(true)
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-all duration-200 hover:shadow-sm border border-gray-200 hover:border-gray-300"
                          title="Aperçu de la campagne"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-sm font-medium">Aperçu</span>
                        </button>
                        {campaign.status === "draft" && (
                          <>
                            {campaign.templateData && (campaign.templateData.hasVisualEditor || campaign.templateData.design) && (
                              <button
                                onClick={() => modifyCampaign(campaign._id)}
                                className="flex items-center gap-2 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg transition-all duration-200 hover:shadow-sm border border-purple-200 hover:border-purple-300"
                                title="Modifier avec l'éditeur visuel"
                              >
                                <Palette className="w-4 h-4" />
                                <span className="text-sm font-medium">Éditeur Visuel</span>
                              </button>
                            )}
                            {(!campaign.templateData || (!campaign.templateData.hasVisualEditor && !campaign.templateData.design)) && (
                              <button
                                onClick={() => {
                                  handleModifyQuickSetup(campaign)
                                }}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all duration-200 hover:shadow-sm border border-blue-200 hover:border-blue-300"
                                title="Modifier la campagne"
                              >
                                <Edit className="w-4 h-4" />
                                <span className="text-sm font-medium">Modifier</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedCampaign(campaign)
                                setShowSendCampaign(true)
                              }}
                              className="flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-all duration-200 hover:shadow-sm border border-green-200 hover:border-green-300"
                              title="Envoyer la campagne"
                            >
                              <Send className="w-4 h-4" />
                              <span className="text-sm font-medium">Envoyer</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setCampaignToDelete(campaign._id)
                            setShowDeleteConfirm(true)
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all duration-200 hover:shadow-sm border border-red-200 hover:border-red-300"
                          title="Supprimer la campagne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
            <div className="flex items-center text-sm text-gray-700">
              Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, totalItems)}{" "}
              sur {totalItems} résultats
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const newPage = currentPage - 1
                  setCurrentPage(newPage)
                  fetchCampaigns(newPage)
                }}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                Page {currentPage} sur {totalPages}
              </span>
              <button
                onClick={() => {
                  const newPage = currentPage + 1
                  setCurrentPage(newPage)
                  fetchCampaigns(newPage)
                }}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Campaign Preview Modal */}
      {showPreview && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] mx-4 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Aperçu de la campagne</h3>
                <p className="text-sm text-gray-600">{selectedCampaign.title}</p>
                <p className="text-xs text-gray-500">{selectedCampaign.subject}</p>
                {selectedCampaign.templateData && (selectedCampaign.templateData.hasVisualEditor || selectedCampaign.templateData.design) && (
                  <p className="text-xs text-purple-600 mt-1">✨ Newsletter créée avec l'éditeur visuel</p>
                )}
              </div>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-auto bg-gray-50">
              <div
                className="mx-auto bg-white shadow-lg rounded-lg"
                style={{ maxWidth: "600px" }}
                dangerouslySetInnerHTML={{ __html: generateCampaignHTML(selectedCampaign) }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmer la suppression</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer cette campagne ? Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setCampaignToDelete(null)
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => campaignToDelete && deleteCampaign(campaignToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Campaign Modal */}
      {showSendCampaign && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Envoyer la campagne</h2>
                <button
                  onClick={() => {
                    setShowSendCampaign(false)
                    setSendAudienceForm({
                      targetAllSubscribers: true,
                      selectedSubscribers: [],
                      targetInterests: [],
                    })
                    setSubscriberSearchTerm("")
                    setAvailableSubscribers([])
                    setSubscriberPagination({
                      page: 1,
                      limit: 10,
                      total: 0,
                      pages: 0,
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-600 mb-4">
                Êtes-vous sûr de vouloir envoyer la campagne <strong>{selectedCampaign.title}</strong> ?
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="text-sm text-blue-800">
                  <p>
                    <strong>Objet:</strong> {selectedCampaign.subject}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Sélectionner l'audience</h3>

                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="audienceType"
                      checked={sendAudienceForm.targetAllSubscribers}
                      onChange={() =>
                        setSendAudienceForm({
                          targetAllSubscribers: true,
                          selectedSubscribers: [],
                          targetInterests: [],
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Envoyer à tous les abonnés actifs</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="audienceType"
                      checked={!sendAudienceForm.targetAllSubscribers}
                      onChange={() => {
                        setSendAudienceForm({
                          targetAllSubscribers: false,
                          selectedSubscribers: [],
                          targetInterests: [],
                        })
                        setSubscriberSearchTerm("")
                        loadSubscribersForAudience(1, "", false)
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Sélectionner des abonnés spécifiques</span>
                  </label>
                </div>

                {!sendAudienceForm.targetAllSubscribers && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <input
                        type="text"
                        placeholder="Rechercher des abonnés..."
                        value={subscriberSearchTerm}
                        onChange={(e) => handleSubscriberSearch(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                      {loadingSubscribers && availableSubscribers.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="mt-2">Chargement des abonnés...</p>
                        </div>
                      ) : availableSubscribers.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          {subscriberSearchTerm
                            ? "Aucun abonné trouvé pour cette recherche"
                            : "Aucun abonné actif trouvé"}
                        </div>
                      ) : (
                        <>
                          {availableSubscribers.map((subscriber) => (
                            <label
                              key={subscriber._id}
                              className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={sendAudienceForm.selectedSubscribers.includes(subscriber._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSendAudienceForm((prev) => ({
                                      ...prev,
                                      selectedSubscribers: [...prev.selectedSubscribers, subscriber._id],
                                    }))
                                  } else {
                                    setSendAudienceForm((prev) => ({
                                      ...prev,
                                      selectedSubscribers: prev.selectedSubscribers.filter(
                                        (id) => id !== subscriber._id,
                                      ),
                                    }))
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">
                                  {subscriber.firstName} {subscriber.lastName}
                                </p>
                                <p className="text-sm text-gray-500">{subscriber.email}</p>
                              </div>
                            </label>
                          ))}

                          {subscriberPagination.page < subscriberPagination.pages && (
                            <div className="p-3 border-t border-gray-200">
                              <button
                                onClick={loadMoreSubscribers}
                                disabled={loadingSubscribers}
                                className="w-full py-2 px-4 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {loadingSubscribers ? (
                                  <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                    Chargement...
                                  </div>
                                ) : (
                                  `Charger plus (${subscriberPagination.total - availableSubscribers.length} restants)`
                                )}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {sendAudienceForm.selectedSubscribers.length > 0 && (
                      <p className="text-sm text-blue-600">
                        {sendAudienceForm.selectedSubscribers.length} abonné(s) sélectionné(s)
                      </p>
                    )}
                  </div>
                )}
              </div>

              <p className="text-sm text-yellow-600">Une fois envoyée, cette campagne ne pourra plus être modifiée.</p>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSendCampaign(false)
                  setSendAudienceForm({
                    targetAllSubscribers: true,
                    selectedSubscribers: [],
                    targetInterests: [],
                  })
                  setSubscriberSearchTerm("")
                  setAvailableSubscribers([])
                  setSubscriberPagination({
                    page: 1,
                    limit: 10,
                    total: 0,
                    pages: 0,
                  })
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleSendCampaignAction(selectedCampaign._id)}
                disabled={
                  isLoading ||
                  (!sendAudienceForm.targetAllSubscribers && sendAudienceForm.selectedSubscribers.length === 0)
                }
                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Setup Modal */}
      {showQuickSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedCampaign ? "Modifier la campagne" : "Envoi rapide"}
                </h2>
                <button
                  onClick={() => {
                    setShowQuickSetup(false)
                    setSelectedCampaign(null)
                    setQuickSetupForm({
                      title: "",
                      subject: "",
                      textContent: "",
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre de la campagne</label>
                <input
                  type="text"
                  value={quickSetupForm.title}
                  onChange={(e) => setQuickSetupForm({ ...quickSetupForm, title: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ma nouvelle campagne"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Objet de l'email</label>
                <input
                  type="text"
                  value={quickSetupForm.subject}
                  onChange={(e) => setQuickSetupForm({ ...quickSetupForm, subject: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Votre objet d'email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contenu du message</label>
                <textarea
                  value={quickSetupForm.textContent}
                  onChange={(e) => setQuickSetupForm({ ...quickSetupForm, textContent: e.target.value })}
                  rows={8}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Votre message ici..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowQuickSetup(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={selectedCampaign ? handleSaveQuickSetup : handleQuickSetup}
                disabled={isLoading}
                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Sauvegarde..." : selectedCampaign ? "Sauvegarder" : "Créer la campagne"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Campaign Modal */}
      {showEditCampaign && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Modifier la campagne</h2>
                <button
                  onClick={() => {
                    setShowEditCampaign(false)
                    setSelectedCampaign(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre de la campagne</label>
                <input
                  type="text"
                  value={selectedCampaign.title}
                  onChange={(e) => setSelectedCampaign({ ...selectedCampaign, title: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ma nouvelle campagne"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Objet de l'email</label>
                <input
                  type="text"
                  value={selectedCampaign.subject}
                  onChange={(e) => setSelectedCampaign({ ...selectedCampaign, subject: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Votre objet d'email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contenu du message</label>
                <textarea
                  value={selectedCampaign.textContent}
                  onChange={(e) => setSelectedCampaign({ ...selectedCampaign, textContent: e.target.value })}
                  rows={8}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Votre message ici..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowEditCampaign(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateCampaign}
                disabled={isLoading}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Mise à jour..." : "Mettre à jour"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
