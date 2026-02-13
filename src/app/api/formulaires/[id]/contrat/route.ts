import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import { Form } from '../../../../../lib/models/Form';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("🔍 Début de la requête POST /api/formulaires/[id]/contrat");
    console.log("🔍 ID du formulaire:", params.id);
    
    const body = await request.json();
    console.log("🔍 Données reçues:", { contratPdf: body.contratPdf ? 'Base64 présent' : 'Base64 absent' });
    
    const { contratPdf } = body;

    if (!contratPdf) {
      return NextResponse.json(
        { error: 'Contrat PDF manquant' },
        { status: 400 }
      );
    }

    // Connexion à la base de données MongoDB
    await connectToDatabase();
    
    // Mettre à jour le formulaire avec le contrat PDF
    const updatedForm = await Form.findByIdAndUpdate(
      params.id,
      { contratPdf },
      { new: true }
    );

    if (!updatedForm) {
      return NextResponse.json(
        { error: 'Formulaire non trouvé' },
        { status: 404 }
      );
    }

    console.log("✅ Contrat PDF ajouté au formulaire:", updatedForm._id);
    
    return NextResponse.json({
      success: true,
      message: 'Contrat PDF ajouté avec succès',
      id: updatedForm._id.toString()
    });

  } catch (error) {
    console.error("❌ Erreur lors de l'ajout du contrat PDF:", error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
