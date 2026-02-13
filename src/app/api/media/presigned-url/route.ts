import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { isValidMediaType, isValidFileSize } from "@/lib/s3";

const s3Client = new S3Client({
  region: process.env.S3_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(request: Request) {
  try {
    const { fileName, fileSize, fileType, componentId, fieldId } = await request.json();

    if (!fileName || !fileSize || !fileType) {
      return NextResponse.json({ error: "fileName, fileSize, and fileType are required" }, { status: 400 });
    }

    if (!isValidMediaType(fileName)) {
      return NextResponse.json(
        { error: "File type not supported. Use JPG, PNG, GIF, WebP, SVG, MP4, WebM, OGG, MOV, AVI or MKV." },
        { status: 400 }
      );
    }

    if (!isValidFileSize(fileSize, fileName)) {
      const maxSize = fileName.toLowerCase().match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i) ? "50MB" : "5MB";
      return NextResponse.json({ error: `File too large. Maximum size: ${maxSize}.` }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = fileName.split(".").pop();
    const uniqueFileName = `${componentId}-${fieldId}-${timestamp}-${randomString}.${fileExtension}`;

    // ✅ Correct: use PutObjectCommand for upload
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: uniqueFileName,
      ContentType: fileType,
    });

    // Generate presigned URL valid for 15 minutes
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION || "us-east-1"}.amazonaws.com/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      presignedUrl,
      fileUrl,
      fileName: uniqueFileName,
    });
  } catch (error) {
    console.error("❌ Error generating presigned URL:", error);
    return NextResponse.json({ error: "Error generating presigned URL" }, { status: 500 });
  }
}
