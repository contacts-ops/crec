import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import { Form } from '../../../../../lib/models/Form';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("Demande de document pour l'ID:", params.id);
    
    // Connexion à la base de données
    await connectToDatabase();
    
    // Récupérer le formulaire depuis MongoDB
    const formulaire = await Form.findById(params.id);
    
    if (!formulaire) {
      return NextResponse.json({
        success: false,
        message: 'Formulaire non trouvé'
      }, { status: 404 });
    }
    
    if (!formulaire.idCardFile) {
      return NextResponse.json({
        success: false,
        message: 'Aucun document fourni pour ce formulaire'
      }, { status: 404 });
    }
    
    // Retourner les informations du document
    return NextResponse.json({
      success: true,
      message: 'Document trouvé',
      data: {
        fileName: formulaire.idCardFile,
        uploadDate: formulaire.createdAt,
        formId: params.id
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération du document:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du document' },
      { status: 500 }
    );
  }
} 