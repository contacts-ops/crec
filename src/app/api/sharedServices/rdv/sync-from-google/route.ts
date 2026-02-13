import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { RendezVous } from '@/lib/models/RendezVous';
import { Site } from '@/lib/models/Site';
import { google } from 'googleapis';

const DEFAULT_DURATION_MINUTES = 30;

// Fonction pour calculer la durée en minutes entre deux dates
const calculateDurationMinutes = (startDate: Date, endDate: Date): number => {
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.round(diffMs / (1000 * 60));
};

// Fonction pour formater la durée en string
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h${mins}min`;
};

// Fonction pour extraire l'heure depuis une date ISO en respectant le timezone
const extractTimeFromDate = (dateISO: string, timeZone?: string): string => {
  // Créer une date en utilisant le timezone spécifié ou UTC par défaut
  const date = new Date(dateISO);
  
  // Si un timezone est spécifié, convertir la date dans ce timezone
  if (timeZone) {
    // Utiliser toLocaleString pour obtenir l'heure dans le bon timezone
    const localTime = date.toLocaleString('en-US', {
      timeZone: timeZone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    return localTime;
  }
  
  // Sinon, utiliser l'heure locale de la date ISO (qui est déjà en UTC)
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Fonction pour extraire la date depuis une date ISO en respectant le timezone
const extractDateFromISO = (dateISO: string, timeZone?: string): Date => {
  const date = new Date(dateISO);
  
  if (timeZone) {
    // Obtenir la date dans le timezone spécifié
    const localDateStr = date.toLocaleString('en-US', {
      timeZone: timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    // Parser la date locale (format: MM/DD/YYYY)
    const [month, day, year] = localDateStr.split('/').map(Number);
    const localDate = new Date(year, month - 1, day);
    localDate.setHours(0, 0, 0, 0);
    return localDate;
  }
  
  // Sinon, utiliser la date UTC
  const utcDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
  return utcDate;
};

export async function POST(request: NextRequest) {
  try {
    console.log("Début de la requête POST /api/rdv/sync-from-google");
    
    const body = await request.json();
    console.log("Paramètres reçus:", body);
    
    const {
      siteId,
      startDate, // Date de début pour filtrer les événements (optionnel)
      endDate,   // Date de fin pour filtrer les événements (optionnel)
      maxResults = 250 // Nombre maximum d'événements à récupérer
    } = body;

    // Validation des champs requis
    if (!siteId) {
      return NextResponse.json(
        { 
          error: 'siteId manquant',
          details: 'Veuillez fournir le siteId'
        },
        { status: 400 }
      );
    }

    try {
      // Connexion à la base de données MongoDB
      await connectToDatabase();
      
      // Récupérer le site
      const site = await Site.findOne({ siteId });
      if (!site || !site.googleCalendar || !site.googleCalendar.refreshToken) {
        return NextResponse.json(
          { 
            error: 'Google Calendar non configuré pour ce site',
            details: 'Le site doit avoir Google Calendar configuré avec un refreshToken'
          },
          { status: 400 }
        );
      }

      // Authentification Google
      const oAuth2Client = new google.auth.OAuth2(
        site.googleCalendar.clientId,
        site.googleCalendar.clientSecret,
        process.env.NEXT_PUBLIC_BASE_URL + '/api/sharedServices/auth/google/callback'
      );
      oAuth2Client.setCredentials({ refresh_token: site.googleCalendar.refreshToken });
      const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

      // Préparer les paramètres de requête pour récupérer les événements
      const timeMin = startDate 
        ? new Date(startDate).toISOString()
        : new Date().toISOString(); // Par défaut, depuis maintenant
      
      const timeMax = endDate
        ? new Date(endDate).toISOString()
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // Par défaut, 1 an dans le futur

      console.log(`Récupération des événements Google Calendar du ${timeMin} au ${timeMax}`);

      // Récupérer les événements depuis Google Calendar
      const eventsResponse = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin,
        timeMax: timeMax,
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const googleEvents = eventsResponse.data.items || [];
      console.log(`✅ ${googleEvents.length} événements récupérés depuis Google Calendar`);

      // Récupérer tous les googleEventId existants dans MongoDB pour ce site avec leurs dates
      const existingRdv = await RendezVous.find({ 
        siteId: siteId,
        googleEventId: { $exists: true, $ne: null }
      }).select('googleEventId _id selectedDate').lean();
      
      const existingGoogleEventIds = new Set(
        existingRdv.map(rdv => rdv.googleEventId).filter(Boolean)
      );
      console.log(`📊 ${existingGoogleEventIds.size} RDV déjà synchronisés dans MongoDB`);

      // Créer un Map pour retrouver rapidement les RDV par googleEventId
      const rdvByGoogleEventId = new Map(
        existingRdv
          .filter(rdv => rdv.googleEventId)
          .map(rdv => [rdv.googleEventId, rdv._id])
      );

      // Récupérer tous les googleEventId présents sur Google Calendar (non annulés)
      const googleEventIds = new Set(
        googleEvents
          .filter(event => event.id && event.status !== 'cancelled')
          .map(event => event.id)
          .filter(Boolean)
      );

      // Trouver les RDV qui existent dans MongoDB mais plus sur Google Calendar
      // On vérifie seulement ceux qui sont dans la période de synchronisation pour éviter de supprimer des RDV anciens
      const syncStartDate = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const syncEndDate = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      const rdvToDelete = existingRdv.filter(rdv => {
        if (!rdv.googleEventId) return false;
        
        // Vérifier si le RDV est dans la période de synchronisation
        const rdvDate = new Date(rdv.selectedDate);
        const isInSyncPeriod = rdvDate >= syncStartDate && rdvDate <= syncEndDate;
        
        // Si le RDV est dans la période de synchronisation et n'existe plus sur Google Calendar, le marquer pour suppression
        return isInSyncPeriod && !googleEventIds.has(rdv.googleEventId);
      });

      // Supprimer les RDV qui n'existent plus sur Google Calendar
      let deletedCount = 0;
      if (rdvToDelete.length > 0) {
        console.log(`🗑️ ${rdvToDelete.length} RDV à supprimer (supprimés sur Google Calendar)`);
        for (const rdv of rdvToDelete) {
          try {
            await RendezVous.findByIdAndDelete(rdv._id);
            deletedCount++;
            console.log(`✅ RDV ${rdv._id} supprimé (googleEventId: ${rdv.googleEventId} n'existe plus sur Google)`);
          } catch (error) {
            console.error(`❌ Erreur lors de la suppression du RDV ${rdv._id}:`, error);
            errors.push({
              googleEventId: rdv.googleEventId,
              error: `Erreur lors de la suppression: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
            });
          }
        }
      }

      // Filtrer les événements qui ne sont pas encore dans MongoDB
      const eventsToSync = googleEvents.filter(event => {
        // Ignorer les événements annulés
        if (event.status === 'cancelled') {
          return false;
        }
        // Ignorer les événements sans ID
        if (!event.id) {
          return false;
        }
        // Ignorer les événements déjà synchronisés
        if (existingGoogleEventIds.has(event.id)) {
          return false;
        }
        // Ignorer les événements sans date de début
        if (!event.start || !event.start.dateTime) {
          return false;
        }
        return true;
      });

      console.log(`🔄 ${eventsToSync.length} événements à synchroniser`);

      const syncedRdv = [];
      const errors = [];

      // Pour chaque événement à synchroniser, créer un RDV dans MongoDB
      for (const googleEvent of eventsToSync) {
        try {
          // Extraire les informations de l'événement Google
          const startDateTime = googleEvent.start?.dateTime;
          const endDateTime = googleEvent.end?.dateTime;
          
          if (!startDateTime || !endDateTime) {
            console.warn(`⚠️ Événement ${googleEvent.id} ignoré : dates manquantes`);
            continue;
          }

          const startDateObj = new Date(startDateTime);
          const endDateObj = new Date(endDateTime);
          const durationMinutes = calculateDurationMinutes(startDateObj, endDateObj);

          // Extraire les participants (attendees)
          const attendees = googleEvent.attendees || [];
          // Le premier participant est généralement l'organisateur (site)
          // Le deuxième est généralement le client
          const organizerEmail = site.googleCalendar.emailGoogle || '';
          const clientAttendee = attendees.find(att => 
            att.email && att.email !== organizerEmail && att.responseStatus !== 'declined'
          );

          // Si pas de client trouvé, utiliser le premier participant non-organisateur
          let userEmail = clientAttendee?.email || 
            (attendees.length > 0 && attendees[0].email !== organizerEmail ? attendees[0].email : '');
          let userName = clientAttendee?.displayName || 
            (attendees.length > 0 && attendees[0].email !== organizerEmail ? attendees[0].displayName || '' : '');

          // Si aucun participant client trouvé, utiliser des valeurs par défaut
          if (!userEmail) {
            // Essayer d'extraire un email depuis le résumé ou la description
            const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
            const summaryMatch = googleEvent.summary?.match(emailRegex);
            const descMatch = googleEvent.description?.match(emailRegex);
            
            if (summaryMatch && summaryMatch.length > 0) {
              userEmail = summaryMatch[0];
            } else if (descMatch && descMatch.length > 0) {
              userEmail = descMatch[0];
            } else {
              // Utiliser un email par défaut basé sur l'ID de l'événement
              userEmail = `client-${googleEvent.id?.substring(0, 8)}@google-calendar.local`;
            }
            
            // Essayer d'extraire un nom depuis le résumé
            if (!userName && googleEvent.summary) {
              // Enlever les emails et caractères spéciaux pour obtenir un nom potentiel
              userName = googleEvent.summary
                .replace(emailRegex, '')
                .replace(/[^\w\s]/g, ' ')
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .join(' ') || 'pas de client';
            } else {
              userName = userName || 'pas de client';
            }
            
            console.log(`ℹ️ Événement ${googleEvent.id} : aucun participant trouvé, utilisation de valeurs par défaut (${userEmail})`);
          }

          // Extraire les autres informations
          const summary = googleEvent.summary || 'Rendez-vous';
          const description = googleEvent.description || '';
          // Utiliser une valeur par défaut si location est manquante (requis dans le modèle)
          const location = googleEvent.location && googleEvent.location.trim() 
            ? googleEvent.location.trim() 
            : 'En ligne'; // Valeur par défaut si location manquante
          const timeZone = googleEvent.start?.timeZone || 'Europe/Paris';
          // Extraire la date et l'heure en respectant le timezone de l'événement
          const selectedDate = extractDateFromISO(startDateTime, timeZone);
          const selectedTime = extractTimeFromDate(startDateTime, timeZone);
          const callDuration = formatDuration(durationMinutes);

          // Déterminer le hostName et hostEmail
          // Par défaut, utiliser les informations du site
          const hostName = site.name || 'Hôte';
          const hostEmail = organizerEmail;

          // Préparer les données pour MongoDB
          const rdvData: any = {
            siteId,
            hostName,
            eventName: summary,
            callDuration,
            location,
            timeZone,
            userName: userName || 'Client',
            userEmail,
            userPhone: '', // Non disponible depuis Google Calendar
            hostEmail,
            selectedDate,
            selectedTime,
            additionalNotes: description,
            status: 'confirmed', // Par défaut, les événements Google sont confirmés
            googleEventId: googleEvent.id,
            googleEventLink: googleEvent.htmlLink || '',
            hangoutLink: googleEvent.hangoutLink || googleEvent.conferenceData?.entryPoints?.[0]?.uri || '',
            createdAt: new Date(googleEvent.created || startDateObj),
            updatedAt: new Date(googleEvent.updated || startDateObj),
          };

          // Vérifier si le rendez-vous existe déjà (éviter les doublons basés sur date/heure/email)
          const existingRdvByDate = await RendezVous.findOne({
            siteId,
            userEmail,
            selectedDate: selectedDate,
            selectedTime
          });

          if (existingRdvByDate) {
            // Mettre à jour avec le googleEventId si manquant
            if (!existingRdvByDate.googleEventId && googleEvent.id) {
              existingRdvByDate.googleEventId = googleEvent.id;
              existingRdvByDate.googleEventLink = googleEvent.htmlLink || '';
              await existingRdvByDate.save();
              console.log(`✅ RDV existant mis à jour avec googleEventId: ${googleEvent.id}`);
              syncedRdv.push({
                action: 'updated',
                rdvId: existingRdvByDate._id.toString(),
                googleEventId: googleEvent.id
              });
            } else {
              console.log(`⚠️ RDV déjà existant pour cette date/heure: ${googleEvent.id}`);
            }
            continue;
          }

          // Créer le nouveau rendez-vous dans MongoDB
          const newRdv = await RendezVous.create(rdvData);
          console.log(`✅ RDV créé depuis Google Calendar: ${newRdv._id} (googleEventId: ${googleEvent.id})`);
          
          syncedRdv.push({
            action: 'created',
            rdvId: newRdv._id.toString(),
            googleEventId: googleEvent.id,
            userName: newRdv.userName,
            userEmail: newRdv.userEmail,
            selectedDate: newRdv.selectedDate.toISOString(),
            selectedTime: newRdv.selectedTime
          });

        } catch (error) {
          console.error(`❌ Erreur lors de la synchronisation de l'événement ${googleEvent.id}:`, error);
          errors.push({
            googleEventId: googleEvent.id,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Synchronisation terminée : ${syncedRdv.length} RDV créés/mis à jour, ${deletedCount} RDV supprimés`,
        stats: {
          totalGoogleEvents: googleEvents.length,
          alreadySynced: existingGoogleEventIds.size,
          toSync: eventsToSync.length,
          synced: syncedRdv.length,
          deleted: deletedCount,
          errors: errors.length
        },
        syncedRdv,
        deleted: deletedCount > 0 ? deletedCount : undefined,
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      console.error("❌ Erreur lors de la synchronisation:", error);
      
      // Déterminer le type d'erreur
      let errorMessage = 'Erreur lors de la synchronisation';
      let errorDetails = 'Une erreur est survenue lors de la synchronisation des RDV';
      
      if (error instanceof Error) {
        if (error.message.includes('connection')) {
          errorMessage = 'Erreur de connexion';
          errorDetails = 'Impossible de se connecter à la base de données ou à Google Calendar';
        } else if (error.message.includes('invalid_grant') || error.message.includes('token')) {
          errorMessage = 'Erreur d\'authentification Google';
          errorDetails = 'Le token d\'authentification Google est invalide ou expiré';
        }
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: errorDetails,
          technicalError: error instanceof Error ? error.message : 'Erreur inconnue'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Erreur lors de la synchronisation des RDV depuis Google Calendar:', error);
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur', 
        details: error instanceof Error ? error.message : 'Erreur inconnue' 
      },
      { status: 500 }
    );
  }
}

