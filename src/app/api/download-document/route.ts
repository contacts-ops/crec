import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('url');
    const fileName = searchParams.get('fileName');

    if (!fileUrl) {
      return NextResponse.json({ error: 'URL manquante' }, { status: 400 });
    }

    console.log('📥 Téléchargement document:', { fileUrl, fileName });

    // Récupérer le fichier depuis l'URL
    const response = await fetch(fileUrl, {
      headers: {
        'Accept': '*/*',
      }
    });

    if (!response.ok) {
      console.error('❌ Erreur lors de la récupération du fichier:', response.status);
      return NextResponse.json({ error: 'Impossible de récupérer le fichier' }, { status: 500 });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Déterminer le nom de fichier
    let finalFileName = fileName || 'document';
    
    // Si pas d'extension, essayer de la déduire du content-type
    if (!finalFileName.includes('.')) {
      const extension = contentType.includes('pdf') ? '.pdf' :
                       contentType.includes('image/jpeg') ? '.jpg' :
                       contentType.includes('image/png') ? '.png' :
                       contentType.includes('image/gif') ? '.gif' :
                       contentType.includes('image/webp') ? '.webp' :
                       '.bin';
      finalFileName += extension;
    }

    console.log('✅ Document téléchargé:', { finalFileName, contentType, size: buffer.byteLength });

    // Retourner le fichier avec les headers appropriés pour forcer le téléchargement
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${finalFileName}"`,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('❌ Erreur lors du téléchargement:', error);
    return NextResponse.json({ error: 'Erreur lors du téléchargement' }, { status: 500 });
  }
}
