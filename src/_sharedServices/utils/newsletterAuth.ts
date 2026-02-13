import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { connectToDatabase } from "@/lib/db"
import { Utilisateur } from "@/lib/models/Utilisateur"
import { User } from "@/lib/models/User"
import { Site } from "@/lib/models/Site"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"
import { FRENCH_ERROR_MESSAGES } from "@/_sharedServices/utils/errorHandler"

interface AuthenticatedUser {
  userId: string
  email: string
  role: string
  siteId: string
  tokenSiteId?: string
  permissions?: string[]
  userType: "user" | "utilisateur" // Track which model was used
}

interface AuthResult {
  success: boolean
  user?: AuthenticatedUser
  error?: string
  statusCode?: number
  note?: string // For dev/prod environment notes
}

export async function authenticateNewsletterAdmin(request: NextRequest): Promise<AuthResult> {
  try {
    // Reuse shared extractor
    const siteId = extractSiteId(request)
    if (!siteId) {
      return {
        success: false,
        error: FRENCH_ERROR_MESSAGES.SITE_ID_REQUIRED,
        statusCode: 400,
      }
    }

    // Try to get token from different sources (prioritize utilisateur_token)
    let token: string | null = null
    let tokenType: "utilisateur_token" | "token" | "bearer" = "utilisateur_token"

    const authHeader = request.headers.get("authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7)
      tokenType = "bearer"
    }

    if (!token) {
      token = request.cookies.get("utilisateur_token")?.value || null
      tokenType = "utilisateur_token"
    }

    if (!token) {
      token = request.cookies.get("token")?.value || null
      tokenType = "token"
    }

    if (!token) {
      return {
        success: false,
        error: FRENCH_ERROR_MESSAGES.AUTH_REQUIRED,
        statusCode: 401,
      }
    }

    // Verify JWT token
    let payload: any
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (error) {
      return {
        success: false,
        error: FRENCH_ERROR_MESSAGES.INVALID_TOKEN,
        statusCode: 401,
      }
    }

    await connectToDatabase()

    // Verify site exists
    const site = await Site.findOne({ siteId })
    if (!site) {
      return {
        success: false,
        error: FRENCH_ERROR_MESSAGES.SITE_NOT_FOUND,
        statusCode: 404,
      }
    }

    // Resolve user based on token type
    let user: any = null
    let userType: "user" | "utilisateur" = "utilisateur"

    if (tokenType === "utilisateur_token") {
      // Use Utilisateur model (for exported websites)
      if (payload.userId) {
        user = await Utilisateur.findById(payload.userId)
      } else if (payload.sub) {
        user = await Utilisateur.findById(payload.sub)
      }
      userType = "utilisateur"
    } else if (tokenType === "token" || tokenType === "bearer") {
      // Use User model (for main platform)
      if (payload.userId) {
        user = await User.findById(payload.userId)
      } else if (payload.sub) {
        user = await User.findById(payload.sub)
      }
      userType = "user"
    }

    if (!user) {
      return {
        success: false,
        error: FRENCH_ERROR_MESSAGES.USER_NOT_FOUND,
        statusCode: 404,
      }
    }

    // Check permissions based on user type and environment
    const hasAccess = await verifySiteAccess(user, site, payload, userType)
    if (!hasAccess) {
      return {
        success: false,
        error: FRENCH_ERROR_MESSAGES.ACCESS_DENIED,
        statusCode: 403,
      }
    }

    return {
      success: true,
      user: {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        siteId: siteId,
        tokenSiteId: payload.siteId,
        permissions: user.permissions,
        userType,
      },
    }
  } catch (error) {
    console.error("Newsletter auth error:", error)
    return {
      success: false,
      error: FRENCH_ERROR_MESSAGES.SERVER_ERROR,
      statusCode: 500,
    }
  }
}

