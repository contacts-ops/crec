import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"

// Protected endpoints - admin can manage subscribers
export async function GET(request: NextRequest) {
  const authResult = await sharedServices._internal._nlVerify(request)
  if (!authResult.success) {
    return NextResponse.json(
      { 
        success: false, 
        error: authResult.error,
        note: authResult.note 
      },
      { status: authResult.statusCode || 401 }
    )
  }
  
  try {
    const result = await sharedServices.newsletter.listSubscribers(request)
    return NextResponse.json({
      ...result,
      note: authResult.note
    })
  } catch (error) {
    console.error("Error listing subscribers:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Erreur lors de la récupération des abonnés",
        note: authResult.note 
      }, 
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await sharedServices._internal._nlVerify(request)
  if (!authResult.success) {
    return NextResponse.json(
      { 
        success: false, 
        error: authResult.error,
        note: authResult.note 
      },
      { status: authResult.statusCode || 401 }
    )
  }
  
  try {
    const result = await sharedServices.newsletter.deleteSubscribers(request)
    return NextResponse.json({
      ...result,
      note: authResult.note
    })
  } catch (error) {
    console.error("Error deleting subscribers:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Erreur lors de la suppression des abonnés",
        note: authResult.note 
      }, 
      { status: 500 }
    )
  }
}
