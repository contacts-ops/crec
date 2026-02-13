import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Site } from '@/lib/models/Site';
import { getStripeKeysFromDatabase } from '@/lib/utils/stripeKeys';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    
    await connectToDatabase();
    
    // Récupérer les clés Stripe pour le site
    const stripeKeys = await getStripeKeysFromDatabase(siteId);
    
    if (!stripeKeys.stripePublishableKey) {
      return NextResponse.json({ 
        error: 'Configuration Stripe non trouvée pour ce site' 
      }, { status: 404 });
    }

    return NextResponse.json({
      stripePublishableKey: stripeKeys.stripePublishableKey
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des clés Stripe:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur' 
    }, { status: 500 });
  }
}
