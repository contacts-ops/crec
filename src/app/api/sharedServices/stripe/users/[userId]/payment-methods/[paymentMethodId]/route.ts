import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Utilisateur } from '@/lib/models/Utilisateur';
import { getStripeKeysFromDatabase } from '@/lib/utils/stripeKeys';
import Stripe from 'stripe';

/**
 * PUT - Modifier un moyen de paiement
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; paymentMethodId: string }> }
) {
  try {
    const { userId, paymentMethodId } = await params;
    const { siteId, name, isDefault } = await request.json();

    await connectToDatabase();
    const user = await Utilisateur.findById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Récupérer les clés Stripe pour le site
    const stripeKeys = await getStripeKeysFromDatabase(siteId);
    if (!stripeKeys.stripeSecretKey) {
      return NextResponse.json({ error: 'Configuration Stripe non trouvée' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKeys.stripeSecretKey, {
      apiVersion: '2025-07-30.basil',
    });

    // Mettre à jour les métadonnées (facultatif)
    await stripe.paymentMethods.update(paymentMethodId, {
      metadata: {
        name: name
      }
    });

    // Si demandé, définir comme moyen de paiement par défaut
    if (isDefault) {
      await stripe.customers.update(user.stripeCustomerId!, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Synchroniser les abonnements existants pour utiliser ce moyen de paiement
      try {
        const subs = await stripe.subscriptions.list({
          customer: user.stripeCustomerId!,
          status: 'all',
          expand: ['data.default_payment_method']
        });

        const targetStatuses = new Set(['active', 'trialing', 'past_due', 'unpaid']);
        const updatable = subs.data.filter(s => targetStatuses.has(s.status) && s.collection_method === 'charge_automatically');

        for (const sub of updatable) {
          try {
            await stripe.subscriptions.update(sub.id, {
              default_payment_method: paymentMethodId,
            });
          } catch (e) {
            console.error(`[Stripe] Impossible de mettre à jour l'abonnement ${sub.id} avec le nouveau moyen de paiement par défaut`, e);
          }
        }
      } catch (e) {
        console.error('[Stripe] Erreur lors de la mise à jour des abonnements existants avec le nouveau moyen de paiement par défaut', e);
      }
    }

    return NextResponse.json({
      message: 'Moyen de paiement modifié avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la modification du moyen de paiement:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

/**
 * DELETE - Supprimer un moyen de paiement
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; paymentMethodId: string }> }
) {
  try {
    const { userId, paymentMethodId } = await params;
    const { siteId } = await request.json();

    await connectToDatabase();
    const user = await Utilisateur.findById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Récupérer les clés Stripe pour le site
    const stripeKeys = await getStripeKeysFromDatabase(siteId);
    if (!stripeKeys.stripeSecretKey) {
      return NextResponse.json({ error: 'Configuration Stripe non trouvée' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKeys.stripeSecretKey, {
      apiVersion: '2025-07-30.basil',
    });

    // Détacher le moyen de paiement du client
    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({
      message: 'Moyen de paiement supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression du moyen de paiement:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
