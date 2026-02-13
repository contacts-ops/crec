import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Entreprise } from '@/lib/models/Entreprise';
import { uploadImageToS3 } from '@/lib/s3';

// POST - Upload de fichiers
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const field = formData.get('field') as string;
    const siteId = formData.get('siteId') as string;

    if (!file || !field || !siteId) {
      return NextResponse.json(
        { message: 'Fichier, champ ou siteId manquant' },
        { status: 400 }
      );
    }

    // Validation du type de fichier
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedDocumentTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    
    let allowedTypes: string[] = [];
    
    switch (field) {
      case 'photo':
      case 'logo':
      case 'cachetSignature':
        allowedTypes = allowedImageTypes;
        break;
      case 'kbis':
      case 'agrementPrefectoral':
        allowedTypes = allowedDocumentTypes;
        break;
      default:
        return NextResponse.json(
          { message: 'Type de fichier non autorisé' },
          { status: 400 }
        );
    }

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: `Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validation de la taille (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: 'Fichier trop volumineux. Taille maximale: 5MB' },
        { status: 400 }
      );
    }

    // Convertir le fichier en buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${field}_${timestamp}.${fileExtension}`;
    const s3Key = `entreprise/${siteId}/${fileName}`;

    // Upload vers S3
    const uploadResult = await uploadImageToS3(buffer, s3Key, file.type);
    
    if (!uploadResult.success || !uploadResult.imageUrl) {
      return NextResponse.json(
        { message: `Erreur lors de l'upload vers S3: ${uploadResult.error || 'Erreur inconnue'}` },
        { status: 500 }
      );
    }
    
    const s3Url = uploadResult.imageUrl;

    // Connecter à la base de données
    await connectToDatabase();

    // Mettre à jour l'entreprise avec l'URL S3
    const entreprise = await Entreprise.findOneAndUpdate(
      { siteId: siteId },
      { [field]: s3Url },
      { new: true, upsert: true }
    );

    if (!entreprise) {
      return NextResponse.json(
        { message: 'Erreur lors de la mise à jour de l\'entreprise' },
        { status: 500 }
      );
    }

    console.log(`Fichier ${field} uploadé avec succès pour le site ${siteId}:`, s3Url);

    return NextResponse.json({ 
      url: s3Url,
      message: 'Fichier uploadé avec succès'
    });

  } catch (error) {
    console.error('Erreur upload:', error);
    return NextResponse.json(
      { message: 'Erreur lors de l\'upload' },
      { status: 500 }
    );
  }
} 