async function verifySiteAccess(
  user: any,
  site: any,
  payload: any,
  userType: "user" | "utilisateur",
): Promise<boolean> {
  const isDev = process.env.NODE_ENV === "development"

  // For User model (main platform) - check admin/developer roles
  if (userType === "user") {
    if (
      user.role === "admin" ||
      user.role === "developer" ||
      payload.role === "admin" ||
      payload.role === "developer"
    ) {
      return true
    }
  }

  // For Utilisateur model (exported websites) - check admin role
  if (userType === "utilisateur") {
    if (user.role === "admin" || payload.role === "admin") {
      return true
    }
  }

  // Site owner access
  if (site.ownerId && site.ownerId.toString() === user._id.toString()) {
    return true
  }

  // Site users list should only grant access when acting as admin context
  if (
    (payload.role === "admin" || user.role === "admin") &&
    site.users &&
    site.users.some((userId: any) => userId.toString() === user._id.toString())
  ) {
    return true
  }

  // In development, allow more flexible access for testing
  if (isDev && userType === "user" && (user.role === "admin" || user.role === "developer")) {
    return true
  }

  return false
}

export function withNewsletterAuth(
  handler: (request: NextRequest, user: AuthenticatedUser, context?: any) => Promise<NextResponse>,
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const authResult = await authenticateNewsletterAdmin(request)

    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode || 401 })
    }

    return handler(request, authResult.user!, context)
  }
}

export async function verifyUserAuthentication(request: NextRequest): Promise<AuthResult> {
  try {
    const siteId = extractSiteId(request)
    if (!siteId) {
      return {
        success: false,
        error: FRENCH_ERROR_MESSAGES.SITE_ID_REQUIRED,
        statusCode: 400,
      }
    }

    let token: string | null = null
    let tokenType: "utilisateur_token" | "token" | "bearer" = "utilisateur_token"

    const authHeader = request.headers.get("authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7)
      tokenType = "bearer"
    }

    if (!token) {
      token = request.cookies.get("utilisateur_token")?.value || null
      tokenType = "utilisateur_token"
    }

    if (!token) {
      token = request.cookies.get("token")?.value || null
      tokenType = "token"
    }

    if (!token) {
      return {
        success: false,
        error: FRENCH_ERROR_MESSAGES.AUTH_REQUIRED,
        statusCode: 401,
      }
    }

    let payload: any
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (error) {
      return {
        success: false,
        error: FRENCH_ERROR_MESSAGES.INVALID_TOKEN,
        statusCode: 401,
      }
    }

    await connectToDatabase()

    const site = await Site.findOne({ siteId })
    if (!site) {
      return {
        success: false,
        error: FRENCH_ERROR_MESSAGES.SITE_NOT_FOUND,
        statusCode: 404,
      }
    }

    let user: any = null
    let userType: "user" | "utilisateur" = "utilisateur"

    if (tokenType === "utilisateur_token") {
      // Use Utilisateur model (for exported websites)
      if (payload.userId) {
        user = await Utilisateur.findById(payload.userId)
      } else if (payload.sub) {
        user = await Utilisateur.findById(payload.sub)
      }
      userType = "utilisateur"
    } else if (tokenType === "token" || tokenType === "bearer") {
      // Use User model (for main platform)
      if (payload.userId) {
        user = await User.findById(payload.userId)
      } else if (payload.sub) {
        user = await User.findById(payload.sub)
      }
      userType = "user"
    }

    if (!user) {
      return {
        success: false,
        error: FRENCH_ERROR_MESSAGES.USER_NOT_FOUND,
        statusCode: 404,
      }
    }
    /*
    // Check if user is active
    if (user.status !== "active") {
      return {
        success: false,
        error: "Votre compte est inactif",
        statusCode: 403,
      }
    }
    */
    return {
      success: true,
      user: {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        siteId: siteId,
        tokenSiteId: payload.siteId,
        permissions: user.permissions,
        userType,
      },
    }
  } catch (error) {
    console.error("User authentication error:", error)
    return {
      success: false,
      error: FRENCH_ERROR_MESSAGES.SERVER_ERROR,
      statusCode: 500,
    }
  }
}

export function withUserAuth(
  handler: (request: NextRequest, user: AuthenticatedUser, context?: any) => Promise<NextResponse>,
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const authResult = await verifyUserAuthentication(request)

    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode || 401 })
    }

    return handler(request, authResult.user!, context)
  }
}
