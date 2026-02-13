import { connectToDatabase } from '@/lib/db';
import { Site } from '@/lib/models/Site';

interface StripeKeys {
  stripeSecretKey?: string;
  stripePublishableKey?: string;
  isTestMode?: boolean;
}

interface SiteWithStripe {
  name: string;
  stripe?: {
    // Ancienne structure (legacy)
    publicKey?: string;
    secretKey?: string;
    webhookSecret?: string;
    // Nouvelle structure séparant test et live
    testPublicKey?: string;
    testSecretKey?: string;
    livePublicKey?: string;
    liveSecretKey?: string;
    isTestMode?: boolean;
    isConfigured?: boolean;
  };
}

export async function getStripeKeysFromDatabase(siteId: string, forceTestMode?: boolean): Promise<StripeKeys> {
  try {
    await connectToDatabase();
    
    const isDev = process.env.NODE_ENV === "development"
    if (isDev) {
      forceTestMode = forceTestMode ?? true;
    }

    console.log(`🔍 Recherche du site avec l'ID: ${siteId}`);
    console.log(`🔍 Mode test forcé: ${forceTestMode}`);
    
    // Récupérer le site depuis la base de données
    const site = await Site.findOne({ siteId }).lean() as SiteWithStripe | null;
    
    if (!site) {
      console.log(`❌ Site non trouvé pour l'ID: ${siteId}`);
      return {};
    }

    console.log(`✅ Site trouvé: ${site.name}`);
    console.log(`🔧 Configuration Stripe:`, {
      hasStripe: !!site.stripe,
      isConfigured: site.stripe?.isConfigured,
      isTestMode: site.stripe?.isTestMode,
      hasTestSecretKey: !!site.stripe?.testSecretKey,
      hasLiveSecretKey: !!site.stripe?.liveSecretKey,
      hasLegacySecretKey: !!site.stripe?.secretKey
    });

    // Vérifier si Stripe est configuré pour ce site
    if (!site.stripe || !site.stripe.isConfigured) {
      console.log(`❌ Configuration Stripe non trouvée pour le site ${site.name}`);
      return {};
    }

    // Déterminer le mode (test ou live) basé sur isTestMode
    // Priorité au paramètre forceTestMode, sinon utiliser la config du site
    const isTestMode = forceTestMode || (site.stripe.isTestMode ?? true);
    console.log(`Mode Stripe pour le site ${site.name}: ${isTestMode ? 'TEST' : 'LIVE'}`);

    // Sélectionner les clés appropriées selon le mode
    let selectedSecretKey: string | undefined;
    let selectedPublicKey: string | undefined;

    if (isTestMode) {
      // Mode test : utiliser les clés de test, avec fallback sur les anciennes clés
      selectedSecretKey = site.stripe.testSecretKey || site.stripe.secretKey;
      selectedPublicKey = site.stripe.testPublicKey || site.stripe.publicKey;
    } else {
      // Mode live : utiliser les clés de production
      selectedSecretKey = site.stripe.liveSecretKey;
      selectedPublicKey = site.stripe.livePublicKey;
    }

    if (!selectedSecretKey) {
      console.log(`Clé secrète Stripe manquante pour le mode ${isTestMode ? 'test' : 'live'} du site ${site.name}`);
      return {};
    }

    console.log(`Clés Stripe trouvées pour le site ${site.name} (mode: ${isTestMode ? 'TEST' : 'LIVE'})`);
    return {
      stripeSecretKey: selectedSecretKey,
      stripePublishableKey: selectedPublicKey,
      isTestMode: isTestMode
    };
    
  } catch (error) {
    console.error('Erreur lors de la récupération des clés Stripe:', error);
    return {};
  }
} 