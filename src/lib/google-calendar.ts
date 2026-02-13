import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Configuration Google Calendar
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

// Créer le client OAuth2
export const createOAuth2Client = () => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google Calendar credentials not configured');
  }

  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
};

// Interface pour les données de rendez-vous
export interface CalendarEvent {
  siteId: string;
  hostName: string;
  eventName: string;
  // eventDescription: string; // Supprimé car on utilise additionalNotes
  callDuration: string;
  location: string;
  timeZone: string;
  userName: string;
  userEmail: string;
  hostEmail: string;
  selectedDate: string;
  selectedTime: string;
  additionalNotes?: string;
}

// Créer un événement dans Google Calendar
export const createCalendarEvent = async (
  eventData: CalendarEvent,
  accessToken: string
) => {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Calculer la date et l'heure de début et de fin
    const eventDate = new Date(eventData.selectedDate);
    const [hours, minutes] = eventData.selectedTime.split(':').map(Number);
    eventDate.setHours(hours, minutes, 0, 0);

    // Calculer la durée (par défaut 1 heure si non spécifiée)
    const duration = eventData.callDuration || '1 hour';
    const durationInMinutes = parseInt(duration) || 60;
    const endDate = new Date(eventDate.getTime() + durationInMinutes * 60000);

    // Créer l'événement
    const event = {
      summary: eventData.eventName,
      description: `${eventData.additionalNotes || 'Aucune note'}`,
      location: eventData.location,
      start: {
        dateTime: eventDate.toISOString(),
        timeZone: eventData.timeZone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: eventData.timeZone,
      },
      attendees: [
        { email: eventData.userEmail, displayName: eventData.userName },
        { email: eventData.hostEmail, displayName: eventData.hostName },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 jour avant
          { method: 'popup', minutes: 30 }, // 30 minutes avant
        ],
      },
      conferenceData: {
        createRequest: {
          requestId: `rdv-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all', // Envoyer les invitations par email
    });

    return {
      success: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
      hangoutLink: response.data.conferenceData?.entryPoints?.[0]?.uri,
    };
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement Google Calendar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
};

// Mettre à jour un événement dans Google Calendar
export const updateCalendarEvent = async (
  eventId: string,
  eventData: CalendarEvent,
  accessToken: string
) => {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Calculer la date et l'heure
    const eventDate = new Date(eventData.selectedDate);
    const [hours, minutes] = eventData.selectedTime.split(':').map(Number);
    eventDate.setHours(hours, minutes, 0, 0);

    const duration = eventData.callDuration || '1 hour';
    const durationInMinutes = parseInt(duration) || 60;
    const endDate = new Date(eventDate.getTime() + durationInMinutes * 60000);

    const event = {
      summary: eventData.eventName,
      description: `${eventData.additionalNotes || 'Aucune note'}`,
      location: eventData.location,
      start: {
        dateTime: eventDate.toISOString(),
        timeZone: eventData.timeZone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: eventData.timeZone,
      },
      attendees: [
        { email: eventData.userEmail, displayName: eventData.userName },
        { email: eventData.hostEmail, displayName: eventData.hostName },
      ],
    };

    const response = await calendar.events.update({
      calendarId: GOOGLE_CALENDAR_ID,
      eventId: eventId,
      requestBody: event,
      sendUpdates: 'all',
    });

    return {
      success: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
    };
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'événement Google Calendar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
};

// Supprimer un événement dans Google Calendar
export const deleteCalendarEvent = async (
  eventId: string,
  accessToken: string
) => {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: GOOGLE_CALENDAR_ID,
      eventId: eventId,
      sendUpdates: 'all',
    });

    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement Google Calendar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
};

// Générer l'URL d'autorisation OAuth2
export const getAuthUrl = () => {
  const oauth2Client = createOAuth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
};

// Échanger le code d'autorisation contre un token
export const exchangeCodeForToken = async (code: string) => {
  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return { success: true, tokens };
  } catch (error) {
    console.error('Erreur lors de l\'échange du code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}; 