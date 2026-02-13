import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Site } from '@/lib/models/Site';
import { RendezVous } from '@/lib/models/RendezVous';
import { google } from 'googleapis';

// POST - Récupérer les créneaux disponibles pour une date donnée
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, date, duration = 30 } = body; // durée en minutes

    if (!siteId || !date) {
      return NextResponse.json({ error: 'siteId et date requis' }, { status: 400 });
    }

    await connectToDatabase();
    const site = await Site.findOne({ siteId });

    if (!site) {
      return NextResponse.json({ error: 'Site non trouvé' }, { status: 404 });
    }

    // Configuration par défaut si aucune n'existe
    const defaultAvailability = {
      monday: { enabled: true, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' },
      tuesday: { enabled: true, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' },
      wednesday: { enabled: true, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' },
      thursday: { enabled: true, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' },
      friday: { enabled: true, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' },
      saturday: { enabled: false, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' },
      sunday: { enabled: false, start: '09:00', end: '17:00', pauseStart: '12:00', pauseEnd: '13:00' }
    };

    const availability = site.availabilityConfig || defaultAvailability;

    // Obtenir le jour de la semaine (0 = dimanche, 1 = lundi, etc.)
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    
    // Convertir en nom de jour
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    const dayConfig = availability[dayName];

    if (!dayConfig || !dayConfig.enabled) {
      return NextResponse.json({
        success: true,
        availableSlots: [],
        message: 'Jour non disponible'
      });
    }

    // Générer les créneaux théoriques disponibles
    const theoreticalSlots = generateAvailableSlots(dayConfig, duration);
    
    // Récupérer les rendez-vous existants pour cette date depuis MongoDB
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingRendezVous = await RendezVous.find({
      siteId,
      selectedDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
    // Créer un set des heures déjà réservées depuis MongoDB
    const bookedTimesFromDB = new Set(existingRendezVous.map(rdv => rdv.selectedTime));
    
    // Récupérer les créneaux réservés depuis Google Calendar
    const bookedTimesFromGoogle = new Set<string>();
    let googleEventsCount = 0;
    let googleEventsNotInDB = 0;
    
    // Vérifier si Google Calendar est configuré
    if (site.googleCalendar && site.googleCalendar.refreshToken) {
      try {
        // Authentification Google
        const oAuth2Client = new google.auth.OAuth2(
          site.googleCalendar.clientId,
          site.googleCalendar.clientSecret,
          process.env.NEXT_PUBLIC_BASE_URL + '/api/sharedServices/auth/google/callback'
        );
        oAuth2Client.setCredentials({ refresh_token: site.googleCalendar.refreshToken });
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        
        // Récupérer les événements Google Calendar pour cette date
        const googleEventsResponse = await calendar.events.list({
          calendarId: 'primary',
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
        });
        
        const googleEvents = googleEventsResponse.data.items || [];
        googleEventsCount = googleEvents.length;
        
        // Extraire les heures de début des événements Google
        for (const event of googleEvents) {
          // Ignorer les événements annulés
          if (event.status === 'cancelled') {
            continue;
          }
          
          // Ignorer les événements sans date de début
          if (!event.start || !event.start.dateTime) {
            continue;
          }
          googleEventsNotInDB++;
          
          // Extraire l'heure de début au format HH:MM en prenant en compte le fuseau horaire de l'événement
          // ou, à défaut, un fuseau par défaut (Europe/Paris) pour rester cohérent avec l'affichage côté site.
          const eventTimeZone = event.start.timeZone || 'Europe/Paris';
          const timeSlot = extractTimeFromDateTime(event.start.dateTime, eventTimeZone);
          
          // Vérifier si cet événement chevauche avec un créneau théorique
          // On doit vérifier tous les créneaux qui pourraient être bloqués par cet événement
          const eventStartMinutes = timeToMinutes(timeSlot);
          const eventEnd = event.end?.dateTime ? new Date(event.end.dateTime) : null;
          const eventDurationMinutes = eventEnd 
            ? Math.round((eventEnd.getTime() - new Date(event.start.dateTime!).getTime()) / (1000 * 60))
            : duration; // Utiliser la durée par défaut si non spécifiée
          
          // Ajouter tous les créneaux qui chevauchent avec cet événement
          for (const slot of theoreticalSlots) {
            const slotStartMinutes = timeToMinutes(slot.start);
            const slotEndMinutes = timeToMinutes(slot.end);
            
            // Vérifier si le créneau chevauche avec l'événement Google
            // Chevauchement si : slotStart < eventEnd ET slotEnd > eventStart
            if (slotStartMinutes < eventStartMinutes + eventDurationMinutes && 
                slotEndMinutes > eventStartMinutes) {
              bookedTimesFromGoogle.add(slot.start);
            }
          }
        }
        
        console.log(`📅 ${googleEventsCount} événements Google Calendar trouvés pour le ${date}`);
        console.log(`🔄 ${googleEventsNotInDB} événements Google non synchronisés dans MongoDB`);
        console.log(`🚫 ${bookedTimesFromGoogle.size} créneaux bloqués par Google Calendar`);
      } catch (googleError) {
        console.error('⚠️ Erreur lors de la récupération des événements Google Calendar:', googleError);
        // Ne pas faire échouer la requête si Google Calendar échoue
        // On continue avec seulement les données MongoDB
      }
    }
    
    // Combiner les créneaux réservés depuis MongoDB et Google Calendar
    const allBookedTimes = new Set([...bookedTimesFromDB, ...bookedTimesFromGoogle]);
    
    // Filtrer les créneaux théoriques pour exclure ceux déjà réservés
    const availableSlots = theoreticalSlots.filter(slot => !allBookedTimes.has(slot.start));

    return NextResponse.json({
      success: true,
      availableSlots,
      dayConfig,
      debug: {
        theoreticalCount: theoreticalSlots.length,
        bookedCountFromDB: existingRendezVous.length,
        bookedCountFromGoogle: googleEventsCount,
        bookedCountFromGoogleNotInDB: googleEventsNotInDB,
        bookedTimesFromDB: Array.from(bookedTimesFromDB),
        bookedTimesFromGoogle: Array.from(bookedTimesFromGoogle),
        totalBookedTimes: Array.from(allBookedTimes),
        availableCount: availableSlots.length
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors du calcul des créneaux disponibles:', error);
    return NextResponse.json(
      { error: 'Erreur lors du calcul des créneaux disponibles' },
      { status: 500 }
    );
  }
}

// Fonction utilitaire pour extraire l'heure locale (HH:MM) depuis un ISO string
// en respectant le fuseau horaire fourni. On s'aligne ainsi sur la logique utilisée
// lors de la synchronisation des événements Google Calendar.
function extractTimeFromDateTime(dateISO: string, timeZone?: string): string {
  const date = new Date(dateISO);

  if (timeZone) {
    const localTime = date.toLocaleString('en-US', {
      timeZone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
    return localTime;
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Fonction pour générer les créneaux disponibles
function generateAvailableSlots(dayConfig: any, duration: number) {
  const slots = [];
  
  // Convertir les heures en minutes depuis minuit
  const startMinutes = timeToMinutes(dayConfig.start);
  const endMinutes = timeToMinutes(dayConfig.end);
  const pauseStartMinutes = timeToMinutes(dayConfig.pauseStart);
  const pauseEndMinutes = timeToMinutes(dayConfig.pauseEnd);
  
  // Générer les créneaux par intervalles égaux à la durée demandée
  // Exemple: pour 15 minutes, on proposera 09:00, 09:15, 09:30, ...
  for (let time = startMinutes; time + duration <= endMinutes; time += duration) {
    const slotEnd = time + duration;
    
    // Vérifier si le créneau chevauche la pause
    const overlapsPause = (time < pauseEndMinutes && slotEnd > pauseStartMinutes);
    
    if (!overlapsPause) {
      slots.push({
        start: minutesToTime(time),
        end: minutesToTime(slotEnd),
        available: true
      });
    }
  }
  
  return slots;
}

// Fonction pour convertir une heure en minutes depuis minuit
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Fonction pour convertir des minutes en format heure
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
