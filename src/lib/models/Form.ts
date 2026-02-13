import mongoose from 'mongoose';

const formSchema = new mongoose.Schema({
  // Métadonnées
  siteId: { type: String, required: true, index: true },
  
  // Étape 1 - Adresse et contact
  street: String,
  suite: String,
  city: String,
  state: String,
  postalCode: String,
  country: String,
  email: { type: String, required: true },
  phone: { type: String, required: true },
  firstName: String,
  lastName: String,
  
  // Étape 2 - Informations entreprise
  legalForm: { type: String, required: false },
  companyName: String,
  ceoFirstName: { type: String, required: false },
  ceoMiddleName: String,
  ceoLastName: { type: String, required: false },
  ceoGender: { type: String, enum: ['female', 'male'], required: false },
  companyCreated: Date,
  // Champs pour l'attestation
  birthDate: String, // Date de naissance du dirigeant
  birthPlace: String, // Lieu de naissance du dirigeant
  nationality: String, // Nationalité du dirigeant
  activity: String, // Activité principale de l'entreprise
  
  // NOUVEAUX CHAMPS : Type de domiciliation et SIRET
  domiciliationType: { 
    type: String, 
    required: true, 
    enum: ['creation', 'changement'], 
    default: 'creation' 
  },
  currentSiret: { 
    type: String, 
    required: false // Sera validé côté application
  },
  
  idCardFile: String, // URL de l'image uploadée vers S3 (legacy - premier fichier)
  domicileProofFile: String, // URL du justificatif de domicile uploadé vers S3 (legacy - premier fichier)
  // Nouveaux champs: support multi-fichiers
  idCardFiles: [{ type: String }],
  domicileProofFiles: [{ type: String }],
  kbisFiles: [{ type: String }],
  
  // Lien paiement / abonnement
  abonnementId: { type: String, index: true },
  abonnementType: { type: String },
  stripeSessionId: { type: String },
  stripePriceId: { type: String },
  ipAddress: { type: String },
  
  // Contrat PDF généré
  contratPdf: String, // URL S3 du contrat PDF généré
  attestationPdf: String, // URL S3 de l'attestation PDF générée
  
  // Signature du client
  signature: String, // Base64 de la signature du client
  
  // Métadonnées
  submittedAt: { type: Date, default: Date.now },
  currentStep: { type: Number, default: 1 }, // Étape actuelle de l'utilisateur
  status: { type: String, default: 'unpaid', enum: ['unpaid', 'pending', 'processing', 'approved', 'rejected', 'paid'] }
}, {
  timestamps: true
});

export const Form = mongoose.models.Form || mongoose.model('Form', formSchema);