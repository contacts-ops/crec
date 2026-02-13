import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

// Fonction utilitaire pour obtenir un client authentifié (service account)
async function getGoogleAuthClient() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
}

export async function POST(req: NextRequest) {
  try {
    const { calendarId, eventId, organizerEmail } = await req.json();

    if (!calendarId || !eventId || !organizerEmail) {
      return NextResponse.json({ message: "calendarId, eventId et organizerEmail requis" }, { status: 400 });
    }

    const auth = await getGoogleAuthClient();
    const calendar = google.calendar({ version: "v3", auth });

    // Récupérer l'événement
    const event = await calendar.events.get({
      calendarId,
      eventId,
    });

    // Mettre à jour la participation de l'organisateur
    const attendees = event.data.attendees?.map(att => {
      if (att.email === organizerEmail) {
        return { ...att, responseStatus: "accepted" };
      }
      return att;
    }) || [];

    await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: { attendees },
    });

    return NextResponse.json({ message: "Participation de l'organisateur confirmée (Oui) sur Google Calendar" });
  } catch (error: any) {
    console.error("Erreur confirmation Google Calendar:", error);
    return NextResponse.json({ message: error.message || "Erreur serveur" }, { status: 500 });
  }
} 