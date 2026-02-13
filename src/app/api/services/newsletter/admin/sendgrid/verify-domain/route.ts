import { NextRequest, NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"
import { Site } from "@/lib/models/Site"
import { FRENCH_ERROR_MESSAGES } from "@/_sharedServices/utils/errorHandler"

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const domainToVerify = (searchParams.get("domain") || "").toLowerCase().trim()

    if (!domainToVerify || !domainToVerify.includes(".")) {
      return NextResponse.json({ 
        success: false, 
        error: FRENCH_ERROR_MESSAGES.INVALID_DOMAIN_FORMAT,
        note: authResult.note 
      }, { status: 400 })
    }

    // Check domain isolation (user can only verify their own domain)
    const canVerify = await sharedServices.sendgrid.canUserVerifyDomain(
      authResult.user?.siteId || "", 
      domainToVerify
    )
    
    if (!canVerify) {
      return NextResponse.json({
        success: false,
        error: FRENCH_ERROR_MESSAGES.DOMAIN_NOT_AUTHORIZED,
        note: authResult.note,
      }, { status: 403 })
    }

    const result = await sharedServices.sendgrid.verifyDomain(domainToVerify)
    return NextResponse.json({ 
      success: true, 
      domain: domainToVerify, 
      verified: result.verified,
      error: result.error,
      note: authResult.note,
    })
  } catch (error) {
    console.error("Erreur de vérification du domaine:", error)
    return NextResponse.json({ 
      success: false, 
      error: FRENCH_ERROR_MESSAGES.DOMAIN_VERIFICATION_FAILED,
      note: "Erreur lors de la vérification du domaine"
    }, { status: 500 })
  }
}
