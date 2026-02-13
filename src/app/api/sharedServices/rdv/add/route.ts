import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { RendezVous } from '@/lib/models/RendezVous';
import { Utilisateur } from '@/lib/models/Utilisateur';
import type { calendar_v3 } from 'googleapis';
// Envoi des emails via le service centralisé
import { emailService } from "@/_sharedServices/emailService";

const DEFAULT_DURATION_MINUTES = 30;

const parseDurationToMinutes = (duration: string | number | null | undefined): number => {
  if (typeof duration === 'number') {
    return Number.isFinite(duration) && duration > 0 ? duration : DEFAULT_DURATION_MINUTES;
  }
  if (!duration) return DEFAULT_DURATION_MINUTES;

  const sanitized = duration.toString().toLowerCase().replace(/,/g, '.').trim();
  if (!sanitized) return DEFAULT_DURATION_MINUTES;

  const numericOnly = Number(sanitized);
  if (!Number.isNaN(numericOnly) && numericOnly > 0) {
    return numericOnly;
  }

  let totalMinutes = 0;
  const hourMatch = sanitized.match(/(\d+(?:\.\d+)?)\s*h/);
  if (hourMatch) {
    totalMinutes += Math.round(parseFloat(hourMatch[1]) * 60);
  }

  const minuteMatch = sanitized.match(/(\d+(?:\.\d+)?)\s*(?:min|m|minutes?)/);
  if (minuteMatch) {
    totalMinutes += Math.round(parseFloat(minuteMatch[1]));
  }

  if (!minuteMatch && sanitized.includes('h')) {
    const afterH = sanitized.split('h')[1];
    const trailingNumber = Number(afterH);
    if (!Number.isNaN(trailingNumber)) {
      totalMinutes += trailingNumber;
    }
  }

  if (totalMinutes <= 0) {
    const fallbackDigits = sanitized.match(/(\d+(?:\.\d+)?)/);
    if (fallbackDigits) {
      totalMinutes = Number(fallbackDigits[1]);
    }
  }

  return totalMinutes > 0 ? totalMinutes : DEFAULT_DURATION_MINUTES;
};

const computeEndTimeLabel = (startTime: string, durationMinutes: number): string => {
  const [startHours, startMinutes] = startTime.split(':').map((value) => Number(value) || 0);
  const totalStartMinutes = startHours * 60 + startMinutes;
  const totalEndMinutes = totalStartMinutes + durationMinutes;
  const endHours = Math.floor((totalEndMinutes % (24 * 60)) / 60);
  const endMinutes = totalEndMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
};

