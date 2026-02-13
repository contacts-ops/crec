import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Site } from '@/lib/models/Site';

export async function POST(
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

    // Utiliser le projet PostHog existant depuis les variables d'environnement
    const projectId = process.env.POSTHOG_PROJECT_ID;
    const publicKey = process.env.POSTHOG_PUBLIC_KEY;
    
    if (!projectId || !publicKey) {
      return NextResponse.json({ 
        error: 'Config PostHog manquante (POSTHOG_PROJECT_ID/POSTHOG_PUBLIC_KEY)' 
      }, { status: 500 });
    }

    // Vérifier si ce site est déjà configuré
    if (site.analytics?.posthog?.isConfigured) {
      return NextResponse.json({ 
        success: true, 
        projectId: site.analytics.posthog.projectId, 
        publicKey: site.analytics.posthog.publicKey,
        message: 'PostHog déjà configuré pour ce site'
      });
    }

    // Configurer ce site avec le projet PostHog existant
    site.analytics = site.analytics || {};
    site.analytics.posthog = {
      projectId,
      publicKey,
      isConfigured: true,
    };
    site.lastUpdated = new Date();
    await site.save();

    return NextResponse.json({ 
      success: true, 
      projectId, 
      publicKey,
      message: 'Site configuré avec le projet PostHog existant'
    });
  } catch (error) {
    console.error('❌ Erreur lors de la configuration PostHog:', error);
    return NextResponse.json({ error: 'Erreur lors de la configuration PostHog' }, { status: 500 });
  }
}


