import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Abonnement } from '@/lib/models/Abonnement';
import { Site } from '@/lib/models/Site';
import Stripe from 'stripe';

// DELETE - Supprimer un produit Stripe
export async function DELETE(request: Request, { params }: { params: { productId: string } }) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { siteId, stripeSecretKey, useStoredKeys } = body;
    const { productId } = params;
    
    if (!productId || !siteId) {
      return NextResponse.json(
        { error: 'productId et siteId sont requis' },
        { status: 400 }
      );
    }

    if (!useStoredKeys && !stripeSecretKey) {
      return NextResponse.json(
        { error: 'stripeSecretKey est requis si useStoredKeys n\'est pas activé' },
        { status: 400 }
      );
    }

    // Trouver l'abonnement associé à ce produit Stripe
    const abonnement = await Abonnement.findOne({ 
      siteId,
      stripeProductId: productId 
    });
    
    if (!abonnement) {
      return NextResponse.json(
        { error: 'Abonnement associé au produit Stripe non trouvé' },
        { status: 404 }
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
      // Utiliser les clés stockées directement
      console.log("🔑 Utilisation des clés stockées pour suppression");
      
      if (!siteConfig.stripe?.secretKey) {
        return NextResponse.json(
          { error: 'Clé secrète Stripe non trouvée dans la configuration' },
          { status: 400 }
        );
      }
      
      validatedSecretKey = siteConfig.stripe.secretKey;
    } else {
      // Vérifier la clé secrète avec l'API get-keys
      console.log("🔐 Vérification de la clé secrète pour suppression...");
      
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
        console.error("❌ Erreur vérification clé:", errorData);
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
      apiVersion: '2025-06-30.basil',
    });

    try {
      // Supprimer définitivement le produit Stripe
      console.log(`🗑️ Suppression définitive du produit Stripe: ${productId}`);
      
      // D'abord, désactiver et supprimer tous les prix associés
      if (abonnement.stripePriceId) {
        try {
          // Récupérer tous les prix du produit
          const prices = await stripe.prices.list({
            product: productId,
            limit: 100
          });
          
          // Désactiver tous les prix associés
          for (const price of prices.data) {
            await stripe.prices.update(price.id, {
              active: false
            });
            console.log(`✅ Prix Stripe désactivé: ${price.id}`);
          }
        } catch (priceError) {
          console.error('❌ Erreur lors de la désactivation des prix:', priceError);
          // Continuer même si la désactivation des prix échoue
        }
      }

      // Supprimer le produit Stripe
      await stripe.products.del(productId);
      console.log(`✅ Produit Stripe supprimé définitivement: ${productId}`);
      
    } catch (stripeError) {
      console.error('❌ Erreur Stripe lors de la suppression:', stripeError);
      
      // Si la suppression échoue, essayer au moins de l'archiver
      try {
        console.log(`🔄 Tentative d'archivage du produit en cas d'échec de suppression...`);
        await stripe.products.update(productId, {
          active: false
        });
        console.log(`⚠️ Produit Stripe archivé (suppression échouée): ${productId}`);
      } catch (archiveError) {
        console.error('❌ Échec de l\'archivage également:', archiveError);
      }
      
      // Continuer pour supprimer les références locales même si Stripe échoue
    }

    // Supprimer les références Stripe de l'abonnement local
    await Abonnement.findByIdAndUpdate(
      abonnement._id,
      {
        $unset: {
          stripeProductId: 1,
          stripePriceId: 1
        },
        updatedAt: new Date()
      }
    );

    console.log(`✅ Références Stripe supprimées de l'abonnement ${abonnement._id}`);

    return NextResponse.json({
      success: true,
      message: 'Produit Stripe supprimé définitivement et références supprimées avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur lors de la suppression du produit Stripe:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du produit Stripe' },
      { status: 500 }
    );
  }
} 