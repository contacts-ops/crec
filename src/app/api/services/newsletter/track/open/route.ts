import type { NextRequest } from "next/server"
import { sharedServices } from "@/_sharedServices"

export async function GET(request: NextRequest) {
  return sharedServices.newsletter.trackEmailOpen(request)
}
