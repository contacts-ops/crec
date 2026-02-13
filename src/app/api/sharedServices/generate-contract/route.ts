import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Form } from '@/lib/models/Form';
import { Entreprise } from '@/lib/models/Entreprise';

export async function POST(request: NextRequest) {
  try {
    const { formData, entrepriseInfo, includeSignature = true } = await request.json();
    
    console.log('[GenerateContract] Données reçues:', { 
      formData: !!formData, 
      entrepriseInfo: !!entrepriseInfo, 
      includeSignature 
    });

    if (!formData) {
      return NextResponse.json(
        { error: 'Données du formulaire manquantes' },
        { status: 400 }
      );
    }

    // Connexion à la base de données
    await connectToDatabase();

    // Récupérer la dernière version du formulaire depuis la BDD
    const latestForm = await Form.findById(formData._id).sort({ updatedAt: -1 });

    if (!latestForm) {
      return NextResponse.json(
        { error: 'Formulaire non trouvé' },
        { status: 404 }
      );
    }

    console.log('[GenerateContract] Formulaire récupéré:', latestForm);

    // Si on a les infos entreprise, les récupérer aussi
    let entrepriseData = entrepriseInfo;
    if (!entrepriseData && latestForm.siteId) {
      entrepriseData = await Entreprise.findOne({ siteId: latestForm.siteId });
      console.log('[GenerateContract] Infos entreprise récupérées:', entrepriseData);
    }

    // Pour l'instant, retourner le contrat existant avec un timestamp
    // TODO: Implémenter la génération complète du PDF avec les infos entreprise
    let contratUrl = latestForm.contratPdf;
    
    if (contratUrl) {
      // Ajouter un timestamp pour éviter le cache
      const separator = contratUrl.includes('?') ? '&' : '?';
      contratUrl = `${contratUrl}${separator}t=${Date.now()}`;
      
      console.log('[GenerateContract] URL du contrat avec timestamp:', contratUrl);
      
      // Retourner l'URL du contrat existant
      return NextResponse.json({
        success: true,
        contratUrl: contratUrl,
        message: 'Contrat récupéré avec succès'
      });
    } else {
      return NextResponse.json(
        { error: 'Aucun contrat PDF trouvé pour ce formulaire' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('[GenerateContract] Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du contrat' },
      { status: 500 }
    );
  }
}
