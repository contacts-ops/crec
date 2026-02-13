import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Utilisateur } from '@/lib/models/Utilisateur';
import { StripeService } from '@/lib/services/stripeService';

/**
 * GET - Récupérer les informations Stripe d'un utilisateur
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    console.log("🔄 Début récupération informations Stripe utilisateur");
    await connectToDatabase();
    
    const userId = params.userId;
    console.log("🔍 Recherche utilisateur ID:", userId);

    const user = await Utilisateur.findById(userId);
    
    if (!user) {
      console.log("❌ Utilisateur non trouvé");
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Si l'utilisateur n'a pas d'ID client Stripe, retourner une réponse vide
    if (!user.stripeCustomerId) {
      return NextResponse.json({
        hasStripeCustomer: false,
        message: "Aucun client Stripe associé à cet utilisateur"
      });
    }

    // Récupérer les informations du client Stripe
    try {
      const customerInfo = await StripeService.getCustomerInfo(user.stripeCustomerId);
      
      return NextResponse.json({
        hasStripeCustomer: true,
        stripeCustomerId: user.stripeCustomerId,
        customerInfo: {
          id: customerInfo.id,
          email: customerInfo.email,
          name: customerInfo.name,
          phone: customerInfo.phone,
          created: customerInfo.created,
          metadata: customerInfo.metadata
        }
      });
      
    } catch (stripeError) {
      console.error("❌ Erreur lors de la récupération des informations Stripe:", stripeError);
      return NextResponse.json({
        hasStripeCustomer: true,
        stripeCustomerId: user.stripeCustomerId,
        error: "Impossible de récupérer les informations Stripe"
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des informations Stripe:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}