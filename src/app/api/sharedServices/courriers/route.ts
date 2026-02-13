import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Courrier } from '@/lib/models/Courrier';
import { Utilisateur } from '@/lib/models/Utilisateur';
import { uploadToS3 } from '@/lib/s3';

// GET - Récupérer tous les courriers d'un site
export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Début récupération courriers");
    await connectToDatabase();
    console.log("✅ Connexion DB établie");
    
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    console.log("🔍 Recherche pour siteId:", siteId);

    if (!siteId) {
      console.log("❌ siteId manquant");
      return NextResponse.json({ error: "siteId requis" }, { status: 400 });
    }

    // Récupérer les courriers avec les informations utilisateur
    const courriers = await Courrier.find({ siteId }).sort({ dateCreation: -1 });
    console.log("✅ Courriers trouvés:", courriers.length);

    // Enrichir avec les données utilisateur
    const enrichedCourriers = await Promise.all(
      courriers.map(async (courrier) => {
        const utilisateur = await Utilisateur.findById(courrier.utilisateurId).select('firstName lastName email');
        return {
          ...courrier.toObject(),
          id: courrier._id.toString(),
          utilisateur: utilisateur ? {
            firstName: utilisateur.firstName,
            lastName: utilisateur.lastName,
            email: utilisateur.email,
          } : null,
        };
      })
    );

    // Calculer les statistiques
    const stats = {
      total: courriers.length,
      parUtilisateur: {} as Record<string, number>
    };

    // Calculer les statistiques par utilisateur
    enrichedCourriers.forEach(courrier => {
      const userName = courrier.utilisateur 
        ? `${courrier.utilisateur.firstName} ${courrier.utilisateur.lastName}`
        : "Utilisateur inconnu";
      stats.parUtilisateur[userName] = (stats.parUtilisateur[userName] || 0) + 1;
    });

    console.log("📤 Retour stats:", stats);
    return NextResponse.json({ 
      courriers: enrichedCourriers, 
      stats 
    }, { status: 200 });

  } catch (error) {
    console.error("❌ Erreur récupération courriers:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des courriers" },
      { status: 500 }
    );
  }
}

// POST - Créer un nouveau courrier
export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Début création courrier");
    await connectToDatabase();
    console.log("✅ Connexion DB établie");

    const formData = await request.formData();
    
    const titre = formData.get('titre') as string;
    const description = formData.get('description') as string;
    const utilisateurId = formData.get('utilisateurId') as string;
    const statut = formData.get('statut') as string;
    const siteId = formData.get('siteId') as string;
    // Multi-fichiers (nouveau)
    const fichiers = formData.getAll('fichiers') as File[];
    // Legacy (ancien champ)
    const fichier = formData.get('fichier') as File;

    console.log("📝 Données reçues:", { 
      titre, 
      description, 
      utilisateurId, 
      statut, 
      siteId, 
      fichier: fichier ? fichier.name : 'aucun' 
    });

    // Validation des champs requis
    if (!titre?.trim()) {
      return NextResponse.json({ error: "Le titre est requis" }, { status: 400 });
    }
    if (!utilisateurId?.trim()) {
      return NextResponse.json({ error: "L'utilisateur est requis" }, { status: 400 });
    }
    if (!siteId?.trim()) {
      return NextResponse.json({ error: "Le siteId est requis" }, { status: 400 });
    }
    if ((!fichiers || fichiers.length === 0) && !fichier) {
      return NextResponse.json({ error: "Le fichier est requis" }, { status: 400 });
    }

    // Vérifier que l'utilisateur existe
    const utilisateur = await Utilisateur.findById(utilisateurId);
    if (!utilisateur) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    // Préparer la liste finale des fichiers à uploader
    const toUpload: File[] = (fichiers && fichiers.length > 0) ? fichiers.slice(0, 5) : (fichier ? [fichier] : []);
    console.log("📦 Nombre de fichiers reçus:", fichiers?.length || 0, "; legacy présent:", !!fichier);

    const uploadedList: { nom: string; url: string; type: 'pdf' | 'image'; taille: number }[] = [];

    console.log(`☁️ Upload vers S3 de ${toUpload.length} fichier(s)...`);
    for (let i = 0; i < toUpload.length; i++) {
      const f = toUpload[i];
      console.log(`📁 Upload fichier ${i + 1}/${toUpload.length}: ${f.name} (${f.size} bytes, ${f.type})`);
      
      if (!allowedTypes.includes(f.type)) {
        console.error(`❌ Type de fichier non autorisé: ${f.type}`);
        return NextResponse.json({ 
          error: "Type de fichier non autorisé. Seuls les PDF et les images sont acceptés." 
        }, { status: 400 });
      }
      if (f.size > 10 * 1024 * 1024) {
        console.error(`❌ Fichier trop volumineux: ${f.size} bytes`);
        return NextResponse.json({ 
          error: "Le fichier est trop volumineux. Taille maximale: 10MB" 
        }, { status: 400 });
      }

      try {
        const timestamp = Date.now();
        const extension = f.name.split('.').pop();
        const fileName = `courriers/${siteId}/courrier_${timestamp}_${Math.random().toString(36).substring(2)}.${extension}`;
        const bytes = await f.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileUrl = await uploadToS3(buffer, fileName, f.type);
        const fileType = f.type.startsWith('image/') ? 'image' : 'pdf';
        uploadedList.push({ nom: f.name, url: fileUrl, type: fileType, taille: f.size });
        console.log(`✅ Fichier ${f.name} uploadé avec succès: ${fileUrl}`);
      } catch (uploadError) {
        console.error(`❌ Erreur upload fichier ${f.name}:`, uploadError);
        return NextResponse.json({ 
          error: `Erreur lors de l'upload du fichier ${f.name}` 
        }, { status: 500 });
      }
    }

    // Créer le courrier en base (multi)
    const nouveauCourrier = await Courrier.create({
      titre: titre.trim(),
      description: description?.trim() || undefined,
      fichiers: uploadedList,
      // maintenir legacy pour compat (premier fichier)
      fichier: uploadedList[0] ? { ...uploadedList[0] } : undefined,
      siteId,
      utilisateurId,
      statut: statut || 'nouveau',
      dateCreation: new Date(),
    });

    console.log("✅ Courrier créé:", nouveauCourrier._id, "avec", uploadedList.length, "fichier(s)");
    console.log("📎 Fichiers sauvegardés:", uploadedList.map(f => ({ nom: f.nom, url: f.url, type: f.type })));

    // Enrichir avec les données utilisateur pour la réponse
    const courrierAvecUtilisateur = {
      ...nouveauCourrier.toObject(),
      id: nouveauCourrier._id.toString(),
      utilisateur: {
        firstName: utilisateur.firstName,
        lastName: utilisateur.lastName,
        email: utilisateur.email,
      },
    };

    return NextResponse.json(courrierAvecUtilisateur, { status: 201 });

  } catch (error) {
    console.error("❌ Erreur création courrier:", error);
    
    if (error instanceof Error) {
      // Erreurs de validation Mongoose
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values((error as any).errors).map((err: any) => err.message);
        return NextResponse.json({ 
          error: "Erreur de validation", 
          details: validationErrors 
        }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Erreur lors de la création du courrier" },
      { status: 500 }
    );
  }
} 