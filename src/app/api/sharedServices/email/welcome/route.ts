import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/_sharedServices/emailService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, password, siteId } = body;

    if (!email || !siteId) {
      return NextResponse.json(
        { error: 'Email et siteId requis' },
        { status: 400 }
      );
    }

    // Envoyer l'email de bienvenue avec les identifiants
    await emailService.sendTransactionalEmail({
      to: email,
      subject: 'Bienvenue chez L\'Arche - Vos identifiants de connexion',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Bienvenue chez L'Arche !</h2>
          
          <p>Bonjour ${firstName || 'Cher client'},</p>
          
          <p>Votre compte a été créé avec succès. Voici vos identifiants de connexion :</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email :</strong> ${email}</p>
            <p><strong>Mot de passe temporaire :</strong> ${password || 'Généré automatiquement'}</p>
          </div>
          
          <p><strong>Important :</strong> Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe lors de votre première connexion.</p>
          
          <p>Vous pouvez maintenant accéder à votre espace client pour suivre vos démarches de domiciliation.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              Cordialement,<br>
              L'équipe L'Arche
            </p>
          </div>
        </div>
      `,
      siteId: siteId
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de bienvenue:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    );
  }
}
