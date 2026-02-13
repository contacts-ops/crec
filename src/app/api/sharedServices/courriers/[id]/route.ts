import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Courrier } from '@/lib/models/Courrier';
import { Utilisateur } from '@/lib/models/Utilisateur';
import { deleteFromS3 } from '@/lib/s3';

// PUT - Modifier un courrier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("🔄 Début modification courrier");
    await connectToDatabase();
    console.log("✅ Connexion DB établie");

    const { id } = await params;
    const updateData = await request.json();

    console.log("📝 Données de modification:", { id, updateData });

    // Validation de l'ID
    if (!id) {
      return NextResponse.json({ error: "ID du courrier requis" }, { status: 400 });
    }

    // Vérifier que le courrier existe
    const courrier = await Courrier.findById(id);
    if (!courrier) {
      return NextResponse.json({ error: "Courrier non trouvé" }, { status: 404 });
    }

    // Validation des données
    if (updateData.titre && typeof updateData.titre !== 'string') {
      return NextResponse.json({ error: "Le titre doit être une chaîne de caractères" }, { status: 400 });
    }

    if (updateData.statut && !['nouveau', 'lu', 'traite', 'archive'].includes(updateData.statut)) {
      return NextResponse.json({ 
        error: "Le statut doit être nouveau, lu, traite ou archive" 
      }, { status: 400 });
    }

    // Préparer les données de mise à jour
    const dataToUpdate: any = {
      dateModification: new Date(),
    };

    if (updateData.titre) {
      dataToUpdate.titre = updateData.titre.trim();
    }

    if (updateData.description !== undefined) {
      dataToUpdate.description = updateData.description?.trim() || undefined;
    }

    if (updateData.statut) {
      dataToUpdate.statut = updateData.statut;
    }

    // Mettre à jour le courrier
    const courrierMisAJour = await Courrier.findByIdAndUpdate(
      id,
      dataToUpdate,
      { 
        new: true, 
        runValidators: true 
      }
    );

    if (!courrierMisAJour) {
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }

    console.log("✅ Courrier mis à jour:", courrierMisAJour._id);

    // Enrichir avec les données utilisateur pour la réponse
    const utilisateur = await Utilisateur.findById(courrierMisAJour.utilisateurId).select('firstName lastName email');
    
    const courrierAvecUtilisateur = {
      ...courrierMisAJour.toObject(),
      id: courrierMisAJour._id.toString(),
      utilisateur: utilisateur ? {
        firstName: utilisateur.firstName,
        lastName: utilisateur.lastName,
        email: utilisateur.email,
      } : null,
    };

    return NextResponse.json(courrierAvecUtilisateur, { status: 200 });

  } catch (error) {
    console.error("❌ Erreur modification courrier:", error);
    
    if (error instanceof Error) {
      // Erreurs de validation Mongoose
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values((error as any).errors).map((err: any) => err.message);
        return NextResponse.json({ 
          error: "Erreur de validation", 
          details: validationErrors 
        }, { status: 400 });
      }

      // Erreur de cast (ID invalide)
      if (error.name === 'CastError') {
        return NextResponse.json({ error: "ID de courrier invalide" }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Erreur lors de la modification du courrier" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un courrier
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("🔄 Début suppression courrier");
    await connectToDatabase();
    console.log("✅ Connexion DB établie");

    const { id } = await params;
    console.log("🗑️ Suppression courrier ID:", id);

    // Validation de l'ID
    if (!id) {
      return NextResponse.json({ error: "ID du courrier requis" }, { status: 400 });
    }

    // Récupérer le courrier avant suppression pour obtenir les infos du fichier
    const courrier = await Courrier.findById(id);
    if (!courrier) {
      return NextResponse.json({ error: "Courrier non trouvé" }, { status: 404 });
    }

    // Supprimer le(s) fichier(s) de S3
    try {
      const files = (courrier.fichiers && courrier.fichiers.length ? courrier.fichiers : (courrier.fichier ? [courrier.fichier] : []));
      for (const f of files) {
        const fileName = f.url.split('/').slice(-3).join('/');
        await deleteFromS3(fileName);
        console.log("🗑️ Fichier supprimé de S3:", fileName);
      }
    } catch (fileError) {
      console.warn("⚠️ Erreur lors de la suppression du fichier S3:", fileError);
      // On continue même si la suppression du fichier échoue
    }

    // Supprimer le courrier de la base de données
    const courrierSupprime = await Courrier.findByIdAndDelete(id);
    
    if (!courrierSupprime) {
      return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
    }

    console.log("✅ Courrier supprimé:", courrierSupprime._id);

    return NextResponse.json({ 
      message: "Courrier supprimé avec succès",
      id: courrierSupprime._id.toString()
    }, { status: 200 });

  } catch (error) {
    console.error("❌ Erreur suppression courrier:", error);
    
    if (error instanceof Error) {
      // Erreur de cast (ID invalide)
      if (error.name === 'CastError') {
        return NextResponse.json({ error: "ID de courrier invalide" }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Erreur lors de la suppression du courrier" },
      { status: 500 }
    );
  }
}

// GET - Récupérer un courrier spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("🔄 Début récupération courrier");
    await connectToDatabase();
    console.log("✅ Connexion DB établie");

    const { id } = await params;
    console.log("🔍 Recherche courrier ID:", id);

    // Validation de l'ID
    if (!id) {
      return NextResponse.json({ error: "ID du courrier requis" }, { status: 400 });
    }

    // Récupérer le courrier
    const courrier = await Courrier.findById(id);
    if (!courrier) {
      return NextResponse.json({ error: "Courrier non trouvé" }, { status: 404 });
    }

    // Enrichir avec les données utilisateur
    const utilisateur = await Utilisateur.findById(courrier.utilisateurId).select('firstName lastName email');
    
    const courrierAvecUtilisateur = {
      ...courrier.toObject(),
      id: courrier._id.toString(),
      utilisateur: utilisateur ? {
        firstName: utilisateur.firstName,
        lastName: utilisateur.lastName,
        email: utilisateur.email,
      } : null,
    };

    console.log("✅ Courrier trouvé:", courrier._id);
    return NextResponse.json(courrierAvecUtilisateur, { status: 200 });

  } catch (error) {
    console.error("❌ Erreur récupération courrier:", error);
    
    if (error instanceof Error) {
      // Erreur de cast (ID invalide)
      if (error.name === 'CastError') {
        return NextResponse.json({ error: "ID de courrier invalide" }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Erreur lors de la récupération du courrier" },
      { status: 500 }
    );
  }
} 