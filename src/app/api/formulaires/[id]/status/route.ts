import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import { Form } from '../../../../../lib/models/Form';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("Début de la requête GET /api/formulaires/[id]/status");
    
    const { id } = params;

    console.log("Récupération du statut pour l'ID:", id);

    // Connexion à la base de données
    await connectToDatabase();
    
    // Récupérer le formulaire dans MongoDB
    const form = await Form.findById(id);
    
    if (!form) {
      console.log("Formulaire non trouvé dans MongoDB");
      return NextResponse.json(
        { error: 'Formulaire non trouvé' },
        { status: 404 }
      );
    }
    
    console.log("Statut récupéré avec succès:", form.status);

    return NextResponse.json({
      success: true,
      status: form.status,
      data: { id, status: form.status }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du statut:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("🔧 DEBUG: Début de la requête PATCH /api/formulaires/[id]/status");
    
    const { id } = params;
    const body = await request.json();
    const { status } = body;

    console.log("🔧 DEBUG: Mise à jour du statut:", { id, status, statusType: typeof status });

    // Validation du statut
    const validStatuses = ['pending', 'processing', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      console.log("❌ DEBUG: Statut invalide:", status, "Statuts valides:", validStatuses);
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      );
    }

    // Connexion à la base de données
    console.log("🔌 DEBUG: Connexion à la base de données...");
    await connectToDatabase();
    console.log("✅ DEBUG: Connexion à la base de données réussie");
    
    // Mettre à jour le statut dans MongoDB
    console.log("📝 DEBUG: Mise à jour du formulaire avec ID:", id);
    const updatedForm = await Form.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    
    if (!updatedForm) {
      console.log("❌ DEBUG: Formulaire non trouvé dans MongoDB");
      return NextResponse.json(
        { error: 'Formulaire non trouvé' },
        { status: 404 }
      );
    }
    
    console.log("✅ DEBUG: Statut mis à jour avec succès dans MongoDB:", {
      id: updatedForm._id,
      email: updatedForm.email,
      status: updatedForm.status,
      updatedAt: updatedForm.updatedAt
    });

    const response = {
      success: true,
      message: 'Statut mis à jour avec succès',
      data: { id, status }
    };
    
    console.log("📤 DEBUG: Réponse envoyée:", response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ DEBUG: Erreur lors de la mise à jour du statut:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
} 