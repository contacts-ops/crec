import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { connectToDatabase } from '@/lib/db';
import { Site } from '@/lib/models/Site';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { siteId, summary, description, start, end, attendeeName, attendeeEmail } = body;

    if (!siteId || !summary || !start || !end || !attendeeEmail) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    await connectToDatabase();
    const site = await Site.findOne({ siteId });
    if (!site || !site.googleCalendar || !site.googleCalendar.refreshToken) {
      return NextResponse.json({ error: 'Google Calendar non configuré pour ce site' }, { status: 400 });
    }

    // Authentification Google
    const oAuth2Client = new google.auth.OAuth2(
      site.googleCalendar.clientId,
      site.googleCalendar.clientSecret,
      process.env.NEXT_PUBLIC_BASE_URL + '/api/sharedServices/auth/google/callback'
    );
    oAuth2Client.setCredentials({
      refresh_token: site.googleCalendar.refreshToken,
    });

    // Création de l'événement
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const event = {
      summary,
      description,
      start: { dateTime: start, timeZone: 'Europe/Paris' },
      end: { dateTime: end, timeZone: 'Europe/Paris' },
      attendees: [
        { email: site.googleCalendar.emailGoogle, displayName: site.name }, // proprio
        { email: attendeeEmail, displayName: attendeeName },          // client
      ],
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return NextResponse.json({ success: true, event: response.data });
  } catch (e) {
    console.error('Erreur création événement Google Calendar:', e);
    return NextResponse.json({ error: "Erreur lors de la création de l'événement", details: e }, { status: 500 });
  }
}
