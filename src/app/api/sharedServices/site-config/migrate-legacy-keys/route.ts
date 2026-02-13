import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Site } from '@/lib/models/Site';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { siteId } = await request.json();
    if (!siteId) return NextResponse.json({ error: 'siteId requis' }, { status: 400 });

    const site = await Site.findOne({ siteId });
    if (!site) return NextResponse.json({ error: 'site introuvable' }, { status: 404 });

    const legacyPublic: string = (site.stripe as any)?.publicKey || '';
    const legacySecret: string = (site.stripe as any)?.secretKey || '';
    const legacyWebhook: string | undefined = (site.stripe as any)?.webhookSecret || undefined;

    const update: Record<string, unknown> = {};
    if (legacyPublic) {
      if (legacyPublic.startsWith('pk_live_')) update['stripe.livePublicKey'] = legacyPublic;
      if (legacyPublic.startsWith('pk_test_')) update['stripe.testPublicKey'] = legacyPublic;
    }
    if (legacySecret) {
      if (legacySecret.startsWith('sk_live_')) update['stripe.liveSecretKey'] = legacySecret;
      if (legacySecret.startsWith('sk_test_')) update['stripe.testSecretKey'] = legacySecret;
    }
    if (legacyWebhook) {
      // webhooks peuvent être distincts; on ne peut pas distinguer test/live facilement, on copie sur les deux si absents
    }

    // Assurer présence des champs même si vides
    update['stripe.testPublicKey'] = (update['stripe.testPublicKey'] as string) || (site as any)?.stripe?.testPublicKey || '';
    update['stripe.testSecretKey'] = (update['stripe.testSecretKey'] as string) || (site as any)?.stripe?.testSecretKey || '';
    update['stripe.livePublicKey'] = (update['stripe.livePublicKey'] as string) || (site as any)?.stripe?.livePublicKey || '';
    update['stripe.liveSecretKey'] = (update['stripe.liveSecretKey'] as string) || (site as any)?.stripe?.liveSecretKey || '';

    await Site.updateOne({ siteId }, { $set: update });

    const refreshed = await Site.findOne({ siteId });
    return NextResponse.json({ success: true, stripe: refreshed?.stripe });
  } catch (error) {
    console.error('❌ migrate-legacy-keys error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


