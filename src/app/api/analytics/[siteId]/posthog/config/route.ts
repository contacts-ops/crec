import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Site } from '@/lib/models/Site';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  try {
    await connectToDatabase();

    const { siteId } = await context.params;
    const site = await Site.findOne({ siteId });
    if (!site) {
      return NextResponse.json({ error: 'Site non trouvé' }, { status: 404 });
    }

    const posthog = site.analytics?.posthog || { isConfigured: false };

    return NextResponse.json({
      isConfigured: !!posthog?.isConfigured && !!posthog?.publicKey,
      publicKey: posthog?.publicKey || process.env.POSTHOG_PUBLIC_KEY || null,
      projectId: posthog?.projectId || process.env.POSTHOG_PROJECT_ID || null,
      host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la config PostHog:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la configuration' },
      { status: 500 }
    );
  }
}


