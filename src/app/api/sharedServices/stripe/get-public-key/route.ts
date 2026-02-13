import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Site } from '@/lib/models/Site';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const isTestMode = searchParams.get('isTestMode') === 'true';

    if (!siteId) {
      return NextResponse.json(
        { error: 'Site ID requis' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Récupérer la configuration Stripe pour ce site
    const site = await Site.findOne({ siteId });

    if (!site) {
      return NextResponse.json(
        { error: 'Site non trouvé' },
        { status: 404 }
      );
    }

    if (!site.stripe?.isConfigured) {
      return NextResponse.json(
        { error: 'Configuration Stripe non trouvée pour ce site' },
        { status: 404 }
      );
    }

    // Sélectionner la clé publique selon le mode (test/live)
    let publicKey;
    if (isTestMode) {
      publicKey = site.stripe?.testPublicKey || site.stripe?.publicKey;
    } else {
      publicKey = site.stripe?.livePublicKey || site.stripe?.publicKey;
    }

    if (!publicKey) {
      return NextResponse.json(
        { error: `Clé publique Stripe non configurée pour le mode ${isTestMode ? 'test' : 'live'}` },
        { status: 404 }
      );
    }

    // Déchiffrer la clé publique (elle est stockée en base64)
    try {
      // Si la clé commence par "base64:", on la déchiffre
      if (publicKey.startsWith('base64:')) {
        publicKey = Buffer.from(publicKey.substring(7), 'base64').toString('utf-8');
      }
    } catch (error) {
      console.error('Erreur lors du déchiffrement de la clé publique:', error);
      // En cas d'erreur, on utilise la clé telle quelle
    }


    // Récupérer les informations de l'entreprise depuis la configuration générale

    // Extraire la ville de l'adresse complète
    let ville = 'Ville non configurée';
    if (site.general?.address) {
      const addressParts = site.general.address.split(',');
      ville = addressParts[addressParts.length - 1]?.trim() || 'Ville non configurée';
    }

    // Extraire le nom du représentant depuis l'email
    let representant = 'Représentant non configuré';
    if (site.general?.contactEmail) {
      const emailParts = site.general.contactEmail.split('@');
      representant = emailParts[0] || 'Représentant non configuré';
    }

    const entrepriseInfo = {
      nom: site.general?.siteName || site.name || 'Entreprise non configurée',
      adresse: site.general?.address || 'Adresse non configurée',
      ville: ville,
      representant: representant,
      rcs: 'RCS non configuré', // À configurer dans l'administration
      agrement: 'Agrément non configuré', // À configurer dans l'administration
    };


    return NextResponse.json({
      publicKey: publicKey,
      entrepriseInfo: entrepriseInfo,
      message: 'Clé publique et informations entreprise récupérées avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la clé publique Stripe:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
