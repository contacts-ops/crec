import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Abonnement } from '@/lib/models/Abonnement';
import { Site } from '@/lib/models/Site';
import Stripe from 'stripe';

// GET - Diagnostiquer les prix Stripe inactifs
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

    // Récupérer la configuration Stripe
    const siteConfig = await Site.findOne({ siteId });
    
    if (!siteConfig || !siteConfig.stripe || !siteConfig.stripe.isConfigured) {
      return NextResponse.json(
        { error: 'Configuration Stripe non trouvée pour ce site' },
        { status: 400 }
      );
    }

    const stripe = new Stripe(siteConfig.stripe.secretKey, {
      apiVersion: '2025-07-30.basil',
    });

    // Récupérer tous les abonnements avec des IDs Stripe
    const abonnements = await Abonnement.find({ 
      siteId,
      stripePriceId: { $exists: true, $ne: null }
    });

    const diagnostics = [];

    for (const abonnement of abonnements) {
      if (!abonnement.stripePriceId) continue;
      
      try {
        const price = await stripe.prices.retrieve(abonnement.stripePriceId);
        
        diagnostics.push({
          abonnementId: abonnement._id,
          nom: abonnement.nom,
          stripePriceId: abonnement.stripePriceId,
          prix: abonnement.prix,
          duree: abonnement.duree,
          priceActive: price.active,
          priceDeleted: price.deleted,
          priceAmount: price.unit_amount,
          priceInterval: price.recurring?.interval,
          priceIntervalCount: price.recurring?.interval_count,
          status: price.active && !price.deleted ? 'OK' : 'INACTIF'
        });
      } catch (error) {
        diagnostics.push({
          abonnementId: abonnement._id,
          nom: abonnement.nom,
          stripePriceId: abonnement.stripePriceId,
          prix: abonnement.prix,
          duree: abonnement.duree,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          status: 'ERREUR'
        });
      }
    }

    return NextResponse.json({
      success: true,
      siteId,
      totalAbonnements: abonnements.length,
      diagnostics
    });

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic des prix Stripe:', error);
    return NextResponse.json(
      { error: 'Erreur lors du diagnostic des prix Stripe' },
      { status: 500 }
    );
  }
}

// POST - Corriger les prix Stripe inactifs
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { siteId, abonnementId } = body;
    
    if (!siteId || !abonnementId) {
      return NextResponse.json(
        { error: 'siteId et abonnementId sont requis' },
        { status: 400 }
      );
    }

    // Récupérer la configuration Stripe
    const siteConfig = await Site.findOne({ siteId });
    
    if (!siteConfig || !siteConfig.stripe || !siteConfig.stripe.isConfigured) {
      return NextResponse.json(
        { error: 'Configuration Stripe non trouvée pour ce site' },
        { status: 400 }
      );
    }

    // Récupérer l'abonnement
    const abonnement = await Abonnement.findById(abonnementId);
    
    if (!abonnement) {
      return NextResponse.json(
        { error: 'Abonnement non trouvé' },
        { status: 404 }
      );
    }

    const stripe = new Stripe(siteConfig.stripe.secretKey, {
      apiVersion: '2025-07-30.basil',
    });

    // Fonction helper pour obtenir l'interval_count Stripe
    function getStripeIntervalCount(duree: string | undefined): number {
      switch (duree) {
        case 'annuel':
          return 1;
        case 'semestriel':
          return 6;
        case 'trimestriel':
          return 3;
        case 'mensuel':
        default:
          return 1;
      }
    }

    // Fonction helper pour convertir les durées en intervalles Stripe
    function getStripeInterval(duree: string | undefined): 'month' | 'year' {
      switch (duree) {
        case 'annuel':
          return 'year';
        case 'semestriel':
        case 'trimestriel':
        case 'mensuel':
        default:
          return 'month';
      }
    }

    // Créer un nouveau prix actif
    const newPrice = await stripe.prices.create({
      product: abonnement.stripeProductId,
      unit_amount: Math.round((abonnement.prix || 0) * 100),
      currency: 'eur',
      recurring: {
        interval: getStripeInterval(abonnement.duree),
        interval_count: getStripeIntervalCount(abonnement.duree)
      },
      metadata: {
        siteId: siteId,
        abonnementId: abonnementId
      }
    });

    // Mettre à jour l'abonnement avec le nouveau prix
    const updatedAbonnement = await Abonnement.findByIdAndUpdate(
      abonnementId,
      {
        stripePriceId: newPrice.id,
        updatedAt: new Date()
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Prix Stripe corrigé avec succès',
      abonnement: updatedAbonnement,
      newPriceId: newPrice.id
    });

  } catch (error) {
    console.error('❌ Erreur lors de la correction du prix Stripe:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la correction du prix Stripe' },
      { status: 500 }
    );
  }
}