export async function POST(request: NextRequest) {
  try {
    console.log("Début de la requête POST /api/rdv/add");
    
    const body = await request.json();
    console.log("Données reçues:", body);
    
    const {
      siteId,
      hostName,
      eventName,
      callDuration,
      location,
      timeZone,
      userName,
      userEmail,
      userPhone,
      hostEmail,
      selectedDate,
      selectedTime,
      additionalNotes,
      status = 'pending',
      googleEventId, // Ajouté
      googleEventLink, // Ajouté
      googleCalendarTitle // Ajouté pour le titre formaté Google Calendar
    } = body;

    const durationMinutes = parseDurationToMinutes(callDuration);
    const durationLabel = callDuration && callDuration.trim().length > 0 ? callDuration : `${durationMinutes}min`;
    const endTimeLabel = selectedTime ? computeEndTimeLabel(selectedTime, durationMinutes) : null;

    // Validation des champs requis
    const missingFields = [];
    if (!siteId) missingFields.push('siteId');
    if (!userName) missingFields.push('userName');
    if (!userEmail) missingFields.push('userEmail');
    if (!selectedDate) missingFields.push('selectedDate');
    if (!selectedTime) missingFields.push('selectedTime');
    if (!hostName) missingFields.push('hostName');
    if (!eventName) missingFields.push('eventName');

    if (missingFields.length > 0) {
      console.log("Champs manquants:", missingFields);
      const errorMessage = `Champs requis manquants : ${missingFields.join(', ')}`;
      return NextResponse.json(
        { 
          error: errorMessage,
          details: `Veuillez remplir les champs suivants : ${missingFields.join(', ')}`,
          missingFields
        },
        { status: 400 }
      );
    }

    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return NextResponse.json(
        { 
          error: 'Format d\'email invalide',
          details: 'Veuillez saisir une adresse email valide'
        },
        { status: 400 }
      );
    }

    try {
      // Connexion à la base de données MongoDB
      await connectToDatabase();
      
      // Création de l'événement Google Calendar (obligatoire AVANT la BDD)
      let googleEventId = null;
      let googleEventLink = null;
      try {
        const { Site } = await import('@/lib/models/Site');
        const { google } = await import('googleapis');
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
        oAuth2Client.setCredentials({ refresh_token: site.googleCalendar.refreshToken });
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        
        // Construction des dates ISO
        const startDate = new Date(selectedDate);
        const [hours, minutes] = selectedTime.split(":");
        startDate.setHours(Number(hours), Number(minutes), 0, 0);
        const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
        
        // Préparer la liste des participants (éviter les emails vides)
        const attendees = [];
        
        // 1. L'organisateur (site) - obligatoire
        if (site.googleCalendar.emailGoogle) {
          attendees.push({
            email: site.googleCalendar.emailGoogle,
            displayName: site.name || 'Organisateur'
          });
        } else {
          return NextResponse.json({ 
            error: 'Email de l\'organisateur manquant',
            details: 'L\'email Google Calendar du site n\'est pas configuré'
          }, { status: 400 });
        }
        
        // 2. Le demandeur (utilisateur) - obligatoire
        if (userEmail && userEmail.trim()) {
          attendees.push({
            email: userEmail,
            displayName: userName || 'Demandeur'
          });
        } else {
          return NextResponse.json({ 
            error: 'Email du demandeur manquant',
            details: 'Veuillez fournir une adresse email valide'
          }, { status: 400 });
        }
        
        // Vérifier qu'il y a exactement 2 participants
        if (attendees.length !== 2) {
          return NextResponse.json({ 
            error: 'Configuration des participants invalide',
            details: 'Il doit y avoir exactement 2 participants : organisateur et demandeur'
          }, { status: 400 });
        }
        
        const event = {
          summary: googleCalendarTitle || eventName, // Utilise googleCalendarTitle s'il est disponible, sinon eventName
          description: additionalNotes || '',
          start: { dateTime: startDate.toISOString(), timeZone: timeZone || 'Europe/Paris' },
          end: { dateTime: endDate.toISOString(), timeZone: timeZone || 'Europe/Paris' },
          attendees: attendees,
        };
        
        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event,
        });
        googleEventId = response.data.id;
        googleEventLink = response.data.htmlLink;
      } catch (err) {
        console.error('Erreur lors de la création de l\'événement Google Calendar:', err);
        return NextResponse.json({ error: "Erreur lors de la création de l'événement Google Calendar", details: err instanceof Error ? err.message : err }, { status: 500 });
      }
      // Préparer les données pour MongoDB
      const rdvData: any = {
        siteId,
        hostName,
        eventName,
        callDuration,
        location,
        timeZone,
        userName,
        userEmail,
        userPhone: userPhone || '',
        hostEmail,
        selectedDate: new Date(selectedDate),
        selectedTime,
        additionalNotes: additionalNotes || '',
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
        googleEventId,
        googleEventLink
      };
      // Vérifier si le rendez-vous existe déjà (éviter les doublons)
      const existingRdv = await RendezVous.findOne({
        siteId,
        userEmail,
        selectedDate: new Date(selectedDate),
        selectedTime
      });
      if (existingRdv) {
        console.log("Rendez-vous déjà existant:", existingRdv._id);
        return NextResponse.json({
          success: true,
          message: 'Rendez-vous déjà pris',
          id: existingRdv._id.toString(),
          warning: 'Un rendez-vous existe déjà pour cette date et heure'
        });
      }
      // Créer le nouveau rendez-vous dans MongoDB
      const newRdv = await RendezVous.create(rdvData);
      console.log("Rendez-vous créé avec succès dans MongoDB:", newRdv._id);

      // Envoyer les emails de confirmation
      try {
        console.log("📧 Envoi des emails de confirmation...");
        
        // Récupérer les admins du site spécifique
        const admins = await Utilisateur.find({ role: 'admin', siteId: siteId }).select('email firstName lastName siteId');
        console.log('📧 API RDV - Admins trouvés pour siteId:', siteId, admins.map(a => ({ email: a.email, siteId: a.siteId })));
        
        const adminEmails = admins.length > 0 ? admins.map(admin => admin.email) : [process.env.ADMIN_EMAIL || 'contact@majoli.io'];
        
        // Formatage de la date pour l'affichage
        const formattedDate = new Date(selectedDate).toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        // Email aux admins
        const adminHtmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #4A7C9B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Nouveau rendez-vous</h1>
            </div>

            <div style="padding: 20px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h3 style="margin-top: 0; color: #333;">Informations du rendez-vous</h3>
                <p><strong>Client :</strong> ${userName}</p>
                <p><strong>Email :</strong> ${userEmail}</p>
                ${userPhone ? `<p><strong>Téléphone :</strong> ${userPhone}</p>` : ''}
                <p><strong>Date :</strong> ${formattedDate}</p>
                <p><strong>Heure :</strong> ${endTimeLabel ? `${selectedTime} - ${endTimeLabel}` : selectedTime}</p>
                <p><strong>Durée :</strong> ${durationLabel}</p>
                <p><strong>Type :</strong> ${eventName}</p>
                <p><strong>Lieu :</strong> ${location}</p>
                ${additionalNotes ? `<p><strong>Notes :</strong> ${additionalNotes}</p>` : ''}
              </div>

              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 14px;">
                  Ce rendez-vous a été créé automatiquement depuis le site.
                </p>
              </div>
            </div>
          </div>
        `;

        // Email de confirmation à l'utilisateur
        const userHtmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #4A7C9B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Confirmation de votre rendez-vous</h1>
            </div>

            <div style="padding: 20px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
              <p>Bonjour ${userName},</p>
              
              <p>Nous confirmons votre rendez-vous et nous vous en remercions.</p>
              
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h3 style="margin-top: 0; color: #333;">Détails de votre rendez-vous</h3>
                <p><strong>Date :</strong> ${formattedDate}</p>
                <p><strong>Heure :</strong> ${endTimeLabel ? `${selectedTime} - ${endTimeLabel}` : selectedTime}</p>
                <p><strong>Durée :</strong> ${durationLabel}</p>
                <p><strong>Type :</strong> ${eventName}</p>
                <p><strong>Lieu :</strong> ${location}</p>
                ${userPhone ? `<p><strong>Téléphone :</strong> ${userPhone}</p>` : ''}
                ${additionalNotes ? `<p><strong>Notes :</strong> ${additionalNotes}</p>` : ''}
              </div>

              <p>Nous vous attendons avec impatience !</p>
              
              <p>Cordialement,<br>L'équipe</p>
            </div>
          </div>
        `;

        // Envoyer les emails
        await Promise.all([
          // Email aux admins
          ...adminEmails.map((adminEmail) =>
            emailService.sendTransactionalEmail({
              to: adminEmail,
              subject: `Nouveau rendez-vous - ${userName}`,
              htmlContent: adminHtmlContent,
              fromName: 'Nouveau rendez-vous',
              siteId: siteId,
            })
          ),
          // Email de confirmation à l'utilisateur
          emailService.sendTransactionalEmail({
            to: userEmail,
            subject: 'Confirmation de votre rendez-vous',
            htmlContent: userHtmlContent,
            fromName: 'Confirmation de rendez-vous',
            siteId: siteId,
          })
        ]);

        console.log("📧 Emails envoyés avec succès");
      } catch (emailError) {
        console.error("❌ Erreur lors de l'envoi des emails:", emailError);
        // On ne fait pas échouer la création du RDV si l'email échoue
      }

      return NextResponse.json({
        success: true,
        message: 'Rendez-vous pris avec succès',
        id: newRdv._id.toString(),
        siteId: siteId,
        googleEventId: newRdv.googleEventId,
        googleEventLink: newRdv.googleEventLink
      });
      
    } catch (error) {
      console.error("❌ Erreur MongoDB:", error);
      
      // Déterminer le type d'erreur MongoDB
      let errorMessage = 'Erreur de base de données';
      let errorDetails = 'Une erreur est survenue lors de la sauvegarde des données';
      
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          errorMessage = 'Rendez-vous déjà existant';
          errorDetails = 'Un rendez-vous avec ces informations existe déjà dans notre base de données';
        } else if (error.message.includes('validation failed')) {
          errorMessage = 'Données invalides';
          errorDetails = 'Certaines données ne respectent pas le format attendu';
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
    console.error('Erreur lors de l\'ajout du rendez-vous:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
} 