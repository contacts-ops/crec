"use client"

import { useState, useEffect } from "react"
import { BarChart3, TrendingUp, Mail, Eye, MousePointer } from "lucide-react"

interface CampaignAnalytics {
  totalCampaigns: number
  totalSent: number
  totalOpens: number
  totalClicks: number
  totalRecipients: number
  averageOpenRate: number
  recentActivity: Array<{
    id: string
    type: "sent" | "opened" | "clicked"
    campaignTitle: string
    timestamp: string
    count?: number
  }>
  campaignPerformance: Array<{
    id: string
    title: string
    openRate: number
    clickRate: number
    totalRecipients: number
    opens: number
    clicks: number
  }>
}

interface AnalyticsDashboardProps {
  siteId: string
}

export default function AnalyticsDashboard({ siteId }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d")
  const [error, setError] = useState("")

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

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      setError("")
      const response = await apiCall(`/admin/analytics?timeRange=${timeRange}`)

      if (response.success && response.data) {
        setAnalytics(response.data)
      } else {
        setError(response.error || "Erreur lors du chargement des analytics")
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
      setError(error instanceof Error ? error.message : "Erreur lors du chargement des analytics")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [siteId, timeRange])

  return (
    <div className="p-6">
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 text-red-800 p-4 rounded-lg shadow-lg z-50 mb-6">{error}</div>
      )}

      {/* Time Range Selector */}
      <div className="mb-6">
        <div className="flex gap-2">
          {[
            { key: "7d", label: "7 jours" },
            { key: "30d", label: "30 jours" },
            { key: "90d", label: "90 jours" },
          ].map((range) => (
            <button
              key={range.key}
              onClick={() => setTimeRange(range.key as "7d" | "30d" | "90d")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range.key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Campagnes</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.totalCampaigns || 0}</p>
            </div>
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Campagnes Envoyées</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.totalSent || 0}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Ouvertures</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.totalOpens || 0}</p>
            </div>
            <Eye className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taux d'Ouverture Moyen</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.averageOpenRate?.toFixed(1) || 0}%</p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Campaign Performance */}
      <div className="bg-white rounded-lg border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Meilleures Campagnes</h3>
        </div>
        <div className="p-6">
          {analytics?.campaignPerformance && analytics.campaignPerformance.length > 0 ? (
            <div className="space-y-4">
              {analytics.campaignPerformance
                .filter((campaign) => campaign.opens > 0)
                .sort((a, b) => b.openRate - a.openRate)
                .slice(0, 5)
                .map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{campaign.title}</h4>
                      <p className="text-sm text-gray-600">{campaign.totalRecipients} destinataires</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{campaign.openRate.toFixed(1)}% ouvertures</p>
                      <p className="text-sm text-gray-600">{campaign.clickRate.toFixed(1)}% clics</p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune donnée de performance disponible</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Activité Récente</h3>
        </div>
        <div className="p-6">
          {analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {analytics.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-full ${
                      activity.type === "sent"
                        ? "bg-blue-100"
                        : activity.type === "opened"
                          ? "bg-green-100"
                          : "bg-purple-100"
                    }`}
                  >
                    {activity.type === "sent" && <Mail className="h-4 w-4 text-blue-600" />}
                    {activity.type === "opened" && <Eye className="h-4 w-4 text-green-600" />}
                    {activity.type === "clicked" && <MousePointer className="h-4 w-4 text-purple-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.campaignTitle}</p>
                    <p className="text-sm text-gray-600">
                      {activity.type === "sent" && "Campagne envoyée"}
                      {activity.type === "opened" && "Ouverture"}
                      {activity.type === "clicked" && "Clic"}
                      {activity.count && ` (${activity.count})`}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">{new Date(activity.timestamp).toLocaleString("fr-FR")}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune activité récente</p>
          )}
        </div>
      </div>
    </div>
  )
}
