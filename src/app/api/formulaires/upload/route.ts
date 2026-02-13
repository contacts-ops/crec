import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Vérifier la taille du fichier (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Le fichier est trop volumineux. Taille maximale : 10MB' },
        { status: 400 }
      );
    }

    // Vérifier le type de fichier
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé' },
        { status: 400 }
      );
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const originalName = file.name;
    const extension = path.extname(originalName);
    const fileName = `${timestamp}_${originalName}`;

    // Chemin vers le dossier des documents
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
    const filePath = path.join(uploadDir, fileName);

    // Créer le dossier s'il n'existe pas
    await mkdir(uploadDir, { recursive: true });

    // Convertir le fichier en buffer et l'écrire
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    console.log('Fichier uploadé avec succès:', fileName);

    return NextResponse.json({
      success: true,
      fileName: fileName,
      fileUrl: `/uploads/documents/${fileName}`,
      originalName: originalName,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload du fichier' },
      { status: 500 }
    );
  }
} 