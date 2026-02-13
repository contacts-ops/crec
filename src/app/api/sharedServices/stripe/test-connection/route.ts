import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// POST - Tester la connexion Stripe
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stripeSecretKey, isTestMode } = body;
    
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'stripeSecretKey est requis' },
        { status: 400 }
      );
    }

    // Créer l'instance Stripe avec la clé fournie
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-06-30.basil',
    });

    try {
      // Tester la connexion en récupérant le compte
      const account = await stripe.accounts.retrieve();
      
      console.log(`✅ Connexion Stripe testée avec succès pour le compte:`, account.id);
      
      return NextResponse.json({
        success: true,
        message: 'Connexion Stripe testée avec succès',
        account: {
          id: account.id,
          business_type: account.business_type,
          country: account.country,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled
        },
        isTestMode
      });

    } catch (error) {
      console.error('❌ Erreur lors du test de connexion Stripe:', error);
      
      if (error instanceof Stripe.errors.StripeError) {
        return NextResponse.json(
          { error: `Erreur Stripe: ${error.message}` },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Clés Stripe invalides. Vérifiez vos clés API.' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Erreur lors du test de connexion:', error);
    return NextResponse.json(
      { error: 'Erreur lors du test de connexion' },
      { status: 500 }
    );
  }
} 