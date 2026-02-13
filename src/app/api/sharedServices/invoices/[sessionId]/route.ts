import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/db';
import { Utilisateur } from '@/lib/models/Utilisateur';
import { getStripeKeysFromDatabase } from '@/lib/utils/stripeKeys';
import Stripe from 'stripe';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    // Récupérer le token depuis le cookie HTTP-only pour les Utilisateurs
    const token = req.cookies.get("utilisateur_token")?.value;
    if (!token) {
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
      return NextResponse.json(
        { error: "Token utilisateur invalide ou expiré" },
        { status: 401 }
      );
    }

    // Connexion à la base de données
    await connectToDatabase();

    // Récupérer l'utilisateur depuis la base de données
    const user = await Utilisateur
      .findById(payload.userId)
      .select("-password")
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Récupérer les clés Stripe depuis la base de données
    const stripeKeys = await getStripeKeysFromDatabase(user.siteId);
    
    if (!stripeKeys.stripeSecretKey) {
      return NextResponse.json(
        { error: "Configuration Stripe non trouvée pour ce site" },
        { status: 500 }
      );
    }

    // Initialiser Stripe avec la clé trouvée
    const stripe = new Stripe(stripeKeys.stripeSecretKey, { apiVersion: '2025-06-30.basil' });

    // Récupérer les détails de la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'line_items', 'invoice']
    });

    // Vérifier que l'email de la session correspond à l'utilisateur connecté
    const sessionEmail = session.customer_details?.email?.toLowerCase();
    const userEmail = user.email.toLowerCase();
    
    if (sessionEmail !== userEmail) {
      return NextResponse.json(
        { error: "Accès non autorisé à cette facture" },
        { status: 403 }
      );
    }

    // Récupérer l'invoice Stripe si elle existe
    let stripeInvoice = null;
    if (session.invoice) {
      try {
        stripeInvoice = await stripe.invoices.retrieve(session.invoice as string);
      } catch (error) {
        console.log('Impossible de récupérer l\'invoice depuis Stripe');
      }
    }

    // Récupérer le nom du produit
    let productName = 'Service';
    const lineItem = session.line_items?.data[0];
    
    if (lineItem && lineItem.price && lineItem.price.product) {
      try {
        const product = await stripe.products.retrieve(lineItem.price.product as string);
        productName = product.name || productName;
      } catch (error) {
        console.log('Impossible de récupérer le nom du produit, utilisation du nom par défaut');
      }
    } else if (session.metadata?.productName) {
      productName = session.metadata.productName;
    }

    return NextResponse.json({
      sessionId: session.id,
      invoiceNumber: stripeInvoice?.number || `FAC-${session.id.slice(-8)}`,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency?.toUpperCase() || 'EUR',
      status: session.payment_status === 'paid' ? 'paid' : 'pending',
      date: new Date(session.created * 1000).toISOString(),
      dueDate: stripeInvoice?.due_date ? new Date(stripeInvoice.due_date * 1000).toISOString() : new Date(session.created * 1000).toISOString(),
      description: productName,
      customerName: session.customer_details?.name || `${user.firstName} ${user.lastName}`,
      customerEmail: session.customer_details?.email || user.email,
      stripeInvoice,
      stripeSession: session
    });

  } catch (error) {
    console.error("Erreur lors de la récupération des détails de la facture:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
} 