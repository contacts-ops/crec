import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Entreprise } from '@/lib/models/Entreprise';
import mongoose from 'mongoose';

// Interface pour les mots-clés
interface BlogKeywords {
  _id?: string;
  siteId: string;
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

// GET - Récupérer les mots-clés d'un site
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json(
        { error: 'Le siteId est requis' },
        { status: 400 }
      );
    }

    // Connexion à la base de données
    await connectToDatabase();

    // Récupérer l'entreprise pour vérifier l'existence du site
    const entreprise = await Entreprise.findOne({ siteId });
    if (!entreprise) {
      return NextResponse.json(
        { error: 'Site non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer ou créer la collection des mots-clés
    const db = mongoose.connection.db;
    const keywordsCollection = db.collection('blog_keywords');
    
    let keywordsDoc = await keywordsCollection.findOne({ siteId });
    
    if (!keywordsDoc) {
      // Créer un document vide si aucun n'existe
      keywordsDoc = {
        siteId,
        keywords: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await keywordsCollection.insertOne(keywordsDoc);
    }

    return NextResponse.json({
      success: true,
      keywords: keywordsDoc.keywords || []
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des mots-clés:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des mots-clés' },
      { status: 500 }
    );
  }
}

// POST - Ajouter un mot-clé
export async function POST(request: NextRequest) {
  try {
    const { keyword, siteId } = await request.json();

    if (!keyword || !siteId) {
      return NextResponse.json(
        { error: 'Le mot-clé et le siteId sont requis' },
        { status: 400 }
      );
    }

    // Connexion à la base de données
    await connectToDatabase();

    // Récupérer l'entreprise pour vérifier l'existence du site
    const entreprise = await Entreprise.findOne({ siteId });
    if (!entreprise) {
      return NextResponse.json(
        { error: 'Site non trouvé' },
        { status: 404 }
      );
    }

    // Normaliser le mot-clé
    const normalizedKeyword = keyword.trim().toLowerCase();

    // Récupérer ou créer la collection des mots-clés
    const db = mongoose.connection.db;
    const keywordsCollection = db.collection('blog_keywords');
    
    let keywordsDoc = await keywordsCollection.findOne({ siteId });
    
    if (!keywordsDoc) {
      // Créer un nouveau document
      keywordsDoc = {
        siteId,
        keywords: [normalizedKeyword],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await keywordsCollection.insertOne(keywordsDoc);
    } else {
      // Vérifier si le mot-clé existe déjà
      if (keywordsDoc.keywords.includes(normalizedKeyword)) {
        return NextResponse.json(
          { error: 'Ce mot-clé existe déjà' },
          { status: 409 }
        );
      }

      // Ajouter le mot-clé
      await keywordsCollection.updateOne(
        { siteId },
        {
          $push: { keywords: normalizedKeyword },
          $set: { updatedAt: new Date() }
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mot-clé ajouté avec succès',
      keyword: normalizedKeyword
    });

  } catch (error) {
    console.error('Erreur lors de l\'ajout du mot-clé:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'ajout du mot-clé' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un mot-clé
export async function DELETE(request: NextRequest) {
  try {
    const { keyword, siteId } = await request.json();

    if (!keyword || !siteId) {
      return NextResponse.json(
        { error: 'Le mot-clé et le siteId sont requis' },
        { status: 400 }
      );
    }

    // Connexion à la base de données
    await connectToDatabase();

    // Récupérer l'entreprise pour vérifier l'existence du site
    const entreprise = await Entreprise.findOne({ siteId });
    if (!entreprise) {
      return NextResponse.json(
        { error: 'Site non trouvé' },
        { status: 404 }
      );
    }

    // Normaliser le mot-clé
    const normalizedKeyword = keyword.trim().toLowerCase();

    // Récupérer la collection des mots-clés
    const db = mongoose.connection.db;
    const keywordsCollection = db.collection('blog_keywords');
    
    // Supprimer le mot-clé
    const result = await keywordsCollection.updateOne(
      { siteId },
      {
        $pull: { keywords: normalizedKeyword },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Aucun document de mots-clés trouvé pour ce site' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mot-clé supprimé avec succès',
      keyword: normalizedKeyword
    });

  } catch (error) {
    console.error('Erreur lors de la suppression du mot-clé:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la suppression du mot-clé' },
      { status: 500 }
    );
  }
}
