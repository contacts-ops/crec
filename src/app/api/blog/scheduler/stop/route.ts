import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { BlogScheduler } from '@/lib/models/BlogScheduler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId } = body || {};
    if (!siteId) {
      return NextResponse.json({ error: 'siteId requis' }, { status: 400 });
    }

    await connectToDatabase();

    await BlogScheduler.findOneAndUpdate(
      { siteId },
      { isActive: false },
      { new: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur stop scheduler:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

 
