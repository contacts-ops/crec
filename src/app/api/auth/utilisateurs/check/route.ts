import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Utilisateur } from '@/lib/models/Utilisateur';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const siteId = searchParams.get('siteId');
    if (!email) {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      );
    }

    // Connexion à la base de données MongoDB
    await connectToDatabase();
    
    // Vérifier si un utilisateur avec cet email existe déjà
    const existingUser = await Utilisateur.findOne({ email: email.toLowerCase(), siteId: siteId });
    return NextResponse.json({
      exists: !!existingUser,
      email: email
    });
    
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
