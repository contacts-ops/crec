import type { NextRequest } from "next/server"
import { sharedServices } from "@/_sharedServices"

// Public endpoint with token validation
export async function GET(request: NextRequest) {
  return sharedServices.newsletter.unsubscribe(request)
}
