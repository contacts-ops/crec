import { type NextRequest } from "next/server"
import { verifyUserAuthentication } from "./newsletterAuth"

export interface GuestAuthResult {
  isAuthenticated: boolean
  userId?: string
  sessionId: string
  email?: string
}

/**
 * Generate a guest session ID using crypto.randomUUID (built-in, no dependencies)
 */
function generateGuestSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `guest_${crypto.randomUUID()}`
  }
  // Fallback for environments without crypto.randomUUID
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Optional authentication helper for guest operations
 * Returns sessionId for guests, userId for authenticated users
 * This allows cart/favorites to work for both guests and authenticated users
 * 
 * Usage:
 * - For cart operations: Use this to allow both guests and authenticated users
 * - For checkout: Use verifyUserAuthentication (strict) instead
 */
export async function getGuestOrUserAuth(request: NextRequest): Promise<GuestAuthResult> {
  // Try to get authenticated user first
  const authResult = await verifyUserAuthentication(request)
  
  if (authResult.success && authResult.user) {
    // User is authenticated - use userId
    return {
      isAuthenticated: true,
      userId: authResult.user.userId,
      sessionId: "", // Not needed for authenticated users
      email: authResult.user.email,
    }
  }

  // User is a guest - get or create session ID from cookies
  let sessionId = request.cookies.get("guest_session_id")?.value

  if (!sessionId) {
    // Generate new session ID for guest
    sessionId = generateGuestSessionId()
  }

  return {
    isAuthenticated: false,
    sessionId,
    userId: undefined,
    email: undefined,
  }
}

