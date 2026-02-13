import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import { Form } from '../../../../../lib/models/Form';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("Début de la requête PATCH /api/formulaires/[id]/update");
    console.log("ID du formulaire:", params.id);
    
    const body = await request.json();
    console.log("Données de mise à jour reçues:", body);
    
    const { contratPdf } = body;

    if (!contratPdf) {
      return NextResponse.json(
        { 
          error: 'Contrat PDF requis',
          details: 'Le contrat PDF doit être fourni pour la mise à jour'
        },
        { status: 400 }
      );
    }

    try {
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
          { 
            error: 'Formulaire non trouvé',
            details: 'Aucun formulaire trouvé avec cet ID'
          },
          { status: 404 }
        );
      }

      console.log("Formulaire mis à jour avec succès:", updatedForm._id);
      
      return NextResponse.json({
        success: true,
        message: 'Formulaire mis à jour avec succès',
        id: updatedForm._id.toString()
      });
      
    } catch (error) {
      console.error("❌ Erreur MongoDB:", error);
      
      let errorMessage = 'Erreur de base de données';
      let errorDetails = 'Une erreur est survenue lors de la mise à jour des données';
      
      if (error instanceof Error) {
        if (error.message.includes('Cast to ObjectId failed')) {
          errorMessage = 'ID de formulaire invalide';
          errorDetails = 'L\'ID du formulaire fourni n\'est pas valide';
        } else if (error.message.includes('validation failed')) {
          errorMessage = 'Données invalides';
          errorDetails = 'Les données ne respectent pas le format attendu';
        } else if (error.message.includes('connection')) {
          errorMessage = 'Erreur de connexion';
          errorDetails = 'Impossible de se connecter à la base de données';
        }
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: errorDetails
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Erreur lors de la mise à jour du formulaire:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
