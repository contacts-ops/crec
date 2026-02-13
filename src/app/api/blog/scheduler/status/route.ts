import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { BlogScheduler } from '@/lib/models/BlogScheduler';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId') || '';
    if (!siteId) {
      return NextResponse.json({ error: 'siteId requis' }, { status: 400 });
    }

    await connectToDatabase();

    const scheduler = await BlogScheduler.findOne({ siteId });
    if (!scheduler) {
      return NextResponse.json({ isActive: false, totalExecutions: 0 });
    }

    // Si la prochaine exécution est passée, recalculer la prochaine sans incrémenter les compteurs
    if (scheduler.isActive && scheduler.nextExecution) {
      const now = new Date();
      if (scheduler.nextExecution <= now) {
        const [hours, minutes] = String(scheduler.time || '09:00').split(':').map((n: string) => parseInt(n, 10));
        const computeNext = (frequency: 'daily' | 'weekly', dayOfWeek?: string): Date => {
          const base = new Date(now);
          base.setSeconds(0, 0);
          base.setHours(hours, minutes, 0, 0);
          if (frequency === 'daily') {
            // passer au prochain jour à l'heure fixée
            if (base <= now) base.setDate(base.getDate() + 1);
          } else if (frequency === 'weekly' && dayOfWeek) {
            const dayMap: { [key: string]: number } = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
            const target = dayMap[dayOfWeek];
            let diff = (target - base.getDay() + 7) % 7;
            if (diff === 0 && base <= now) diff = 7;
            base.setDate(base.getDate() + diff);
          }
          return base;
        };
        scheduler.nextExecution = computeNext(scheduler.frequency as any, scheduler.dayOfWeek as any);
        await scheduler.save();
      }
    }

    // Si aucune nextExecution n'est encore définie mais le scheduler est actif, l'initialiser
    if (scheduler.isActive && !scheduler.nextExecution) {
      const now = new Date();
      const [hours, minutes] = String(scheduler.time || '09:00').split(':').map((n: string) => parseInt(n, 10));
      const computeInitialNext = (frequency: 'daily' | 'weekly', dayOfWeek?: string): Date => {
        const base = new Date(now);
        base.setSeconds(0, 0);
        base.setHours(hours, minutes, 0, 0);
        if (frequency === 'daily') {
          if (base <= now) base.setDate(base.getDate() + 1);
        } else if (frequency === 'weekly' && dayOfWeek) {
          const dayMap: { [key: string]: number } = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
          const target = dayMap[dayOfWeek];
          let diff = (target - base.getDay() + 7) % 7;
          if (diff === 0 && base <= now) diff = 7;
          base.setDate(base.getDate() + diff);
        }
        return base;
      };
      scheduler.nextExecution = computeInitialNext(scheduler.frequency as any, scheduler.dayOfWeek as any);
      await scheduler.save();
    }

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
    console.error('Erreur statut scheduler:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

 
