import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { RendezVous } from '@/lib/models/RendezVous';

export async function POST(request: NextRequest) {
  try {
    console.log("Début de la requête POST /api/rdv/list");
    
    const body = await request.json();
    console.log("Paramètres reçus:", body);
    
    const {
      siteId = 'all',
      page = 1,
      limit = 50,
      status,
      search
    } = body;

    try {
      // Connexion à la base de données MongoDB
      await connectToDatabase();
      
      // Construire la requête de filtrage
      const filter: any = {};
      
      // Filtrer par site si spécifié
      if (siteId && siteId !== 'all') {
        filter.siteId = siteId;
      }
      
      // Filtrer par statut si spécifié
      if (status && status !== 'all') {
        filter.status = status;
      }
      
      // Filtrer par recherche si spécifié
      if (search) {
        filter.$or = [
          { userName: { $regex: search, $options: 'i' } },
          { userEmail: { $regex: search, $options: 'i' } },
          { eventName: { $regex: search, $options: 'i' } },
          { hostName: { $regex: search, $options: 'i' } }
        ];
      }
      
      console.log("Filtre MongoDB:", filter);
      
      // Calculer le skip pour la pagination
      const skip = (page - 1) * limit;
      
      // Récupérer les rendez-vous avec pagination
      const rendezVous = await RendezVous.find(filter)
        .sort({ selectedDate: -1, selectedTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      // Compter le total pour la pagination
      const totalRendezVous = await RendezVous.countDocuments(filter);
      
      console.log(`Rendez-vous récupérés: ${rendezVous.length} sur ${totalRendezVous} total`);
      
      // Transformer les données pour l'API
      const transformedRendezVous = rendezVous.map((rdv: any) => ({
        id: rdv._id.toString(),
        siteId: rdv.siteId,
        hostName: rdv.hostName,
        eventName: rdv.eventName,
        // eventDescription: rdv.eventDescription, // Supprimé car on utilise additionalNotes
        callDuration: rdv.callDuration,
        location: rdv.location,
        timeZone: rdv.timeZone,
        userName: rdv.userName,
        userEmail: rdv.userEmail,
        hostEmail: rdv.hostEmail,
        selectedDate: rdv.selectedDate.toISOString(),
        selectedTime: rdv.selectedTime,
        additionalNotes: rdv.additionalNotes,
        status: rdv.status,
        createdAt: rdv.createdAt.toISOString(),
        updatedAt: rdv.updatedAt.toISOString()
      }));
      
      return NextResponse.json({
        success: true,
        rendezVous: transformedRendezVous,
        totalRendezVous,
        pagination: {
          page,
          limit,
          total: totalRendezVous,
          totalPages: Math.ceil(totalRendezVous / limit)
        }
      });
      
    } catch (error) {
      console.error("❌ Erreur MongoDB:", error);
      
      // Déterminer le type d'erreur MongoDB
      let errorMessage = 'Erreur de base de données';
      let errorDetails = 'Une erreur est survenue lors de la récupération des données';
      
      if (error instanceof Error) {
        if (error.message.includes('connection')) {
          errorMessage = 'Erreur de connexion';
          errorDetails = 'Impossible de se connecter à la base de données';
        } else if (error.message.includes('validation')) {
          errorMessage = 'Données invalides';
          errorDetails = 'Les paramètres de recherche ne sont pas valides';
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
    console.error('Erreur lors de la récupération des rendez-vous:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
} 