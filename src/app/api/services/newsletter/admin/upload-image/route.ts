import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }


    const componentId = Math.floor(Math.random() * 1000) + 1 // Random number 1-1000
    const fieldId = Math.floor(Math.random() * 1000) + 1 // Random number 1-1000
    const fileName = file.name
    const fileType = file.type.split("/")[1] || "png" // Extract extension from MIME type
    const fileSize = file.size

  
    const companyFormData = new FormData()
    companyFormData.append("image", file) // Company endpoint expects "image" field
    companyFormData.append("componentId", componentId.toString())
    companyFormData.append("fieldId", fieldId.toString())
    companyFormData.append("fileName", fileName)
    companyFormData.append("fileType", fileType)
    companyFormData.append("fileSize", fileSize.toString())


    const response = await fetch(`https://www.hub.majoli.io/api/upload-image`, {
      method: "POST",
      body: companyFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      url: result.imageUrl, // Company endpoint returns imageUrl
      filename: fileName,
    })
  } catch (error) {
    return NextResponse.json({ error: "Impossible de télécharger l'image" }, { status: 500 })
  }
}
