import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"

// Protected endpoints - admin can manage campaigns
export async function GET(request: NextRequest) {
  const authResult = await sharedServices._internal._nlVerify(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode || 401 }
    )
  }
  
  return sharedServices.newsletter.listCampaigns(request)
}

export async function POST(request: NextRequest) {
  const authResult = await sharedServices._internal._nlVerify(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode || 401 }
    )
  }
  
  return sharedServices.newsletter.createCampaign(request)
}
