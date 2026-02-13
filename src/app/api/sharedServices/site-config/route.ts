import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Site } from '@/lib/models/Site';
import { hashKey, encryptKey } from '@/lib/utils/crypto';
import mongoose from 'mongoose';

// GET - Récupérer la configuration du site
export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId est requis' },
        { status: 400 }
      );
    }

    // Utiliser la collection native pour contourner le cache du schéma
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Connexion à la base de données non établie');
    }
    const sitesCollection = db.collection('sites');
    const config = await sitesCollection.findOne({ siteId });

    if (!config) {
      return NextResponse.json({
        success: true,
        config: {
          siteId,
          chatbot: { provider: 'crisp', websiteId: '', isEnabled: false, themeColor: '' },
          stripe: {
            isConfigured: false,
            isTestMode: true // Par défaut en mode test
          },
          googleCalendar: {
            isConfigured: false
          },
          email: {
            isConfigured: false
          },
          general: {}
        }
      });
    }

    const parseBoolean = (value: unknown): boolean => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lowered = value.toLowerCase().trim();
        if (lowered === 'true' || lowered === '1') return true;
        if (lowered === 'false' || lowered === '0' || lowered === '') return false;
      }
      return Boolean(value);
    };

    // Simplifier: ne plus inférer depuis legacy; ne renvoyer que les nouveaux champs

    // Assurer la présence des champs test/live dans la BDD (création si manquants) - uniquement 4 champs (sans webhooks)
    try {
      const ensureFields: Record<string, unknown> = {
        'stripe.testPublicKey': config?.stripe?.testPublicKey ?? '',
        'stripe.testSecretKey': config?.stripe?.testSecretKey ?? '',
        'stripe.livePublicKey': config?.stripe?.livePublicKey ?? '',
        'stripe.liveSecretKey': config?.stripe?.liveSecretKey ?? '',
      };
      await Site.updateOne({ siteId }, { $set: ensureFields }, { upsert: true });
    } catch {} 

    // Utiliser la configuration de la base de données
    const effectiveTestMode = parseBoolean(config.stripe?.isTestMode ?? true);



    return NextResponse.json({
      success: true,
      config: {
        siteId: config.siteId,
        chatbot: config.chatbot || { provider: 'crisp', websiteId: '', isEnabled: false, themeColor: '' },
        stripe: {
          isConfigured: parseBoolean(config.stripe?.isConfigured ?? false),
          isTestMode: effectiveTestMode,
          testPublicKey: config.stripe?.testPublicKey || '',
          testSecretKey: config.stripe?.testSecretKey || '',
          livePublicKey: config.stripe?.livePublicKey || '',
          liveSecretKey: config.stripe?.liveSecretKey || '',
        },
        googleCalendar: {
          isConfigured: config.googleCalendar?.isConfigured || false
        },
        email: {
          isConfigured: config.email?.isConfigured || false
        },
        general: config.general || {}
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la configuration:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la configuration' },
      { status: 500 }
    );
  }
}

