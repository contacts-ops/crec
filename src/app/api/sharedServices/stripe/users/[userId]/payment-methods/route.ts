import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Utilisateur } from '@/lib/models/Utilisateur';
import { getStripeKeysFromDatabase } from '@/lib/utils/stripeKeys';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    console.log(`🔍 GET /api/sharedServices/stripe/users/${userId}/payment-methods`);
    
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
      return NextResponse.json({ error: 'Aucun client Stripe associé' }, { status: 400 });
    }

    const stripeKeys = await getStripeKeysFromDatabase(user.siteId);
    
    if (!stripeKeys.stripeSecretKey) {
      console.log(`❌ Pas de clé Stripe pour le site ${user.siteId}`);
      return NextResponse.json({ error: 'Configuration Stripe manquante' }, { status: 500 });
    }

    console.log(`🔑 Clés Stripe trouvées pour le site ${user.siteId}`);

    const stripe = new Stripe(stripeKeys.stripeSecretKey, {
      apiVersion: '2025-08-27.basil',
    });

    // Retrieve customer to get the default payment method
    console.log(`🔍 Récupération du customer Stripe: ${user.stripeCustomerId}`);
    const customer = await stripe.customers.retrieve(user.stripeCustomerId, {
      expand: ['invoice_settings.default_payment_method'],
    });
    
    if (customer.deleted) {
      console.log(`❌ Customer Stripe supprimé: ${user.stripeCustomerId}`);
      return NextResponse.json({ error: 'Client Stripe supprimé' }, { status: 400 });
    }
    
    console.log(`✅ Customer Stripe trouvé:`, {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      defaultPaymentMethod: customer.invoice_settings?.default_payment_method?.id
    });

    const defaultPaymentMethodId = (customer.invoice_settings?.default_payment_method as Stripe.PaymentMethod)?.id || null;

    // Récupérer les moyens de paiement du customer de l'utilisateur
    console.log(`🔍 Récupération des moyens de paiement pour le customer: ${user.stripeCustomerId}`);
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });

    console.log(`📊 Moyens de paiement trouvés: ${paymentMethods.data.length}`);

    const formattedPaymentMethods = paymentMethods.data.map(method => ({
      id: method.id,
      name: method.metadata?.name || 'Carte bancaire',
      maskedNumber: `**** **** **** ${method.card?.last4 || '****'}`,
      expiryDate: method.card?.exp_month && method.card?.exp_year 
        ? `${method.card.exp_month.toString().padStart(2, '0')}/${method.card.exp_year}`
        : null,
      isDefault: method.id === defaultPaymentMethodId
    }));

    console.log(`✅ Réponse finale:`, {
      paymentMethodsCount: formattedPaymentMethods.length,
      defaultPaymentMethodId: defaultPaymentMethodId
    });

    return NextResponse.json({
      paymentMethods: formattedPaymentMethods,
      defaultPaymentMethodId: defaultPaymentMethodId
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des moyens de paiement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des moyens de paiement' },
      { status: 500 }
    );
  }
}

/**
 * POST - Ajouter un moyen de paiement pour un utilisateur
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { siteId, name, type, maskedNumber, expiryDate, isDefault } = await request.json();

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
      apiVersion: '2025-08-27.basil',
    });

    // Créer ou récupérer le client Stripe
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: userId,
          siteId: siteId
        }
      });
      customerId = customer.id;
      
      // Mettre à jour l'utilisateur avec l'ID client Stripe
      await Utilisateur.findByIdAndUpdate(userId, {
        stripeCustomerId: customerId
      });
    }

    // Pour l'instant, on retourne une erreur car l'ajout de vrais moyens de paiement
    // nécessite l'intégration avec Stripe Elements ou Checkout
    return NextResponse.json({
      error: 'L\'ajout de moyens de paiement nécessite l\'intégration avec Stripe Elements. Cette fonctionnalité sera bientôt disponible.'
    }, { status: 501 });

  } catch (error) {
    console.error('Erreur lors de l\'ajout du moyen de paiement:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
