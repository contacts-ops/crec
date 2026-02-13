import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Abonnement } from '@/lib/models/Abonnement';
import { Site } from '@/lib/models/Site';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { siteId } = await request.json();
    if (!siteId) return NextResponse.json({ error: 'siteId requis' }, { status: 400 });

    const site = await Site.findOne({ siteId });
    const defaultMode: 'test' | 'live' = site?.stripe?.isTestMode === false ? 'live' : 'test';

    const abonnements = await Abonnement.find({ siteId });
    let updated = 0;
    for (const ab of abonnements) {
      const hasTest = Boolean((ab as any).stripeProductIdTest || (ab as any).stripePriceIdTest);
      const hasLive = Boolean((ab as any).stripeProductIdLive || (ab as any).stripePriceIdLive);
      let stripeMode: 'test' | 'live' = defaultMode;
      if (hasTest && !hasLive) stripeMode = 'test';
      if (hasLive && !hasTest) stripeMode = 'live';

      if ((ab as any).stripeMode !== stripeMode) {
        await Abonnement.updateOne({ _id: ab._id }, { $set: { stripeMode } });
        updated += 1;
      }
    }

    return NextResponse.json({ success: true, updated, total: abonnements.length, modeDefault: defaultMode });
  } catch (error) {
    console.error('❌ migrate-stripe-mode error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


