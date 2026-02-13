import { NextRequest, NextResponse } from "next/server"
import { emailService } from "../../../../../_sharedServices/emailService"
import { connectToDatabase } from "@/lib/db"
import { Site } from "@/lib/models/Site"
import { Utilisateur } from "@/lib/models/Utilisateur"

const buildDomiciliationFilename = (
  type: "contrat" | "attestation",
  formData: any,
  date: Date = new Date()
) => {
  const rawName =
    formData?.companyName ||
    `${formData?.ceoFirstName || formData?.firstName || ""} ${formData?.ceoLastName || formData?.lastName || ""}`.trim() ||
    "client";
  const safeName = rawName.replace(/[^a-zA-Z0-9-_]+/g, "_") || "client";
  const dateStr = date.toISOString().split("T")[0];
  const prefix = type === "contrat" ? "contrat_domiciliation" : "attestation_domiciliation";
  return `${prefix}_Arche_${safeName}_${dateStr}.pdf`;
};

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { formData, contractBase64, attestationBase64, siteId } = await request.json()

    // Validation des données requises
    if (!formData || !contractBase64 || !attestationBase64) {
      return NextResponse.json(
        { error: "Les champs 'formData', 'contractBase64' et 'attestationBase64' sont requis" },
        { status: 400 }
      )
    }

    if (!formData.email) {
      return NextResponse.json(
        { error: "L'email du client est requis" },
        { status: 400 }
      )
    }

    // Récupérer tous les utilisateurs admin du site
    let adminEmails: string[] = []
    try {
      if (siteId) {
        const admins = await Utilisateur.find({ role: 'admin', siteId: siteId }).select('email siteId');
        console.log('📧 API RDV - Admins trouvés pour siteId:', siteId, admins.map(a => ({ email: a.email, siteId: a.siteId })));
        
        adminEmails = admins.length > 0 ? admins.map(admin => admin.email) : [process.env.ADMIN_EMAIL || 'larche.centredaffaires@gmail.com'];
        
        console.log('🔍 DEBUG - Admins trouvés:', adminEmails);
      }
      
      // Fallback si aucun admin trouvé
      if (adminEmails.length === 0) {
        adminEmails = [process.env.ADMIN_EMAIL || "larche.centredaffaires@gmail.com"]
        console.log('🔍 DEBUG - Aucun admin trouvé, utilisation email par défaut:', adminEmails);
      }
    } catch (error) {
      console.warn('Impossible de récupérer les admins du site:', error)
      adminEmails = [process.env.ADMIN_EMAIL || "larche.centredaffaires@gmail.com"]
    }
    
    console.log('🔍 DEBUG - Emails admin utilisés:', adminEmails);
    console.log('🔍 DEBUG - Email client:', formData.email);

    // Préparer les pièces jointes - extraire la partie base64 pure
    const contractBase64Clean = contractBase64.replace(/^data:application\/pdf;base64,/, '');
    const attestationBase64Clean = attestationBase64.replace(/^data:application\/pdf;base64,/, '');
    
    const generationDate = new Date();
    const attachments: Array<{ content: string; filename: string; type: string; disposition: 'attachment' | 'inline' }> = [
      {
        content: contractBase64Clean,
        filename: buildDomiciliationFilename("contrat", formData, generationDate),
        type: 'application/pdf',
        disposition: 'attachment'
      },
      {
        content: attestationBase64Clean,
        filename: buildDomiciliationFilename("attestation", formData, generationDate),
        type: 'application/pdf',
        disposition: 'attachment'
      }
    ]

    // Envoyer l'email à chaque admin individuellement
    const adminEmailResults = await Promise.allSettled(
      adminEmails.map(async (adminEmail) => {
        try {
          const result = await emailService.sendTransactionalEmailWithAttachment({
            to: adminEmail,
            subject: 'Nouvelle demande de domiciliation signée',
            htmlContent: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Nouvelle demande de domiciliation signée</h2>

                <p>Une nouvelle demande de domiciliation a été soumise et signée.</p>

                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                  <h3 style="margin-top: 0; color: #856404;">Détails de la demande :</h3>
                  <p><strong>Client :</strong> ${formData.firstName || ''} ${formData.lastName || ''}</p>
                  <p><strong>Email :</strong> ${formData.email || 'Non renseigné'}</p>
                  <p><strong>Téléphone :</strong> ${formData.phone || 'Non renseigné'}</p>
                  <p><strong>Forme juridique :</strong> ${formData.legalForm || 'Non renseigné'}</p>
                  <p><strong>Entreprise :</strong> ${formData.companyName || 'Non renseigné'}</p>
                  <p><strong>Adresse :</strong> ${formData.street || ''} ${formData.suite || ''}, ${formData.postalCode || ''} ${formData.city || ''}</p>
                  <p><strong>Type de domiciliation :</strong> ${formData.domiciliationType || 'Non renseigné'}</p>
                </div>

                <p>Les documents suivants sont joints à cet email :</p>
                <ul>
                  <li>Contrat de domiciliation signé</li>
                  <li>Attestation de domiciliation</li>
                </ul>

                <p>Cordialement,<br>L'équipe de l'Arche</p>
              </div>
            `,
            fromName: 'Système de domiciliation',
            siteId: siteId,
            attachments: attachments
          });
          console.log(`✅ Email admin envoyé avec succès à: ${adminEmail}`);
          return { success: true, email: adminEmail };
        } catch (error) {
          console.error(`❌ Échec envoi email admin à: ${adminEmail}`, error);
          return { success: false, email: adminEmail, error: error };
        }
      })
    );

    const adminEmailSent = adminEmailResults.every(result => 
      result.status === 'fulfilled' && result.value.success === true
    );

    // Log des résultats des emails admin
    const successfulAdmins = adminEmailResults.filter(result => 
      result.status === 'fulfilled' && result.value.success === true
    ).length;
    const failedAdmins = adminEmailResults.length - successfulAdmins;
    
    console.log(`📊 Résultats emails admin: ${successfulAdmins}/${adminEmailResults.length} envoyés avec succès`);
    if (failedAdmins > 0) {
      console.warn(`⚠️ ${failedAdmins} emails admin ont échoué`);
    }

    // Envoyer l'email au client
    const clientEmailSent = await emailService.sendTransactionalEmailWithAttachment({
      to: formData.email,
      subject: 'Confirmation de votre demande de domiciliation',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Confirmation de votre demande de domiciliation</h2>

          <p>Bonjour ${formData.firstName || ''} ${formData.lastName || ''},</p>

          <p>Nous avons bien reçu votre demande de domiciliation et elle a été traitée avec succès.</p>

          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="margin-top: 0; color: #155724;">Récapitulatif de votre demande :</h3>
            <p><strong>Forme juridique :</strong> ${formData.legalForm || 'Non renseigné'}</p>
            <p><strong>Entreprise :</strong> ${formData.companyName || 'Non renseigné'}</p>
            <p><strong>Adresse de domiciliation :</strong> ${formData.street || ''} ${formData.suite || ''}, ${formData.postalCode || ''} ${formData.city || ''}</p>
            <p><strong>Type de domiciliation :</strong> ${formData.domiciliationType || 'Non renseigné'}</p>
          </div>

          <p>Les documents suivants sont joints à cet email :</p>
          <ul>
            <li>Votre contrat de domiciliation signé</li>
            <li>Votre attestation de domiciliation</li>
          </ul>

          <p>Nous vous contacterons prochainement pour toute information complémentaire.</p>

          <p>Cordialement,<br>L'équipe de l'Arche</p>
        </div>
      `,
      fromName: 'Arche Domiciliation',
      siteId: siteId,
      attachments: attachments
    })

    if (adminEmailSent && clientEmailSent) {
      return NextResponse.json(
        {
          success: true,
          message: "Emails de domiciliation envoyés avec succès",
          adminEmails: adminEmails,
          clientEmail: formData.email
        },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        {
          error: "Échec partiel de l'envoi des emails",
          adminEmailSent,
          clientEmailSent
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("Erreur lors de l'envoi des emails de domiciliation:", error)
    return NextResponse.json(
      {
        error: "Erreur interne du serveur",
        details: error instanceof Error ? error.message : "Erreur inconnue"
      },
      { status: 500 }
    )
  }
}
