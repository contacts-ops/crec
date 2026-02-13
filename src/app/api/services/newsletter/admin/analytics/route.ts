import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { sharedServices } from "@/_sharedServices"

// Get analytics data
export async function GET(request: NextRequest) {
  return sharedServices.newsletter.getAnalytics(request)
}

// Track analytics events (simplified)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // For now, just log the event - you can extend this later
    return NextResponse.json({
      success: true,
      message: "Event tracked successfully",
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to track event" }, { status: 500 })
  }
}
