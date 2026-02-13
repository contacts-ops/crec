import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Media } from '@/lib/models/Media';
import { Site } from '@/lib/models/Site';
import jwt from 'jsonwebtoken';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {

    const body = await request.json();
    const {siteId} = body || await params;

    // Vérifier que l'utilisateur a accès au site
    await connectToDatabase();
    const site = await Site.findOne({ siteId });
    if (!site) {
      console.warn("⚠️ Site non trouvé");
      return NextResponse.json(
        { error: 'Site non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer les paramètres de filtrage
    const { searchParams } = new URL(request.url);
    const mediaType = searchParams.get('mediaType'); // 'image' ou 'video'
    const componentId = searchParams.get('componentId');
    const pageId = searchParams.get('pageId');
    const isActive = searchParams.get('isActive'); // 'true' ou 'false'
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Construire la requête de filtrage
    const filter: any = { siteId };
    
    if (mediaType) {
      filter.mediaType = mediaType;
    }
    
    if (componentId) {
      filter.componentId = componentId;
    }
    
    if (pageId) {
      filter.pageId = pageId;
    }
    
    if (isActive !== null) {
      filter.isActive = isActive === 'true';
    }

    // Récupérer les médias avec pagination
    // Utilise une agrégation pour pousser les éléments sans position à la fin
    const media = await Media.aggregate([
      { $match: filter },
      { $addFields: { __positionEff: { $ifNull: ['$position', 999999999] } } },
      { $sort: { __positionEff: 1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { __positionEff: 0 } }
    ]);

    // Compter le total pour la pagination
    const total = await Media.countDocuments(filter);

    return NextResponse.json({
      success: true,
      media,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("❌ Erreur lors de la récupération des médias:", error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des médias' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const body = await request.json();
    const {siteId} = body || await params;

    const token = request.cookies.get('utilisateur_token')?.value;
    if (!token) {
      console.warn("⚠️ Token manquant");
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Vérifier le token
    let decoded: { sub: string; role: string; [key: string]: unknown };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string; role: string; [key: string]: unknown };
    } catch (error) {
      console.error("❌ Erreur de vérification du token:", error);
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur a accès au site
    await connectToDatabase();
    const site = await Site.findOne({ siteId });
    if (!site) {
      console.warn("⚠️ Site non trouvé");
      return NextResponse.json(
        { error: 'Site non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier les permissions (propriétaire ou utilisateur autorisé)
    const hasAccess = decoded.role === "admin" || decoded.role === "developer" ;
    
    if (!hasAccess) {
      console.warn("⚠️ Accès refusé au site");
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      );
    }

    
    const { mediaIds } = body;

    if (!mediaIds || !Array.isArray(mediaIds)) {
      return NextResponse.json(
        { error: 'Liste des IDs de médias requise' },
        { status: 400 }
      );
    }

    // Supprimer les médias spécifiés
    const result = await Media.deleteMany({
      _id: { $in: mediaIds },
      siteId // Sécurité supplémentaire
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error("❌ Erreur lors de la suppression des médias:", error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression des médias' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const body = await request.json();
    const { siteId } = body || await params;

    // Auth
    const token = request.cookies.get('utilisateur_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    let decoded: { sub: string; role: string; [key: string]: unknown };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string; role: string; [key: string]: unknown };
    } catch {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
    }

    await connectToDatabase();
    const site = await Site.findOne({ siteId });
    if (!site) {
      return NextResponse.json({ error: 'Site non trouvé' }, { status: 404 });
    }

    const hasAccess = decoded.role === "admin" || decoded.role === "developer" ;
    if (!hasAccess) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { 
      mediaId, 
      isActive, 
      title, 
      description, 
      mediaUrl, 
      fileName, 
      fileSize, 
      mimeType 
    } = body as { 
      mediaId?: string; 
      isActive?: boolean; 
      title?: string; 
      description?: string;
      mediaUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
    };
    if (!mediaId) {
      return NextResponse.json({ error: 'mediaId est requis' }, { status: 400 });
    }

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof isActive === 'boolean') update.isActive = isActive;
    if (typeof title === 'string') update.title = title;
    if (typeof description === 'string') update.description = description;
    
    // Mise à jour du fichier média si fourni
    if (typeof mediaUrl === 'string') update.mediaUrl = mediaUrl;
    if (typeof fileName === 'string') update.fileName = fileName;
    if (typeof fileSize === 'number') update.fileSize = fileSize;
    if (typeof mimeType === 'string') {
      update.mimeType = mimeType;
      // Déterminer le type de média basé sur le mimeType
      const isVideo = mimeType.startsWith('video/');
      update.mediaType = isVideo ? 'video' : 'image';
    }

    if (Object.keys(update).length === 1) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
    }

    const updated = await Media.findOneAndUpdate(
      { _id: mediaId, siteId },
      { $set: update },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: 'Média non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ success: true, media: updated });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du média:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du média' }, { status: 500 });
  }
}