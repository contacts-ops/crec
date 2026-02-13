import { NextRequest, NextResponse } from 'next/server';
import { StripeEventHandler } from '@/lib/services/stripeEventHandler';

/**
 * GET - Récupérer les statistiques des paiements échoués d'un utilisateur
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    console.log("🔄 Début récupération statistiques paiements échoués");
    
    const userId = params.userId;
    console.log("🔍 Recherche statistiques pour utilisateur ID:", userId);

    const stats = await StripeEventHandler.getFailedPaymentsStats(userId);
    
    if (!stats) {
      console.log("❌ Utilisateur non trouvé");
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    console.log("✅ Statistiques récupérées avec succès");
    return NextResponse.json(stats);
    
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des statistiques:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}

/**
 * DELETE - Supprimer un paiement échoué pour un utilisateur
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    const body = await request.json().catch(() => ({}));
    const invoiceId = (body.invoiceId || '').toString().trim();

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId requis' }, { status: 400 });
    }

    await StripeEventHandler.removeFailedPayment(userId, invoiceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de l\'impayé:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
