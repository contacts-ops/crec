import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"

// Protected endpoints - admin can manage individual subscribers
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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
    const result = await sharedServices.newsletter.getSubscriberById(params.id, request)
    return NextResponse.json({
      ...result,
      note: authResult.note
    })
  } catch (error) {
    console.error("Error getting subscriber:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Erreur lors de la récupération de l'abonné",
        note: authResult.note 
      }, 
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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
    const result = await sharedServices.newsletter.updateSubscriber(params.id, request)
    return NextResponse.json({
      ...result,
      note: authResult.note
    })
  } catch (error) {
    console.error("Error updating subscriber:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Erreur lors de la mise à jour de l'abonné",
        note: authResult.note 
      }, 
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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
    const result = await sharedServices.newsletter.deleteSubscriber(params.id, request)
    return NextResponse.json({
      ...result,
      note: authResult.note
    })
  } catch (error) {
    console.error("Error deleting subscriber:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Erreur lors de la suppression de l'abonné",
        note: authResult.note 
      }, 
      { status: 500 }
    )
  }
}
