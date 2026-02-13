import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { RendezVous } from '@/lib/models/RendezVous';
import { Site } from '@/lib/models/Site';
import { google } from 'googleapis';

export async function DELETE(request: NextRequest) {
  try {
    console.log("Début de la requête DELETE /api/rdv/delete");
    
    const body = await request.json();
    console.log("Données reçues:", body);
    
    const {
      rdvId
    } = body;

    // Validation des champs requis
    if (!rdvId) {
      return NextResponse.json(
        { 
          error: 'ID du rendez-vous manquant',
          details: 'Veuillez fournir l\'ID du rendez-vous à supprimer'
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

      // Suppression Google Calendar si googleEventId présent
      if (existingRdv.googleEventId && existingRdv.siteId) {
        const site = await Site.findOne({ siteId: existingRdv.siteId });
        if (site && site.googleCalendar && site.googleCalendar.refreshToken) {
          try {
            const oAuth2Client = new google.auth.OAuth2(
              site.googleCalendar.clientId,
              site.googleCalendar.clientSecret,
              process.env.NEXT_PUBLIC_BASE_URL + '/api/sharedServices/auth/google/callback'
            );
            oAuth2Client.setCredentials({ refresh_token: site.googleCalendar.refreshToken });
            const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
            await calendar.events.delete({
              calendarId: 'primary',
              eventId: existingRdv.googleEventId,
              sendUpdates: 'all',
            });
            console.log(`✅ Événement Google Calendar ${existingRdv.googleEventId} supprimé (OAuth)`);
          } catch (err) {
            console.error('Erreur lors de la suppression Google Calendar (OAuth):', err);
          }
        } else {
          // Fallback : suppression via service account
          try {
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
            await calendar.events.delete({
              calendarId: 'primary',
              eventId: existingRdv.googleEventId,
            });
            console.log(`✅ Événement Google Calendar ${existingRdv.googleEventId} supprimé (service account)`);
          } catch (err) {
            console.error('Erreur lors de la suppression Google Calendar (service account):', err);
          }
        }
      }
      
      // Supprimer le rendez-vous
      await RendezVous.findByIdAndDelete(rdvId);
      
      console.log(`✅ Rendez-vous ${rdvId} supprimé avec succès`);
      
      return NextResponse.json({
        success: true,
        message: 'Rendez-vous supprimé avec succès',
        rdvId: rdvId
      });
      
    } catch (error) {
      console.error("❌ Erreur MongoDB:", error);
      
      // Déterminer le type d'erreur MongoDB
      let errorMessage = 'Erreur de base de données';
      let errorDetails = 'Une erreur est survenue lors de la suppression';
      
      if (error instanceof Error) {
        if (error.message.includes('connection')) {
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
    console.error('Erreur lors de la suppression du rendez-vous:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
} 