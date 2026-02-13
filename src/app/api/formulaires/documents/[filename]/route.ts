import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = decodeURIComponent(params.filename);
    
    // Chemin vers le dossier des documents uploadés
    const documentsDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
    const filePath = path.join(documentsDir, filename);
    
    // Vérifier que le fichier existe
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error('❌ Fichier non trouvé:', filePath);
      return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 });
    }
    
    // Lire le fichier
    const fileBuffer = await fs.readFile(filePath);
    
    // Déterminer le type MIME basé sur l'extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
    }
    
    // Retourner le fichier avec les bons headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600', // Cache pendant 1 heure
      },
    });
    
  } catch (error) {
    console.error('❌ Erreur lors du service du document:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
