import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

const s3Client = new S3Client({
  region: process.env.S3_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
})

interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Upload file to AWS S3
 */
export async function uploadToS3(
  file: Buffer,
  fileName: string,
  mimeType: string,
  folder = "ecommerce",
): Promise<UploadResult> {
  try {
    if (!process.env.S3_BUCKET_NAME) {
      return { success: false, error: "AWS_S3_BUCKET not configured" }
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const uniqueFileName = `${folder}/${timestamp}-${fileName}`

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: uniqueFileName,
      Body: file,
      ContentType: mimeType,
      // ACL: "public-read",
    })

    await s3Client.send(command)

    // Generate public URL
    const url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION || "eu-north-1"}.amazonaws.com/${uniqueFileName}`

    return { success: true, url }
  } catch (error: any) {
    console.error("[s3Upload] Error uploading file:", error)
    return { success: false, error: error.message || "Failed to upload file to S3" }
  }
}

/**
 * Delete file from AWS S3
 */
export async function deleteFromS3(fileUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.AWS_S3_BUCKET) {
      return { success: false, error: "AWS_S3_BUCKET not configured" }
    }

    // Extract key from URL
    const urlParts = fileUrl.split("/")
    const key = urlParts.slice(3).join("/")

    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    })

    await s3Client.send(command)
    return { success: true }
  } catch (error: any) {
    console.error("[s3Upload] Error deleting file:", error)
    return { success: false, error: error.message || "Failed to delete file from S3" }
  }
}

/**
 * Validate file before upload
 */
export function validateFile(file: Buffer, fileName: string, maxSizeInMB = 5): { valid: boolean; error?: string } {
  // Check file size
  const fileSizeInMB = file.length / (1024 * 1024)
  if (fileSizeInMB > maxSizeInMB) {
    return { valid: false, error: `File size exceeds ${maxSizeInMB}MB limit` }
  }

  // Check file type
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"]
  const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf("."))

  if (!allowedExtensions.includes(fileExtension)) {
    return { valid: false, error: "Only image files (JPG, PNG, WebP, GIF) are allowed" }
  }

  return { valid: true }
}
