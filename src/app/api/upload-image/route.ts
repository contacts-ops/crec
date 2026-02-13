import { NextResponse } from 'next/server';
import { uploadImageToS3, isValidImageType, isValidFileSize } from '@/lib/s3';

export async function POST(request: Request) {
  try {
    console.log('🚀 Début de l\'API upload-media');

    const formData = await request.formData();
    console.log('📋 FormData récupéré');

    const file = formData.get('image') as File;
    const componentId = formData.get('componentId') as string;
    const fieldId = formData.get('fieldId') as string;

    console.log('📄 Données reçues:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      componentId,
      fieldId
    });

    if (!file || !componentId || !fieldId) {
      console.log('❌ Données manquantes');
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    // Validation du type de fichier (images + vidéos)
    console.log('🔍 Validation du type de fichier...');
    const isValidImage = isValidImageType(file.name);
    const isValidVideo = file.type.startsWith('video/') ||
                        file.name.match(/\.(mp4|webm|ogg|mov|avi|mkv|gif)$/i);

    if (!isValidImage && !isValidVideo) {
      console.log('❌ Type de fichier non supporté:', file.name);
      return NextResponse.json(
        { error: 'Type de fichier non supporté. Utilisez JPG, PNG, GIF, WebP, SVG, MP4, WebM, OGG, MOV, AVI, MKV.' },
        { status: 400 }
      );
    }
    console.log('✅ Type de fichier valide');

    // Validation de la taille du fichier
    console.log('🔍 Validation de la taille du fichier...');
    const maxSize = isValidVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024; // 100MB pour vidéos, 5MB pour images
    if (!isValidFileSize(file.size, file.name)) {
      console.log('❌ Fichier trop volumineux:', file.size);
      const maxSizeMB = maxSize / (1024 * 1024);
      return NextResponse.json(
        { error: `Fichier trop volumineux. Taille maximum : ${maxSizeMB}MB.` },
        { status: 400 }
      );
    }
    console.log('✅ Taille de fichier valide');

    // Convertir le fichier en buffer
    console.log('🔄 Conversion en buffer...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log('✅ Buffer créé, taille:', buffer.length);

    // Générer un nom de fichier unique avec le préfixe du composant
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${componentId}-${fieldId}-${timestamp}-${randomString}.${fileExtension}`;
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

    console.log(`✅ Média uploadé avec succès: ${uploadResult.imageUrl}`);

    return NextResponse.json({
      imageUrl: uploadResult.imageUrl,
      success: true
    });

  } catch (error) {
    console.error('❌ Erreur lors du téléchargement:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'Pas de stack trace');
    return NextResponse.json(
      { error: 'Erreur lors du téléchargement du média' },
      { status: 500 }
    );
  }
}
