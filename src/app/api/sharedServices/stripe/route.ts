import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getStripeKeysFromDatabase } from '@/lib/utils/stripeKeys';
import { StripeEventHandler } from '@/lib/services/stripeEventHandler';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    // Récupérer les données de la requête
    const { siteId, priceId, serviceName } = await request.json();

    console.log('Route /api/sharedServices/stripe appelée avec:', {
      hasSiteId: !!siteId,
      hasPriceId: !!priceId,
      serviceName
    });

    if (!siteId) {
      return NextResponse.json(
        { error: "SiteId requis" },
        { status: 400 }
      );
    }

    // Récupérer les clés Stripe depuis la base de données
    const stripeKeys = await getStripeKeysFromDatabase(siteId);

    if (!stripeKeys.stripeSecretKey) {
      return NextResponse.json(
        { error: "Configuration Stripe non trouvée pour ce site" },
        { status: 500 }
      );
    }

    try {
      // Initialisation de Stripe avec la clé trouvée
      const stripe = new Stripe(stripeKeys.stripeSecretKey, { apiVersion: '2025-08-27.basil' });

      console.log(`Récupération des paiements Stripe en mode ${stripeKeys.isTestMode ? 'TEST' : 'LIVE'}...`);

      // Récupérer les sessions de paiement (Checkout Sessions)
      const sessions = await stripe.checkout.sessions.list({
        limit: 100,
        expand: ['data.payment_intent', 'data.line_items'],
      });

      console.log(`Sessions Stripe trouvées: ${sessions.data.length}`);

      // Transformer les sessions en paiements (seulement les paiements complétés)
      const paymentsPromises = sessions.data
        .filter(session => session.payment_status === 'paid')
        .map(async (session) => {
          const lineItem = session.line_items?.data[0];
          const paymentIntent = session.payment_intent as any;

          // Récupérer le vrai nom du produit depuis Stripe
          let productName = 'Domiciliation d\'Entreprise'; // Valeur par défaut

          if (lineItem && lineItem.price && lineItem.price.product) {
            // Récupérer le nom du produit depuis l'API Stripe
            try {
              const product = await stripe.products.retrieve(lineItem.price.product as string);
              productName = product.name || productName;
            } catch (error) {
              console.log('Impossible de récupérer le nom du produit, utilisation du nom par défaut');
            }
          } else if (session.metadata?.productName) {
            // Utiliser le nom du produit depuis les métadonnées
            productName = session.metadata.productName;
          } else if (serviceName) {
            // Utiliser le nom du service configuré dans la bande paiement
            productName = serviceName;
          }

          return {
            id: session.id,
            customerName: session.customer_details?.name || 'Client anonyme',
            customerEmail: session.customer_details?.email || '',
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency?.toUpperCase() || 'EUR',
            status: 'completed',
            date: new Date(session.created * 1000).toISOString().split('T')[0],
            serviceName: productName,
            reference: session.id,
            paymentMethod: 'Carte bancaire'
          };
        });

      const completedPayments = await Promise.all(paymentsPromises);

      // Si un priceId est spécifié, filtrer les paiements
      let filteredPayments = completedPayments;

      const normalizeFailedPaymentEntry = (entry: any) => {
        const source = typeof entry?.toObject === 'function'
          ? entry.toObject({ virtuals: true })
          : entry?._doc
            ? entry._doc
            : entry;

        const amountValue = source?.amount ?? entry?.amount ?? 0;
        const rawAmount = typeof amountValue === 'number' ? amountValue : Number(amountValue);
        const invoiceIdRaw = source?.invoiceId ?? entry?.invoiceId ?? '';
        const currencyRaw = source?.currency ?? entry?.currency ?? 'eur';
        const failedAtRaw = source?.failedAt ?? entry?.failedAt ?? new Date().toISOString();
        const attemptRaw = source?.attemptCount ?? entry?.attemptCount ?? 1;

        const userIdRaw = entry?.userId ?? source?.userId ?? entry?._id ?? source?._id;
        const userEmailRaw = entry?.userEmail ?? source?.userEmail ?? entry?.email ?? source?.email ?? '';
        const userNameRaw = entry?.userName
          ?? source?.userName
          ?? (source?.firstName && source?.lastName ? `${source.firstName} ${source.lastName}`.trim() : undefined)
          ?? (entry?.firstName && entry?.lastName ? `${entry.firstName} ${entry.lastName}`.trim() : undefined)
          ?? 'Client inconnu';

        return {
          id: `failed-${invoiceIdRaw || userIdRaw || Date.now()}`,
          customerName: userNameRaw,
          customerEmail: userEmailRaw ? userEmailRaw.toString() : '',
          amount: Number.isFinite(rawAmount) ? rawAmount / 100 : 0,
          currency: currencyRaw ? currencyRaw.toString().toUpperCase() : 'EUR',
          status: 'failed',
          date: new Date(failedAtRaw).toISOString().split('T')[0],
          serviceName: 'Paiement en impayé',
          reference: invoiceIdRaw ? invoiceIdRaw.toString() : 'impaye',
          paymentMethod: 'Carte bancaire',
          stripeSessionId: undefined,
          stripeInvoiceId: invoiceIdRaw ? invoiceIdRaw.toString() : undefined,
          isFailedPayment: true,
          failedDetails: {
            invoiceId: invoiceIdRaw ? invoiceIdRaw.toString() : '',
            failedAt: failedAtRaw,
            reason: source?.reason ?? entry?.reason ?? 'Paiement refusé',
            attemptCount: typeof attemptRaw === 'number' ? attemptRaw : Number(attemptRaw) || 1,
          },
        };
      };

      // Récupérer les impayés enregistrés côté base de données pour ce site
      let failedPaymentsCombined: any[] = [];
      try {
        const failedStats = await StripeEventHandler.getSiteFailedPaymentsStats(siteId);
        const rawFailedPayments: any[] = Array.isArray(failedStats?.failedPayments) ? failedStats.failedPayments : [];

        failedPaymentsCombined = rawFailedPayments.map(normalizeFailedPaymentEntry);
      } catch (failedError) {
        console.warn('Impossible de récupérer les impayés Stripe pour le site', siteId, failedError);
      }

      const allPayments = [...filteredPayments, ...failedPaymentsCombined];

      // Calculer les statistiques (seulement les paiements complétés)
      const totalPayments = allPayments.length;
      const totalAmount = Math.round(filteredPayments.reduce((acc, payment) => acc + payment.amount, 0) * 10) / 10;

      console.log(`Paiements Stripe complétés récupérés: ${totalPayments} paiements, montant total: ${totalAmount}€`);

      return NextResponse.json({
        payments: allPayments,
        totalPayments,
        totalAmount,
        failedPaymentsCount: failedPaymentsCombined.length
      });

    } catch (stripeError) {
      console.error("Erreur Stripe:", stripeError);
      throw new Error(`Erreur Stripe: ${stripeError instanceof Error ? stripeError.message : 'Erreur inconnue'}`);
    }

  } catch (error) {
    console.error("Erreur dans la route Stripe:", error);
    return NextResponse.json({
      error: "Une erreur est survenue lors du traitement de votre demande"
    }, { status: 500 });
  }
}
