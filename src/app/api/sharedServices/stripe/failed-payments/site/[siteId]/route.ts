import { NextRequest, NextResponse } from 'next/server';
import { StripeEventHandler } from '@/lib/services/stripeEventHandler';

/**
 * GET - Récupérer les statistiques des paiements échoués d'un site
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    console.log("🔄 Début récupération statistiques paiements échoués du site");
    
    const { siteId } = await params;
    console.log("🔍 Recherche statistiques pour site ID:", siteId);

    const stats = await StripeEventHandler.getSiteFailedPaymentsStats(siteId);

    const normalizedFailedPayments = (stats?.failedPayments || []).map((entry: any) => {
      try {
        const source = typeof entry?.toObject === 'function'
          ? entry.toObject({ virtuals: true })
          : entry?._doc
            ? entry._doc
            : entry;

        const amountValue = source?.amount ?? entry?.amount ?? 0;
        const rawAmount = typeof amountValue === 'number' ? amountValue : Number(amountValue);

        const rawInvoiceId = source?.invoiceId ?? entry?.invoiceId ?? '';
        const rawCurrency = source?.currency ?? entry?.currency ?? 'eur';
        const rawAttemptCount = source?.attemptCount ?? entry?.attemptCount ?? 1;

        const userIdRaw = entry?.userId ?? source?.userId ?? entry?._id ?? source?._id;
        const userEmailRaw = entry?.userEmail ?? source?.userEmail ?? entry?.email ?? source?.email ?? '';
        const userNameRaw = entry?.userName
          ?? source?.userName
          ?? (source?.firstName && source?.lastName ? `${source.firstName} ${source.lastName}`.trim() : undefined)
          ?? (entry?.firstName && entry?.lastName ? `${entry.firstName} ${entry.lastName}`.trim() : undefined)
          ?? 'Client inconnu';

        return {
          invoiceId: rawInvoiceId ? rawInvoiceId.toString() : '',
          amount: Number.isFinite(rawAmount) ? rawAmount : 0,
          currency: rawCurrency ? rawCurrency.toString() : 'eur',
          failedAt: source?.failedAt ?? entry?.failedAt ?? null,
          reason: source?.reason ?? entry?.reason ?? 'Paiement refusé',
          attemptCount: typeof rawAttemptCount === 'number' ? rawAttemptCount : Number(rawAttemptCount) || 1,
          userId: userIdRaw ? userIdRaw.toString() : undefined,
          userEmail: userEmailRaw ? userEmailRaw.toString() : '',
          userName: userNameRaw,
        };
      } catch (normalizationError) {
        console.warn('⚠️ Impossible de normaliser un impayé Stripe:', normalizationError, entry);
        return {
          invoiceId: '',
          amount: 0,
          currency: 'eur',
          failedAt: null,
          reason: 'Paiement refusé',
          attemptCount: 1,
          userId: undefined,
          userEmail: '',
          userName: 'Client inconnu',
        };
      }
    });

    console.log("✅ Statistiques du site récupérées avec succès");
    return NextResponse.json({
      ...stats,
      failedPayments: normalizedFailedPayments,
    });
    
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des statistiques du site:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}