import { NextResponse } from 'next/server';
import { uploadImageToS3, isValidImageType, isValidFileSize } from '@/lib/s3';

export async function POST(request: Request) {
  try {


    const formData = await request.formData();

    const file = formData.get('image') as File;
    const blogId = formData.get('blogId') as string;
    const siteId = formData.get('siteId') as string;


    if (!file || !siteId) {

      return NextResponse.json(
        { error: 'Fichier et siteId sont requis' },
        { status: 400 }
      );
    }

    // Validation du type de fichier (images uniquement)

    if (!isValidImageType(file.name)) {

      return NextResponse.json(
        { error: 'Type de fichier non supporté. Utilisez JPG, PNG, GIF, WebP, SVG.' },
        { status: 400 }
      );
    }

    // Validation de la taille du fichier (5MB max pour les images)

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (!isValidFileSize(file.size, file.name)) {

      return NextResponse.json(
        { error: 'Fichier trop volumineux. Taille maximum : 5MB.' },
        { status: 400 }
      );
    }

    // Convertir le fichier en buffer

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);


    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `blog-${siteId}-${blogId || 'new'}-${timestamp}-${randomString}.${fileExtension}`;

    // Upload vers S3

    const uploadResult = await uploadImageToS3(
      buffer,
      fileName,
      file.type
    );

    if (!uploadResult.success) {

      return NextResponse.json(
        { error: 'Erreur lors de l\'upload vers S3' },
        { status: 500 }
      );
    }

  

    return NextResponse.json({
      imageUrl: uploadResult.imageUrl,
      success: true
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Erreur lors du téléchargement de l\'image' },
      { status: 500 }
    );
  }
} 