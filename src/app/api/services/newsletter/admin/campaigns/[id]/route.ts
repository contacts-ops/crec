import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"

// Protected endpoints - admin can manage individual campaigns
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await sharedServices._internal._nlVerify(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode || 401 }
    )
  }
  
  const { id } = await params
  return sharedServices.newsletter.getCampaignById(id)
}

export async function PATCH(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await sharedServices._internal._nlVerify(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode || 401 }
    )
  }
  
  const { id } = await params
  return sharedServices.newsletter.updateCampaign(id, request)
}

export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await sharedServices._internal._nlVerify(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode || 401 }
    )
  }
  
  const { id } = await params
  return sharedServices.newsletter.deleteCampaign(id)
}
