import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Abonnement } from '@/lib/models/Abonnement';
import { Site } from '@/lib/models/Site';
import { verifyKey, decryptKey } from '@/lib/utils/crypto';
import Stripe from 'stripe';

// Fonction helper pour convertir les durées en intervalles Stripe
function getStripeInterval(duree: string | undefined): 'month' | 'year' {
  switch (duree) {
    case 'annuel':
      return 'year';
    case 'semestriel':
      return 'month'; // Stripe ne supporte pas 6 mois directement, on utilisera month avec interval_count: 6
    case 'trimestriel':
      return 'month'; // Stripe ne supporte pas 3 mois directement, on utilisera month avec interval_count: 3
    case 'mensuel':
    default:
      return 'month';
  }
}

// Fonction helper pour obtenir l'interval_count Stripe
function getStripeIntervalCount(duree: string | undefined): number {
  switch (duree) {
    case 'annuel':
      return 1;
    case 'semestriel':
      return 6; // 6 mois
    case 'trimestriel':
      return 3; // 3 mois
    case 'mensuel':
    default:
      return 1;
  }
}

// POST - Créer un produit Stripe à partir d'un abonnement
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { abonnementId, siteId, useStoredKeys, providedStripeSecretKey, stripeSecretKey: providedKey, mode } = body;
    
    if (!abonnementId || !siteId) {
      return NextResponse.json(
        { error: 'abonnementId et siteId sont requis' },
        { status: 400 }
      );
    }

    // Récupérer la configuration Stripe depuis la base de données
    const siteConfig = await Site.findOne({ siteId });
    
    if (!siteConfig || !siteConfig.stripe || !siteConfig.stripe.isConfigured) {
      return NextResponse.json(
        { error: 'Configuration Stripe non trouvée. Veuillez configurer Stripe d\'abord.' },
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

    let stripeSecretKey;

    if (useStoredKeys) {
      // Choisir la clé selon le mode courant
      const isTest = typeof mode === 'string' ? mode === 'test' : (siteConfig.stripe?.isTestMode ?? true);
      const secret = isTest ? (siteConfig.stripe?.testSecretKey || siteConfig.stripe?.secretKey) : (siteConfig.stripe?.liveSecretKey);
      if (!secret) {
        return NextResponse.json(
          { error: 'Clé secrète Stripe non trouvée pour le mode sélectionné' },
          { status: 400 }
        );
      }
      stripeSecretKey = secret;
    } else {
      // Méthode avec validation de clé fournie
      const secretKeyToUse = providedStripeSecretKey || providedKey;

      if (!secretKeyToUse) {
        return NextResponse.json(
          { error: 'Clé secrète Stripe requise' },
          { status: 400 }
        );
      }

      // Récupérer les clés déchiffrées de manière sécurisée
      const keysResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sharedServices/site-config/get-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId,
          configType: 'stripe',
          providedKeys: {
            secretKey: secretKeyToUse
          }
        }),
      });

      if (!keysResponse.ok) {
        const errorData = await keysResponse.json();
        return NextResponse.json(
          { error: errorData.error || 'Erreur lors de la récupération des clés' },
          { status: keysResponse.status }
        );
      }

      const keysData = await keysResponse.json();
      stripeSecretKey = keysData.keys.secretKey;
    }

    // Créer l'instance Stripe avec les clés déchiffrées
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-08-27.basil',
    });

    // Créer le produit Stripe
    const product = await stripe.products.create({
      name: abonnement.nom,
      description: abonnement.description || `Abonnement ${abonnement.type}`,
      metadata: {
        siteId: siteId,
        abonnementId: abonnementId,
        type: abonnement.type
      }
    });

    // Créer le prix Stripe
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round((abonnement.prix || 0) * 100), // Stripe utilise les centimes
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

    // Mettre à jour l'abonnement avec les IDs Stripe (par mode + legacy)
    const isTest = typeof mode === 'string' ? mode === 'test' : (siteConfig.stripe?.isTestMode ?? true);
    const update: any = {
      updatedAt: new Date(),
      // legacy pour compat
      stripeProductId: product.id,
      stripePriceId: price.id,
    };
    if (isTest) {
      update.stripeProductIdTest = product.id;
      update.stripePriceIdTest = price.id;
    } else {
      update.stripeProductIdLive = product.id;
      update.stripePriceIdLive = price.id;
    }
    const updatedAbonnement = await Abonnement.findByIdAndUpdate(
      abonnementId,
      { ...update, stripeMode: isTest ? 'test' : 'live' },
      { new: true }
    );



    return NextResponse.json({
      success: true,
      abonnement: updatedAbonnement,
      stripeProduct: product,
      stripePrice: price
    });

  } catch (error) {
    console.error('❌ Erreur lors de la création du produit Stripe:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du produit Stripe' },
      { status: 500 }
    );
  }
}

