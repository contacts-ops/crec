export class CustomError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
    this.name = "CustomError"
  }
}

// Centralized French error messages for newsletter system
export const FRENCH_ERROR_MESSAGES = {
  // Authentication errors
  AUTH_REQUIRED: "Authentification requise",
  INVALID_TOKEN: "Jeton d'authentification invalide ou expiré",
  ACCESS_DENIED: "Accès refusé à ce site",
  SITE_NOT_FOUND: "Site introuvable",
  USER_NOT_FOUND: "Utilisateur introuvable",
  
  // SendGrid domain errors
  DOMAIN_NOT_AUTHORIZED: "Vous n'avez pas l'autorisation de vérifier ce domaine",
  DOMAIN_VERIFICATION_FAILED: "Échec de la vérification du domaine",
  INVALID_DOMAIN_FORMAT: "Format de domaine invalide",
  
  // Newsletter errors
  SITE_ID_REQUIRED: "ID du site est requis",
  SUBSCRIBER_NOT_FOUND: "Abonné introuvable",
  EMAIL_ALREADY_EXISTS: "Cette adresse e-mail est déjà inscrite à notre newsletter",
  INVALID_EMAIL_FORMAT: "Format d'adresse e-mail invalide",
  CAMPAIGN_NOT_FOUND: "Campagne introuvable",
  CAMPAIGN_ALREADY_SENT: "La campagne a déjà été envoyée",
  NO_ACTIVE_SUBSCRIBERS: "Aucun abonné actif trouvé pour cette campagne",
  
  // General errors
  VALIDATION_ERROR: "Données invalides. Veuillez vérifier les informations saisies",
  DATABASE_ERROR: "Erreur de base de données",
  NETWORK_ERROR: "Erreur de connexion",
  UNKNOWN_ERROR: "Une erreur inattendue s'est produite",
  SERVER_ERROR: "Erreur serveur interne",
  
  // Success messages
  SUBSCRIBER_ADDED: "Abonné ajouté avec succès",
  SUBSCRIBER_UPDATED: "Abonné mis à jour avec succès",
  SUBSCRIBER_DELETED: "Abonné supprimé avec succès",
  CAMPAIGN_CREATED: "Campagne créée avec succès",
  CAMPAIGN_UPDATED: "Campagne mise à jour avec succès",
  CAMPAIGN_DELETED: "Campagne supprimée avec succès",
  CAMPAIGN_SENT: "Campagne envoyée avec succès",
  CONFIG_SAVED: "Configuration sauvegardée avec succès",
  DOMAIN_VERIFIED: "Domaine vérifié avec succès",
}

export function handleApiError(error: any) {
  console.error("Erreur API:", error)
  
  if (error instanceof CustomError) {
    return {
      error: error.message,
      statusCode: error.statusCode,
    }
  }

  if (error.name === "ValidationError") {
    const firstError = Object.values(error.errors)[0] as any
    return {
      error: firstError.message || FRENCH_ERROR_MESSAGES.VALIDATION_ERROR,
      statusCode: 400,
    }
  }

  if (error.name === "CastError") {
    return {
      error: FRENCH_ERROR_MESSAGES.VALIDATION_ERROR,
      statusCode: 400,
    }
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0]
    if (field === "email") {
      return {
        error: FRENCH_ERROR_MESSAGES.EMAIL_ALREADY_EXISTS,
        statusCode: 400,
      }
    }
    return {
      error: `Cette valeur existe déjà pour le champ: ${field}`,
      statusCode: 400,
    }
  }

  // Network or connection errors
  if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
    return {
      error: FRENCH_ERROR_MESSAGES.NETWORK_ERROR,
      statusCode: 503,
    }
  }

  return {
    error: FRENCH_ERROR_MESSAGES.UNKNOWN_ERROR,
    statusCode: 500,
  }
}

// Helper function to get user-friendly error message
export function getUserFriendlyError(error: any): string {
  const { error: errorMessage } = handleApiError(error)
  return errorMessage || FRENCH_ERROR_MESSAGES.UNKNOWN_ERROR
}