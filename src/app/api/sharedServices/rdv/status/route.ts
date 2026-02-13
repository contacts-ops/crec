import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { RendezVous } from '@/lib/models/RendezVous';

export async function PUT(request: NextRequest) {
  try {
    console.log("Début de la requête PUT /api/rdv/status");
    
    const body = await request.json();
    console.log("Données reçues:", body);
    
    const {
      rdvId,
      status
    } = body;

    // Validation des champs requis
    if (!rdvId) {
      return NextResponse.json(
        { 
          error: 'ID du rendez-vous manquant',
          details: 'Veuillez fournir l\'ID du rendez-vous'
        },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { 
          error: 'Statut manquant',
          details: 'Veuillez fournir le nouveau statut'
        },
        { status: 400 }
      );
    }

    // Validation du statut
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { 
          error: 'Statut invalide',
          details: `Le statut doit être l'un des suivants : ${validStatuses.join(', ')}`
        },
        { status: 400 }
      );
    }

    try {
      // Connexion à la base de données MongoDB
      await connectToDatabase();
      
      // Vérifier si le rendez-vous existe
      const existingRdv = await RendezVous.findById(rdvId);
      
      if (!existingRdv) {
        return NextResponse.json(
          { 
            error: 'Rendez-vous non trouvé',
            details: 'Le rendez-vous avec cet ID n\'existe pas'
          },
          { status: 404 }
        );
      }
      
      // Mettre à jour le statut
      const updatedRdv = await RendezVous.findByIdAndUpdate(
        rdvId,
        { 
          status,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      console.log(`✅ Statut du rendez-vous ${rdvId} mis à jour vers: ${status}`);

      // Fusion directe : confirmation Google Calendar si status === 'confirmed'
      if (status === 'confirmed' && existingRdv.googleEventId && existingRdv.hostEmail) {
        try {
          // Utilisation du service account pour Google Calendar
          const { google } = await import('googleapis');
          async function getGoogleAuthClient() {
            return new google.auth.GoogleAuth({
              credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
              },
              scopes: ["https://www.googleapis.com/auth/calendar"],
            });
          }
          const auth = await getGoogleAuthClient();
          const calendar = google.calendar({ version: "v3", auth });
          // Récupérer l'événement
          const event = await calendar.events.get({
            calendarId: 'primary', // Adapter si besoin
            eventId: existingRdv.googleEventId,
          });
          // Mettre à jour la participation de l'organisateur
          const attendees = event.data.attendees?.map(att => {
            if (att.email === existingRdv.hostEmail) {
              return { ...att, responseStatus: "accepted" };
            }
            return att;
          }) || [];
          await calendar.events.patch({
            calendarId: 'primary',
            eventId: existingRdv.googleEventId,
            requestBody: { attendees },
          });
          console.log('Confirmation Google Calendar réussie');
        } catch (err) {
          console.error('Erreur lors de la confirmation Google Calendar:', err);
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'Statut mis à jour avec succès',
        rdvId: updatedRdv._id.toString(),
        status: updatedRdv.status,
        updatedAt: updatedRdv.updatedAt.toISOString()
      });
      
    } catch (error) {
      console.error("❌ Erreur MongoDB:", error);
      
      // Déterminer le type d'erreur MongoDB
      let errorMessage = 'Erreur de base de données';
      let errorDetails = 'Une erreur est survenue lors de la mise à jour';
      
      if (error instanceof Error) {
        if (error.message.includes('validation failed')) {
          errorMessage = 'Données invalides';
          errorDetails = 'Le statut fourni ne respecte pas le format attendu';
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
    console.error('Erreur lors de la mise à jour du statut:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
} 