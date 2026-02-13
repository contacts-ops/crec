import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { StripeEventHandler } from "@/lib/services/stripeEventHandler";
import { getStripeKeysFromDatabase } from '@/lib/utils/stripeKeys';

// Variables d'environnement pour les webhooks Stripe
const WEBHOOK_SECRET_TEST = process.env.STRIPE_WEBHOOK_SECRET_TEST;
const WEBHOOK_SECRET_LIVE = process.env.STRIPE_WEBHOOK_SECRET_LIVE;

/**
 * Détermine le bon webhook secret selon le mode Stripe
 */
async function getWebhookSecret(): Promise<string> {
  try {
    // Récupérer les clés Stripe pour déterminer le mode
    const defaultStripeKeys = await getStripeKeysFromDatabase(process.env.DEFAULT_SITE_ID || '');
    const isTestMode = defaultStripeKeys.isTestMode ?? true; // Par défaut en mode test
    
    console.log(`🔧 Mode Stripe détecté: ${isTestMode ? 'TEST' : 'LIVE'}`);
    
    const webhookSecret = isTestMode ? WEBHOOK_SECRET_TEST : WEBHOOK_SECRET_LIVE;
    
    if (!webhookSecret) {
      throw new Error(`Webhook secret manquant pour le mode ${isTestMode ? 'TEST' : 'LIVE'}`);
    }
    
    console.log(`🔑 Webhook secret utilisé: ${webhookSecret.substring(0, 20)}...`);
    return webhookSecret;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du webhook secret:', error);
    throw error;
  }
}

/**
 * Gestionnaire principal des webhooks Stripe
 * Adapté à l'architecture multi-sites du CMS
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('🔔 ===== WEBHOOK STRIPE REÇU =====');
  console.log(`🔔 Timestamp: ${new Date().toISOString()}`);
  console.log(`🔔 URL: ${req.url}`);
  console.log(`🔔 Method: ${req.method}`);
  
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");
  
  console.log(`🔔 Body length: ${body.length} bytes`);
  console.log(`🔔 Signature: ${signature ? signature.substring(0, 20) + '...' : 'AUCUNE'}`);
  
  if (body.length === 0) {
    console.log('⚠️ WEBHOOK REÇU - Body vide !');
    return NextResponse.json({ error: 'Empty body' }, { status: 400 });
  }

  let event: Stripe.Event;

  // 1. Vérifier que la requête vient bien de Stripe (TRÈS IMPORTANT !)
  try {
    console.log('🔍 Récupération des clés Stripe...');
    
    // Récupérer les clés Stripe et le webhook secret approprié
    const defaultStripeKeys = await getStripeKeysFromDatabase(process.env.DEFAULT_SITE_ID || '');
    const stripeSecretKey = defaultStripeKeys.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
    const webhookSecret = await getWebhookSecret();
    
    if (!stripeSecretKey) {
      throw new Error('Aucune clé Stripe disponible pour la vérification de signature');
    }

    console.log(`🔑 Clé Stripe utilisée: ${stripeSecretKey.substring(0, 20)}...`);
    console.log(`🔑 Webhook secret utilisé: ${webhookSecret.substring(0, 20)}...`);

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-08-27.basil',
    });

    console.log('🔐 Vérification de la signature webhook...');
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
    
    console.log(`✅ Webhook validé: ${event.type} (ID: ${event.id})`);
    console.log(`📊 Données de l'événement:`, {
      type: event.type,
      id: event.id,
      created: new Date(event.created * 1000).toISOString(),
      livemode: event.livemode
    });
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.log(`❌ Erreur de signature webhook: ${errorMessage}`);
    console.log(`❌ Détails de l'erreur:`, err);
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
  }

  try {
    // 2. Traiter l'événement avec le service centralisé
    console.log(`🔄 Traitement de l'événement ${event.type}...`);
    const processingStartTime = Date.now();
    
    await StripeEventHandler.handleEvent(event);
    
    const processingTime = Date.now() - processingStartTime;
    const totalTime = Date.now() - startTime;
    
    console.log(`✅ Événement ${event.type} traité avec succès`);
    console.log(`⏱️ Temps de traitement: ${processingTime}ms`);
    console.log(`⏱️ Temps total: ${totalTime}ms`);
    console.log('🔔 ===== WEBHOOK TRAITÉ =====');

    // 3. Confirmer la réception de l'événement à Stripe
    return NextResponse.json({ 
      received: true, 
      eventType: event.type,
      eventId: event.id,
      processingTime: `${processingTime}ms`
    });
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Erreur lors du traitement du webhook ${event.type}:`, error);
    console.error(`❌ Temps écoulé avant erreur: ${totalTime}ms`);
    console.log('🔔 ===== WEBHOOK ÉCHEC =====');
    return NextResponse.json({ 
      error: "Internal server error",
      eventType: event.type,
      eventId: event.id
    }, { status: 500 });
  }
}
