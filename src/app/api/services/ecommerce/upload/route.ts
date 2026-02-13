import { type NextRequest, NextResponse } from "next/server"
import { uploadToS3, validateFile } from "@/_sharedServices/utils/s3Upload"
import { sharedServices } from "@/_sharedServices"
import { extractSiteId } from "@/_sharedServices/utils/siteExtractor"

// Helper function to generate unique filenames
function generateUniqueFileName(originalFileName: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const extension = originalFileName.split(".").pop()
  const nameWithoutExtension = originalFileName.substring(0, originalFileName.lastIndexOf("."))

  return `${nameWithoutExtension}_${timestamp}_${randomString}.${extension}`
}

function validateVideoFile(fileName: string, fileSize: number): { valid: boolean; error?: string } {
  const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"]
  const extension = "." + fileName.split(".").pop()?.toLowerCase()

  if (!videoExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Format vidéo non supporté. Formats acceptés: ${videoExtensions.join(", ")}`,
    }
  }

  const fileSizeInMB = fileSize / (1024 * 1024)
  if (fileSizeInMB > 50) {
    return { valid: false, error: `Video file size exceeds 50MB limit` }
  }

  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    //console.log("All headers:", Object.fromEntries(request.headers))
    //console.log("Cookies:", request.headers.get("cookie"))
    // Extract and validate authentication
    const authResult = await sharedServices._internal._nlVerify(request)
    console.log(authResult.success)
    if (!authResult.success) {
      console.log(authResult.error)
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    // Extract siteId
    let siteId = extractSiteId(request)
    console.log("siteId: ", siteId)

    if (!siteId) {
      const body = await request.json().catch(() => ({}))
      siteId = body.siteId
    }

    if (!siteId) {
      const formData = await request.formData()
      siteId = formData.get("siteId") as string
      console.log("siteId: ", siteId)
    }

    if (!siteId) {
      return NextResponse.json({ error: "L'ID du site est requis" }, { status: 400 })
    }

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const resourceType = formData.get("resourceType") as string
    const resourceId = formData.get("resourceId") as string
    const imageUrls = formData.getAll("imageUrls") as string[]
    const videoUrls = formData.getAll("videoUrls") as string[]
    const isVideoUpload = formData.get("mediaType") === "video"

    if (!resourceType) {
      return NextResponse.json({ error: "Le type de ressource est requis" }, { status: 400 })
    }

    if (!["product", "category"].includes(resourceType)) {
      return NextResponse.json({ error: "Type de ressource invalide" }, { status: 400 })
    }

    if (isVideoUpload && resourceType !== "product") {
      return NextResponse.json({ error: "Les vidéos ne peuvent être uploadées que pour les produits" }, { status: 400 })
    }

    const maxImages = resourceType === "product" ? 6 : 1
    const maxVideos = 6

    if (videoUrls.length > 0 && resourceId && resourceType === "product") {
      console.log("[DEBUG] Attaching videos to product")
      console.log("[DEBUG] videoUrls:", videoUrls)

      const mediaObjects = videoUrls.map((url) => ({
        url,
        type: "video",
        thumbnailUrl: "",
      }))

      const result = await sharedServices.ecommerce.addProductMedia(siteId, resourceId, mediaObjects)

      console.log("[DEBUG] Video attachment result:", result)

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        uploadedCount: videoUrls.length,
      })
    }

    if (imageUrls.length > 0 && resourceId) {
      let result
      if (resourceType === "product") {
        const mediaObjects = imageUrls.map((url) => ({
          url,
          type: "image",
        }))
        result = await sharedServices.ecommerce.addProductMedia(siteId, resourceId, mediaObjects)
      } else {
        result = await sharedServices.ecommerce.addCategoryImages(siteId, resourceId, imageUrls)
      }

      console.log("[DEBUG] Attachment result:", result)

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        uploadedCount: imageUrls.length,
      })
    }

    if (!files || files.length === 0) {
      if (imageUrls.length > 0) {
        return NextResponse.json({
          success: true,
          data: { urls: imageUrls },
          uploadedCount: imageUrls.length,
        })
      }
      if (videoUrls.length > 0) {
        return NextResponse.json({
          success: true,
          data: { urls: videoUrls },
          uploadedCount: videoUrls.length,
        })
      }
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    // Upload files to S3
    const uploadedUrls: string[] = []
    const errors: string[] = []

    for (const file of files) {
      const buffer = await file.arrayBuffer()

      if (isVideoUpload) {
        // Validate video file
        const videoValidation = validateVideoFile(file.name, buffer.byteLength)
        if (!videoValidation.valid) {
          errors.push(`${file.name}: ${videoValidation.error}`)
          continue
        }
      } else {
        // Validate image file
        const validation = validateFile(Buffer.from(buffer), file.name, 5)
        if (!validation.valid) {
          errors.push(`${file.name}: ${validation.error}`)
          continue
        }
      }

      const uniqueFileName = generateUniqueFileName(file.name)

      const s3Path = isVideoUpload ? `ecommerce/videos` : `ecommerce/${resourceType}s`

      const uploadResult = await uploadToS3(Buffer.from(buffer), uniqueFileName, file.type, s3Path)

      if (uploadResult.success && uploadResult.url) {
        uploadedUrls.push(uploadResult.url)
      } else {
        errors.push(`${file.name}: ${uploadResult.error}`)
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json({ error: "Aucun fichier n'a été uploadé avec succès", details: errors }, { status: 400 })
    }

    if (resourceId) {
      if (isVideoUpload && resourceType === "product") {
        const mediaObjects = uploadedUrls.map((url) => ({
          url,
          type: "video",
          thumbnailUrl: "",
        }))

        const result = await sharedServices.ecommerce.addProductMedia(siteId, resourceId, mediaObjects)

        console.log("[DEBUG] Video attachment result:", result)

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          data: result.data,
          uploadedCount: uploadedUrls.length,
          errors: errors.length > 0 ? errors : undefined,
        })
      } else {
        let result
        if (resourceType === "product") {
          const mediaObjects = uploadedUrls.map((url) => ({
            url,
            type: "image",
          }))
          result = await sharedServices.ecommerce.addProductMedia(siteId, resourceId, mediaObjects)
        } else {
          result = await sharedServices.ecommerce.addCategoryImages(siteId, resourceId, uploadedUrls)
        }

        console.log("[DEBUG] Attachment result:", result)

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          data: result.data,
          uploadedCount: uploadedUrls.length,
          errors: errors.length > 0 ? errors : undefined,
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: { urls: uploadedUrls },
      uploadedCount: uploadedUrls.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("[ecommerce upload] Error:", error)
    return NextResponse.json({ error: "Échec de l'upload des fichiers" }, { status: 500 })
  }
}
