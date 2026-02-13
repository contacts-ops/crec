import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
// Envoi des emails via le service centralisé (gère l'expéditeur selon siteId)
import { emailService } from "@/_sharedServices/emailService";
import { Utilisateur } from '@/lib/models/Utilisateur';
import { Contact } from '@/lib/models/Contact';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      prenom, 
      nom, 
      email, 
      telephone, 
      typeDemande, 
      typeDemandeLabel,
      message, 
      type, 
      dataSource, 
      siteId,
      statut,
      userType,
    } = body;

    // Récupérer éventuel siteId depuis la query
    let siteIdFromQuery: string | null = null;
    try {
      const url = new URL(request.url);
      siteIdFromQuery = url.searchParams.get('siteId');
    } catch {}

    console.log('📧 API Contact Send - Données reçues:', { 
      prenom, 
      nom, 
      email, 
      telephone, 
      typeDemande, 
      type, 
      dataSource, 
      siteId,
      statut: statut || userType,
    });

    // Validation minimaliste du téléphone (optionnel)
    const isValidPhone = (value?: string) => {
      if (!value) return true;
      const digits = value.replace(/\D/g, '');
      if (digits.length < 8 || digits.length > 15) return false;
      return /^[+]?[\d\s().-]+$/.test(value);
    };

    if (!isValidPhone(telephone)) {
      return NextResponse.json(
        { success: false, error: 'Format de téléphone invalide' },
        { status: 400 }
      );
    }

    // Connexion à la base de données MongoDB
    await connectToDatabase();

    // Déterminer le siteId (depuis le body, sinon extraction URL/headers)
    // Calculer un siteId résolu: DOIT venir du payload (exigé)
    let resolvedSiteId = siteId || siteIdFromQuery || undefined;
    if (!resolvedSiteId) {
      return NextResponse.json(
        { success: false, error: "siteId requis pour l'enregistrement du contact" },
        { status: 400 }
      );
    }
    if (!resolvedSiteId) {
      const referer = request.headers.get('referer') || '';
      try {
        const url = new URL(referer);
        const segs = url.pathname.split('/');
        const idx = segs.indexOf('sites');
        if (idx !== -1 && segs[idx + 1]) {
          resolvedSiteId = segs[idx + 1];
        } else if (segs[1] && segs[1] !== 'app' && segs[1] !== 'sites') {
          resolvedSiteId = segs[1];
        }
      } catch {}
      if (!resolvedSiteId) {
        const headerSiteId = request.headers.get('x-site-id') || undefined;
        if (headerSiteId) resolvedSiteId = headerSiteId;
      }
    }

    // Enregistrer la demande en base (collection Contacts)
    let savedContact = await Contact.create({
      siteId: resolvedSiteId,
      name: nom || '—',
      firstName: prenom || '—',
      email,
      subject: typeDemandeLabel || typeDemande || 'contact',
      message,
      phone: telephone || undefined,
      status: 'new',
      source: 'form-coach'
    });

    // Récupérer tous les admins (propriétaires de sites)
    console.log('📧 API Contact Send - siteId résolu:', resolvedSiteId);
    
    // Récupérer les admins du site spécifique
    const allAdmins = await Utilisateur.find({ role: 'admin', siteId: resolvedSiteId }).select('email firstName lastName _id siteId');
    console.log('📧 API Contact Send - Tous les admins dans la DB pour siteId:', resolvedSiteId, allAdmins.map(a => ({ email: a.email, firstName: a.firstName, lastName: a.lastName, id: a._id, siteId: a.siteId })));
    
    // Utiliser les admins du site spécifique
    const admins = allAdmins;
    console.log('📧 API Contact Send - Admins sélectionnés pour ce site:', admins.length);

    // Si aucun admin trouvé, utiliser l'email par défaut
    let adminEmails: string[] = [];
    if (admins.length === 0) {
      console.log('📧 API Contact Send - Aucun admin trouvé, utilisation de l\'email par défaut');
      const defaultEmail = process.env.ADMIN_EMAIL || 'contacts@majoli.io';
      adminEmails = [defaultEmail];
    } else {
      adminEmails = admins.map(admin => admin.email);
    }

    const dateParis = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());

    // Déterminer le libellé de type de demande (facultatif)
    const typeLibelle = (typeDemandeLabel || typeDemande || "").toString().trim();
    const statutLibelle = (statut || userType || "").toString().trim();

    // Préparer le contenu HTML de l'email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #4A7C9B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Nouvelle demande</h1>
        </div>

        <div style="padding: 20px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="margin-top: 0; color: #333;">Informations du demandeur</h3>
            <p><strong>Nom :</strong> ${prenom} ${nom}</p>
            <p><strong>Email :</strong> ${email}</p>
            <p><strong>Téléphone :</strong> ${telephone || 'Non renseigné'}</p>
            ${typeLibelle ? `<p><strong>Type de demande :</strong> ${typeLibelle}</p>` : ''}
            ${statutLibelle ? `<p><strong>Statut :</strong> ${statutLibelle}</p>` : ''}
            <p><strong>Date :</strong> ${dateParis}</p>
          </div>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="margin-top: 0; color: #333;">Message</h3>
            <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">
              Cet email a été envoyé automatiquement depuis le formulaire du site.
            </p>
          </div>
        </div>
      </div>
    `;

    console.log('📧 API Contact Send - Envoi aux emails:', adminEmails);

    // Envoyer l'email à tous les admins via emailService (expéditeur du site)
    const mailFromDomain = process.env.MAIL_FROM_DOMAIN || 'majoli.io';
    console.log('📧 API Contact Send - Envoi via emailService vers admins:', adminEmails, 'depuis:', `contacts@${mailFromDomain}`);
    await Promise.all(
      adminEmails.map((adminEmail) =>
        emailService.sendTransactionalEmail({
          to: adminEmail,
          subject: typeLibelle ? `Nouvelle demande - ${typeLibelle}` : 'Nouvelle demande',
          fromEmail: `contacts@${mailFromDomain}`,
          htmlContent: htmlContent,
          fromName: 'Demande de contact',
          siteId: resolvedSiteId,
        })
      )
    );

    console.log('📧 API Contact Send - Emails aux admins envoyés avec succès via emailService');

    // Envoyer un email de confirmation à l'utilisateur
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #4A7C9B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Confirmation de votre demande</h1>
        </div>

        <div style="padding: 20px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
          <p>Bonjour ${prenom} ${nom},</p>
          
          <p>Nous avons bien reçu votre demande et nous vous en remercions.</p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="margin-top: 0; color: #333;">Récapitulatif de votre demande</h3>
            <p><strong>Nom :</strong> ${prenom} ${nom}</p>
            <p><strong>Email :</strong> ${email}</p>
            <p><strong>Téléphone :</strong> ${telephone || 'Non renseigné'}</p>
            ${typeLibelle ? `<p><strong>Type de demande :</strong> ${typeLibelle}</p>` : ''}
            ${statutLibelle ? `<p><strong>Statut :</strong> ${statutLibelle}</p>` : ''}
            <p><strong>Date :</strong> ${dateParis}</p>
            <p><strong>Message :</strong></p>
            <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
          </div>

          <p>Nous traiterons votre demande dans les plus brefs délais et nous vous répondrons très prochainement.</p>
          
          <p>Cordialement,<br>L'équipe</p>
        </div>
      </div>
    `;

    console.log('📧 API Contact Send - Envoi email de confirmation (emailService) à:', email);
    await emailService.sendTransactionalEmail({
      to: email,
      subject: 'Confirmation de votre demande',
      htmlContent: confirmationHtml,
      fromEmail: `contacts@${mailFromDomain}`,
      fromName: 'Demande de contact',
      siteId: resolvedSiteId,
    });

    console.log('📧 API Contact Send - Email de confirmation envoyé avec succès (emailService)');
    console.log('📧 API Contact Send - Total emails envoyés:', adminEmails.length + 1);

    return NextResponse.json({ 
      success: true, 
      message: 'Emails envoyés avec succès',
      sentTo: adminEmails.length,
      contactId: String((savedContact as any)._id),
      siteId: resolvedSiteId || null
    });

  } catch (error) {
    console.error('📧 API Contact Send - Erreur:', error);
    
    // Extraire plus de détails de l'erreur SendGrid si disponible
    let errorMessage = 'Erreur inconnue';
    let errorDetails: any = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      // SendGrid errors have response.body.errors
      const sendGridError = error as any;
      if (sendGridError.response?.body?.errors) {
        errorDetails = sendGridError.response.body.errors;
        console.error('📧 API Contact Send - Détails erreur SendGrid:', JSON.stringify(errorDetails, null, 2));
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    );
  }
}
