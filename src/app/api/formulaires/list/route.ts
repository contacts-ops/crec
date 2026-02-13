import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import { Form } from '../../../../lib/models/Form';

export async function GET(request: NextRequest) {
  try {
    console.log("Début de la requête GET /api/formulaires/list");
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const siteId = searchParams.get('siteId');

    console.log("Paramètres de recherche:", { page, limit, status, search, siteId });

    // Connexion à la base de données
    await connectToDatabase();
    console.log("✅ Connexion à MongoDB réussie");

    // Construire la requête MongoDB
    let query: any = {};

    // Filtrer par siteId si spécifié
    if (siteId) {
      query.siteId = siteId;
      console.log("🔍 Filtrage par siteId:", siteId);
    }

    if (status) {
      query.status = status;
      console.log("🔍 Filtrage par status:", status);
    }

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { ceoFirstName: { $regex: search, $options: 'i' } },
        { ceoLastName: { $regex: search, $options: 'i' } }
      ];
      console.log("🔍 Recherche textuelle:", search);
    }

    console.log("🔍 Requête MongoDB construite:", JSON.stringify(query, null, 2));

    // Compter le total
    console.log("📊 Comptage des documents...");
    const total = await Form.countDocuments(query);
    console.log("📊 Total de documents trouvés:", total);

    // Récupérer les données avec pagination
    const skip = (page - 1) * limit;
    console.log("📄 Pagination: skip=", skip, "limit=", limit);

    // Essayer d'abord sans tri pour éviter les problèmes de mémoire
    let forms;
    try {
      forms = await Form.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .allowDiskUse(true)
        .lean();
      console.log("✅ Requête avec tri réussie");
    } catch (sortError) {
      console.warn("⚠️ Erreur avec tri, tentative sans tri:", sortError);
      // Fallback: récupérer sans tri
      forms = await Form.find(query)
        .skip(skip)
        .limit(limit)
        .lean();
      console.log("✅ Requête sans tri réussie");
    }

    console.log("📦 Données récupérées de MongoDB:", forms.length, "sur", total);
    console.log("📋 Premier document:", forms.length > 0 ? forms[0]._id : "Aucun document");

    return NextResponse.json({
      success: true,
      data: forms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des formulaires:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur', 
      details: error instanceof Error ? error.message : 'Erreur inconnue' 
    }, { status: 500 });
  }
} 