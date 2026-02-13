import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Abonnement } from '@/lib/models/Abonnement';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    console.log("🔍 DEBUG - get-abonnements-domiciliation appelé avec siteId:", siteId);

    if (!siteId) {
      console.log("❌ DEBUG - Site ID manquant");
      return NextResponse.json(
        { error: 'Site ID requis' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    console.log("🔍 DEBUG - Connexion à la base de données établie");
    
    // Récupérer les abonnements de type domiciliation pour ce site
    const abonnements = await Abonnement.find({ 
      siteId, 
      type: 'domiciliation',
      actif: true 
    }).sort({ prix: 1 });

    console.log("🔍 DEBUG - Abonnements trouvés:", abonnements.length);

    return NextResponse.json({
      success: true,
      abonnements: abonnements,
      message: 'Abonnements de domiciliation récupérés avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des abonnements de domiciliation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des abonnements' },
      { status: 500 }
    );
  }
}
