import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import { Contact } from '../../../../lib/models/Contact';
import { Site } from '../../../../lib/models/Site';
import { emailService } from "@/_sharedServices/emailService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dataSource, contactEmail, siteId, status } = body as { dataSource?: string; contactEmail?: string; siteId?: string; status?: string };

    console.log('📧 API Contact - Paramètres reçus:', { dataSource, contactEmail });

    // Connexion à la base de données MongoDB
    await connectToDatabase();

    // Récupérer les contacts depuis MongoDB
    let query: any = {};
    
    // Si un email de contact est spécifié, filtrer par cet email
    if (contactEmail) {
      query = { email: { $regex: contactEmail, $options: 'i' } };
    }

    // Filtrer par siteId si fourni
    if (siteId) {
      query.siteId = siteId;
    }

    // Soft delete: par défaut exclure les supprimés
    const deletedOnly = status === 'deleted';
    if (deletedOnly) {
      query.isDeleted = true;
    } else {
      query.isDeleted = { $ne: true };
    }

    // Filtrage par statut fonctionnel (sauf quand on demande les supprimés)
    if (status && !deletedOnly) {
      query.status = status;
    }

    const contacts = await Contact.find(query).sort({ submittedAt: -1 });

    console.log('📧 API Contact - Contacts récupérés depuis MongoDB:', contacts.length);

    // Transformer les données MongoDB en format attendu par le frontend
    const transformedContacts = contacts.map(contact => ({
      id: contact._id.toString(),
      name: `${contact.firstName} ${contact.name}`,
      email: contact.email,
      subject: contact.subject,
      message: contact.message,
      status: contact.status,
      date: contact.submittedAt.toISOString(),
      phone: contact.phone,
      company: contact.company,
      siteId: (contact as any).siteId || null,
      source: (contact as any).source || null,
      isDeleted: (contact as any).isDeleted === true,
      deletedAt: (contact as any).deletedAt || null,
    }));

    return NextResponse.json({
      success: true,
      contacts: transformedContacts,
      totalContacts: transformedContacts.length,
      dataSource: dataSource,
      contactEmail: contactEmail,
      siteId: siteId || null
    });

  } catch (error) {
    console.error('❌ Erreur API Contact:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: "Erreur lors de la récupération des contacts",
        error: error instanceof Error ? error.message : "Erreur inconnue"
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, action, data } = body;

    console.log('📧 API Contact - Action reçue:', { contactId, action, data });

    // Connexion à la base de données MongoDB
    await connectToDatabase();
    
    let message = "Action effectuée avec succès";
    
    switch (action) {
      case 'markAsRead':
        const contactToUpdate = await Contact.findById(contactId);
        if (!contactToUpdate) {
          throw new Error('Contact non trouvé');
        }
        
        await Contact.findByIdAndUpdate(contactId, { 
          status: 'read',
          updatedAt: new Date()
        });
        console.log(`✅ Contact ${contactId} marqué comme lu`);
        message = "Contact marqué comme lu";
        break;
      case 'reply':
        // Récupérer les informations du contact
        const contact = await Contact.findById(contactId);
        if (!contact) {
          throw new Error('Contact non trouvé');
        }

        // Récupérer le nom du site pour la signature
        let siteName = "Majoli";
        if (contact.siteId) {
          try {
            const site = await Site.findOne({ siteId: contact.siteId }).select('name');
            if (site && site.name) {
              siteName = site.name;
            }
          } catch (siteError) {
            console.warn('Impossible de récupérer le nom du site:', siteError);
          }
        }

        // Préparer le contenu HTML de la réponse
        const replyHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #E74C1B; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Réponse à votre message</h1>
            </div>
            
            <div style="padding: 20px;">
              <p>Bonjour ${contact.firstName} ${contact.name},</p>
              
              <p>Nous avons bien reçu votre message et nous vous répondons ci-dessous :</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333; font-size: 16px;">Votre message original :</h3>
                <p style="margin: 0; color: #666; font-style: italic;">${contact.message}</p>
              </div>
              
              <div style="background-color: #fff; padding: 15px; border-left: 4px solid #E74C1B; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333; font-size: 16px;">Notre réponse :</h3>
                <p style="white-space: pre-wrap; line-height: 1.6; margin: 0;">${data?.replyMessage || 'Réponse de l\'administrateur'}</p>
              </div>
              
              <p>Si vous avez d'autres questions, n'hésitez pas à nous recontacter.</p>
              
              <p>Cordialement,<br>
              <strong>L'équipe ${siteName}</strong></p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                Ce message est une réponse automatique à votre demande de contact.
              </p>
              <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">
                Date de réponse : ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}
              </p>
            </div>
          </div>
        `;

        try {
          // Envoyer l'email via emailService (même service que form-coach)
          await emailService.sendTransactionalEmail({
            to: contact.email,
            subject: `Réponse à votre message : ${contact.subject}`,
            htmlContent: replyHtml,
            fromName: 'Réponse à votre demande',
            siteId: contact.siteId || undefined,
          });

          // Mettre à jour le statut dans la base de données
          await Contact.findByIdAndUpdate(contactId, { 
            status: 'replied',
            adminNotes: data?.replyMessage || 'Répondu par l\'administrateur',
            updatedAt: new Date()
          });
          console.log(`✅ Contact ${contactId} marqué comme répondu et email envoyé`);
          message = "Réponse envoyée avec succès";
          
          // Retourner des informations détaillées
          return NextResponse.json({
            success: true,
            message: message,
            contactId: contactId,
            action: action,
            emailSent: true,
            emailInfo: `Email envoyé à ${contact.email}`
          });

        } catch (emailError) {
          console.error('❌ Erreur lors de l\'envoi de l\'email:', emailError);
          
          // Mettre à jour le statut dans la base de données même si l'email échoue
          await Contact.findByIdAndUpdate(contactId, { 
            status: 'replied',
            adminNotes: data?.replyMessage || 'Répondu par l\'administrateur (email non envoyé)',
            updatedAt: new Date()
          });
          console.log(`✅ Contact ${contactId} marqué comme répondu (email non envoyé)`);
          message = "Réponse enregistrée avec succès";
          
          // Retourner des informations détaillées
          return NextResponse.json({
            success: true,
            message: message,
            contactId: contactId,
            action: action,
            emailSent: false,
            emailInfo: "Email non envoyé - problème de configuration SendGrid (voir GUIDE_CONFIGURATION_EMAIL.md)"
          });
        }
        break;
      case 'archive':
        await Contact.findByIdAndUpdate(contactId, { 
          status: 'archived',
          updatedAt: new Date()
        });
        console.log(`✅ Contact ${contactId} archivé`);
        message = "Contact archivé";
        break;
      case 'delete':
        await Contact.findByIdAndUpdate(contactId, {
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✅ Contact ${contactId} marqué supprimé (soft delete)`);
        message = "Contact supprimé (récupérable 7 jours)";
        break;
      case 'restore':
        await Contact.findByIdAndUpdate(contactId, {
          isDeleted: false,
          deletedAt: null,
          updatedAt: new Date(),
        });
        console.log(`✅ Contact ${contactId} restauré`);
        message = "Contact restauré";
        break;
      case 'hardDelete':
        await Contact.findByIdAndDelete(contactId);
        console.log(`🗑️ Contact ${contactId} supprimé définitivement`);
        message = "Contact supprimé définitivement";
        break;
      default:
        message = "Action non reconnue";
    }

    // Retourner la réponse de succès
    return NextResponse.json({
      success: true,
      message: message,
      contactId: contactId,
      action: action
    });

  } catch (error) {
    console.error('❌ Erreur API Contact (PUT):', error);
    
    return NextResponse.json(
      {
        success: false,
        message: "Erreur lors de l'exécution de l'action",
        error: error instanceof Error ? error.message : "Erreur inconnue"
      },
      { status: 500 }
    );
  }
} 