// GET - Récupérer les produits Stripe d'un site
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
      return NextResponse.json([]);
    }

    // Récupérer les abonnements avec les IDs Stripe
    const abonnements = await Abonnement.find({ 
      siteId,
      stripeProductId: { $exists: true, $ne: null }
    });

    // Pour la méthode GET, nous ne pouvons pas récupérer les produits Stripe
    // car nous n'avons pas la clé secrète. Nous retournons juste les abonnements
    // avec leurs IDs Stripe
    const abonnementsWithStripeIds = abonnements.map(abonnement => ({
      abonnement,
      stripeProductId: abonnement.stripeProductId,
      stripePriceId: abonnement.stripePriceId
    }));

    return NextResponse.json(abonnementsWithStripeIds);

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des produits Stripe:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des produits Stripe' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour un produit Stripe
export async function PUT(request: Request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { abonnementId, siteId, stripeSecretKey, useStoredKeys, mode } = body;
    
    if (!abonnementId || !siteId) {
      return NextResponse.json(
        { error: 'abonnementId et siteId sont requis' },
        { status: 400 }
      );
    }

    if (!useStoredKeys && !stripeSecretKey) {
      return NextResponse.json(
        { error: 'stripeSecretKey est requis si useStoredKeys n\'est pas activé' },
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

    if (!abonnement.stripeProductId) {
      return NextResponse.json(
        { error: 'Aucun produit Stripe associé à cet abonnement' },
        { status: 400 }
      );
    }

    // Récupérer la configuration Stripe
    const siteConfig = await Site.findOne({ siteId });
    
    if (!siteConfig || !siteConfig.stripe || !siteConfig.stripe.isConfigured) {
      return NextResponse.json(
        { error: 'Configuration Stripe non trouvée' },
        { status: 400 }
      );
    }

    let validatedSecretKey;

    if (useStoredKeys) {
      const isTest = typeof mode === 'string' ? mode === 'test' : (siteConfig.stripe?.isTestMode ?? true);
      const secret = isTest ? (siteConfig.stripe?.testSecretKey || siteConfig.stripe?.secretKey) : (siteConfig.stripe?.liveSecretKey);
      if (!secret) {
        return NextResponse.json(
          { error: 'Clé secrète Stripe non trouvée pour le mode sélectionné' },
          { status: 400 }
        );
      }
      validatedSecretKey = secret;
    } else {
      // Vérifier la clé secrète avec l'API get-keys
      
      const keysResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sharedServices/site-config/get-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId,
          configType: 'stripe',
          providedKeys: {
            secretKey: stripeSecretKey
          }
        }),
      });

      if (!keysResponse.ok) {
        const errorData = await keysResponse.json();
        return NextResponse.json(
          { error: errorData.error || 'Erreur lors de la vérification de la clé' },
          { status: keysResponse.status }
        );
      }

      const keysData = await keysResponse.json();
      validatedSecretKey = keysData.keys.secretKey;
    }

    // Créer l'instance Stripe avec la clé validée
    const stripe = new Stripe(validatedSecretKey, {
      apiVersion: '2025-08-27.basil',
    });

    // Mettre à jour le produit Stripe
    const product = await stripe.products.update(abonnement.stripeProductId, {
      name: abonnement.nom,
      description: abonnement.description || `Abonnement ${abonnement.type}`,
      metadata: {
        siteId: siteId,
        abonnementId: abonnementId,
        type: abonnement.type
      }
    });

    // Gérer le prix Stripe (créer un nouveau prix ou mettre à jour l'existant)
    let finalPriceId = abonnement.stripePriceId;
    
    if (abonnement.stripePriceId) {
      // L'abonnement a déjà un prix, vérifier s'il faut le mettre à jour
      try {
        const currentPrice = await stripe.prices.retrieve(abonnement.stripePriceId);
        const newPriceAmount = Math.round((abonnement.prix || 0) * 100);
        
        // Vérifier si le prix ou la durée a changé
        const priceChanged = currentPrice.unit_amount !== newPriceAmount;
        const intervalChanged = getStripeInterval(abonnement.duree) !== currentPrice.recurring?.interval || 
                               getStripeIntervalCount(abonnement.duree) !== currentPrice.recurring?.interval_count;
        
                 if (priceChanged || intervalChanged) {
           console.log(`🔄 Création d'un nouveau prix Stripe pour l'abonnement ${abonnement.nom}:`);
           console.log(`   - Ancien prix: ${currentPrice.unit_amount} centimes, interval: ${currentPrice.recurring?.interval}, count: ${currentPrice.recurring?.interval_count}`);
           console.log(`   - Nouveau prix: ${newPriceAmount} centimes, interval: ${getStripeInterval(abonnement.duree)}, count: ${getStripeIntervalCount(abonnement.duree)}`);
           
           // Créer un nouveau prix
           const newPrice = await stripe.prices.create({
             product: product.id,
             unit_amount: newPriceAmount,
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

           console.log(`✅ Nouveau prix créé: ${newPrice.id}`);

           // Archiver l'ancien prix
           await stripe.prices.update(abonnement.stripePriceId, {
             active: false
           });

           console.log(`📝 Ancien prix archivé: ${abonnement.stripePriceId}`);

           finalPriceId = newPrice.id;

         }
      } catch (priceError) {
        console.error('❌ Erreur lors de la mise à jour du prix:', priceError);
        // Continuer même si la mise à jour du prix échoue
      }
    } else {
      // L'abonnement n'a pas encore de prix, en créer un
      try {
        const newPrice = await stripe.prices.create({
          product: product.id,
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

        finalPriceId = newPrice.id;
      } catch (priceError) {
        console.error('❌ Erreur lors de la création du prix:', priceError);
      }
    }

         // Mettre à jour l'abonnement avec le price ID final
     if (finalPriceId && finalPriceId !== abonnement.stripePriceId) {
       const isTest = typeof mode === 'string' ? mode === 'test' : (siteConfig.stripe?.isTestMode ?? true);
       const update: any = { stripePriceId: finalPriceId, updatedAt: new Date(), stripeMode: isTest ? 'test' : 'live' };
       if (isTest) update.stripePriceIdTest = finalPriceId; else update.stripePriceIdLive = finalPriceId;
       await Abonnement.findByIdAndUpdate(abonnementId, update);
       abonnement.stripePriceId = finalPriceId;
     }



    return NextResponse.json({
      success: true,
      stripeProduct: product,
      stripePriceId: finalPriceId
    });

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du produit Stripe:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du produit Stripe' },
      { status: 500 }
    );
  }
}