import mongoose from "mongoose"
import { NextResponse } from "next/server"

function validateObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid identifier provided",
      },
      { status: 400 },
    )
  }
  return null
}

export { validateObjectId }