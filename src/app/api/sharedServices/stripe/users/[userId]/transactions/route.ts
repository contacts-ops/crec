import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Utilisateur } from '@/lib/models/Utilisateur';
import { getStripeKeysFromDatabase } from '@/lib/utils/stripeKeys';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';

/**
 * GET - Récupérer les transactions d'un utilisateur
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    console.log(`🔍 GET /api/sharedServices/stripe/users/${userId}/transactions`);
    
    // Vérifier l'authentification JWT
    const token = request.cookies.get("utilisateur_token")?.value;
    if (!token) {
      console.log(`❌ Token d'authentification manquant`);
      return NextResponse.json(
        { error: "Non autorisé - Token utilisateur manquant" },
        { status: 401 }
      );
    }

    // Vérifier et décoder le JWT
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      console.log(`❌ Token d'authentification invalide`);
      return NextResponse.json(
        { error: "Token utilisateur invalide ou expiré" },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur connecté accède à ses propres données
    if (payload.userId !== userId) {
      console.log(`❌ Tentative d'accès non autorisé: ${payload.userId} → ${userId}`);
      return NextResponse.json(
        { error: "Non autorisé - Accès aux données d'un autre utilisateur" },
        { status: 403 }
      );
    }

    console.log(`✅ Authentification réussie pour l'utilisateur: ${payload.userId}`);
    
    await connectToDatabase();
    const user = await Utilisateur.findById(userId);
    
    if (!user) {
      console.log(`❌ Utilisateur non trouvé: ${userId}`);
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    console.log(`👤 Utilisateur trouvé:`, {
      id: user._id,
      email: user.email,
      stripeCustomerId: user.stripeCustomerId,
      siteId: user.siteId
    });

    if (!user.stripeCustomerId) {
      console.log(`❌ Aucun stripeCustomerId pour l'utilisateur ${userId}`);
      return NextResponse.json({ transactions: [] });
    }

    // Récupérer les clés Stripe pour le site de l'utilisateur
    const stripeKeys = await getStripeKeysFromDatabase(user.siteId);
    
    if (!stripeKeys.stripeSecretKey) {
      console.log(`❌ Pas de clé Stripe pour le site ${user.siteId}`);
      return NextResponse.json({ error: 'Configuration Stripe non trouvée' }, { status: 500 });
    }

    console.log(`🔑 Clés Stripe trouvées pour le site ${user.siteId}`);

    const stripe = new Stripe(stripeKeys.stripeSecretKey, {
      apiVersion: '2025-07-30.basil',
    });

    // Récupérer les transactions depuis le customer de l'utilisateur
    console.log(`🔍 Récupération des PaymentIntents pour le customer: ${user.stripeCustomerId}`);
    const payments = await stripe.paymentIntents.list({
      customer: user.stripeCustomerId,
      limit: 50,
    });

    console.log(`📊 PaymentIntents trouvés: ${payments.data.length}`);

    console.log(`🔍 Récupération des Checkout Sessions pour le customer: ${user.stripeCustomerId}`);
    const sessions = await stripe.checkout.sessions.list({
      customer: user.stripeCustomerId,
      limit: 50,
    });

    console.log(`📊 Checkout Sessions trouvées: ${sessions.data.length}`);

    // Formater les transactions
    const transactions = [];

    // Ajouter les paiements
    for (const payment of payments.data) {
      const transaction = {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        created: payment.created,
        description: payment.description || 'Paiement Stripe',
        payment_method_details: payment.payment_method_options,
        invoice: null // PaymentIntent n'a pas d'invoice direct
      };
      transactions.push(transaction);
    }

    // Ajouter les sessions de checkout
    for (const session of sessions.data) {
      if (session.payment_status === 'paid') {
        const transaction = {
          id: session.id,
          amount: session.amount_total,
          currency: session.currency,
          status: 'succeeded',
          created: session.created,
          description: session.metadata?.productName || 'Achat via Checkout',
          payment_method_details: {
            card: {
              brand: 'unknown',
              last4: '****'
            }
          },
          invoice: session.invoice
        };
        transactions.push(transaction);
      }
    }

    // Trier par date (plus récent en premier)
    transactions.sort((a, b) => b.created - a.created);

    console.log(`✅ Réponse finale: ${transactions.length} transactions`);

    return NextResponse.json({
      transactions: transactions
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des transactions:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
