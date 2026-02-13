// lib/sendMail.ts
import sgMail from "@sendgrid/mail";

// Récupération des variables d'environnement
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_SENDER_EMAIL = process.env.SENDGRID_SENDER_EMAIL || process.env.SENDGRID_SENDER; // Pour la compatibilité si vous utilisez encore SENDGRID_SENDER
const SENDGRID_SENDER_NAME = process.env.SENDGRID_SENDER_NAME || "Hub Majoli";

const SENDGRID_TEMPLATE_ID_VERIFICATION = "d-bcd5adc087e745be93ba1e6fda5c48f3" // Assumant que c'est pour la vérification
const SENDGRID_TEMPLATE_ID_RESET_PASSWORD = "d-966365d902994a309866e0dbcbe0876d";

// Initialisation de la clé API SendGrid
if (!SENDGRID_API_KEY) {
  console.error('SENDGRID_API_KEY manquant dans .env. Les emails ne pourront pas être envoyés.');
  // En développement, il est préférable de lever une erreur pour s'en rendre compte immédiatement
  if (process.env.NODE_ENV === 'development') {
    throw new Error('SENDGRID_API_KEY manquant dans .env');
  }
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

if (!SENDGRID_SENDER_EMAIL) {
    console.warn('SENDGRID_SENDER_EMAIL (ou SENDGRID_SENDER) manquant dans .env.');
}


// --- Envoi du mail de vérification ---
export async function sendVerificationEmail(
  to: string,
  code: string,
  firstName: string
) {

  if (!SENDGRID_API_KEY || !SENDGRID_SENDER_EMAIL) {
    console.error("Configuration SendGrid de base (API Key ou Sender Email) manquante pour l'email de vérification.");
    return;
  }

  const msg = {
    to,
    from: {
        email: SENDGRID_SENDER_EMAIL!,
        name: SENDGRID_SENDER_NAME
    },
    templateId: SENDGRID_TEMPLATE_ID_VERIFICATION,
    dynamicTemplateData: {
      firstName: firstName || "Utilisateur", // Fallback
      verificationCode: code,
      // Si votre template de vérification utilise currentYear, ajoutez-le ici aussi
      // currentYear: new Date().getFullYear().toString(),
    },
  };

  try {
    await sgMail.send(msg);
    console.log(`Email de vérification envoyé à ${to}`);
  } catch (error: any) {
    console.error('Erreur SendGrid (vérification):', error.response?.body?.errors || error.message);
    throw error; // Propager l'erreur pour que l'appelant la gère
  }
}


// --- Envoi du mail de réinitialisation de mot de passe ---
export async function sendResetPasswordEmail(
  to: string,
  firstName: string, // Accepter firstName
  resetLink: string  // Le lien de réinitialisation
) {

  if (!SENDGRID_API_KEY || !SENDGRID_SENDER_EMAIL) {
    console.error("Configuration SendGrid de base (API Key ou Sender Email) manquante pour l'email de réinitialisation.");
    return;
  }

  const msg = {
    to,
    from: {
        email: SENDGRID_SENDER_EMAIL!, // Utiliser une variable plus explicite
        name: SENDGRID_SENDER_NAME     // Nom de l'expéditeur
    },
    templateId: SENDGRID_TEMPLATE_ID_RESET_PASSWORD,
    dynamicTemplateData: {
      firstName: firstName || "Utilisateur", // Fournir un fallback
      resetLink: resetLink,               // ICI: 'resetLink' (camelCase) pour correspondre au template
      expirationTime: "1 heure",          // Fournir cette donnée
      currentYear: new Date().getFullYear().toString(), // Fournir cette donnée
    },
  };

  try {
    await sgMail.send(msg);
    console.log(`Email de réinitialisation de mot de passe envoyé à ${to}`);
  } catch (error: any) {
    console.error('Erreur SendGrid (réinitialisation mdp):', error.response?.body?.errors || error.message);
    // En production, pour la réinitialisation de mdp, il est souvent préférable de ne pas
    // propager l'erreur à l'utilisateur pour ne pas révéler si un compte existe ou si l'envoi a échoué.
    // Le logging est suffisant pour le débogage. Si l'envoi est absolument critique, vous pouvez throw.
    // throw error;
  }
}

// --- Envoi d'email générique ---
export async function sendMail({
  to,
  subject,
  html
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!SENDGRID_API_KEY || !SENDGRID_SENDER_EMAIL) {
    console.error("Configuration SendGrid de base (API Key ou Sender Email) manquante pour l'envoi d'email.");
    return;
  }

  const msg = {
    to,
    from: {
      email: SENDGRID_SENDER_EMAIL,
      name: SENDGRID_SENDER_NAME
    },
    subject,
    html
  };

  try {
    await sgMail.send(msg);
    console.log(`Email envoyé à ${to}: ${subject}`);
  } catch (error: any) {
    console.error('Erreur SendGrid (email générique):', error.response?.body?.errors || error.message);
    throw error;
  }
}
