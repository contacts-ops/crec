import type { NextRequest } from "next/server"
import { sharedServices } from "@/_sharedServices"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params 
  return sharedServices.newsletter.sendCampaign(id, request)
}
