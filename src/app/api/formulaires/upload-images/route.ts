import { NextResponse } from 'next/server';
import { uploadImageToS3, isValidImageType, isValidFileSize } from '@/lib/s3';

export async function POST(request: Request) {
  try {
    console.log('🚀 Début de l\'API upload-images pour formulaires');

    const formData = await request.formData();
    console.log('📋 FormData récupéré');

    const file = formData.get('image') as File;
    const formId = formData.get('formId') as string;
    const siteId = formData.get('siteId') as string;

    console.log('📄 Données reçues:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      formId,
      siteId
    });

    if (!file || !siteId) {
      console.log('❌ Données manquantes');
      return NextResponse.json(
        { error: 'Fichier et siteId sont requis' },
        { status: 400 }
      );
    }

    // Validation du type de fichier (images uniquement)
    console.log('🔍 Validation du type de fichier...');
    if (!isValidImageType(file.name)) {
      console.log('❌ Type de fichier non supporté:', file.name);
      return NextResponse.json(
        { error: 'Type de fichier non supporté. Utilisez JPG, PNG, WebP, SVG, PDF.' },
        { status: 400 }
      );
    }
    console.log('✅ Type de fichier valide');

    // Validation de la taille du fichier (5MB max pour les images)
    console.log('🔍 Validation de la taille du fichier...');
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (!isValidFileSize(file.size, file.name)) {
      console.log('❌ Fichier trop volumineux:', file.size);
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Taille maximum : 5MB.' },
        { status: 400 }
      );
    }
    console.log('✅ Taille de fichier valide');

    // Convertir le fichier en buffer
    console.log('🔄 Conversion en buffer...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log('✅ Buffer créé, taille:', buffer.length);

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `form-${siteId}-${formId || 'new'}-${timestamp}-${randomString}.${fileExtension}`;
    console.log('📝 Nom de fichier généré:', fileName);

    // Upload vers S3
    console.log('☁️ Début de l\'upload vers S3...');
    const uploadResult = await uploadImageToS3(
      buffer,
      fileName,
      file.type
    );

    if (!uploadResult.success) {
      console.error('❌ Échec de l\'upload vers S3:', uploadResult.error);
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload vers S3' },
        { status: 500 }
      );
    }

    console.log(`✅ Image uploadée avec succès: ${uploadResult.imageUrl}`);

    return NextResponse.json({
      imageUrl: uploadResult.imageUrl,
      success: true
    });

  } catch (error) {
    console.error('❌ Erreur lors du téléchargement:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'Pas de stack trace');
    return NextResponse.json(
      { error: 'Erreur lors du téléchargement de l\'image' },
      { status: 500 }
    );
  }
} 