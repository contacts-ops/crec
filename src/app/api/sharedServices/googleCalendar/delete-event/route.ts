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

export async function DELETE(req: NextRequest) {
  try {
    const { calendarId, eventId } = await req.json();

    if (!calendarId || !eventId) {
      return NextResponse.json({ message: "calendarId et eventId requis" }, { status: 400 });
    }

    const auth = await getGoogleAuthClient();
    const calendar = google.calendar({ version: "v3", auth });

    await calendar.events.delete({
      calendarId,
      eventId,
    });

    return NextResponse.json({ message: "Événement supprimé de Google Calendar" });
  } catch (error: any) {
    console.error("Erreur suppression Google Calendar:", error);
    return NextResponse.json({ message: error.message || "Erreur serveur" }, { status: 500 });
  }
} 