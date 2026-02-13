import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import { Form } from '../../../../lib/models/Form';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("Début de la requête GET /api/formulaires/[id] pour l'ID:", id);
    
    // Connexion à la base de données MongoDB
    await connectToDatabase();
    
    // Récupérer le formulaire par ID
    const form = await Form.findById(id);
    
    if (!form) {
      return NextResponse.json(
        { error: 'Formulaire non trouvé' },
        { status: 404 }
      );
    }
    
    console.log("Formulaire récupéré avec succès:", form._id);
    return NextResponse.json(form);
    
  } catch (error) {
    console.error('Erreur lors de la récupération du formulaire:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("Début de la requête PUT /api/formulaires/[id]");
    const { id } = await params;
    // Logs détaillés sur la requête entrante
    const reqUrl = new URL(request.url);
    const contentType = request.headers.get('content-type');
    const contentLength = request.headers.get('content-length');
    console.log("\n===== DEBUG PUT /api/formulaires/[id] =====");
    console.log("URL:", reqUrl.toString());
    console.log("ID param:", id);
    console.log("Headers: { content-type:", contentType, ", content-length:", contentLength, "}");
    
    const body = await request.json();
    const bodyKeys = body && typeof body === 'object' ? Object.keys(body) : [];
    console.log("Données reçues pour mise à jour (keys):", bodyKeys);
    // Pour éviter d'inonder les logs, ne pas afficher des blobs/base64 entiers
    console.log("Aperçu du body:", JSON.stringify(body, (k, v) => (typeof v === 'string' && v.length > 200 ? v.slice(0, 200) + '…' : v)));
    
    const {
      email,
      phone,
      legalForm,
      companyName,
      ceoFirstName,
      ceoLastName,
      ceoGender,
      street,
      suite,
      city,
      state,
      postalCode,
      country,
      contratPdf,
      attestationPdf,
      // Nouveaux champs
      domiciliationType,
      currentSiret,
      firstName,
      lastName,
      birthDate,
      birthPlace,
      nationality,
      activity,
      kbisFiles,
      currentStep,
      // Nouveaux champs multi-fichiers
      idCardFiles,
      domicileProofFiles,
      // Champs de statut
      status,
      hasPaid,
      signature,
    } = body;

    // Pas d'exigence de champs requis pour PUT (mise à jour partielle)
    // Valider uniquement les champs fournis
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { 
            error: 'Format d\'email invalide',
            details: 'Veuillez saisir une adresse email valide'
          },
          { status: 400 }
        );
      }
    }

    try {
      // Connexion à la base de données MongoDB
      await connectToDatabase();
      
      // Préparer les données pour MongoDB (ne pas écraser avec undefined)
      const rawUpdateData = {
        email,
        phone,
        legalForm,
        companyName,
        ceoFirstName,
        ceoLastName,
        ceoGender,
        street,
        suite,
        city,
        state,
        postalCode,
        country,
        contratPdf,
        attestationPdf,
        // Nouveaux champs pour particuliers
        firstName,
        lastName,
        birthDate,
        birthPlace,
        nationality,
        // Champs pour l'attestation
        activity,
        // KBIS pour entreprises
        kbisFiles,
        // Nouveaux champs multi-fichiers
        idCardFiles,
        domicileProofFiles,
        // Champs de suivi
        currentStep,
        // Champs domiciliation
        domiciliationType: typeof domiciliationType === 'string' ? (domiciliationType === 'changement' ? 'changement' : 'creation') : undefined,
        currentSiret: typeof currentSiret === 'string' && currentSiret.trim() !== '' ? currentSiret.trim() : undefined,
        // Champs de statut
        status,
        hasPaid,
        signature,
        updatedAt: new Date()
      };
      const updateData = Object.fromEntries(
        Object.entries(rawUpdateData).filter(([, value]) => value !== undefined)
      );

      console.log("Données à mettre à jour dans MongoDB:", updateData);
      
      // Mettre à jour le formulaire dans MongoDB
      const { id } = await params;
      const updatedForm = await Form.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );
      
      if (!updatedForm) {
        return NextResponse.json(
          { error: 'Formulaire non trouvé' },
          { status: 404 }
        );
      }
      
             console.log("Formulaire mis à jour avec succès:", updatedForm._id);
       
       // Créer automatiquement un utilisateur basique lié au site (si email présent)
       let userResponse = null;
       let securePassword = null;
       if (email) {
         try {
           const existingUser = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/utilisateurs/check?email=${encodeURIComponent(email)}`, {
             method: 'GET',
           });
           const userExists = await existingUser.json();
           if (!userExists.exists) {
             // Générer un mot de passe sécurisé
             const generatePassword = () => {
               const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
               let password = '';
               for (let i = 0; i < 12; i++) {
                 password += chars.charAt(Math.floor(Math.random() * chars.length));
               }
               return password;
             };
             
             securePassword = generatePassword();
             
             const userData = {
                 siteId: updatedForm.siteId || 'default-site',
                 firstName: firstName || ceoFirstName || 'Client',
                 lastName: lastName || ceoLastName || '',
                 email: email,
                 phone: phone,
                 role: 'user',
                 password: securePassword // Envoyer le mot de passe en clair, l'endpoint le hashera
               };
               
               
             userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/utilisateurs`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(userData)
             });
             if (userResponse.ok) {
               console.log("✅ Utilisateur créé avec succès pour le formulaire:", updatedForm._id);
               console.log("📧 DEBUG - Tentative d'envoi email de bienvenue à:", email);
               
               // Envoyer un email de bienvenue avec les identifiants
               try {
                 const welcomeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/sharedServices/email/welcome`, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({
                     email: email,
                     firstName: userData.firstName,
                     lastName: userData.lastName,
                     password: securePassword, // Mot de passe sécurisé généré
                     siteId: updatedForm.siteId
                   })
                 });
                 
                 if (welcomeResponse.ok) {
                   console.log("✅ Email de bienvenue envoyé avec succès à:", email);
                 } else {
                   const errorText = await welcomeResponse.text();
                   console.warn("⚠️ Échec envoi email de bienvenue:", welcomeResponse.status, errorText);
                 }
               } catch (emailError) {
                 console.error("❌ Erreur envoi email de bienvenue:", emailError);
               }
             } else if (userResponse.status === 409) {
               // Utilisateur existe déjà -> continuer silencieusement
               console.log('ℹ️ Utilisateur déjà existant, pas de création ni d\'email de bienvenue');
             } else {
               const errorText = await userResponse.text();
               console.warn("⚠️ Échec de la création de l'utilisateur (non bloquant):", userResponse.status, errorText);
             }
           } else {
             console.log("ℹ️ Utilisateur avec cet email existe déjà, pas de création ni d'email de bienvenue");
           }
         } catch (e) {
           console.warn('Création utilisateur échouée (non bloquant):', e);
         }
       }
       
       // Retourner les informations sur la création d'utilisateur
       const response = {
         ...updatedForm.toObject(),
         userCreated: userResponse?.ok || false,
         userEmail: email,
         userPassword: userResponse?.ok ? securePassword : null // Retourner le mot de passe généré
       };
       
       
       return NextResponse.json(response);
      
    } catch (error) {
      console.error("❌ Erreur MongoDB:", error);
      
      let errorMessage = 'Erreur de base de données';
      let errorDetails = 'Une erreur est survenue lors de la mise à jour des données';
      
      if (error instanceof Error) {
        if (error.message.includes('validation failed')) {
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
    console.error('Erreur lors de la mise à jour du formulaire:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
