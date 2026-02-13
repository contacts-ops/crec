import nodemailer from 'nodemailer';

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true pour 465, false pour les autres ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Fonction pour envoyer une réponse à un utilisateur
export async function sendReplyToUser(
  userEmail: string,
  userName: string,
  originalSubject: string,
  originalMessage: string,
  adminReply: string,
  adminName: string = 'L\'équipe Majoli'
) {
  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: userEmail,
      subject: `Réponse à votre message : ${originalSubject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #E74C1B; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Réponse à votre message</h1>
          </div>
          
          <div style="padding: 20px;">
            <p>Bonjour ${userName},</p>
            
            <p>Nous avons bien reçu votre message et nous vous répondons ci-dessous :</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333; font-size: 16px;">Votre message original :</h3>
              <p style="margin: 0; color: #666; font-style: italic;">${originalMessage}</p>
            </div>
            
            <div style="background-color: #fff; padding: 15px; border-left: 4px solid #E74C1B; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333; font-size: 16px;">Notre réponse :</h3>
              <p style="white-space: pre-wrap; line-height: 1.6; margin: 0;">${adminReply}</p>
            </div>
            
            <p>Si vous avez d'autres questions, n'hésitez pas à nous recontacter.</p>
            
            <p>Cordialement,<br>
            <strong>${adminName}</strong></p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              Ce message est une réponse automatique à votre demande de contact.
            </p>
            <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">
              Date de réponse : ${new Date().toLocaleString('fr-FR')}
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Réponse envoyée à l\'utilisateur:', info.messageId);
    return true;

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la réponse:', error);
    return false;
  }
}

// Fonction pour envoyer un email à l'admin (existant)
export async function sendAdminEmail(contactData: {
  name: string;
  firstName: string;
  email: string;
  subject: string;
  message: string;
}) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@majoli.io';

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: adminEmail,
      subject: `Nouveau message de contact - ${contactData.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E74C1B;">Nouveau message de contact</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Informations du contact</h3>
            <p><strong>Nom :</strong> ${contactData.name}</p>
            <p><strong>Prénom :</strong> ${contactData.firstName}</p>
            <p><strong>Email :</strong> ${contactData.email}</p>
            <p><strong>Sujet :</strong> ${contactData.subject}</p>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border-left: 4px solid #E74C1B; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Message</h3>
            <p style="white-space: pre-wrap; line-height: 1.6;">${contactData.message}</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">
              Ce message a été envoyé depuis le formulaire de contact de votre site web.
            </p>
            <p style="color: #666; font-size: 14px;">
              Date d'envoi : ${new Date().toLocaleString('fr-FR')}
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email envoyé à l\'admin:', info.messageId);

  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
  }
}

// Fonction spécifique pour envoyer les emails du formulaire coach
export async function sendCoachContactEmail(contactData: {
  name: string;
  firstName: string;
  email: string;
  subject: string;
  message: string;
}) {
  try {
    // Adresse email spécifique pour le formulaire coach
    const coachEmail = 'contact@vendresansagenceenfrance.fr';

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: coachEmail,
      subject: `Nouvelle demande coach - ${contactData.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4A7C9B; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Nouvelle demande coach</h1>
          </div>
          
          <div style="padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Informations du contact</h3>
              <p><strong>Nom :</strong> ${contactData.name}</p>
              <p><strong>Prénom :</strong> ${contactData.firstName}</p>
              <p><strong>Email :</strong> ${contactData.email}</p>
              <p><strong>Sujet :</strong> ${contactData.subject}</p>
            </div>
            
            <div style="background-color: #fff; padding: 20px; border-left: 4px solid #4A7C9B; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Message</h3>
              <p style="white-space: pre-wrap; line-height: 1.6;">${contactData.message}</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 14px;">
                Ce message a été envoyé depuis le formulaire de contact coach de votre site web.
              </p>
              <p style="color: #666; font-size: 14px;">
                Date d'envoi : ${new Date().toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email coach envoyé à', coachEmail, ':', info.messageId);
    return true;

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email coach:', error);
    return false;
  }
} 