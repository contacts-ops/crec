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

    const scheduler = await BlogScheduler.findOne({ siteId });
    if (!scheduler || !scheduler.isActive) {
      return NextResponse.json({ success: false, error: 'Scheduler inactif' }, { status: 400 });
    }

    // Préparer les mots-clés
    const allKeywords = String(scheduler.keywords || '')
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    if (allKeywords.length === 0) {
      return NextResponse.json({ error: 'Aucun mot-clé configuré' }, { status: 400 });
    }
    const numKeywords = Math.min(3, Math.max(2, Math.floor(Math.random() * 3))); // 2 ou 3
    const shuffled = [...allKeywords].sort(() => Math.random() - 0.5);
    const selectedKeywords = shuffled.slice(0, numKeywords);

    // Générer l'article
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const generateResponse = await fetch(`${baseUrl}/api/blog/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords: selectedKeywords,
        siteId,
        tone: scheduler.tone,
        length: scheduler.length
      })
    });
    if (!generateResponse.ok) {
      const errorData = await generateResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erreur lors de la génération');
    }
    const generateResult = await generateResponse.json();
    if (!generateResult?.success || !generateResult?.article) {
      throw new Error('Réponse de génération invalide');
    }

    // Créer l'article
    const createResponse = await fetch(`${baseUrl}/api/blog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: generateResult.article.title,
        content: generateResult.article.content,
        keywords: generateResult.article.keywords,
        image: generateResult.article.imageUrl,
        siteId
      })
    });
    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erreur lors de la création de l\'article');
    }
    const created = await createResponse.json();

    // Mettre à jour le scheduler (dates + compteur)
    const computeNext = (frequency: 'daily' | 'weekly', time: string, dayOfWeek?: string): Date => {
      const now = new Date();
      const [hours, minutes] = time.split(':').map(Number);
      const next = new Date(now);
      next.setSeconds(0, 0);
      next.setHours(hours, minutes, 0, 0);
      if (frequency === 'daily') {
        next.setDate(next.getDate() + 1);
      } else if (frequency === 'weekly' && dayOfWeek) {
        const dayMap: { [key: string]: number } = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
        const target = dayMap[dayOfWeek];
        let diff = (target - next.getDay() + 7) % 7;
        if (diff === 0) diff = 7;
        next.setDate(next.getDate() + diff);
      }
      return next;
    };

    scheduler.lastExecution = new Date();
    scheduler.totalExecutions = (scheduler.totalExecutions || 0) + 1;
    scheduler.nextExecution = computeNext(scheduler.frequency as any, scheduler.time, scheduler.dayOfWeek);
    await scheduler.save();

    return NextResponse.json({ success: true, article: created });
  } catch (error) {
    console.error('Erreur execute scheduler:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur serveur' }, { status: 500 });
  }
}

 
