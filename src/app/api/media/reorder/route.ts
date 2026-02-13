import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Media } from '@/lib/models/Media';
import mongoose from 'mongoose';
import { Site } from '@/lib/models/Site';
import jwt from 'jsonwebtoken';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const body = await request.json();
    const routeParams = await params;
    const siteId = (body?.siteId as string | undefined) ?? routeParams.siteId;

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

    const hasAccess = decoded.role === 'admin' || decoded.role === 'developer';
    if (!hasAccess) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { orderedIds, baseIndex } = body as { orderedIds?: string[]; baseIndex?: number };
    if (!orderedIds || !Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: 'orderedIds est requis' }, { status: 400 });
    }

    // Mettre à jour la position pour chaque média, en conservant le siteId comme garde-fou
    const start = Number.isFinite(baseIndex) ? Number(baseIndex) : 0;
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id), siteId },
        update: { $set: { position: start + index, updatedAt: new Date() } },
      },
    }));

    if (bulkOps.length > 0) {
      await Media.bulkWrite(bulkOps);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur lors du réordonnancement des médias:', error);
    return NextResponse.json({ error: 'Erreur lors du réordonnancement des médias' }, { status: 500 });
  }
}


