import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import { Form } from '../../../../lib/models/Form';
import bcrypt from 'bcryptjs';

// Configuration pour les requêtes volumineuses
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export async function POST(request: NextRequest) {
  try {
    console.log("Début de la requête POST /api/formulaires/add");
    
    const body = await request.json();
    console.log("Données reçues:", body);
    console.log("🔍 DEBUG - Champs d'identité reçus:", {
      firstName: body.firstName,
      lastName: body.lastName,
      firstNameType: typeof body.firstName,
      lastNameType: typeof body.lastName,
      firstNameLength: body.firstName?.length,
      lastNameLength: body.lastName?.length
    });
    console.log("🔍 DEBUG - Signature reçue:", {
      hasSignature: !!body.signature,
      signatureLength: body.signature?.length,
      signatureType: typeof body.signature,
      signaturePreview: body.signature ? body.signature.substring(0, 50) + '...' : 'null'
    });
    console.log("🔍 DEBUG - Champs domiciliation reçus:", {
      domiciliationType: body.domiciliationType,
      currentSiret: body.currentSiret,
      domiciliationTypeType: typeof body.domiciliationType,
      currentSiretType: typeof body.currentSiret
    });
    
    const {
      // Métadonnées
      siteId,
      currentStep = 1,
      // Paiement / abonnement
      abonnementId,
      abonnementType,
      stripeSessionId,
      stripePriceId,
      // Étape 1 - Adresse et contact
      street,
      suite,
      city,
      state,
      postalCode,
      country,
      email,
      phone,
      // Champs d'identité
      firstName,
      lastName,
      // Étape 2 - Informations entreprise
      legalForm,
      companyName,
      ceoFirstName,
      ceoMiddleName,
      ceoLastName,
      companyCreated,
      idCardFile,
      domicileProofFile,
      // Nouveaux champs multi-fichiers
      idCardFiles,
      domicileProofFiles,
      hasDocument,
      hasDomicileDocument,
      idCardFileName,
      domicileProofFileName,
      // Contrat PDF
      contratPdf,
      // Signature du client
      signature,
      // Champs domiciliation
      domiciliationType,
      currentSiret,
      // Métadonnées
      submittedAt = new Date(),
      status = 'pending'
    } = body;

    // Normalisation selon la forme juridique
    const isParticulier = (legalForm || '').toLowerCase() === 'particulier';
    const safePhone = isParticulier ? (phone || '') : phone;
    const safeCeoFirstName = isParticulier ? (ceoFirstName || '') : ceoFirstName;
    const safeCeoLastName = isParticulier ? (ceoLastName || '') : ceoLastName;

    // Validation des champs requis selon l'étape
    const missingFields: string[] = [];
    if (!siteId) missingFields.push('siteId');
    if (!email) missingFields.push('email');
    if (!safePhone) missingFields.push('phone');
    
    // À l'étape 1, seuls les champs de base sont requis
    if (currentStep !== 1) {
      // À partir de l'étape 2, les champs CEO sont requis pour les non-particuliers
      if (!isParticulier) {
        if (!safeCeoFirstName) missingFields.push('ceoFirstName');
        if (!safeCeoLastName) missingFields.push('ceoLastName');
        if (!legalForm) missingFields.push('legalForm');
      }
    }

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
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          error: 'Format d\'email invalide',
          details: 'Veuillez saisir une adresse email valide'
        },
        { status: 400 }
      );
    }

    // Validation du format téléphone (basique)
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
    if (safePhone) {
      if (!phoneRegex.test(safePhone)) {
        return NextResponse.json(
          { 
            error: 'Format de téléphone invalide',
            details: 'Veuillez saisir un numéro de téléphone valide'
          },
          { status: 400 }
        );
      }
    } else if (!isParticulier) {
      // Absence de téléphone déjà signalée via missingFields pour non-particulier
    }

    try {
      // Connexion à la base de données MongoDB
      await connectToDatabase();
      
      // Préparer les données pour MongoDB
    const formData = {
        siteId,
        currentStep,
        abonnementId,
        abonnementType,
        stripeSessionId,
        stripePriceId,
        street,
        suite,
        city,
        state,
        postalCode,
        country,
        email,
        phone: safePhone,
        legalForm,
        companyName,
        firstName,
        lastName,
        ceoFirstName: safeCeoFirstName,
        ceoMiddleName,
        ceoLastName: safeCeoLastName,
        // Gérer le champ companyCreated correctement
        companyCreated: companyCreated && companyCreated !== 'non' ? new Date(companyCreated) : undefined,
        // Legacy: premier fichier (compatibilité)
        idCardFile: (body.idCardFile && typeof body.idCardFile === 'string' && body.idCardFile.trim() !== '') ? body.idCardFile : undefined,
        domicileProofFile: (body.domicileProofFile && typeof body.domicileProofFile === 'string' && body.domicileProofFile.trim() !== '') ? body.domicileProofFile : undefined,
        // Nouveaux champs: tableaux d'URLs S3
        idCardFiles: Array.isArray(body.idCardFiles)
          ? body.idCardFiles.filter((u: unknown) => typeof u === 'string' && u.trim() !== '')
          : (typeof body.idCardFiles === 'string' && body.idCardFiles.trim() !== ''
            ? [body.idCardFiles]
            : undefined),
        domicileProofFiles: Array.isArray(body.domicileProofFiles)
          ? body.domicileProofFiles.filter((u: unknown) => typeof u === 'string' && u.trim() !== '')
          : (typeof body.domicileProofFiles === 'string' && body.domicileProofFiles.trim() !== ''
            ? [body.domicileProofFiles]
            : undefined),
        contratPdf, // Ajouter le contrat PDF
        signature, // Ajouter la signature du client
        // Champs domiciliation
        domiciliationType: domiciliationType === 'changement' ? 'changement' : 'creation',
        currentSiret: typeof currentSiret === 'string' && currentSiret.trim() !== '' ? currentSiret.trim() : undefined,
        submittedAt: new Date(submittedAt),
      status
      };

      console.log("Données à insérer dans MongoDB:", formData);
      console.log("🔍 DEBUG - Signature dans formData:", {
        hasSignature: !!formData.signature,
        signatureLength: formData.signature?.length,
        signatureType: typeof formData.signature
      });
      console.log("🔍 DEBUG - Champs domiciliation dans formData:", {
        domiciliationType: formData.domiciliationType,
        currentSiret: formData.currentSiret,
        domiciliationTypeType: typeof formData.domiciliationType,
        currentSiretType: typeof formData.currentSiret
      });
      
      // Vérifier si le formulaire existe déjà (éviter les doublons)
      const existingForm = await Form.findOne({
        email: formData.email,
        ceoFirstName: formData.ceoFirstName,
        ceoLastName: formData.ceoLastName
      });
      
      if (existingForm) {
        console.log("Formulaire déjà existant:", existingForm._id);
        
        // Mettre à jour le formulaire existant avec les nouveaux champs
        console.log("Mise à jour du formulaire existant avec les nouveaux champs");
        const updateData: any = {
          // Mettre à jour les champs domiciliation
          domiciliationType: formData.domiciliationType,
          currentSiret: formData.currentSiret,
          updatedAt: new Date()
        };
        
        // Ajouter les autres champs si fournis
        if (contratPdf) updateData.contratPdf = contratPdf;
        if (signature) updateData.signature = signature;
        
        const updatedForm = await Form.findByIdAndUpdate(
          existingForm._id,
          updateData,
          { new: true }
        );
        console.log("Formulaire mis à jour avec les nouveaux champs:", updatedForm._id);
        console.log("🔍 DEBUG - Champs domiciliation mis à jour:", {
          domiciliationType: updatedForm.domiciliationType,
          currentSiret: updatedForm.currentSiret
        });
        
        return NextResponse.json({
          success: true,
          message: 'Formulaire mis à jour avec succès',
          id: existingForm._id.toString()
        });
      }
      
      // Créer le nouveau formulaire dans MongoDB
      const newForm = await Form.create(formData);
      console.log("Formulaire créé avec succès dans MongoDB:", newForm._id);
      
      // Créer automatiquement un utilisateur basique lié au site
      try {
        // Vérifier si un utilisateur avec cet email existe déjà
        const existingUser = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/utilisateurs/check?email=${encodeURIComponent(email)}`, {
          method: 'GET',
        });
        
        const userExists = await existingUser.json();
        
        if (!userExists.exists) {
          // Créer un nouvel utilisateur avec un mot de passe sécurisé
          const generatePassword = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
            let password = '';
            for (let i = 0; i < 12; i++) {
              password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return password;
          };
          
          const securePassword = generatePassword();
          const hashedPassword = await bcrypt.hash(securePassword, 12);
          
                     const userData = {
               siteId: siteId || 'default-site',
              firstName: firstName || safeCeoFirstName || 'Client',
              lastName: lastName || safeCeoLastName || '',
               email: email,
              phone: safePhone,
               role: 'user',
               password: hashedPassword,
               stripeSessionId: stripeSessionId // Passer le stripeSessionId pour l'association immédiate
             };
             
             console.log('🔍 DEBUG - Données utilisateur à créer:', {
               firstName: userData.firstName,
               lastName: userData.lastName,
               email: userData.email,
               firstNameSource: firstName ? 'firstName' : 'safeCeoFirstName',
               lastNameSource: lastName ? 'lastName' : 'safeCeoLastName',
               originalFirstName: firstName,
               originalLastName: lastName,
               safeCeoFirstName: safeCeoFirstName,
               safeCeoLastName: safeCeoLastName
             });
             
                     const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/utilisateurs`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(userData)
           });
          
                     if (userResponse.ok) {
             const createdUser = await userResponse.json();
             console.log("Utilisateur créé avec succès pour le formulaire:", newForm._id, "User ID:", createdUser._id);
             console.log("✅ Paiement Stripe déjà associé lors de la création du client");
           } else {
             console.warn("Échec de la création de l'utilisateur (non bloquant):", await userResponse.text());
           }
        } else {
          console.log("Utilisateur avec cet email existe déjà");
          
          // Si on a un stripeSessionId, associer le paiement à l'utilisateur existant
          if (stripeSessionId) {
            console.log("🔗 Association du paiement à l'utilisateur existant");
            try {
              const associateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/utilisateurs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  siteId: siteId || 'default-site',
                  firstName: safeCeoFirstName || 'Client',
                  lastName: safeCeoLastName || '',
                  email: email,
                  phone: safePhone,
                  role: 'user',
                  password: 'dummy-password', // Ne sera pas utilisé car utilisateur existe
                  stripeSessionId: stripeSessionId
                })
              });
              
              if (associateResponse.status === 409) {
                console.log("✅ Paiement Stripe associé à l'utilisateur existant");
              } else {
                console.warn("⚠️ Échec de l'association du paiement:", await associateResponse.text());
              }
            } catch (associateError) {
              console.warn("⚠️ Erreur lors de l'association du paiement:", associateError);
            }
          }
        }
      } catch (e) {
        console.warn('Création utilisateur échouée (non bloquant):', e);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Formulaire soumis avec succès',
        id: newForm._id.toString()
      });
      
    } catch (error) {
      console.error("❌ Erreur MongoDB:", error);
      
      // Déterminer le type d'erreur MongoDB
      let errorMessage = 'Erreur de base de données';
      let errorDetails = 'Une erreur est survenue lors de la sauvegarde des données';
      
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          errorMessage = 'Formulaire déjà existant';
          errorDetails = 'Un formulaire avec ces informations existe déjà dans notre base de données';
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
    console.error('Erreur lors de l\'ajout du formulaire:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
} 