// POST - Sauvegarder la configuration du site
export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { siteId, configType, configData } = body;

    if (!siteId || !configType) {
      return NextResponse.json(
        { error: 'siteId et configType sont requis' },
        { status: 400 }
      );
    }

    // Hasher/chiffrer les clés sensibles selon le type de configuration
    let processedConfigData = configData;

    const parseBoolean = (value: unknown): boolean => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lowered = value.toLowerCase().trim();
        if (lowered === 'true' || lowered === '1') return true;
        if (lowered === 'false' || lowered === '0' || lowered === '') return false;
      }
      return Boolean(value);
    };

    if (configType === 'chatbot') {
      // Données brutes; Crisp websiteId n'est pas sensible
      processedConfigData = {
        provider: 'crisp',
        websiteId: configData.websiteId || '',
        isEnabled: Boolean(configData.isEnabled),
        themeColor: configData.themeColor || '',
      };
    } else if (configType === 'stripe') {
      // TEMPORAIRE : Pas de hachage pour debug
      const testPublicKey = configData.testPublicKey || configData.publicKey || '';
      const testSecretKey = configData.testSecretKey || configData.secretKey || '';
      // Webhooks non gérés ici (réduire aux 4 champs demandés)
      const livePublicKey = configData.livePublicKey || '';
      const liveSecretKey = configData.liveSecretKey || '';
      

      // Dupliquer dans les champs legacy pour visibilité BDD
      const legacyPublic = testPublicKey || livePublicKey || '';
      const legacySecret = testSecretKey || liveSecretKey || '';
      const legacyWebhook = undefined;

      processedConfigData = {
        // Legacy toujours présents pour compat/visibilité
        publicKey: legacyPublic,
        secretKey: legacySecret,
        webhookSecret: legacyWebhook,
        // Nouveaux champs séparés
        testPublicKey,
        testSecretKey,
        livePublicKey,
        liveSecretKey,
        // pas de webhook
        // Mode courant: on conserve si fourni, sinon inchangé via findOneAndUpdate plus bas
        isTestMode: parseBoolean(configData.isTestMode),
        isConfigured: parseBoolean(configData.isConfigured ?? Boolean(legacySecret))
      };
    } else if (configType === 'googleCalendar') {
      processedConfigData = {
        clientId: encryptKey(configData.clientId || ''),
        clientSecret: await hashKey(configData.clientSecret || ''),
        refreshToken: configData.refreshToken ? await hashKey(configData.refreshToken) : undefined,
        isConfigured: configData.isConfigured
      };
    } else if (configType === 'email') {
      processedConfigData = {
        host: encryptKey(configData.host || ''),
        port: configData.port,
        username: encryptKey(configData.username || ''),
        password: await hashKey(configData.password || ''),
        isConfigured: configData.isConfigured
      };
    }

    // Récupérer la configuration existante
    const existingConfig = await Site.findOne({ siteId });

    let updatedConfig;

    if (existingConfig) {
      // Mettre à jour la configuration existante
      if (configType === 'chatbot') {
        // Utiliser un update non-strict pour contourner un éventuel modèle mis en cache sans le champ
        const updateResult = await Site.updateOne(
          { siteId },
          { $set: { chatbot: processedConfigData, lastUpdated: new Date() } },
          { strict: false }
        );

        // Utiliser une requête MongoDB native pour contourner le cache du schéma
        const db = mongoose.connection.db;
        if (!db) {
          throw new Error('Connexion à la base de données non établie');
        }
        const sitesCollection = db.collection('sites');

        // Mettre à jour avec la collection native
        await sitesCollection.updateOne(
          { siteId },
          { $set: { chatbot: processedConfigData, lastUpdated: new Date() } }
        );

        // Récupérer le document mis à jour avec la collection native
        const rawSite = await sitesCollection.findOne({ siteId });

        // Convertir en objet Mongoose pour la réponse
        updatedConfig = rawSite ? new Site(rawSite) : null;
      } else {
        const updateData: Record<string, unknown> = {};
        updateData[configType] = processedConfigData;
        updateData.lastUpdated = new Date();
        updatedConfig = await Site.findOneAndUpdate(
          { siteId },
          { $set: updateData },
          { new: true, runValidators: true }
        );
      }
    } else {
      // Créer une nouvelle configuration
      if (configType === 'chatbot') {
        await Site.updateOne(
          { siteId },
          { $set: { chatbot: processedConfigData, siteId, lastUpdated: new Date() } },
          { upsert: true, strict: false }
        );
        updatedConfig = await Site.findOne({ siteId });
      } else {
        const newConfigData: Record<string, unknown> = { siteId };
        newConfigData[configType] = processedConfigData;
        updatedConfig = await Site.create(newConfigData);
      }
    }

    // S'assurer que les champs test/live existent toujours dans le document (même vides)
    try {
      const ensureFields: Record<string, unknown> = {
        'stripe.testPublicKey': processedConfigData.testPublicKey ?? '',
        'stripe.testSecretKey': processedConfigData.testSecretKey ?? '',
        'stripe.livePublicKey': processedConfigData.livePublicKey ?? '',
        'stripe.liveSecretKey': processedConfigData.liveSecretKey ?? '',
      };
      await Site.updateOne({ siteId }, { $set: ensureFields });
    } catch (e) {
      console.warn('⚠️ Impossible de forcer la présence des champs test/live:', e);
    }


    return NextResponse.json({
      success: true,
      message: `Configuration ${configType} sauvegardée avec succès`,
      config: updatedConfig
    });

  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de la configuration:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde de la configuration' },
      { status: 500 }
    );
  }
}
