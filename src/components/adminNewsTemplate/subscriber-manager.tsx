"use client"

import React, { useState, useEffect } from "react"
import { Users, Edit, Trash2, RefreshCw, UserCheck, AlertCircle } from "lucide-react"

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
    statistics?: {
      totalSubscribers: number
      activeSubscribers: number
      inactiveSubscribers: number
    }
  }
  error?: string
  message?: string
}

interface SubscriberManagerProps {
  siteId: string
}

export default function SubscriberManager({ siteId }: SubscriberManagerProps) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")

  // Statistics
  const [totalSubscribers, setTotalSubscribers] = useState(0)
  const [activeSubscribers, setActiveSubscribers] = useState(0)
  const [inactiveSubscribers, setInactiveSubscribers] = useState(0)

  // Filters
  const [availableInterests, setAvailableInterests] = useState<string[]>([])
  const [interestFilter, setInterestFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Modal states
  const [showContactForm, setShowContactForm] = useState(false)
  const [editingContact, setEditingContact] = useState<Subscriber | null>(null)
  const [showDeleteSubscriberConfirm, setShowDeleteSubscriberConfirm] = useState(false)
  const [subscriberToDelete, setSubscriberToDelete] = useState<string | null>(null)

  // Form state
  const [contactForm, setContactForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    interests: [] as string[],
    status: "active" as "active" | "inactive",
  })

  // Email validation state
  const [emailError, setEmailError] = useState("")

  const itemsPerPage = 10

  useEffect(() => {
    console.log("[DEBUG] Filtering useEffect triggered - statusFilter:", statusFilter, "interestFilter:", interestFilter)
    setCurrentPage(1) // Reset to first page when filtering
    fetchSubscribers(1, searchTerm)
  }, [siteId, statusFilter, interestFilter])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== "") {
        fetchSubscribers(1, searchTerm)
      } else {
        fetchSubscribers(currentPage)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess("")
        setError("")
      }, 5000) // Consistent 5-second timeout
      return () => clearTimeout(timer)
    }
  }, [success, error])

  const fetchSubscribers = async (page = 1, search = "", forceRefresh = false) => {
    try {
      setIsLoading(true)
      setError("")

      console.log("[DEBUG] fetchSubscribers called - page:", page, "statusFilter:", statusFilter, "search:", search)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      })

      if (statusFilter === "active") {
        params.append("status", "active")
        console.log("[DEBUG] Adding status=active to params")
      } else if (statusFilter === "inactive") {
        params.append("status", "inactive")
        console.log("[DEBUG] Adding status=inactive to params")
      } else {
        params.append("status", "all")
        console.log("[DEBUG] Adding status=all to params")
      }

      if (interestFilter) {
        params.append("interest", interestFilter)
      }

      if (search) {
        params.append("search", search)
      }

      console.log("[DEBUG] Final API URL:", `/api/services/newsletter/admin/subscribers?${params}`)

      const response = await fetch(`/api/services/newsletter/admin/subscribers?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        credentials: "include",
      })

      console.log("[DEBUG] API Response status:", response.status, response.statusText)
      console.log("[DEBUG] API Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.log("[DEBUG] API Error Response:", errorText)
        
        try {
          const errorData = JSON.parse(errorText)
          setError(errorData.error || `Erreur API (${response.status})`)
        } catch {
          setError(`Erreur de connexion (${response.status})`)
        }
        return
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text()
        console.log("[DEBUG] Non-JSON Response:", responseText)
        setError("Réponse invalide du serveur")
        return
      }

      const result: PaginatedResponse<Subscriber> = await response.json()
      console.log("[DEBUG] API response:", result)

      if (result.success) {
        const subscribersData = result.data.subscribers || []
        console.log("[DEBUG] Setting subscribers:", subscribersData.length, "items")
        setSubscribers(subscribersData)
        setTotalPages(result.data.pagination.pages)
        setTotalItems(result.data.pagination.total)
        setTotalSubscribers(result.data.statistics?.totalSubscribers || 0)
        setActiveSubscribers(result.data.statistics?.activeSubscribers || 0)
        setInactiveSubscribers(result.data.statistics?.inactiveSubscribers || 0)
      } else {
        setError(result.error || "Erreur inconnue de l'API")
      }
    } catch (error) {
      console.error("[DEBUG] Error fetching subscribers:", error)
      setError("Erreur de connexion au serveur")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditContact = (subscriber: Subscriber) => {
    setEditingContact(subscriber)
    setContactForm({
      email: subscriber.email,
      firstName: subscriber.firstName || "Abonné",
      lastName: subscriber.lastName || "Estimé",
      interests: subscriber.interests || [],
      status: subscriber.isActive !== false ? "active" : "inactive",
    })
    setShowContactForm(true)
  }

  const handleDeleteContact = (subscriber: Subscriber) => {
    setSubscriberToDelete(subscriber._id)
    setShowDeleteSubscriberConfirm(true)
  }

  const deleteSubscriber = async (subscriberId: string) => {
    try {
      setIsLoading(true)
      setError("")

      const response = await fetch(`/api/services/newsletter/admin/subscribers/${subscriberId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        credentials: "include",
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.log("[DEBUG] Delete API Error:", errorText)
        
        try {
          const errorData = JSON.parse(errorText)
          setError(errorData.error || `Erreur lors de la suppression (${response.status})`)
        } catch {
          setError(`Erreur lors de la suppression (${response.status})`)
        }
        return
      }

      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        const result = await response.json()
        if (result.success) {
          setSuccess(result.message || "Abonné supprimé avec succès")
        } else {
          setError(result.error || "Erreur lors de la suppression")
        }
      } else {
        setSuccess("Abonné supprimé avec succès")
      }

      await fetchSubscribers(currentPage, searchTerm, true)
    } catch (error) {
      console.error("[DEBUG] Error deleting subscriber:", error)
      setError("Erreur de connexion lors de la suppression")
    } finally {
      setShowDeleteSubscriberConfirm(false)
      setSubscriberToDelete(null)
      setIsLoading(false)
    }
  }

  // Email validation function
  const validateEmail = (email: string): { isValid: boolean; error: string } => {
    if (!email) {
      return { isValid: false, error: "L'adresse e-mail est requise" }
    }

    // Check for basic email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { isValid: false, error: "Format d'adresse e-mail invalide" }
    }

    // Check for ASCII-only characters to prevent header issues
    const asciiRegex = /^[\x00-\x7F]*$/
    if (!asciiRegex.test(email)) {
      return {
        isValid: false,
        error:
          "L'adresse e-mail ne peut contenir que des caractères ASCII (pas de caractères spéciaux comme ŧ, é, ñ, etc.)",
      }
    }

    // Additional check for common problematic characters
    const problematicChars = /[ŧñéèêëàáâäôöùúûüçÿ]/i
    if (problematicChars.test(email)) {
      return {
        isValid: false,
        error:
          "L'adresse e-mail contient des caractères non autorisés. Utilisez uniquement des lettres, chiffres et symboles ASCII.",
      }
    }

    return { isValid: true, error: "" }
  }

  const handleAddContact = async (contactData: any) => {
    try {
      setIsLoading(true)
      setError("")
      setEmailError("")

      // Validate email before making API call
      const emailValidation = validateEmail(contactData.email)
      if (!emailValidation.isValid) {
        setEmailError(emailValidation.error)
        setIsLoading(false)
        return
      }

      if (editingContact) {
        const response = await fetch(`/api/services/newsletter/admin/subscribers/${editingContact._id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-site-id": siteId,
          },
          credentials: "include",
          body: JSON.stringify({
            email: contactData.email,
            firstName: contactData.firstName,
            lastName: contactData.lastName,
            interests: contactData.interests ? [contactData.interests] : [],
            isActive: contactData.status === "active",
            source: "manual",
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.log("[DEBUG] Update API Error:", errorText)
          
          try {
            const errorData = JSON.parse(errorText)
            setError(errorData.error || `Erreur lors de la mise à jour (${response.status})`)
          } catch {
            setError(`Erreur lors de la mise à jour (${response.status})`)
          }
          return
        }

        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const result = await response.json()
          if (result.success) {
            setSuccess(result.message || "Abonné mis à jour avec succès")
          } else {
            setError(result.error || "Erreur lors de la mise à jour")
          }
        } else {
          setSuccess("Abonné mis à jour avec succès")
        }

        await fetchSubscribers(currentPage, searchTerm, true)
        setShowContactForm(false)
        setEditingContact(null)
        setContactForm({
          email: "",
          firstName: "",
          lastName: "",
          interests: [],
        })
      } else {
        const response = await fetch(`/api/services/newsletter/subscribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-site-id": siteId,
          },
          credentials: "include",
          body: JSON.stringify({
            email: contactData.email,
            firstName: contactData.firstName,
            lastName: contactData.lastName,
            interests: contactData.interests ? [contactData.interests] : [],
            source: "manual",
            siteId: siteId,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.log("[DEBUG] Add API Error:", errorText)

          if (response.status === 400) {
            setError("Cette adresse e-mail est déjà inscrite à notre newsletter.")
          } else if (response.status === 422) {
            setError("Données invalides. Veuillez vérifier les informations saisies.")
          } else {
            setError(`Erreur API (${response.status}): ${response.statusText}`)
          }
          return
        }

        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const result = await response.json()
          if (result.success) {
            setSuccess(result.message || "Abonné ajouté avec succès")
          } else {
            setError(result.error || "Erreur lors de l'ajout")
          }
        } else {
          setSuccess("Abonné ajouté avec succès")
        }

        await fetchSubscribers(currentPage, searchTerm, true)
        setShowContactForm(false)
        setEditingContact(null)
        setContactForm({
          email: "",
          firstName: "",
          lastName: "",
          interests: [],
        })
      }
    } catch (error) {
      console.error("[DEBUG] Error saving contact:", error)
      setError("Erreur de connexion lors de la sauvegarde")
    } finally {
      setIsLoading(false)
    }
  }

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Abonnés</p>
              <p className="text-2xl font-bold text-gray-900">{totalSubscribers}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Abonnés Actifs</p>
              <p className="text-2xl font-bold text-gray-900">{activeSubscribers}</p>
            </div>
            <UserCheck className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Abonnés Inactifs</p>
              <p className="text-2xl font-bold text-gray-900">{inactiveSubscribers}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Rechercher un abonné..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              console.log("[DEBUG] Status filter changed from", statusFilter, "to", e.target.value)
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
          <button
            onClick={() => setShowContactForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Users className="w-4 h-4" />
            Ajouter Contact
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Chargement...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Abonné
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Intérêt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date d'inscription
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subscribers.map((subscriber) => (
                  <tr key={subscriber._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {(subscriber.firstName || subscriber.lastName)
                            ? `${subscriber.firstName || ""} ${subscriber.lastName || ""}`.trim()
                            : ""}
                        </div>
                        <div className="text-sm text-gray-500">{subscriber.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          subscriber.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {subscriber.isActive ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {subscriber.interests && subscriber.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {subscriber.interests.map((interest, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {interest}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(subscriber.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditContact(subscriber)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteContact(subscriber)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
                  fetchSubscribers(newPage)
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
                  fetchSubscribers(newPage)
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

      {showContactForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">{editingContact ? "Modifier l'abonné" : "Ajouter un abonné"}</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAddContact({
                  email: contactForm.email,
                  firstName: contactForm.firstName,
                  lastName: contactForm.lastName,
                  interests: contactForm.interests?.[0] || "",
                  status: contactForm.status,
                })
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => {
                      setContactForm((p) => ({ ...p, email: e.target.value }))
                      const validation = validateEmail(e.target.value)
                      setEmailError(validation.isValid ? "" : validation.error)
                    }}
                    className="w-full p-2 border rounded-md"
                  />
                  {emailError && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {emailError}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prénom</label>
                  <input
                    type="text"
                    name="firstName"
                    value={contactForm.firstName}
                    onChange={(e) => setContactForm((p) => ({ ...p, firstName: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nom</label>
                  <input
                    type="text"
                    name="lastName"
                    value={contactForm.lastName}
                    onChange={(e) => setContactForm((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Statut</label>
                  <div className="flex items-center space-x-3">
                    <input type="hidden" name="status" value={contactForm.status} />
                    <button
                      type="button"
                      onClick={() =>
                        setContactForm((p) => ({ ...p, status: p.status === "active" ? "inactive" : "active" }))
                      }
                      className={
                        contactForm.status === "active"
                          ? "px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 transition-colors"
                          : "px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-300 hover:bg-red-200 transition-colors"
                      }
                    >
                      {contactForm.status === "active" ? "Actif" : "Inactif"}
                    </button>
                    <span className="text-sm text-gray-500">Cliquez pour changer</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Intérêt</label>
                  <input
                    type="text"
                    name="interests"
                    placeholder="Ex: Marketing, Technologie, Design..."
                    value={contactForm.interests?.[0] || ""}
                    onChange={(e) =>
                      setContactForm((p) => ({ ...p, interests: e.target.value ? [e.target.value] : [] }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowContactForm(false)
                    setEditingContact(null)
                    setEmailError("")
                  }}
                  className="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !!emailError}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? "Sauvegarde..." : editingContact ? "Modifier" : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteSubscriberConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmer la suppression</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer cet abonné ? Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteSubscriberConfirm(false)
                  setSubscriberToDelete(null)
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => subscriberToDelete && deleteSubscriber(subscriberToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
