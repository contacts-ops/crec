import type { NextRequest } from "next/server"
import { sharedServices } from "@/_sharedServices"

// Public endpoint - anyone can subscribe
export async function POST(request: NextRequest) {
  return sharedServices.newsletter.subscribe(request)
}
