import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Site } from '@/lib/models/Site';
import { hashKey, encryptKey } from '@/lib/utils/crypto';
import Stripe from 'stripe';

// POST - Sauvegarder la configuration Stripe
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { 
      siteId, 
      stripePublicKey, 
      stripeSecretKey, 
      webhookSecret, 
      isTestMode 
    } = body;
    
    if (!siteId || !stripePublicKey || !stripeSecretKey) {
      return NextResponse.json(
        { error: 'siteId, stripePublicKey et stripeSecretKey sont requis' },
        { status: 400 }
      );
    }

    // Tester la connexion Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-06-30.basil',
    });

    try {
      // Tester la connexion en récupérant le compte
      await stripe.accounts.retrieve();
    } catch (error) {
      return NextResponse.json(
        { error: 'Clés Stripe invalides. Vérifiez vos clés API.' },
        { status: 400 }
      );
    }

    // Préparer la configuration Stripe (les clés seront hashées par l'API générale)
    const stripeConfig = {
      publicKey: stripePublicKey,
      secretKey: stripeSecretKey,
      webhookSecret,
      isTestMode,
      isConfigured: true
    };

    // Utiliser l'API générale pour sauvegarder la configuration Stripe
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sharedServices/site-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        siteId,
        configType: 'stripe',
        configData: stripeConfig
      }),
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la sauvegarde de la configuration');
    }

    const data = await response.json();
    console.log(`✅ Configuration Stripe sauvegardée pour siteId ${siteId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Configuration Stripe sauvegardée avec succès',
      config: {
        siteId: siteId,
        isTestMode: stripeConfig.isTestMode,
        isConfigured: stripeConfig.isConfigured
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de la configuration Stripe:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde de la configuration' },
      { status: 500 }
    );
  }
}

// GET - Récupérer la configuration Stripe
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    
    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId est requis' },
        { status: 400 }
      );
    }

    const config = await Site.findOne({ siteId });
    
    if (!config || !config.stripe) {
      return NextResponse.json({
        success: true,
        config: {
          isConfigured: false,
          isTestMode: true
        }
      });
    }

    return NextResponse.json({
      success: true,
      config: {
        isConfigured: config.stripe.isConfigured,
        isTestMode: config.stripe.isTestMode
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la configuration Stripe:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la configuration' },
      { status: 500 }
    );
  }
} 