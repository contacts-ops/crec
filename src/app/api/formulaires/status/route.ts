import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import { Form } from '../../../../lib/models/Form';

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 DEBUG: Début de la requête GET /api/formulaires/status");
    
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const siteId = searchParams.get('siteId');

    console.log("📧 DEBUG: Récupération du statut pour:", { email, siteId });

    if (!email) {
      console.log("❌ DEBUG: Email requis manquant");
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      );
    }

    // Connexion à la base de données
    console.log("🔌 DEBUG: Connexion à la base de données...");
    await connectToDatabase();
    console.log("✅ DEBUG: Connexion à la base de données réussie");
    
    // Construire la requête de recherche
    const query: any = { email };
    if (siteId) {
      query.siteId = siteId;
    }
    
    console.log("🔍 DEBUG: Requête de recherche:", query);
    
    // Récupérer le formulaire le plus récent pour cet email
    const form = await Form.findOne(query).sort({ createdAt: -1 });
    
    if (!form) {
      console.log("❌ DEBUG: Aucun formulaire trouvé pour cet email");
      return NextResponse.json(
        { error: 'Formulaire non trouvé' },
        { status: 404 }
      );
    }
    
    console.log("✅ DEBUG: Formulaire trouvé:", {
      id: form._id,
      email: form.email,
      status: form.status,
      siteId: form.siteId,
      createdAt: form.createdAt
    });

    const response = {
      success: true,
      status: form.status,
      data: { id: form._id, status: form.status }
    };
    
    console.log("📤 DEBUG: Réponse envoyée:", response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ DEBUG: Erreur lors de la récupération du statut:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
