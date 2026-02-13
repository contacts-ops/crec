import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Site } from '@/lib/models/Site';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { siteId } = await request.json();
    if (!siteId) {
      return NextResponse.json({ error: 'siteId requis' }, { status: 400 });
    }

    // Assurer la présence des champs test/live (même vides)
    const update: Record<string, unknown> = {
      'stripe.testPublicKey': '',
      'stripe.testSecretKey': '',
      'stripe.livePublicKey': '',
      'stripe.liveSecretKey': '',
    };

    const result = await Site.updateOne({ siteId }, { $set: update });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('❌ ensure-stripe-fields error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


