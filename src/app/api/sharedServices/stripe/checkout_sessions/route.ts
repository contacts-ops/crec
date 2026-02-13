import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Site } from '@/lib/models/Site';
// Le SDK Stripe a été installé via : npm install stripe
// @ts-ignore
import Stripe from 'stripe';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    
    // Récupérer les données de la requête
    const { priceId, successUrl, cancelUrl, productName, siteId, abonnementId, abonnementType, locale, formId, metadata, isTestMode: frontendTestMode } = await request.json();

    // Validation des données
    if (!priceId) {
      return NextResponse.json(
        { message: "Price ID requis" },
        { status: 400 }
      );
    }

    if (!siteId) {
      return NextResponse.json(
        { message: "Site ID requis" },
        { status: 400 }
      );
    }

    // Récupérer la configuration du site pour vérifier que Stripe est configuré
    const site = await Site.findOne({ siteId });
    console.log("🔍 DEBUG - Site trouvé:", site ? "Oui" : "Non");
    console.log("🔍 DEBUG - Configuration Stripe:", site?.stripe);
    
    if (!site) {
      return NextResponse.json(
        { message: "Site non trouvé" },
        { status: 400 }
      );
    }
    
    if (!site.stripe?.isConfigured) {
      return NextResponse.json(
        { message: "Configuration Stripe non trouvée pour ce site" },
        { status: 400 }
      );
    }

    // Sélectionner la clé secrète selon le mode (test/live)
    // Priorité au mode passé par le frontend (pour localhost), sinon utiliser la config du site
    const isTestMode = frontendTestMode !== undefined ? frontendTestMode : (site.stripe?.isTestMode ?? true);
    const selectedSecret = isTestMode
      ? (site.stripe?.testSecretKey || site.stripe?.secretKey)
      : site.stripe?.liveSecretKey;

    if (!selectedSecret) {
      return NextResponse.json(
        { message: `Clé secrète Stripe manquante pour le mode ${isTestMode ? 'test' : 'live'}.` },
        { status: 400 }
      );
    }

    const stripeSecretKey = selectedSecret;
    const secretMode = stripeSecretKey.startsWith('sk_live_') ? 'live' : (stripeSecretKey.startsWith('sk_test_') ? 'test' : 'unknown');

    console.log(`🔍 DEBUG - Utilisation de la clé ${secretMode} (isTestMode=${isTestMode})`);

    // Initialisation de Stripe avec la clé secrète
    let stripe = new Stripe(stripeSecretKey);

    // Vérifier que le priceId est accessible avec cette clé (et actif)
    try {
      const price = await stripe.prices.retrieve(priceId);
      console.log('🔍 DEBUG - Prix Stripe récupéré:', price?.id, 'actif:', price?.active, 'mode attendu:', secretMode);
      const isDeleted = (price as { deleted?: boolean })?.deleted === true;
      if (!price || isDeleted) {
        return NextResponse.json(
          { message: "Price introuvable avec cette clé Stripe. Vérifiez que le priceId appartient au même compte." },
          { status: 400 }
        );
      }
      if (price.active === false) {
        return NextResponse.json(
          { message: "Le prix Stripe est inactif. Activez-le ou sélectionnez un autre prix." },
          { status: 400 }
        );
      }
    } catch (e) {
      console.error('❌ Erreur lors de la récupération du price:', e);
      // Fallback: essayer l'autre clé (test/live) si disponible
      try {
        const altSecret = isTestMode
          ? (site.stripe?.liveSecretKey || site.stripe?.secretKey)
          : (site.stripe?.testSecretKey || site.stripe?.secretKey);
        if (!altSecret) {
          throw new Error('Aucune clé alternative disponible');
        }
        console.warn(`⚠️ Tentative avec la clé alternative (${altSecret.startsWith('sk_live_') ? 'live' : 'test'}) pour le price ${priceId}`);
        stripe = new Stripe(altSecret);
        const price = await stripe.prices.retrieve(priceId);
        const isDeleted = (price as { deleted?: boolean })?.deleted === true;
        if (!price || isDeleted) {
          return NextResponse.json(
            { message: "Price introuvable avec les clés Stripe disponibles. Vérifiez que le priceId appartient au bon compte." },
            { status: 400 }
          );
        }
        // On continue avec la clé alternative
      } catch (fallbackErr) {
        console.error('❌ Échec avec la clé alternative:', fallbackErr);
        return NextResponse.json(
          { message: "Impossible de récupérer le price avec cette clé Stripe. Assurez-vous que le priceId et le compte (test/live) correspondent." },
          { status: 400 }
        );
      }
    }

    // Validation et construction des URLs
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    
    // Gestion des URLs vides ou relatives
    let finalSuccessUrl = successUrl;
    let finalCancelUrl = cancelUrl;
    
    // Si l'URL est vide, utiliser les pages par défaut
    if (!successUrl || successUrl.trim() === '') {
      finalSuccessUrl = `${baseUrl}/success`;
    } else if (!successUrl.startsWith('http')) {
      // Si c'est un chemin relatif, ajouter le domaine
      finalSuccessUrl = `${baseUrl}${successUrl.startsWith('/') ? '' : '/'}${successUrl}`;
    }
    
    if (!cancelUrl || cancelUrl.trim() === '') {
      finalCancelUrl = `${baseUrl}/cancel`;
    } else if (!cancelUrl.startsWith('http')) {
      // Si c'est un chemin relatif, ajouter le domaine
      finalCancelUrl = `${baseUrl}${cancelUrl.startsWith('/') ? '' : '/'}${cancelUrl}`;
    }

    console.log('🔗 URLs de redirection:', { 
      original: { successUrl, cancelUrl },
      final: { finalSuccessUrl, finalCancelUrl },
      baseUrl 
    });
    
    console.log('🔗 Mode Stripe utilisé:', isTestMode ? 'TEST' : 'LIVE');
    console.log('🔗 Clé secrète utilisée:', stripeSecretKey.substring(0, 20) + '...');

    // Crée une session de paiement Stripe (Checkout Session)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription', // 'subscription' pour les paiements récurrents (mensuels)
      automatic_tax: { enabled: true },
      
      // URLs vers lesquelles l'utilisateur sera redirigé après le paiement.
      success_url: `${finalSuccessUrl}${finalSuccessUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}&price_id=${encodeURIComponent(priceId)}${abonnementId ? `&abonnement_id=${encodeURIComponent(abonnementId)}` : ''}${formId ? `&form_id=${encodeURIComponent(formId)}` : ''}`,
      cancel_url: finalCancelUrl,
      metadata: {
        productName: productName || 'Produit',
        siteId,
        priceId,
        abonnementId: abonnementId || '',
        abonnementType: abonnementType || '',
        formId: formId || '',
        ...(metadata && typeof metadata === 'object' ? metadata : {}),
      },
      // Collecter l'email du client
      customer_email: undefined, // Stripe collectera automatiquement l'email
      billing_address_collection: 'required',
      allow_promotion_codes: true,
      // Forcer la langue française
      locale: locale || 'fr',
    });

    console.log('✅ Session Stripe créée:', {
      sessionId: session.id,
      url: session.url,
      mode: isTestMode ? 'TEST' : 'LIVE',
      successUrl: finalSuccessUrl,
      cancelUrl: finalCancelUrl
    });

    // Retourne l'ID de la session et l'URL directe
    return NextResponse.json({ sessionId: session.id, url: session.url });

  } catch (err) {
    const error = err as Error;
    console.error("Erreur lors de la création de la session Stripe:", error.message);
    // On retourne toujours une réponse JSON, même en cas d'erreur
    return NextResponse.json(
      { message: "Impossible de créer la session de paiement.", error: error.message },
      { status: 500 }
    );
  }
} 