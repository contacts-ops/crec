import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Utilisateur } from '@/lib/models/Utilisateur';
import { getStripeKeysFromDatabase } from '@/lib/utils/stripeKeys';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
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

    if (!user.stripeCustomerId) {
      return NextResponse.json({ error: 'Aucun client Stripe associé' }, { status: 400 });
    }

    // Récupérer les clés Stripe pour le site
    const stripeKeys = await getStripeKeysFromDatabase(user.siteId);
    if (!stripeKeys.stripeSecretKey) {
      return NextResponse.json({ error: 'Configuration Stripe non trouvée' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKeys.stripeSecretKey, {
      apiVersion: '2025-07-30.basil',
    });

    // Créer la session du portail de facturation
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${request.headers.get('origin')}/espace-client`, // Redirection après la session
    });

    return NextResponse.json({ url: portalSession.url });

  } catch (error) {
    console.error('Erreur lors de la création de la session du portail:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la création de la session du portail' 
    }, { status: 500 });
  }
}
