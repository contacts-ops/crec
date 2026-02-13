"use client"

import { useState, useCallback, useEffect } from "react"
import { BarChart3, Users, Mail, Settings } from "lucide-react"
import SubscriberManager from "./subscriber-manager"
import CampaignManager from "./campaign-manager"
import AnalyticsDashboard from "./analytics-dashboard"
import SenderConfigForm from "./SenderConfigForm"

interface NewsletterManagerProps {
  siteId: string
  onCreateVisualNewsletter: () => void
  onEditTemplate: (templateId: string) => void
  onViewAnalytics: () => void
  fromAddress: string
  isLoadingFromAddress: boolean
  onBack?: () => void
  defaultActiveTab?: "contacts" | "campaigns" | "analytics" | "settings"
}

export default function NewsletterManager({
  siteId,
  onCreateVisualNewsletter,
  onEditTemplate,
  onViewAnalytics,
  fromAddress,
  isLoadingFromAddress,
  onBack,
  defaultActiveTab,
}: NewsletterManagerProps) {
  const [activeTab, setActiveTab] = useState<"contacts" | "campaigns" | "analytics" | "settings">("contacts")

  useEffect(() => {
    if (defaultActiveTab) setActiveTab(defaultActiveTab)
  }, [defaultActiveTab])
  const [refreshKey, setRefreshKey] = useState(0)

  const handleDataChange = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  return (
    <div>
      {/* Tabs */}
      <div className="px-0">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab("contacts")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "contacts"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Abonnés
            </div>
          </button>
          <button
            onClick={() => setActiveTab("campaigns")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "campaigns"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Campagnes
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab("analytics")
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "analytics"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </div>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "settings"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configuration
            </div>
          </button>
        </div>
      </div>

      {/* Content - Keep all components mounted to prevent unnecessary re-renders */}
      <div className="pt-4">
        <div style={{ display: activeTab === "contacts" ? "block" : "none" }}>
          <SubscriberManager key={`contacts-${refreshKey}`} siteId={siteId} onDataChange={handleDataChange} />
        </div>

        <div style={{ display: activeTab === "campaigns" ? "block" : "none" }}>
          <CampaignManager
            key={`campaigns-${refreshKey}`}
            siteId={siteId}
            onCreateVisualNewsletter={onCreateVisualNewsletter}
            onEditTemplate={onEditTemplate}
            onDataChange={handleDataChange}
            fromAddress={fromAddress}
          />
        </div>

        <div style={{ display: activeTab === "analytics" ? "block" : "none" }}>
          <AnalyticsDashboard key={`analytics-${refreshKey}`} siteId={siteId} />
        </div>

        <div style={{ display: activeTab === "settings" ? "block" : "none" }}>
          <SenderConfigForm siteId={siteId} />
        </div>
      </div>
    </div>
  )
}
