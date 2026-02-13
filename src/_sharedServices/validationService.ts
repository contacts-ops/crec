import Joi from "joi"
import sanitizeHtml from "sanitize-html"

// Input sanitization
const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== "string") return ""
  return sanitizeHtml(input.trim(), {
    allowedTags: [],
    allowedAttributes: {},
  })
}

const sanitizeObject = (obj: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeInput(value)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) => (typeof item === "string" ? sanitizeInput(item) : item))
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

// Generic validation schemas
const newsletterValidation = Joi.object({
  siteId: Joi.string().required().messages({
    "string.empty": "Site ID is required",
    "any.required": "Site ID is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Veuillez saisir une adresse e-mail valide",
    "string.empty": "Adresse e-mail requise",
    "any.required": "Adresse e-mail requise",
  }),
  fullName: Joi.string().max(100).optional().allow(""),
  firstName: Joi.string().max(50).optional().allow(""),
  lastName: Joi.string().max(50).optional().allow(""),
  interests: Joi.array().items(Joi.string()).optional(),
  source: Joi.string().valid("website", "manual", "social", "other").optional(),
  metadata: Joi.object().optional(),
  // Allow isActive for admin operations
  isActive: Joi.boolean().optional(),
})

const campaignValidation = Joi.object({
  siteId: Joi.string().required().messages({
    "string.empty": "Site ID is required",
    "any.required": "Site ID is required",
  }),
  title: Joi.string().max(200).required().messages({
    "string.empty": "Campaign title is required",
    "any.required": "Campaign title is required",
  }),
  subject: Joi.string().max(300).required().messages({
    "string.empty": "Email subject is required",
    "any.required": "Email subject is required",
  }),
  htmlContent: Joi.string().required().messages({
    "string.empty": "HTML content is required",
    "any.required": "HTML content is required",
  }),
  textContent: Joi.string().optional().allow(""),
  targetAudience: Joi.object({
    allSubscribers: Joi.boolean().default(true),
    interests: Joi.array().items(Joi.string()).default([]),
    segments: Joi.array().items(Joi.string()).default([]),
  }).optional(),
})


export const validationService = {
  sanitizeInput,
  sanitizeObject,
  newsletterValidation,
  campaignValidation
}
