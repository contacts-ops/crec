import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Utilisateur } from '@/lib/models/Utilisateur';
import { getStripeKeysFromDatabase } from '@/lib/utils/stripeKeys';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { paymentMethodId } = await request.json();

    // Vérifier l'authentification
    const token = request.cookies.get("utilisateur_token")?.value || 
                  request.cookies.get("token")?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Décoder le token pour obtenir l'utilisateur
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Récupérer l'utilisateur
    const userId = payload.userId || payload.sub;
    const user = await Utilisateur.findById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Récupérer les clés Stripe pour le site
    const stripeKeys = await getStripeKeysFromDatabase(user.siteId);
    if (!stripeKeys.stripeSecretKey) {
      return NextResponse.json({ error: 'Configuration Stripe non trouvée' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKeys.stripeSecretKey, {
      apiVersion: '2025-07-30.basil',
    });

    // Créer ou récupérer le client Stripe
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: userId,
          siteId: user.siteId
        }
      });
      customerId = customer.id;
      
      // Mettre à jour l'utilisateur avec l'ID client Stripe
      await Utilisateur.findByIdAndUpdate(userId, {
        stripeCustomerId: customerId
      });
    }

    // Attacher le PaymentMethod au client
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Définir comme moyen de paiement par défaut au niveau du Customer
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Mettre à jour les abonnements existants pour utiliser ce moyen de paiement par défaut
    try {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
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

    return NextResponse.json({
      success: true,
      message: 'Moyen de paiement ajouté et défini par défaut',
      defaultPaymentMethodId: paymentMethodId
    });

  } catch (error) {
    console.error('Erreur lors de l\'ajout du moyen de paiement:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de l\'ajout du moyen de paiement' 
    }, { status: 500 });
  }
}
