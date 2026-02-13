import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { BlogScheduler } from '@/lib/models/BlogScheduler';

function computeNextExecution(frequency: 'daily' | 'weekly', time: string, dayOfWeek?: string): Date {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(hours, minutes, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  if (frequency === 'weekly' && dayOfWeek) {
    const dayMap: { [key: string]: number } = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6,
    };
    const target = dayMap[dayOfWeek];
    let diff = (target - next.getDay() + 7) % 7;
    if (diff === 0 && next <= now) diff = 7;
    next.setDate(next.getDate() + diff);
  }
  return next;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, isActive, frequency, time, dayOfWeek, keywords, tone, length } = body || {};
    if (!siteId || !keywords || !time || !frequency) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    await connectToDatabase();

    const nextExecution = computeNextExecution(frequency, time, dayOfWeek);

    const scheduler = await BlogScheduler.findOneAndUpdate(
      { siteId },
      {
        siteId,
        isActive: true,
        frequency,
        time,
        dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
        keywords,
        tone,
        length,
        nextExecution,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      isActive: scheduler.isActive,
      nextExecution: scheduler.nextExecution?.toISOString(),
      lastExecution: scheduler.lastExecution?.toISOString(),
      totalExecutions: scheduler.totalExecutions || 0,
      config: {
        frequency: scheduler.frequency,
        time: scheduler.time,
        dayOfWeek: scheduler.dayOfWeek,
        keywords: scheduler.keywords,
        tone: scheduler.tone,
        length: scheduler.length,
      },
    });
  } catch (error) {
    console.error('Erreur start scheduler:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

