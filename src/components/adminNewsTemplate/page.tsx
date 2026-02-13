"use client"

import { useState, useEffect } from "react"
import NewsletterManager from "./newsletter-manager"
import NewsletterBuilder from "./newsletter-builder"
import {useSiteId} from "@/hooks/use-site-id";

// Helper function to extract siteId from pathname

export default function Page() {
  const [currentMode, setCurrentMode] = useState<"manager" | "builder">("manager")
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)
  const siteId = useSiteId()
  const [fromAddress, setFromAddress] = useState("")
  const [isLoadingFromAddress, setIsLoadingFromAddress] = useState(true)

  useEffect(() => {
    const fetchFromAddress = async () => {
      try {
        setIsLoadingFromAddress(true)
        console.log("[DEBUG] Fetching from address for siteId:", siteId)

        const response = await fetch(
          `/api/services/newsletter/admin/from-address?siteId=${encodeURIComponent(siteId)}`,
          {
            headers: {
              "Content-Type": "application/json",
              "x-site-id": siteId,
            },
            credentials: "include", // Include cookies for authentication
          },
        )

        console.log("[DEBUG] From address response status:", response.status)
        console.log("[DEBUG] From address response headers:", Object.fromEntries(response.headers.entries()))

        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          console.warn("[DEBUG] Newsletter from-address API not implemented or returning non-JSON")
          setFromAddress("newsletter@votre-site.com")
          return
        }

        if (response.ok) {
          const responseText = await response.text()
          console.log("[DEBUG] From address response body:", responseText)

          try {
            const data = JSON.parse(responseText)
            setFromAddress(data.fromAddress || data.email || "")
          } catch (error) {
            console.log("[DEBUG] Failed to parse from address JSON:", error)
            setFromAddress("newsletter@votre-site.com")
          }
        } else {
          const errorText = await response.text()
          console.error("[DEBUG] Failed to fetch from address:", errorText)
          setFromAddress("Erreur de chargement")
        }
      } catch (error) {
        console.error("[DEBUG] Error fetching from address:", error)
        setFromAddress("newsletter@votre-site.com")
      } finally {
        setIsLoadingFromAddress(false)
      }
    }

    fetchFromAddress()
  }, [siteId])

  const handleCreateVisualNewsletter = () => {
    console.log("[DEBUG] Create visual newsletter clicked")
    setEditingCampaignId(null) // Creating new campaign
    setCurrentMode("builder")
  }

  const handleEditTemplate = (templateId: string) => {
    console.log("[DEBUG] Edit template clicked:", templateId)
    setEditingCampaignId(templateId) // Load existing campaign
    setCurrentMode("builder")
  }

  const handleBackToManager = () => {
    setCurrentMode("manager")
    setEditingCampaignId(null)
    // Ensure URL reflects manager mode and open Campaigns tab by default
    const url = new URL(window.location.href)
    url.searchParams.set("mode", "manager")
    url.searchParams.set("tab", "campaigns")
    window.history.replaceState({}, "", url.toString())
  }

  if (currentMode === "builder") {
    return (
      <div className="h-screen bg-gray-50">
        <NewsletterBuilder
          templateId={editingCampaignId || undefined}
          onSave={(template) => {
            console.log("Template saved:", template)
            setEditingCampaignId(null)
          }}
          onBack={handleBackToManager}
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Gestion des Newsletters</h2>
            <p className="text-gray-600">Interface de gestion pour les abonnés, campagnes et analytics.</p>
          </div>
        </div>

        <NewsletterManager
          siteId={siteId}
          onCreateVisualNewsletter={handleCreateVisualNewsletter}
          onEditTemplate={handleEditTemplate}
          onViewAnalytics={() => {}}
          fromAddress={fromAddress}
          isLoadingFromAddress={isLoadingFromAddress}
          onBack={handleBackToManager}
          defaultActiveTab={
            typeof window !== "undefined" && new URL(window.location.href).searchParams.get("tab") === "campaigns"
              ? "campaigns"
              : "contacts"
          }
        />
      </div>
    </div>
  )
}
