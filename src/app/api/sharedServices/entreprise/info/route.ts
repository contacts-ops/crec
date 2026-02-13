import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Entreprise } from '@/lib/models/Entreprise';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    console.log("🔍 DEBUG - get-entreprise-info appelé avec siteId:", siteId);

    if (!siteId) {
      console.log("❌ DEBUG - Site ID manquant");
      return NextResponse.json(
        { error: 'Site ID requis' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    console.log("🔍 DEBUG - Connexion à la base de données établie");
    
    // Récupérer les informations de l'entreprise pour ce site
    const entreprise = await Entreprise.findOne({ siteId });
    console.log("🔍 DEBUG - Entreprise trouvée:", entreprise ? "Oui" : "Non");

    if (!entreprise) {
      console.log("❌ DEBUG - Entreprise non trouvée pour siteId:", siteId);
      return NextResponse.json(
        { error: 'Entreprise non trouvée' },
        { status: 404 }
      );
    }

    console.log("🔍 DEBUG - Informations entreprise trouvées:", {
      nom: entreprise.nom,
      siren: entreprise.siren,
      villeRcs: entreprise.villeRcs,
      adresseCentreAffaires: entreprise.adresseCentreAffaires,
      adresseSiege: entreprise.adresseSiege
    });

    // Construire l'adresse complète du siège social
    let adresseSiege = '';
    if (entreprise.siegeDifferent && entreprise.adresseSiege?.adresse) {
      // Si siège différent, utiliser l'adresse du siège
      adresseSiege = `${entreprise.adresseSiege.adresse}, ${entreprise.adresseSiege.codePostal} ${entreprise.adresseSiege.ville}`;
    } else {
      // Sinon utiliser l'adresse du centre d'affaires
      adresseSiege = `${entreprise.adresseCentreAffaires?.adresse || ''}, ${entreprise.adresseCentreAffaires?.codePostal || ''} ${entreprise.adresseCentreAffaires?.ville || ''}`;
    }

    // Récupérer le nom du représentant (priorité au champ dédié, sinon extraction depuis l'email)
    let representant = 'Représentant non configuré';
    if (entreprise.nomRepresentant) {
      representant = entreprise.nomRepresentant;
    } else if (entreprise.email) {
      const emailParts = entreprise.email.split('@');
      representant = emailParts[0] || 'Représentant non configuré';
    }

    const entrepriseInfo = {
      nom: entreprise.nom || 'Entreprise non configurée',
      adresse: adresseSiege,
      ville: entreprise.villeRcs || entreprise.adresseCentreAffaires?.ville || 'Ville non configurée',
      representant: representant,
      rcs: entreprise.siren || 'RCS non configuré',
      agrement: entreprise.arreteActivite || 'Agrément non configuré',
      email: entreprise.email || '',
      telephone: entreprise.telephone || '',
      logo: entreprise.logo || null,
      cachetSignature: entreprise.cachetSignature || null
    };

    console.log("🔍 DEBUG - Informations entreprise construites:", entrepriseInfo);

    return NextResponse.json({
      success: true,
      entrepriseInfo: entrepriseInfo,
      message: 'Informations entreprise récupérées avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des informations entreprise:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

