"use client";

import { useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import {
  Search,
  RefreshCw,
  FileText,
  CheckCircle,
  Clock,
  X,
  Eye,
  Download,
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  File,
  ExternalLink,
  Filter,
  ArrowUpDown,
  XCircle,
  CreditCard,
  Info
} from "lucide-react";
import { useFormDom } from "../../hooks/use-form-dom";
import { useSiteId } from "@/hooks/use-site-id";

const buildDomiciliationFilename = (
  type: "contrat" | "attestation",
  data: any,
  date: Date = new Date()
) => {
  const rawName =
    data?.companyName ||
    `${data?.ceoFirstName || data?.firstName || ""} ${data?.ceoLastName || data?.lastName || ""}`.trim() ||
    "client";
  const safeName = (rawName || "client").replace(/[^a-zA-Z0-9-_]+/g, "_") || "client";
  const dateStr = date.toISOString().split("T")[0];
  const prefix = type === "contrat" ? "contrat_domiciliation" : "attestation_domiciliation";
  return `${prefix}_Arche_${safeName}_${dateStr}.pdf`;
};

interface FormulairesAdminProps {
  siteId?: string;
  editableElements?: {
    [key: string]: string;
  };
}

interface Formulaire {
  _id: string;
  abonnementId?: string;
  abonnementType?: string;
  stripeSessionId?: string;
  stripePriceId?: string;
  selectedAbonnementPrix?: number;
  street?: string;
  suite?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  email: string;
  phone: string;
  // Nouveaux champs pour particuliers
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  nationality?: string;
  legalForm: string;
  companyName?: string;
  ceoFirstName: string;
  ceoMiddleName?: string;
  ceoLastName: string;
  companyCreated?: string;

  // NOUVEAUX CHAMPS : Type de domiciliation et SIRET
  domiciliationType?: 'creation' | 'changement';
  currentSiret?: string;

  idCardFile?: string; // URL S3 ou nom de fichier (legacy - premier fichier)
  domicileProofFile?: string; // Justificatif de domicile (URL S3 ou nom de fichier) (legacy - premier fichier)
  idCardFiles?: string[]; // Nouveau - liste des CNI (URLs S3)
  domicileProofFiles?: string[]; // Nouveau - liste des justificatifs (URLs S3)
  kbisFiles?: string[]; // Nouveau - fichiers KBIS/statuts pour entreprises
  contratPdf?: string; // Base64 du contrat PDF généré
  attestationPdf?: string; // Base64 du PDF d'attestation
  signature?: string; // Base64 de la signature du client
  submittedAt: string;
  status: 'pending' | 'processing' | 'unpaid' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    fileName: string;
    fileUrl?: string;
    isImage?: boolean;
    userFirstName?: string;
    userLastName?: string;
    documentType?: 'idCard' | 'domicileProof' | 'kbis' | undefined; // Type de document
  } | null;
}

// Composant Modal pour afficher les documents
const DocumentModal: React.FC<DocumentModalProps> = ({ isOpen, onClose, document: doc }) => {
  if (!isOpen || !doc) return null;

  // Fonction de téléchargement fiable pour les documents
  const downloadDocument = async (fileUrl: string, fileName: string) => {
    try {
      console.log('📥 Tentative de téléchargement:', { fileUrl, fileName });
      // Si c'est une data URL (base64), la traiter directement
      if (fileUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName || 'document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('✅ Téléchargement data URL réussi');
        return;
      }
      
      // Pour les URLs S3 ou autres URLs externes, utiliser l'API proxy
      const downloadUrl = `/api/download-document?url=${encodeURIComponent(fileUrl)}&fileName=${encodeURIComponent(fileName || 'document')}`;
      
      // Créer un lien de téléchargement temporaire
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || 'document.pdf';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('✅ Téléchargement via API proxy réussi');
    } catch (e) {
      console.error('❌ Erreur téléchargement document:', e);
      // Fallback: Essayer le téléchargement direct
      try {
        console.log('🔄 Tentative fallback - téléchargement direct');
        const response = await fetch(fileUrl, { 
          credentials: 'include',
          headers: {
            'Accept': '*/*',
          }
        });
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = window.document.createElement('a');
          a.href = url;
          a.download = fileName || 'document.pdf';
          a.style.display = 'none';
          window.document.body.appendChild(a);
          a.click();
          window.document.body.removeChild(a);
          URL.revokeObjectURL(url);
          console.log('✅ Téléchargement direct réussi');
          return;
        }
      } catch (fallbackError) {
        console.error('❌ Fallback échoué:', fallbackError);
      }
      
      // Dernier recours: Ouvrir dans un nouvel onglet
      console.log('🔄 Dernier recours - ouverture dans nouvel onglet');
      window.open(fileUrl, '_blank');
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return <FileText className="w-8 h-8 text-blue-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="w-8 h-8 text-blue-600" />;
      default:
        return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  const getDisplayType = (fileName: string, fileUrl?: string) => {
    if (fileUrl && fileUrl.startsWith('data:')) {
      const semi = fileUrl.indexOf(';');
      const mime = semi > 5 ? fileUrl.substring(5, semi) : 'application/octet-stream';
      return mime.toUpperCase();
    }
    const extension = fileName.split('.').pop()?.toUpperCase();
    return extension || 'FICHIER';
  };

  const getFileName = (fileName: string, fileUrl?: string) => {
    if (fileUrl && fileUrl.startsWith('data:')) {
      // Pour les data URLs, utiliser un nom plus descriptif
      const semi = fileUrl.indexOf(';');
      const mime = semi > 5 ? fileUrl.substring(5, semi) : 'application/octet-stream';
      const extension = mime === 'image/jpeg' ? '.jpg' : 
                       mime === 'image/png' ? '.png' : 
                       mime === 'image/gif' ? '.gif' : 
                       mime === 'image/webp' ? '.webp' : 
                       mime === 'application/pdf' ? '.pdf' : '.bin';
      return fileName.replace('.pdf', extension);
    }
    return fileName;
  };

  const isImageFile = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '');
  };

  const isImage = (doc.fileUrl?.startsWith('data:image') ?? false) || isImageFile(doc.fileName);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Document fourni
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              {getFileIcon(doc.fileName)}
              <div>
                <h4 className="font-medium text-gray-900">
                  {doc.documentType === 'domicileProof' ? 'Justificatif de domicile' : 'Carte d\'identité'} de {doc.userFirstName || ''} {doc.userLastName || ''}
                </h4>
                <p className="text-sm text-gray-500">{getDisplayType(doc.fileName, doc.fileUrl)}</p>
                <p className="text-xs text-gray-400">{getFileName(doc.fileName, doc.fileUrl)}</p>
              </div>
            </div>

            {doc.fileUrl ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Document disponible</span>
                </div>

                                 {/* Aperçu direct du document */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                   <h5 className="font-medium text-gray-900 mb-3">Aperçu :</h5>
                    <div className="flex justify-center">
                     {isImage ? (
                      <img
                        src={doc.fileUrl}
                        alt={doc.fileName}
                        className="max-w-full max-h-96 object-contain rounded-lg shadow-sm"
                        style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const errorDiv = window.document.createElement('div');
                          errorDiv.className = 'text-center py-8 text-gray-500';
                          errorDiv.innerHTML = `
                            <div class="text-center py-8">
                              <svg class="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                              </svg>
                              <p class="text-gray-500 mb-2">Image non accessible</p>
                              <p class="text-sm text-gray-400">L'image ne peut pas être affichée</p>
                            </div>
                          `;
                          target.parentNode?.appendChild(errorDiv);
                        }}
                      />
                     ) : (
                       <iframe
                         src={doc.fileUrl}
                         className="w-full h-96 border-0 rounded-lg shadow-sm"
                         style={{ maxWidth: '100%', maxHeight: '400px' }}
                         title={doc.fileName}
                         onError={(e) => {
                           const target = e.target as HTMLIFrameElement;
                           target.style.display = 'none';
                           const errorDiv = window.document.createElement('div');
                           errorDiv.className = 'text-center py-8 text-gray-500';
                           errorDiv.innerHTML = `
                             <div class="text-center py-8">
                               <svg class="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                               </svg>
                               <p class="text-gray-500 mb-2">Document non accessible</p>
                               <p class="text-sm text-gray-400">Le document ne peut pas être affiché</p>
                    </div>
                           `;
                           target.parentNode?.appendChild(errorDiv);
                         }}
                       />
                )}
                   </div>
                 </div>

                                 <div className="flex flex-wrap gap-2">
                                   <button
                                     onClick={() => downloadDocument(doc.fileUrl || '', getFileName(doc.fileName, doc.fileUrl))}
                                     className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                                   >
                                     <Download className="w-4 h-4" />
                                     Télécharger
                                   </button>
                                 </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p className="text-gray-500 mb-2">Document non disponible</p>
                <p className="text-sm text-gray-400">
                  Le fichier n'est pas accessible pour le moment.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Fermer
            </button>
              </div>
            </div>

          </div>
        </div>
  );
};

// Modal d'accès rapide aux infos client
const CustomerInfoModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  formulaire: Formulaire | null;
}> = ({ isOpen, onClose, formulaire }) => {
  if (!isOpen || !formulaire) return null;

  const fullAddress = [
    [formulaire.street, formulaire.suite].filter(Boolean).join(" "),
    [formulaire.postalCode, formulaire.city].filter(Boolean).join(" "),
    formulaire.country
  ].filter(Boolean).join(" • ");
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Infos client</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-gray-900">
            <User className="w-4 h-4" />
            <span className="font-medium">
              {formulaire.legalForm === 'Particulier'
                ? `${(formulaire.firstName || '').trim()} ${(formulaire.lastName || '').trim()}`.trim() || `${formulaire.ceoFirstName} ${formulaire.ceoLastName}`
                : `${formulaire.ceoFirstName} ${formulaire.ceoLastName}`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Mail className="w-4 h-4" />
            <a href={`mailto:${formulaire.email}`} className="text-blue-600 hover:underline">{formulaire.email}</a>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Phone className="w-4 h-4" />
            <a href={`tel:${formulaire.phone}`} className="text-blue-600 hover:underline">{formulaire.phone}</a>
          </div>
          {fullAddress && (
            <div className="flex items-start gap-2 text-gray-700">
              <MapPin className="w-4 h-4 mt-0.5" />
              <span>{fullAddress}</span>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-md transition-colors">Fermer</button>
        </div>
      </div>
    </div>
  );
};

// Modal de création rapide d'un formulaire (sans paiement)
type NewFormFields = {
  email?: string;
  phone?: string;
  legalForm?: string;
  companyName?: string;
  ceoFirstName?: string;
  ceoLastName?: string;
  street?: string;
  suite?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  selectedAbonnementId?: string;
  selectedAbonnementPrix?: number;
  
  // NOUVEAUX CHAMPS : Type de domiciliation et SIRET
  domiciliationType?: 'creation' | 'changement';
  currentSiret?: string;
  
  idCardFile?: File | string | null; // Legacy - pour compatibilité (File ou URL S3)
  domicileProofFile?: File | string | null; // Legacy - pour compatibilité (File ou URL S3)
  idCardFiles?: string[]; // Nouveau - liste des URLs S3 des CNI
  domicileProofFiles?: string[]; // Nouveau - liste des URLs S3 des justificatifs
  signature?: string; // Base64 de la signature du client
};

const CreateFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: NewFormFields) => Promise<void>;
  siteId?: string;
}> = ({ isOpen, onClose, onCreate, siteId }) => {
  const [form, setForm] = useState<NewFormFields>({});
  const [submitting, setSubmitting] = useState(false);
  const [abonnements, setAbonnements] = useState<any[]>([]);
  const [loadingAbonnements, setLoadingAbonnements] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState('FR');
  const [phoneValue, setPhoneValue] = useState(form.phone || '');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [showErrors, setShowErrors] = useState(false);
  // Fermer les suggestions quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.address-suggestions') && !target.closest('.address-input')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  // Fonction pour l'autocomplétion d'adresse
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      setAddressSuggestions(data.features || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Erreur lors de la recherche d\'adresse:', error);
    }
  };

  // Fonction pour sélectionner une adresse
  const selectAddress = (suggestion: any) => {
    const properties = suggestion.properties;
    setForm(prev => ({
      ...prev,
      city: properties.city,
      postalCode: properties.postcode
    }));
    setShowSuggestions(false);
  };

  // Fonction pour gérer le téléphone international
  const handlePhoneChange = (value: string, country: string) => {
    setPhoneValue(value);
    setPhoneCountry(country);
    setForm(prev => ({ ...prev, phone: value }));
  };

  // Initialiser le formulaire avec les valeurs par défaut quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setForm({
        domiciliationType: 'creation', // Valeur par défaut
        currentSiret: '', // Initialiser le SIRET vide
        email: '',
        phone: '',
        legalForm: '',
        companyName: '',
        ceoFirstName: '',
        ceoLastName: '',
        street: '',
        suite: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        selectedAbonnementId: '',
        selectedAbonnementPrix: undefined,
        idCardFile: null,
        domicileProofFile: null,
        idCardFiles: [],
        domicileProofFiles: [],
        signature: ''
      });
      setErrors({});
      setShowErrors(false);
    }
  }, [isOpen]);
  // Charger les abonnements de domiciliation
  useEffect(() => {
    const fetchAbonnements = async () => {
      if (!siteId) return;
      
      setLoadingAbonnements(true);
      try {
        const res = await fetch(`/api/sharedServices/abonnements/domiciliation?siteId=${siteId}`);
        if (res.ok) {
          const data = await res.json();
          setAbonnements(data.abonnements || []);
        }
      } catch (e) {
        console.error('❌ Erreur récupération abonnements:', e);
      } finally {
        setLoadingAbonnements(false);
      }
    };

    if (isOpen) {
      fetchAbonnements();
    }
  }, [isOpen, siteId]);
  if (!isOpen) return null;

  const handleChange = (key: keyof NewFormFields, value: string) => {
    // Pour le code postal, ne permettre que les chiffres
    if (key === "postalCode") {
      const numericValue = value.replace(/[^0-9]/g, '');
      setForm((prev) => ({ ...prev, [key]: numericValue }));
    } else {
      setForm((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleAbonnementChange = (abonnementId: string) => {
    const selectedAbonnement = abonnements.find(ab => ab._id === abonnementId);
    setForm((prev) => ({ 
      ...prev, 
      selectedAbonnementId: abonnementId,
      selectedAbonnementPrix: selectedAbonnement?.prix || 0
    }));
  };

  const resetForm = () => {
    setForm({
      domiciliationType: 'creation', // Valeur par défaut
      currentSiret: '', // Initialiser le SIRET vide
      email: '',
      phone: '',
      legalForm: '',
      companyName: '',
      ceoFirstName: '',
      ceoLastName: '',
      street: '',
      suite: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      selectedAbonnementId: '',
      selectedAbonnementPrix: undefined,
      idCardFile: null,
      domicileProofFile: null,
      idCardFiles: [],
      domicileProofFiles: [],
      signature: ''
    });
    setErrors({});
    setShowErrors(false);
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    // Validation email
    if (!form.email || !form.email.trim()) {
      newErrors.email = "L'email est requis";
    } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
        newErrors.email = "Format d'email invalide";
      }
    }

    // Validation téléphone
    if (!form.phone || !form.phone.trim()) {
      newErrors.phone = "Le téléphone est requis";
    } else if (form.phone.length < 8) {
      newErrors.phone = "Le numéro de téléphone doit contenir au moins 8 chiffres";
    }

    // Validation forme juridique
    if (!form.legalForm || !form.legalForm.trim()) {
      newErrors.legalForm = "La forme juridique est requise";
    }
    
    // Validation type de domiciliation
    if (!form.domiciliationType) {
      newErrors.domiciliationType = "Le type de domiciliation est requis";
    }
    
    // Validation SIRET si changement de siège
    if (form.domiciliationType === 'changement' && (!form.currentSiret || !form.currentSiret.trim())) {
      newErrors.currentSiret = "Le SIRET actuel est requis pour un changement de siège";
    }
    
    if (form.domiciliationType === 'changement' && form.currentSiret) {
      // Vérifier que le SIRET contient exactement 14 chiffres
      const siretDigits = form.currentSiret.replace(/\s/g, '');
      if (siretDigits.length !== 14 || !/^\d{14}$/.test(siretDigits)) {
        newErrors.currentSiret = "Le SIRET doit contenir exactement 14 chiffres";
      }
    }

    // Validation nom de l'entreprise
    if (!form.companyName || !form.companyName.trim()) {
      newErrors.companyName = "Le nom de l'entreprise est requis";
    }

    // Validation prénom
    if (!form.ceoFirstName || !form.ceoFirstName.trim()) {
      newErrors.ceoFirstName = "Le prénom est requis";
    }

    // Validation nom
    if (!form.ceoLastName || !form.ceoLastName.trim()) {
      newErrors.ceoLastName = "Le nom est requis";
    }

    // Validation adresse
    if (!form.city || !form.city.trim()) {
      newErrors.city = "L'adresse est requise";
    }

    // Validation code postal
    if (!form.postalCode || !form.postalCode.trim()) {
      newErrors.postalCode = "Le code postal est requis";
    } else if (!/^\d{5}$/.test(form.postalCode)) {
      newErrors.postalCode = "Le code postal doit contenir 5 chiffres";
    }

    // Validation abonnement
    if (!form.selectedAbonnementId) {
      newErrors.selectedAbonnementId = "Veuillez sélectionner un abonnement";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    setShowErrors(true);
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    try {
      await onCreate(form);
      resetForm(); // Réinitialiser le formulaire après création
      setErrors({});
      setShowErrors(false);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Créer un formulaire (sans paiement)</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">Renseignez les informations minimales, vous pourrez compléter plus tard.</p>
        </div>
        
        {/* Message d'erreur général */}
        {showErrors && Object.keys(errors).length > 0 && (
          <div className="mx-4 sm:mx-6 mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex-shrink-0">
            <div className="flex items-start">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 mt-0.5 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="text-xs sm:text-sm text-red-800">
                <p className="font-medium mb-2">Veuillez corriger les erreurs suivantes :</p>
                <ul className="list-disc list-inside space-y-1">
                  {Object.values(errors).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email *</label>
            <input 
              className={`w-full px-3 py-2 border rounded-md text-sm sm:text-base ${
                showErrors && errors.email 
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              value={form.email || ""} 
              onChange={(e) => handleChange("email", e.target.value)} 
              placeholder="email@exemple.com" 
              required
            />
            {showErrors && errors.email && (
              <p className="text-red-500 text-xs sm:text-sm mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                {errors.email}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Téléphone *</label>
            <div className="flex w-full">
              <select
                className="w-20 sm:w-24 px-1 sm:px-2 py-2 border border-gray-300 border-r-0 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-xs sm:text-sm"
                value={phoneCountry}
                onChange={(e) => setPhoneCountry(e.target.value)}
              >
                <option value="FR">🇫🇷 +33</option>
                <option value="BE">🇧🇪 +32</option>
                <option value="CH">🇨🇭 +41</option>
                <option value="LU">🇱🇺 +352</option>
                <option value="DE">🇩🇪 +49</option>
                <option value="IT">🇮🇹 +39</option>
                <option value="ES">🇪🇸 +34</option>
                <option value="PT">🇵🇹 +351</option>
                <option value="NL">🇳🇱 +31</option>
                <option value="AT">🇦🇹 +43</option>
              </select>
              <input 
                className={`flex-1 min-w-0 px-2 sm:px-3 py-2 border rounded-r-md transition-all text-sm sm:text-base ${
                  showErrors && errors.phone 
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                value={phoneValue} 
                onChange={(e) => handlePhoneChange(e.target.value, phoneCountry)} 
                placeholder="1 23 45 67 89" 
              />
            </div>
            {showErrors && errors.phone && (
              <p className="text-red-500 text-xs sm:text-sm mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                {errors.phone}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Forme juridique *</label>
            <select 
              className={`w-full px-3 py-2 border rounded-md text-sm sm:text-base ${
                showErrors && errors.legalForm 
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              value={form.legalForm || ""}
              onChange={(e) => handleChange("legalForm", e.target.value)}
            >
              <option value="">Sélectionner une forme juridique</option>
              {[
                "Auto-entrepreneur",
                "EI (Entreprise Individuelle)",
                "EIRL (Entreprise Individuelle à Responsabilité Limitée)",
                "EURL (Entreprise Unipersonnelle à Responsabilité Limitée)",
                "SARL (Société à Responsabilité Limitée)",
                "SAS (Société par Actions Simplifiée)",
                "SASU (Société par Actions Simplifiée Unipersonnelle)",
                "SA (Société Anonyme)",
                "SNC (Société en Nom Collectif)",
                "SCS (Société en Commandite Simple)",
                "SCA (Société en Commandite par Actions)",
                "Association",
                "GIE (Groupement d'Intérêt Économique)",
                "Autre",
              ].map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {showErrors && errors.legalForm && (
              <p className="text-red-500 text-xs sm:text-sm mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                {errors.legalForm}
              </p>
            )}
          </div>
          
          {/* Type de domiciliation */}
          <div>
            <label className="block text-sm text-gray-700 mb-1">Type de domiciliation *</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="domiciliationType"
                  value="creation"
                  checked={form.domiciliationType === 'creation'}
                  onChange={(e) => handleChange("domiciliationType", e.target.value)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                />
                <span className="ml-2 text-gray-700">Création d'une nouvelle entreprise</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="domiciliationType"
                  value="changement"
                  checked={form.domiciliationType === 'changement'}
                  onChange={(e) => handleChange("domiciliationType", e.target.value)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                />
                <span className="ml-2 text-gray-700">Changement de siège social</span>
              </label>
            </div>
            {showErrors && errors.domiciliationType && (
              <p className="text-red-500 text-xs sm:text-sm mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                {errors.domiciliationType}
              </p>
            )}
          </div>
          
          {/* SIRET actuel (conditionnel) */}
          {form.domiciliationType === 'changement' && (
            <div>
              <label className="block text-sm text-gray-700 mb-1">SIRET actuel *</label>
              <input 
                className={`w-full px-3 py-2 border rounded-md text-sm sm:text-base ${
                  showErrors && errors.currentSiret 
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                value={form.currentSiret || ""} 
                onChange={(e) => handleChange("currentSiret", e.target.value)} 
                placeholder="123 456 789 00012"
                maxLength={14}
              />
              <p className="text-sm text-gray-500 mt-1">
                Format : 14 chiffres (espaces autorisés pour la lisibilité)
              </p>
              {showErrors && errors.currentSiret && (
                <p className="text-red-500 text-xs sm:text-sm mt-1 flex items-center">
                  <AlertCircle className="w-3 h-4 sm:w-4 sm:h-4 mr-1" />
                  {errors.currentSiret}
                </p>
              )}
            </div>
          )}
          
          <div>
            <label className="block text-sm text-gray-700 mb-1">Entreprise *</label>
            <input 
              className={`w-full px-3 py-2 border rounded-md text-sm sm:text-base ${
                showErrors && errors.companyName 
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              value={form.companyName || ""} 
              onChange={(e) => handleChange("companyName", e.target.value)} 
              placeholder="Nom de l'entreprise" 
            />
            {showErrors && errors.companyName && (
              <p className="text-red-500 text-xs sm:text-sm mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                {errors.companyName}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Prénom *</label>
            <input 
              className={`w-full px-3 py-2 border rounded-md text-sm sm:text-base ${
                showErrors && errors.ceoFirstName 
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              value={form.ceoFirstName || ""} 
              onChange={(e) => handleChange("ceoFirstName", e.target.value)} 
              placeholder="Prénom" 
            />
            {showErrors && errors.ceoFirstName && (
              <p className="text-red-500 text-xs sm:text-sm mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                {errors.ceoFirstName}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Nom *</label>
            <input 
              className={`w-full px-3 py-2 border rounded-md text-sm sm:text-base ${
                showErrors && errors.ceoLastName 
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              value={form.ceoLastName || ""} 
              onChange={(e) => handleChange("ceoLastName", e.target.value)} 
              placeholder="Nom" 
            />
            {showErrors && errors.ceoLastName && (
              <p className="text-red-500 text-xs sm:text-sm mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                {errors.ceoLastName}
              </p>
            )}
          </div>
          <div className="relative">
            <label className="block text-sm text-gray-700 mb-1">Adresse *</label>
            <input 
              className={`address-input w-full px-3 py-2 border rounded-md transition-all text-sm sm:text-base ${
                showErrors && errors.city 
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="Commencez à taper votre adresse..." 
              onChange={(e) => {
                const value = e.target.value;
                handleChange("city", value);
                searchAddress(value);
              }}
              onFocus={() => {
                if (form.city && form.city.length >= 3) {
                  searchAddress(form.city);
                }
              }}
            />
            {showSuggestions && addressSuggestions.length > 0 && (
              <div className="address-suggestions absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {addressSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                    onClick={() => selectAddress(suggestion)}
                  >
                    <div className="font-medium">{suggestion.properties.name}</div>
                    <div className="text-sm text-gray-600">
                      {suggestion.properties.postcode} {suggestion.properties.city}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showErrors && errors.city && (
              <p className="text-red-500 text-xs sm:text-sm mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                {errors.city}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Code postal *</label>
            <input 
              className={`w-full px-3 py-2 border rounded-md text-sm sm:text-base ${
                showErrors && errors.postalCode 
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              value={form.postalCode || ""} 
              onChange={(e) => handleChange("postalCode", e.target.value)} 
              placeholder="59000" 
            />
            {showErrors && errors.postalCode && (
              <p className="text-red-500 text-xs sm:text-sm mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                {errors.postalCode}
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-700 mb-1">Abonnement de domiciliation *</label>
            {loadingAbonnements ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                Chargement des abonnements...
              </div>
            ) : (
              <select 
                className={`w-full px-3 py-2 border rounded-md text-sm sm:text-base ${
                  showErrors && errors.selectedAbonnementId 
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                value={form.selectedAbonnementId || ""}
                onChange={(e) => handleAbonnementChange(e.target.value)}
              >
                <option value="">Sélectionner un abonnement</option>
                {abonnements.map((abonnement) => (
                  <option key={abonnement._id} value={abonnement._id}>
                    {abonnement.nom} - {abonnement.prix}€/{abonnement.duree}
                  </option>
                ))}
              </select>
            )}
            {form.selectedAbonnementPrix && (
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Prix sélectionné : {form.selectedAbonnementPrix}€
              </p>
            )}
            {showErrors && errors.selectedAbonnementId && (
              <p className="text-red-500 text-xs sm:text-sm mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                {errors.selectedAbonnementId}
              </p>
            )}
          </div>
          
          {/* Champs de fichiers - Support multi-fichiers */}
          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-700 mb-1">Cartes d'identité (optionnel)</label>
            <input 
              type="file" 
              accept="image/*,.pdf"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;
                try {
                  const uploadPromises = files.map(async (file) => {
                  const formData = new FormData();
                    formData.append('image', file);
                    formData.append('siteId', siteId || '');
                    const res = await fetch('/api/formulaires/upload-images', { method: 'POST', body: formData });
                  if (!res.ok) throw new Error('Upload S3 échoué');
                  const data = await res.json();
                    return data.imageUrl;
                  });
                  const newUrls = await Promise.all(uploadPromises);
                  setForm(prev => ({ 
                    ...prev, 
                    idCardFiles: [...(prev.idCardFiles || []), ...newUrls],
                    idCardFile: newUrls[0] // Compatibilité legacy
                  }));
                } catch (err) {
                  console.error('Erreur upload cartes identité:', err);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs sm:file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            
          </div>
          
          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-700 mb-1">Justificatifs de domicile (optionnel)</label>
            <input 
              type="file" 
              accept="image/*,.pdf"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;
                try {
                  const uploadPromises = files.map(async (file) => {
                  const formData = new FormData();
                    formData.append('image', file);
                    formData.append('siteId', siteId || '');
                    const res = await fetch('/api/formulaires/upload-images', { method: 'POST', body: formData });
                  if (!res.ok) throw new Error('Upload S3 échoué');
                  const data = await res.json();
                    return data.imageUrl;
                  });
                  const newUrls = await Promise.all(uploadPromises);
                  setForm(prev => ({ 
                    ...prev, 
                    domicileProofFiles: [...(prev.domicileProofFiles || []), ...newUrls],
                    domicileProofFile: newUrls[0] // Compatibilité legacy
                  }));
                } catch (err) {
                  console.error('Erreur upload justificatifs de domicile:', err);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs sm:file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-200 flex items-center justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-3 sm:px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 text-sm sm:text-base">Annuler</button>
          <button onClick={handleSubmit} disabled={submitting} className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm sm:text-base">
            {submitting ? "Création..." : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal d'édition de formulaire
const EditFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  formData: Formulaire;
  siteId?: string;
}> = ({ isOpen, onClose, onSave, formData, siteId }) => {
  const [form, setForm] = useState<any>(formData);
  const [submitting, setSubmitting] = useState(false);
  const [abonnements, setAbonnements] = useState<any[]>([]);
  const [loadingAbonnements, setLoadingAbonnements] = useState(false);
  // Charger les abonnements de domiciliation
  useEffect(() => {
    const fetchAbonnements = async () => {
      if (!siteId) return;
      
      setLoadingAbonnements(true);
      try {
        const res = await fetch(`/api/sharedServices/abonnements/domiciliation?siteId=${siteId}`);
        if (res.ok) {
          const data = await res.json();
          setAbonnements(data.abonnements || []);
        }
      } catch (e) {
        console.error('❌ Erreur récupération abonnements:', e);
      } finally {
        setLoadingAbonnements(false);
      }
    };

    if (isOpen) {
      fetchAbonnements();
    }
  }, [isOpen, siteId]);
  // Mettre à jour le formulaire quand formData change
  useEffect(() => {
    setForm(formData);
  }, [formData]);
  if (!isOpen) {
    console.log('🚫 Modal d\'édition fermé');
    return null;
  }
  
  console.log('✅ Modal d\'édition ouvert pour formulaire:', formData._id);
  const handleChange = (key: string, value: string) => {
    // Pour le code postal, ne permettre que les chiffres
    if (key === "postalCode") {
      const numericValue = value.replace(/[^0-9]/g, '');
      setForm((prev: any) => ({ ...prev, [key]: numericValue }));
    } else {
      setForm((prev: any) => ({ ...prev, [key]: value }));
    }
  };

  const handleSubmit = async () => {
    console.log('💾 Soumission du formulaire d\'édition:', form);
    setSubmitting(true);
    try {
      await onSave(form);
      console.log('✅ Formulaire d\'édition sauvegardé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde du formulaire d\'édition:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Modifier le formulaire</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">Modifiez les informations du formulaire et régénérez le contrat si nécessaire.</p>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email *</label>
            <input 
              className="w-full px-3 py-2 border border-gray-300 rounded-md" 
              value={form.email || ""} 
              onChange={(e) => handleChange("email", e.target.value)} 
              placeholder="email@exemple.com" 
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Téléphone *</label>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-md" value={form.phone || ""} onChange={(e) => handleChange("phone", e.target.value)} placeholder="06 00 00 00 00" />
          </div>
          <div>
                         <label className="block text-sm text-gray-700 mb-1">Forme juridique</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={form.legalForm || ""}
              onChange={(e) => handleChange("legalForm", e.target.value)}
            >
              <option value="">Sélectionner une forme juridique</option>
              <option value="Particulier">Particulier</option>
              <option value="Auto-entrepreneur">Auto-entrepreneur</option>
              <option value="EI (Entreprise Individuelle)">EI (Entreprise Individuelle)</option>
              <option value="EIRL (Entreprise Individuelle à Responsabilité Limitée)">EIRL (Entreprise Individuelle à Responsabilité Limitée)</option>
              <option value="EURL (Entreprise Unipersonnelle à Responsabilité Limitée)">EURL (Entreprise Unipersonnelle à Responsabilité Limitée)</option>
              <option value="SARL (Société à Responsabilité Limitée)">SARL (Société à Responsabilité Limitée)</option>
              <option value="SAS (Société par Actions Simplifiée)">SAS (Société par Actions Simplifiée)</option>
              <option value="SASU (Société par Actions Simplifiée Unipersonnelle)">SASU (Société par Actions Simplifiée Unipersonnelle)</option>
              <option value="SA (Société Anonyme)">SA (Société Anonyme)</option>
              <option value="SCI (Société Civile Immobilière)">SCI (Société Civile Immobilière)</option>
              <option value="SNC (Société en Nom Collectif)">SNC (Société en Nom Collectif)</option>
              <option value="SCS (Société en Commandite Simple)">SCS (Société en Commandite Simple)</option>
              <option value="SCA (Société en Commandite par Actions)">SCA (Société en Commandite par Actions)</option>
              <option value="Association">Association</option>
              <option value="GIE (Groupement d'Intérêt Économique)">GIE (Groupement d'Intérêt Économique)</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
          
          {/* Type de domiciliation */}
          <div>
            <label className="block text-sm text-gray-700 mb-1">Type de domiciliation *</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="domiciliationType"
                  value="creation"
                  checked={form.domiciliationType === 'creation'}
                  onChange={(e) => handleChange("domiciliationType", e.target.value)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                />
                <span className="ml-2 text-gray-700">Création d'une nouvelle entreprise</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="domiciliationType"
                  value="changement"
                  checked={form.domiciliationType === 'changement'}
                  onChange={(e) => handleChange("domiciliationType", e.target.value)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                />
                <span className="ml-2 text-gray-700">Changement de siège social</span>
              </label>
            </div>
          </div>
          
          {/* SIRET actuel (conditionnel) */}
          {form.domiciliationType === 'changement' && (
            <div>
              <label className="block text-sm text-gray-700 mb-1">SIRET actuel *</label>
              <input 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={form.currentSiret || ""} 
                onChange={(e) => handleChange("currentSiret", e.target.value)} 
                placeholder="123 456 789 00012"
                maxLength={14}
              />
              <p className="text-sm text-gray-500 mt-1">
                Format : 14 chiffres (espaces autorisés pour la lisibilité)
              </p>
            </div>
          )}
          
          {/* Champs conditionnels selon le type de formulaire */}
          {form.legalForm !== 'Particulier' && (
            <div>
              <label className="block text-sm text-gray-700 mb-1">Entreprise *</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-md" value={form.companyName || ""} onChange={(e) => handleChange("companyName", e.target.value)} placeholder="Nom de l'entreprise" />
            </div>
          )}

          {form.legalForm === 'Particulier' ? (
            <>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Prénom *</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-md" value={form.firstName || ""} onChange={(e) => handleChange("firstName", e.target.value)} placeholder="Prénom" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Nom *</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-md" value={form.lastName || ""} onChange={(e) => handleChange("lastName", e.target.value)} placeholder="Nom" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Date de naissance</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={form.birthDate || ""}
                  onChange={(e) => handleChange("birthDate", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Nationalité</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-md" value={form.nationality || ""} onChange={(e) => handleChange("nationality", e.target.value)} placeholder="Française" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Prénom du représentant *</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-md" value={form.ceoFirstName || ""} onChange={(e) => handleChange("ceoFirstName", e.target.value)} placeholder="Prénom du représentant" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Nom du représentant *</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-md" value={form.ceoLastName || ""} onChange={(e) => handleChange("ceoLastName", e.target.value)} placeholder="Nom du représentant" />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm text-gray-700 mb-1">Adresse *</label>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-md" value={form.city || ""} onChange={(e) => handleChange("city", e.target.value)} placeholder="Ville" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Code postal *</label>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-md" value={form.postalCode || ""} onChange={(e) => handleChange("postalCode", e.target.value)} placeholder="59000" />
          </div>
          
                                            {/* Champs de fichiers - Support multi-fichiers */}
                       <div className="sm:col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Cartes d'identité</label>
              <input 
                type="file" 
                accept="image/*,.pdf"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;
                  try {
                    const uploadPromises = files.map(async (file) => {
                    const formData = new FormData();
                      formData.append('image', file);
                      formData.append('siteId', siteId || '');
                      const res = await fetch('/api/formulaires/upload-images', { method: 'POST', body: formData });
                    if (!res.ok) throw new Error('Upload S3 échoué');
                    const data = await res.json();
                      return data.imageUrl;
                    });
                    const newUrls = await Promise.all(uploadPromises);
                    setForm((prev: any) => ({ 
                      ...prev, 
                      idCardFiles: [...(prev.idCardFiles || []), ...newUrls],
                      idCardFile: newUrls[0] // Compatibilité legacy
                    }));
                  } catch (err) {
                    console.error('Erreur upload cartes identité:', err);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {form.idCardFiles && form.idCardFiles.length > 0 && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-green-600">✓ {form.idCardFiles.length} CNI enregistrée(s)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {form.idCardFiles.map((url: string, index: number) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3 border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-700">CNI {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newFiles = form.idCardFiles.filter((_: string, i: number) => i !== index);
                              setForm((prev: any) => ({ 
                                ...prev, 
                                idCardFiles: newFiles,
                                idCardFile: newFiles.length > 0 ? newFiles[0] : undefined
                              }));
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Aperçu du document */}
                        <div className="w-full h-24 bg-gray-100 rounded border overflow-hidden">
                          {url.toLowerCase().includes('.pdf') ? (
                            <iframe
                              src={url}
                              className="w-full h-full border-0"
                              title={`Aperçu CNI ${index + 1}`}
                            />
                          ) : (
                            <img
                              src={url}
                              alt={`Aperçu CNI ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling!.classList.remove('hidden');
                              }}
                            />
                          )}
                          <div className="hidden flex items-center justify-center h-full text-gray-500 text-xs">
                            <File className="w-6 h-6 mb-1" />
                            <span>Aperçu indisponible</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
           
           <div className="sm:col-span-2">
             <label className="block text-sm text-gray-700 mb-1">Justificatifs de domicile</label>
             <input 
               type="file" 
               accept="image/*,.pdf"
               multiple
               onChange={async (e) => {
                 const files = Array.from(e.target.files || []);
                 if (files.length === 0) return;
                 try {
                   const uploadPromises = files.map(async (file) => {
                   const formData = new FormData();
                     formData.append('image', file);
                     formData.append('siteId', siteId || '');
                     const res = await fetch('/api/formulaires/upload-images', { method: 'POST', body: formData });
                   if (!res.ok) throw new Error('Upload S3 échoué');
                   const data = await res.json();
                     return data.imageUrl;
                   });
                   const newUrls = await Promise.all(uploadPromises);
                   setForm((prev: any) => ({ 
                     ...prev, 
                     domicileProofFiles: [...(prev.domicileProofFiles || []), ...newUrls],
                     domicileProofFile: newUrls[0] // Compatibilité legacy
                   }));
                 } catch (err) {
                   console.error('Erreur upload justificatifs de domicile:', err);
                 }
               }}
               className="w-full px-3 py-2 border border-gray-300 rounded-md file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
             />
             {form.domicileProofFiles && form.domicileProofFiles.length > 0 && (
               <div className="mt-2 space-y-2">
                 <p className="text-sm text-green-600">✓ {form.domicileProofFiles.length} justificatif(s) enregistré(s)</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   {form.domicileProofFiles.map((url: string, index: number) => (
                     <div key={index} className="bg-gray-50 rounded-lg p-3 border">
                       <div className="flex items-center justify-between mb-2">
                         <span className="text-xs font-medium text-gray-700">Justif. {index + 1}</span>
                         <button
                           type="button"
                           onClick={() => {
                             const newFiles = form.domicileProofFiles.filter((_: string, i: number) => i !== index);
                             setForm((prev: any) => ({ 
                               ...prev, 
                               domicileProofFiles: newFiles,
                               domicileProofFile: newFiles.length > 0 ? newFiles[0] : undefined
                             }));
                           }}
                           className="text-red-500 hover:text-red-700"
                         >
                           <XCircle className="w-4 h-4" />
                         </button>
                       </div>
                       {/* Aperçu du document */}
                       <div className="w-full h-24 bg-gray-100 rounded border overflow-hidden">
                         {url.toLowerCase().includes('.pdf') ? (
                           <iframe
                             src={url}
                             className="w-full h-full border-0"
                             title={`Aperçu Justificatif ${index + 1}`}
                           />
                         ) : (
                           <img
                             src={url}
                             alt={`Aperçu Justificatif ${index + 1}`}
                             className="w-full h-full object-cover"
                             onError={(e) => {
                               const target = e.target as HTMLImageElement;
                               target.style.display = 'none';
                               target.nextElementSibling!.classList.remove('hidden');
                             }}
                           />
                         )}
                         <div className="hidden flex items-center justify-center h-full text-gray-500 text-xs">
                           <File className="w-6 h-6 mb-1" />
                           <span>Aperçu indisponible</span>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}
           </div>

           {/* KBIS - Uniquement pour les entreprises */}
           {form.legalForm !== 'Particulier' && (
             <div className="sm:col-span-2">
               <label className="block text-sm text-gray-700 mb-1">Extrait KBIS ou statuts *</label>
               <input
                 type="file"
                 accept=".pdf,.jpg,.jpeg,.png"
                 multiple
                 onChange={async (e) => {
                   const files = Array.from(e.target.files || []);
                   if (files.length === 0) return;
                   try {
                     const uploadPromises = files.map(async (file) => {
                       const formData = new FormData();
                       formData.append('image', file);
                       formData.append('siteId', siteId || '');
                       const res = await fetch('/api/formulaires/upload-images', { method: 'POST', body: formData });
                       if (!res.ok) throw new Error('Upload S3 échoué');
                       const data = await res.json();
                       return data.imageUrl;
                     });
                     const newUrls = await Promise.all(uploadPromises);
                     setForm((prev: any) => ({
                       ...prev,
                       kbisFiles: [...(prev.kbisFiles || []), ...newUrls]
                     }));
                   } catch (err) {
                     console.error('Erreur upload KBIS:', err);
                   }
                 }}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
               />

               
             </div>
           )}
        </div>
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200">Annuler</button>
          <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {submitting ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal d'upload de contrat PDF (enregistre contratPdf en base64)
// (Supprimé) Modal d'upload manuel de contrat

export default function FormulairesAdmin({
  editableElements = {}
}: Omit<FormulairesAdminProps, 'siteId'>) {
  // Utiliser le hook pour récupérer le siteId
  const siteId = useSiteId();
  const { getFormulaires, updateFormStatus, loading, error } = useFormDom();
  const { submitForm } = useFormDom();
  const [entrepriseInfo, setEntrepriseInfo] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formulaires, setFormulaires] = useState<Formulaire[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("submittedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [hideUnpaidRejected, setHideUnpaidRejected] = useState<boolean>(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Formulaire | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    fileName: string;
    fileUrl?: string;
    userFirstName?: string;
    userLastName?: string;
    documentType?: 'idCard' | 'domicileProof';
  } | null>(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedContrat, setSelectedContrat] = useState<{
    fileName: string;
    fileUrl?: string;
    userFirstName?: string;
    userLastName?: string;
  } | null>(null);
  const [isContratModalOpen, setIsContratModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<Formulaire | null>(null);
  const [allAbonnements, setAllAbonnements] = useState<any[]>([]);
  const [loadingAllAbonnements, setLoadingAllAbonnements] = useState(false);
  const [failedPaymentEmails, setFailedPaymentEmails] = useState<string[]>([]);
  const [failedPaymentSummaryByEmail, setFailedPaymentSummaryByEmail] = useState<Record<string, { count: number; totalAmount: number }>>({});
  const failedPaymentEmailSet = useMemo(() => {
    return new Set(failedPaymentEmails.map(email => email.toLowerCase().trim()).filter(Boolean));
  }, [failedPaymentEmails]);
  // (Supprimé) états liés à l'upload manuel de contrat
  const itemsPerPage = 100; // Augmenté pour récupérer tous les formulaires

  // Charger les informations d'entreprise pour enrichir le contrat
  useEffect(() => {
    const fetchEntrepriseInfo = async () => {
      try {
        if (!siteId) return;
        const res = await fetch(`/api/sharedServices/entreprise/info?siteId=${siteId}`);
        if (res.ok) {
          const data = await res.json();
          setEntrepriseInfo(data.entrepriseInfo || null);
        }
      } catch (e) {
        console.error('❌ Erreur récupération entreprise:', e);
      }
    };
    fetchEntrepriseInfo();
  }, [siteId]);
  // Charger tous les abonnements (pour retrouver le prix réellement payé)
  useEffect(() => {
    const fetchAllAbonnements = async () => {
      try {
        if (!siteId) return;
        setLoadingAllAbonnements(true);
        const res = await fetch(`/api/sharedServices/abonnements/domiciliation?siteId=${siteId}`);
        if (res.ok) {
          const data = await res.json();
          setAllAbonnements(data.abonnements || []);
        }
      } catch (e) {
        console.error('❌ Erreur récupération abonnements (globaux):', e);
      } finally {
        setLoadingAllAbonnements(false);
      }
    };
    fetchAllAbonnements();
  }, [siteId]);
  // Charger la liste des clients ayant un impayé Stripe
  useEffect(() => {
    let isMounted = true;

    const fetchFailedPaymentEmails = async () => {
      if (!siteId) {
        return;
      }

      try {
        const response = await fetch(`/api/sharedServices/stripe/failed-payments/site/${siteId}`);
        if (!response.ok) {
          console.warn('⚠️ Impossible de récupérer les impayés du site:', response.status, response.statusText);
          return;
        }

        const data = await response.json();
        if (!isMounted) {
          return;
        }

        const emails: string[] = [];
        const summary: Record<string, { count: number; totalAmount: number }> = {};

        (data.failedPayments || []).forEach((entry: any) => {
          const email = (entry.userEmail || '').toLowerCase().trim();
          if (!email) {
            return;
          }

          emails.push(email);
          if (!summary[email]) {
            summary[email] = {
              count: 0,
              totalAmount: 0,
            };
          }

          summary[email].count += 1;
          summary[email].totalAmount += typeof entry.amount === 'number' ? entry.amount : 0;
        });
        setFailedPaymentEmails(Array.from(new Set(emails)));
        setFailedPaymentSummaryByEmail(summary);
      } catch (error) {
        console.error('❌ Erreur lors du chargement des impayés Stripe pour les formulaires:', error);
      }
    };

    fetchFailedPaymentEmails();
    return () => {
      isMounted = false;
    };
  }, [siteId]);
  // Fonction pour récupérer les données
  const fetchData = async () => {
    console.log("🔄 Début fetchData - Chargement des formulaires...");
    setIsLoading(true);
    try {
      console.log("📡 Appel API avec paramètres:", {
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter || undefined,
        search: searchTerm || undefined,
      });
      const result = await getFormulaires({
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter || undefined,
        search: searchTerm || undefined,
        siteId: siteId || 'default-site',
      });
      console.log("📦 Résultat API reçu:", result);
      if (result) {
        console.log("✅ Données valides reçues, mise à jour du state");
        console.log("📋 Détail des formulaires:", result.data);
        setFormulaires(result.data);
        console.log("📊 Formulaires mis à jour:", result.data.length, "formulaires");
      } else {
        console.log("❌ Aucun résultat reçu de l'API");
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des formulaires:', error);
    } finally {
      setIsLoading(false);
      console.log("🏁 fetchData terminé");
    }
  };

  // Charger les données au montage du composant
  useEffect(() => {
    fetchData();
  }, [currentPage, statusFilter, searchTerm]);
  // Réinitialiser la page quand la recherche, le filtre ou le tri change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortBy, sortOrder]);
  // Pagination et tri
  const getCurrentData = () => {
    const filteredFormulaires = formulaires.filter(formulaire => {
      let matchesSearch = searchTerm === "" ||
        formulaire.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formulaire.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formulaire.ceoFirstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formulaire.ceoLastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formulaire.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formulaire.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
      // Filtres spéciaux pour les PDFs
      if (searchTerm === "contrat:oui") {
        matchesSearch = !!formulaire.contratPdf;
      } else if (searchTerm === "contrat:non") {
        matchesSearch = !formulaire.contratPdf;
      } else if (searchTerm === "attestation:oui") {
        matchesSearch = !!formulaire.attestationPdf;
      } else if (searchTerm === "attestation:non") {
        matchesSearch = !formulaire.attestationPdf;
      }

      const emailLower = (formulaire.email || '').toLowerCase();
      const hasFailedPayment = failedPaymentEmailSet.has(emailLower);
      const matchesStatus = statusFilter === "" ? true :
        statusFilter === "failed_payment" ? hasFailedPayment :
        formulaire.status === statusFilter;

      // Masquer par défaut les statuts Non payé et Rejeté quand aucun filtre explicite n'est appliqué et que le formulaire n'est pas marqué comme impayé Stripe
      const isHiddenByDefault = hideUnpaidRejected && statusFilter === "" && !hasFailedPayment && (formulaire.status === 'unpaid' || formulaire.status === 'rejected');
      return matchesSearch && matchesStatus && !isHiddenByDefault;
    });
    // Tri des formulaires
    const sortedFormulaires = [...filteredFormulaires].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "companyName":
          aValue = a.companyName || "";
          bValue = b.companyName || "";
          break;
        case "ceoName":
          aValue = `${a.ceoFirstName || ""} ${a.ceoLastName || ""}`;
          bValue = `${b.ceoFirstName || ""} ${b.ceoLastName || ""}`;
          break;
        case "email":
          aValue = a.email;
          bValue = b.email;
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "createdAt":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default: // submittedAt
          aValue = new Date(a.submittedAt).getTime();
          bValue = new Date(b.submittedAt).getTime();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    const totalPages = Math.ceil(sortedFormulaires.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentFormulaires = sortedFormulaires.slice(startIndex, endIndex);
    return {
      data: currentFormulaires,
      total: sortedFormulaires.length,
      totalPages,
      startIndex,
      endIndex
    };
  };

  const currentData = getCurrentData();
  // Log pour déboguer l'état des données
  console.log("🎯 État actuel de l'admin:", {
    formulairesCount: formulaires.length,
    currentDataCount: currentData.data.length,
    isLoading,
    searchTerm,
    statusFilter,
    currentPage
  });
  // Gérer le changement de statut
  const handleStatusChange = async (id: string, newStatus: string) => {
    const success = await updateFormStatus(id, newStatus);
    if (success) {
      fetchData(); // Recharger les données
    }
  };

  const handleRefreshData = () => {
    fetchData();
  };

  // Génération d'un contrat PDF complet (même contenu que form-dom) avec variables remplacées
  const generateContractPdfBlob = (data: any, existingSignature?: string) => {
    const doc = new jsPDF();
    const marginLeft = 20;
    let yPosition = 20;
    const maxWidth = 170;
    doc.setFont("helvetica");
    // Logo entreprise centré en haut si disponible
    if (entrepriseInfo?.logo) {
      try {
        const pageWidth = doc.internal.pageSize.getWidth();
        const logoWidth = 40; // mm
        const logoHeight = 15; // mm
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(entrepriseInfo.logo, 'PNG', logoX, yPosition, logoWidth, logoHeight);
        yPosition += logoHeight + 8;
      } catch {}
    }
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("CONTRAT DE DOMICILIATION", marginLeft, yPosition);
    yPosition += 20;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const entrepriseData = {
      nom: entrepriseInfo?.nom || "MAJOLI.IO",
      adresse: entrepriseInfo?.adresse || "123 Rue de la Domiciliation, 75001 Paris",
      ville: entrepriseInfo?.ville || "Paris",
      representant: entrepriseInfo?.representant || entrepriseInfo?.nomRepresentant || "Directeur Majoli.io",
      rcs: entrepriseInfo?.rcs || entrepriseInfo?.siren || "123456789",
      agrement: entrepriseInfo?.agrement || entrepriseInfo?.dateAgrement || "AGR123456"
    };

    const replaceVariables = (text: string) => {
      return text
        .replace(/%NOMENTREPRISE%/g, entrepriseData.nom)
        .replace(/%ADDRESSENTREPRISE%/g, entrepriseData.adresse)
        .replace(/%VILLERCS%/g, entrepriseData.ville)
        .replace(/%NUMRCS%/g, entrepriseData.rcs)
        .replace(/%NUMAGR%/g, entrepriseData.agrement)
        .replace(/%NOMREPRESENTANT%/g, entrepriseData.representant)
        .replace(/%NOMCLIENT%/g, `${data.ceoFirstName || ""} ${data.ceoLastName || ""}`.trim())
        .replace(/%ADDRESSCLIENT%/g, `${data.street || ""} ${data.suite || ""}, ${data.postalCode || ""} ${data.city || ""}`.trim())
        .replace(/%NOMENTREPRISECLIENT%/g, data.companyName || "Société en formation")
        .replace(/%ADDRESSEXPEDITION%/g, `${data.street || ""} ${data.suite || ""}`.trim())
        .replace(/%ADDRESSEXPEDITIONCP%/g, `${data.postalCode || ""} ${data.city || ""}`.trim())
        .replace(/%PAYSSEXPEDITION%/g, "France")
        .replace(/%DATEDEBUT%/g, new Date().toLocaleDateString("fr-FR"))
        .replace(/%PRICE%/g, data.selectedAbonnementPrix?.toString() || "50")
        .replace(/%PERIODICITE%/g, (data.periodicite || "mensuel"))
        .replace(/%VILLE%/g, data.city || entrepriseData.ville)
        .replace(/%CURRENTDATE%/g, new Date().toLocaleDateString("fr-FR"));
    };

    const contractText = replaceVariables(`ENTRE LES SOUSSIGNÉS :

La société %NOMENTREPRISE% dont le siège social est au %ADDRESSENTREPRISE%, immatriculée au Registre des Commerces et des Sociétés de %VILLERCS% sous le N°%NUMRCS%, ayant l'agrément de domiciliation N°%NUMAGR%, représentée par %NOMREPRESENTANT% et intitulée ci après "Le domiciliataire"
D'UNE PART,

Madame/Monsieur %NOMCLIENT% demeurant au %ADDRESSCLIENT%, agit pour le compte de la société en formation/changement de siège %NOMENTREPRISECLIENT% intitulée ci-après "Le domicilié"
D'AUTRE PART,

IL A ÉTÉ CONVENU CE QUI SUIT :

Le domiciliataire fournit, par le présent contrat un ensemble de prestations de services définies ci-après à l'article premier, concernant une domiciliation dans des locaux sis : %ADDRESSENTREPRISE%, Pour l'accomplissement auprès de la chambre d'immatriculation concernée par le régime juridique de l'entreprise, de toutes les formalités légales relatives à la création/ou changement de siège et au fonctionnement de ses activités, l'adresse de domiciliation devra donc devenir le siège social de l'entreprise.

ARTICLE I DÉFINITION DES PRESTATIONS DE SERVICES
Par la présente, le domiciliataire s'engage à fournir les prestations de services suivantes :
1. Une domiciliation commerciale dans les locaux situés au %ADDRESSENTREPRISE%, permettant l'établissement du siège social ou de l'adresse commerciale. Dans le cas d'une domiciliation postale, cette dernière permet uniquement au domicilié de recevoir son courrier, sans pour autant y fixer son siège social ou en faire utilisation dans sa communication commerciale qui serait susceptible de publicité mensongère (artL121-1 code de la consommation). En cas d'utilisation autre, le contrat est nul.

2. Réception, tri et mise à disposition du courrier destiné au domicilié, chaque jour ouvré pendant les horaires définis par le domiciliataire.

3. La réexpédition du courrier aura lieu sur demande à l'adresse ci-dessous, communiquée par le domicilié : %ADDRESSEXPEDITION%, %ADDRESSEXPEDITIONCP%, %PAYSSEXPEDITION%. 
Chaque envoi/réexpédition se fait suivant les tarifs communiqués par le domiciliataire. Le domicilié dégage le domiciliataire de toutes responsabilités quant à la transmission du courrier effectuée par la Poste ou par des entreprises assimilées ainsi que pour tout envoi mal libellé (adresse incomplète ou illisible, absence de cedex ou tout autre nom, etc.) reçu à l'intention du domicilié

4. Le domiciliataire met à la disposition du domicilié, sur sa demande (en contactant le service %NOMENTREPRISE% par e-mail à contacts@%NOMENTREPRISE% ou directement sur la plateforme) et à titre onéreux (tarifs communiqués par le domiciliataire), des locaux dotés d'une pièce propre à assurer la confidentialité nécessaire et à permettre une réunion régulière des organes chargés de la direction, de l'administration ou de la surveillance de l'entreprise ainsi que la tenue, la conservation et la consultation des livres, registres et documents prescrits par les lois et
règlements (Décret N°85.1280. du 5 décembre 1985, Article 2.6.1 modifié par Décret 2007-750 du 9 mai 2007).

5. Dans le cas où le client domicilié serait amené à souscrire l'offre de permanence/standard téléphonique, il ne deviendra en aucun cas propriétaire du numéro qui lui sera attribué. Il s'agit d'une mise à disposition d'un numéro de téléphone indexé sur la durée de vie du contrat de domiciliation. À défaut de paiement d'une seule facture à son échéance, le domiciliataire se réserve le droit de suspendre l'intégralité des prestations de services. Le courrier pourra être refusé et les appels rejetés.

ARTICLE II NATURE DES OBLIGATIONS
Pour l'accomplissement des diligences et prestations prévues à l'Article premier ci-dessus, Le domiciliataire s'engage à donner ses meilleurs soins, conformément aux règles de l'art. La présente obligation, n'est, de convention expresse, que pure obligation de moyens à l'exclusion de toute obligation de résultat.

ARTICLE III DURÉE
Conformément aux exigences légales le contrat est conclu irrévocablement pour une durée minimum de trois mois puis sera reconduit tacitement chaque mois jusqu'à sa résiliation. La dite domiciliation commence à courir à partir du %DATEDEBUT% .

ARTICLE IV TARIFS ET CONDITIONS
Le présent contrat est accepté moyennant le versement par le domicilié de la somme forfaitaire de %PRICE% € HT payable à chaque abonnement %PERIODICITE% par carte bancaire. Tout abonnement %PERIODICITE% civil commencé sera dû.
Ce prix ne comprend pas les frais relatifs aux courriers supplémentaires réexpédiés, et ce conformément à l'article 1.2.

En cas de retard lié à des tentatives de débit infructueuses, une majoration de 10% (DIXPOURCENT) sera appliquée avec une augmentation de 5% (CINQ POUR CENT) par mois si le retard est supérieur à un mois.
À défaut de paiement de deux mois consécutifs, il sera dû une annuité entière. Tout retard lié à des tentatives de débit infructueuses entraîne de plein droit et sans mise en demeure préalable, nonobstant la clause de résiliation, la facturation d'un intérêt de retard de 15% (QUINZE POURCENT). Le domicilié donne dès à présent son accord pour une révision chaque année du tarif mensuel des prestations de services définies à l'article premier dans une limite de 15% ainsi que pour le mode de règlement proposé par le domiciliataire, et ce sans qu'il soit besoin d'une notification préalable.

ARTICLE V CLAUSES D'ACCEPTATION
Le présent contrat a été consenti en considération de la qualité des signataires, et il est expressément convenu que ce contrat est conclu « INTUITU PERSONAE ». Le domicilié ne pourra en aucun cas céder ou transférer le présent contrat à un tiers sans avoir obtenu au préalable l'accord écrit du domiciliataire.
En cas de changement, soit d'adresse, soit d'état civil personnel, soit de dénomination sociale, soit de nom commercial, soit de sigle (afin d'éviter les homonymes), soit de forme juridique ou d'objet, soit de dirigeant, soit de l'utilisateur des prestations fournies au titre du présent contrat, le domicilié devra fournir tous les documents afférents à ces modifications au domiciliataire et présenter son successeur ou le nouvel utilisateur, avant de déclarer tout changement auprès du Greffe du Tribunal de Commerce ou de la Chambre des Métiers ou toutes autres administrations compétentes et arrêter les comptes, et si bon semble au domiciliataire, résilier le contrat à effet immédiat.
Dans tous les cas, le domicilié fera sa propre affaire des dettes pouvant exister à son départ. Tout renseignement fourni par le domicilié pourra être communiqué sur demande aux représentants des organismes officiels et le domicilié en donne dès à présent son accord.
Le domicilié devra justifier de son inscription au Registre du Commerce ou des Métiers ou toutes autres administrations compétentes dans les trois mois qui suivent la date d'engagement de la domiciliation, faute de quoi Le domiciliataire se réserve le droit de commander les documents justificatifs au frais du domicilié, au coût de 15€ HT pour le K-bis et de 20€ HT pour les statuts.
En l'absence de ce justificatif, le domiciliataire se réserve le droit de poursuivre le contrat de domiciliation dans les termes initiaux. Le domicilié déclare de manière expresse et sur l'honneur, certifier l'exactitude des renseignements fournis à l'appui de la signature du contrat avec le domiciliataire, certifier de ne pas être en situation de liquidation de biens, redressement judiciaire en ce qui concerne
l'entreprise ou les entreprises qu'il dirige, que ces établissements soient l'objet ou non du dit contrat, certifier de ne pas être à titre personnel frappé de faillite personnelle ou d'interdiction de gérer, atteste l'exactitude de tous les renseignements fournis au domiciliataire tant en ce qui concerne son état civil que l'entreprise représentée.
Ce contrat est ferme et définitif à la signature et aucun remboursement partiel ou total ne pourra être revendiqué par le domicilié. Dans le cas d'une résiliation les sommes versées restent acquises à la société domiciliataire sans droit à indemnités pour le domicilié.

ARTICLE VI FACTURATION
1. Cycle de facturation : Les frais de domiciliation et les frais d'abonnement aux services additionnels, ainsi que les frais éventuels liés à votre utilisation du service, tels que les taxes et d'éventuels frais d'affranchissement, seront facturés chaque mois ou chaque année, en fonction des services et du cycle de facturation choisi, correspondant au début de la période payante de votre domiciliation. Dans certains cas, votre date de facturation peut changer, par exemple, si votre mode de paiement n'a pas fonctionné ou si votre abonnement payant a commencé un jour ne figurant pas dans un mois donné.
2. Modes de paiement : Vous pouvez modifier votre mode de paiement en accédant à votre espace client. Si le règlement d'un paiement échoue en raison de l'expiration de la carte, d'un solde insuffisant ou pour tout autre motif, et que vous ne modifiez pas votre mode de paiement ou que vous ne résiliez pas votre compte, nous pouvons suspendre votre accès à notre service jusqu'à l'obtention d'un mode de paiement valide. En mettant à jour votre moyen de paiement, vous nous autorisez à continuer à prélever votre compte via le mode de paiement mis à jour et vous êtes redevable de tout montant non prélevé. Une telle situation peut entraîner un changement de vos dates de facturation.
3. Résiliation : Le présent contrat pourra être dénoncé par l'une des parties avec notification à l'autre par lettre recommandée avec accusé de réception en respectant un préavis d'un mois. La résiliation du contrat n'entraîne aucun frais de résiliation. Si la résiliation intervient pendant les trois premiers mois du début de contrat de domiciliation : le domiciliataire s'engage à continuer jusqu'à la fin de la durée de 3 mois à mettre à disposition à titre onéreux (au tarif communiqué par le domiciliataire) de la personne domiciliée des locaux permettant une réunion régulière des organes chargés de la direction, de l'administration ou de la surveillance de l'entreprise et l'installation des services nécessaires à la tenue, à la conservation et à la consultation des livres, registres et documents prescrits par les lois et règlements.
le domicilié prend l'engagement de continuer jusqu'à la fin de la durée de 3 mois à utiliser effectivement et exclusivement les locaux, soit comme siège de l'entreprise, soit si le siège est situé à l'étranger comme agence, succursale ou représentation. Le domicilié se déclare tenue d'informer le domiciliataire de toute modification concernant son activité. Il prend en outre l'engagement de déclarer, s'il s'agit d'une personne physique, tout changement relatif à son domicile personnel, et s'il s'agit d'une personne morale tout changement relatif à sa forme juridique et son objet, ainsi qu'au nom et au domicile personnel des personnes ayant le pouvoir général de l'engager.
La résiliation du contrat de domiciliation durant les trois premiers mois du contrat de domiciliation entraînera la suspension des services liés à la gestion du courrier ou à tout autre type de service fourni par le domiciliataire et /ou l'un de ses partenaires. Si la résiliation intervient après les trois premiers mois du contrat de domiciliation, le domicilié continuera d'avoir accès à ses services et ce jusqu'à la fin de la période de facturation mensuelle.
Le domicilié devra obligatoirement joindre à sa lettre recommandée un justificatif délivré par le Tribunal de Commerce ou par le Répertoire des Métiers (ou par la Préfecture pour les Associations) soit pour la radiation ou le transfert du siège social, soit la non immatriculation de l'entreprise (pour les Autos entrepreneurs le récipissé de radiation auprès du CFE), faute de quoi le domiciliataire sera amené à facturer les prestations de service de domiciliation tant que le transfert ou la radiation ne seront pas effectifs et validés par le Registre du Commerce ou à la Chambre des métiers ou la Préfecture. Afin de sauvegarder ses intérêts, le domiciliataire se réserve le droit d'intervenir auprès des différents services compétents en vue de signaler la fin du contrat.
Par la suite de non-paiement le domiciliataire pourra procéder à la résiliation immédiate du contrat de domiciliation.
Tout règlement d'abonnement et/ou de prestations non effectué après 3 tentatives de prélèvement entraînera la suspension de la totalité des services, ainsi qu'une majoration prévue à l'article 4 des présentes, et ce jusqu'au paiement des factures impayées.
Conformément aux articles 441-6 c.com et D. 441-5 c.com, tout retard de paiement entraîne de plein droit, outre les pénalités de retard, une obligation pour le débiteur de payer une indemnité forfaitaire de 40 (quarante) euros due au titre des frais de recouvrement. A défaut de règlement par le domicilié d 'une ou plusieurs mensualités dues en vertu du présent contrat, le domiciliataire pourra, après l'envoi d'une lettre RAR valant mise en demeure de régler la ou les échéances impayées, prononcer la déchéance du terme de toutes les mensualités à venir. En cas de résiliation, le courrier sera refusé avec l'annotation « N'habite pas à l'adresse indiquée » ; le fait sera également signalé au Greffe du Tribunal de Commerce ou à la Chambre des Métiers ou à toutes autres Administrations compétentes (Décret 2007-750 Article 2.6.1 du 9 mai 2007) afin de stopper une domiciliation qui deviendrait illégale.
La liste des cas de résiliation n'est pas limitative. La société domiciliataire se réserve le droit de dénoncer et résilier unilatéralement le présent contrat pour faute du domicilié. La faute s'entend du manquement à une des obligations pesant sur le Domicilié et prévue par le présent contrat ou la réglementation applicable.

ARTICLE VII RESPONSABILITÉS
Le domicilié décharge le domiciliataire de toute responsabilité quant à la retransmission du courrier, celle-ci étant effectuée par la Poste. Le domicilié s'engage de manière irrévocable à ne jamais se retourner en responsabilité tant civile que pénale contre le domiciliataire au titre de faits relatifs à cette réexpédition. Toute modification ou ordre du domicilié devra être transmis au domiciliataire par écrit. 
En cas de contestations liées aux présentes, seul le Tribunal de Commerce concerné sera compétent.
Le domiciliataire ne saurait être tenu en aucune façon responsable du rejet du domicilié pour l'ouverture d'un compte bancaire professionnel ou par les différents organismes administratifs nécessaires à son inscription ou pour tout autre motif et ne procédera donc à aucun remboursement.
Le domicilié prend acte que l'accord de domiciliation passé ne confère en aucun cas de figure propriété commerciale, droit au bail ou tout autre droit.
Pour être considéré comme valable, ce contrat dont le nombre de pages est indiqué au pied de chaque page, établi en deux exemplaires originaux (dont un remis au domicilié) doit impérativement comporter le nom du signataire et sa signature manuscrite ou électronique.
Le domicilié ne pourra exercer aucun recours contre la société domiciliataire en cas de dommages ou disparition de documents ou de biens propres qui pourraient intervenir dans les bureaux ou les parties communes auxquels il pourrait avoir accès.

ARTICLE VIII DISPOSITIONS DIVERSES
Le représentant légal devra fournir au domiciliataire, dès la signature du contrat ou dans les meilleurs délais toutes les pièces justificatives relatives : à son identité, son domicile, à ses coordonnées téléphoniques, au lieu de détention de ses documents comptables ainsi que le numéro de SIRET de la société à domicilier.
En cas de manquement à cette disposition, la société domiciliataire se réserve le droit de suspendre le contrat ou de résilier à tout moment le présent contrat, par lettre recommandée, purement et simplement, sans préavis ni indemnité.
Le domicilié donne mandat au domiciliataire qui l'accepte, de recevoir en son nom toute notification. Les lettres recommandées du domicilié pourront être retirées par le domiciliataire au bureau de poste dépendant de son adresse commerciale. Le domicilié devra donner pouvoir au domiciliataire en remplissant dument la « procuration d'un client destinataire d'envois postaux contre signature à un prestataire». Tous règlements, correspondances et demandes doivent être adressés par le domicilié à l'adresse de sa domiciliation.

ARTICLE IX ATTRIBUTION DE COMPÉTENCE
En cas de litige non réglé par voie amiable , seul le Tribunal de Commerce de Paris sera compétent, sans que le domiciliataire puisse être cité devant un autre Tribunal, même en cas de pluralité de défendeur ou d'appels en garanties.

Fait à %VILLE%, le %CURRENTDATE%`);
    const lines = doc.splitTextToSize(contractText, maxWidth);
    const linesPerPage = 40;
    for (let i = 0; i < lines.length; i += linesPerPage) {
      if (i > 0) {
        doc.addPage();
        yPosition = 20;
      }
      const pageLines = lines.slice(i, i + linesPerPage);
      doc.text(pageLines, marginLeft, yPosition);
      doc.setFontSize(10);
      doc.text(`Page ${Math.floor(i / linesPerPage) + 1}`, marginLeft, 280);
      doc.setFontSize(11);
    }

    // Ajouter une page pour les signatures
    doc.addPage();
    yPosition = 20;

    // Titre de la page de signatures
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("SIGNATURES", marginLeft, yPosition);
    yPosition += 30;

    // Section Domiciliataire
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Le Domiciliataire", marginLeft, yPosition);
    yPosition += 15;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`La société ${entrepriseData.nom} représentée`, marginLeft, yPosition);
    yPosition += 8;
    doc.text(`par ${entrepriseData.representant}.`, marginLeft, yPosition);
    yPosition += 20;

    // Ajouter le cachet/signature de l'entreprise si disponible
    if (entrepriseInfo?.cachetSignature) {
      try {
        doc.addImage(entrepriseInfo.cachetSignature, "PNG", marginLeft, yPosition, 40, 20);
        yPosition += 25;
      } catch (error) {
        console.log('⚠️ Impossible d\'ajouter le cachet de l\'entreprise:', error);
      }
    }

    yPosition += 40;

    // Section Domicilié
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Le domicilié", marginLeft, yPosition);
    yPosition += 15;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`La société ${data.companyName || "Société en formation"} représentée par`, marginLeft, yPosition);
    yPosition += 8;
    doc.text(`${data.ceoFirstName || ""} ${data.ceoLastName || ""} qui agit pour le compte de la société en formation ou changement de siège.`, marginLeft, yPosition);
    yPosition += 20;

    // Ajouter la signature du client si disponible
    if (existingSignature) {
      try {
        doc.addImage(existingSignature, "PNG", marginLeft, yPosition, 60, 30);
        console.log('✅ Signature client ajoutée au PDF depuis la base de données');
      } catch (error) {
        console.error('❌ Erreur lors de l\'ajout de la signature client:', error);
      }
    } else {
      console.log('⚠️ Aucune signature client disponible en base de données');
    }

    return doc.output('blob');
  };

  // Fonction pour uploader un PDF vers S3
  const uploadPdfToS3 = async (pdfBlob: Blob, fileName: string) => {
    try {
      console.log('📤 Upload PDF vers S3:', { fileName, size: pdfBlob.size, type: pdfBlob.type });
      const formData = new FormData();
      formData.append('media', pdfBlob, fileName);
      formData.append('componentId', 'admin-formulaires');
      formData.append('fieldId', 'contratPdf');
      formData.append('siteId', siteId || 'default-site'); // Ajout du siteId requis
      
      console.log('📦 FormData préparé avec siteId:', siteId);
      const res = await fetch('/api/upload-media', { method: 'POST', body: formData });
      if (!res.ok) {
        const errorData = await res.json();
        console.error('❌ Erreur upload PDF S3:', errorData);
        throw new Error(`Upload PDF S3 échoué: ${errorData.error || 'Erreur inconnue'}`);
      }
      
      const data = await res.json();
      console.log('✅ PDF uploadé avec succès:', data.mediaUrl);
      return data.mediaUrl;
    } catch (err) {
      console.error('❌ Erreur upload PDF:', err);
      throw err;
    }
  };
  // Fonction pour envoyer un email de bienvenue avec identifiants
  const sendWelcomeEmailWithCredentials = async (email: string, firstName: string, password: string) => {
    try {
      console.log('DEBUG: sendWelcomeEmailWithCredentials called with:', { email, firstName, password });
      // Récupérer le nom du site depuis les informations d'entreprise
      let siteName = "Majoli";
      if (siteId) {
        try {
          const response = await fetch(`/api/sharedServices/entreprise/info?siteId=${siteId}`);
          if (response.ok) {
            const data = await response.json();
            siteName = data.entrepriseInfo?.nom || "Majoli";
          }
        } catch (error) {
          console.warn('Impossible de récupérer les informations d\'entreprise:', error);
        }
      }
      
      const emailData: any = {
        to: email,
        subject: `Vos identifiants de connexion - ${siteName}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Bienvenue sur ${siteName} !</h2>
            <p>Bonjour ${firstName || "Client"},</p>
            <p>Votre compte a été créé avec succès sur notre plateforme. Voici vos identifiants de connexion :</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
              <p><strong>Email :</strong> ${email}</p>
              <p><strong>Mot de passe :</strong> ${password}</p>
            </div>
            <p><strong>Important :</strong> Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe lors de votre première connexion.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/login" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Se connecter
              </a>
            </div>
            <p>Si vous avez des questions ou besoin d'aide, n'hésitez pas à nous contacter.</p>
            <p>Cordialement,<br>L'équipe ${siteName}</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              Cet email a été envoyé automatiquement. Veuillez ne pas y répondre.
            </p>
          </div>
        `,
        fromName: `Support ${siteName}`
      };
      if (siteId) {
        emailData.siteId = siteId;
      }
      console.log('DEBUG: Sending email with data:', emailData);
      const emailResponse = await fetch('/api/sharedServices/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
      });
      console.log('DEBUG: Email API response status:', emailResponse.status);
      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('DEBUG: Email API error response:', errorText);
        throw new Error(`Erreur lors de l'envoi de l'email: ${emailResponse.status} - ${errorText}`);
      }
      const responseData = await emailResponse.json();
      console.log('DEBUG: Email API success response:', responseData);
      console.log("Email de bienvenue avec identifiants envoyé avec succès à:", email);
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email de bienvenue:", error);
      throw error;
    }
  };

  // Téléchargement fiable (garde le bon nom de fichier, gère CORS/redirects)
  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('Impossible de télécharger le fichier');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erreur téléchargement fichier:', e);
      // Fallback: ouvrir dans un nouvel onglet
      window.open(fileUrl, '_blank');
    }
  };

  // Création d'un formulaire sans paiement
  const handleCreateForm = async (data: NewFormFields) => {
    try {
      console.log('🚀 DEBUG: handleCreateForm STARTED with data:', data);
      // Génération automatique du contrat PDF et upload vers S3
      const pdfBlob = generateContractPdfBlob(data, undefined);
      const generationDate = new Date();
      const fileName = buildDomiciliationFilename("contrat", data, generationDate);
      const contratPdf = await uploadPdfToS3(pdfBlob, fileName);
      const payload = {
        siteId: siteId || 'default-site',
        ...data,
        // Les champs idCardFile et domicileProofFile sont déjà des URLs S3 si fournis
        contratPdf,
      } as any;
      
      console.log('📤 Payload envoyé à l\'API:', payload);
      const res = await submitForm(payload);
      console.log('📦 DEBUG: submitForm response:', res);
      if (res && res.success) {
        console.log('✅ Formulaire créé avec succès, rechargement des données...');
        // Envoyer un email de bienvenue si un email est fourni
        if (data.email) {
          console.log('📧 DEBUG: Email check passed. Email:', data.email, 'First Name:', data.ceoFirstName);
          try {
            console.log('📧 DEBUG: Calling sendWelcomeEmailWithCredentials...');
            await sendWelcomeEmailWithCredentials(
              data.email,
              data.ceoFirstName || 'Client',
              'Password123!'
            );
            console.log('✅ DEBUG: Welcome email sent successfully to:', data.email);
          } catch (emailError) {
            console.error('❌ DEBUG: Email sending failed:', emailError);
            console.warn('Envoi email échoué (non bloquant):', emailError);
          }
        } else {
          console.warn('⚠️ DEBUG: Welcome email not sent. No email provided in data:', data.email);
        }
        
        fetchData();
      } else {
        console.error('❌ Erreur création formulaire:', res?.error || res?.message);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création du formulaire:', error);
    }
  };

  // (Supprimé) Upload du contrat manuellement: on génère désormais le contrat automatiquement à la création

  // Fonction pour ouvrir le modal de document
  const handleViewDocument = (formulaire: Formulaire, documentType: 'idCard' | 'domicileProof' | 'kbis' | undefined, fileIndex?: number) => {
    console.log('🔍 Ouverture document:', { documentType, fileIndex, formulaireId: formulaire._id });
    let fileUrl: string | undefined;
    let fileName: string | undefined;
    
    if (documentType === 'idCard') {
      // Nouveau système multi-fichiers
      if (formulaire.idCardFiles && formulaire.idCardFiles.length > 0 && typeof fileIndex === 'number') {
        fileUrl = formulaire.idCardFiles[fileIndex];
        const match = (fileUrl || '').match(/\.([a-zA-Z0-9]+)(?:[?#].*)?$/);
        const ext = match ? `.${match[1].toLowerCase()}` : '';
        fileName = `carte_identite_${formulaire.ceoFirstName}_${formulaire.ceoLastName}_${fileIndex + 1}${ext}`;
      }
      // Système legacy (fallback)
      else if (formulaire.idCardFile) {
      fileUrl = formulaire.idCardFile;
      const match = (fileUrl || '').match(/\.([a-zA-Z0-9]+)(?:[?#].*)?$/);
      const ext = match ? `.${match[1].toLowerCase()}` : '';
      fileName = `carte_identite_${formulaire.ceoFirstName}_${formulaire.ceoLastName}${ext}`;
      }
    } else if (documentType === 'domicileProof') {
      // Nouveau système multi-fichiers
      if (formulaire.domicileProofFiles && formulaire.domicileProofFiles.length > 0 && typeof fileIndex === 'number') {
        fileUrl = formulaire.domicileProofFiles[fileIndex];
        const match = (fileUrl || '').match(/\.([a-zA-Z0-9]+)(?:[?#].*)?$/);
        const ext = match ? `.${match[1].toLowerCase()}` : '';
        fileName = `justificatif_domicile_${formulaire.ceoFirstName}_${formulaire.ceoLastName}_${fileIndex + 1}${ext}`;
      }
      // Système legacy (fallback)
      else if (formulaire.domicileProofFile) {
      fileUrl = formulaire.domicileProofFile;
      const match = (fileUrl || '').match(/\.([a-zA-Z0-9]+)(?:[?#].*)?$/);
      const ext = match ? `.${match[1].toLowerCase()}` : '';
      fileName = `justificatif_domicile_${formulaire.ceoFirstName}_${formulaire.ceoLastName}${ext}`;
      }
    } else if (documentType === 'kbis') {
      // Gestion des KBIS pour entreprises
      if (formulaire.kbisFiles && formulaire.kbisFiles.length > 0 && typeof fileIndex === 'number') {
        fileUrl = formulaire.kbisFiles[fileIndex];
        const match = (fileUrl || '').match(/\.([a-zA-Z0-9]+)(?:[?#].*)?$/);
        const ext = match ? `.${match[1].toLowerCase()}` : '';
        fileName = `kbis_${formulaire.companyName || 'entreprise'}_${formulaire.ceoFirstName}_${formulaire.ceoLastName}_${fileIndex + 1}${ext}`;
      }
    }

    if (fileUrl && fileName) {
      console.log('🔍 Document modal - fileUrl:', fileUrl, 'fileName:', fileName, 'documentType:', documentType);
      // Validation de l'URL
      if (!fileUrl.startsWith('http') && !fileUrl.startsWith('data:')) {
        console.error('❌ URL invalide:', fileUrl);
        alert('URL du document invalide. Veuillez contacter l\'administrateur.');
        return;
      }
      
      setSelectedDocument({
        fileName: fileName,
        fileUrl: fileUrl,
        userFirstName: formulaire.ceoFirstName,
        userLastName: formulaire.ceoLastName,
        documentType: documentType as any
      });
      setIsDocumentModalOpen(true);
    } else {
      console.warn('❌ Document non trouvé ou URL invalide:', { fileUrl, fileName, documentType, fileIndex });
      alert('Document non trouvé. Veuillez vérifier que le document a été correctement uploadé.');
    }
  };

  // Fonction pour ouvrir le modal de contrat
  const handleViewContrat = async (formulaire: Formulaire) => {
    try {
      console.log('🔍 DEBUG - handleViewContrat (admin) - affichage depuis la BDD:', {
        id: formulaire._id,
        hasContratPdf: !!formulaire.contratPdf,
        contratPdfLength: formulaire.contratPdf?.length,
      });
      if (formulaire.contratPdf) {
        const contratFileName = buildDomiciliationFilename("contrat", formulaire, formulaire.createdAt ? new Date(formulaire.createdAt) : new Date());
        setSelectedContrat({
          fileName: contratFileName,
          fileUrl: formulaire.contratPdf,
          userFirstName: formulaire.ceoFirstName,
          userLastName: formulaire.ceoLastName
        });
        setIsContratModalOpen(true);
        return;
      }

      console.warn('⚠️ Aucun contrat stocké en BDD pour ce formulaire.');
      alert("Aucun contrat stocké pour ce formulaire.");
    } catch (error) {
      console.error('❌ Erreur lors de l\'affichage du contrat:', error);
      alert('Erreur lors de l\'affichage du contrat.');
    }
  };

  const handleViewAttestation = (formulaire: Formulaire) => {
    console.log('📄 Ouverture de l\'attestation pour formulaire:', formulaire._id);
    if (formulaire.attestationPdf) {
      const attestationFileName = buildDomiciliationFilename("attestation", formulaire, formulaire.createdAt ? new Date(formulaire.createdAt) : new Date());
      setSelectedContrat({
        fileName: attestationFileName,
        fileUrl: formulaire.attestationPdf,
        userFirstName: formulaire.legalForm === 'Particulier' ? formulaire.firstName : formulaire.ceoFirstName,
        userLastName: formulaire.legalForm === 'Particulier' ? formulaire.lastName : formulaire.ceoLastName
      });
      setIsContratModalOpen(true);
    } else {
      console.warn('⚠️ Aucune attestation PDF trouvée pour ce formulaire');
    }
  };

  // Fonction pour ouvrir le modal d'édition
  const handleEditForm = (formulaire: Formulaire) => {
    console.log('🔧 Ouverture modal d\'édition pour formulaire:', formulaire._id);
    console.log('📋 Données du formulaire:', formulaire);
    setEditingForm(formulaire);
    setIsEditModalOpen(true);
  };

  // Fonction pour sauvegarder les modifications
  const handleSaveEdit = async (updatedData: any) => {
    if (!editingForm) {
      console.error('❌ Aucun formulaire en cours d\'édition');
      return;
    }

    console.log('💾 Sauvegarde des modifications pour formulaire:', editingForm._id);
    console.log('📝 Données à sauvegarder:', updatedData);
    try {
      // Encoder les nouveaux fichiers si fournis
      let idCardFileUrl = editingForm.idCardFile;
      let domicileProofFileUrl = editingForm.domicileProofFile;

      const toDataUrl = (file: any) => new Promise<string>((resolve, reject) => {
        try {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(file as Blob);
        } catch (e) { reject(e); }
      });
      if (updatedData.idCardFile && typeof updatedData.idCardFile === 'object' && 'name' in updatedData.idCardFile && 'size' in updatedData.idCardFile) {
        idCardFileUrl = await toDataUrl(updatedData.idCardFile);
      }

      if (updatedData.domicileProofFile && typeof updatedData.domicileProofFile === 'object' && 'name' in updatedData.domicileProofFile && 'size' in updatedData.domicileProofFile) {
        domicileProofFileUrl = await toDataUrl(updatedData.domicileProofFile);
      }

      // Générer un nouveau contrat PDF si nécessaire et upload vers S3
      let contratPdf = editingForm.contratPdf; // Garder l'ancien contrat par défaut
      
      try {
        const pdfBlob = generateContractPdfBlob(updatedData, editingForm?.signature);
        const fileName = buildDomiciliationFilename("contrat", updatedData, new Date());
        contratPdf = await uploadPdfToS3(pdfBlob, fileName);
        console.log('✅ Nouveau contrat PDF généré et uploadé');
      } catch (pdfError) {
        console.warn('⚠️ Échec de la génération/upload du nouveau contrat PDF, conservation de l\'ancien:', pdfError);
        // Continuer avec l'ancien contrat PDF
      }

      // Mettre à jour le formulaire
      console.log('📡 Envoi de la requête PUT vers:', `/api/formulaires/${editingForm._id}`);
      const requestBody = {
        ...updatedData,
        idCardFile: idCardFileUrl,
        domicileProofFile: domicileProofFileUrl,
        contratPdf,
      };
      console.log('📦 Corps de la requête:', requestBody);
      const response = await fetch(`/api/formulaires/${editingForm._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      console.log('📊 Réponse API:', response.status, response.statusText);
      if (response.ok) {
        fetchData();
        setIsEditModalOpen(false);
        setEditingForm(null);
      } else {
        const errorData = await response.json();
        console.error('❌ Erreur lors de la mise à jour du formulaire:', errorData);
        alert(`Erreur lors de la mise à jour: ${errorData.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      alert(`Erreur lors de la sauvegarde: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  // Formater la date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date inconnue';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date invalide';
    
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'unpaid':
        return 'bg-orange-100 text-orange-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-blue-600" />;
      case 'unpaid':
        return <CreditCard className="w-4 h-4 text-orange-600" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <>
      <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Gestion des Formulaires
            </h2>
            <p className="text-gray-600">
              Consultez et gérez tous les formulaires soumis.
            </p>
            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">
                  <strong>Erreur :</strong> {error}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Formulaires</p>
                <p className="text-2xl font-bold text-gray-900">{formulaires.length}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En attente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formulaires.filter(f => f.status === 'pending').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approuvés</p>
                <p className="text-2xl font-bold text-green-600">
                  {formulaires.filter(f => f.status === 'approved').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Non payés</p>
                <p className="text-2xl font-bold text-red-600">
                  {formulaires.filter(f => f.status === 'unpaid').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher par email, nom, entreprise..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
              <button
                onClick={handleRefreshData}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Actualiser
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
              >
                <FileText className="w-4 h-4" />
                Créer un formulaire
              </button>
          </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filtres :</span>
              </div>
              
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Statut :</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Tous les statuts</option>
              <option value="unpaid">Non payé</option>
              <option value="pending">En attente</option>
              <option value="processing">En cours</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Rejeté</option>
              <option value="failed_payment">Impayé Stripe</option>
            </select>
              </div>

              {/* Masquer Non payé / Rejeté */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Masquer Non payé/Rejeté :</label>
                <button
                  onClick={() => setHideUnpaidRejected(v => !v)}
                  className={`px-3 py-1.5 text-sm rounded-md border ${hideUnpaidRejected ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                >
                  {hideUnpaidRejected ? 'Activé' : 'Désactivé'}
                </button>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Trier par :</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="submittedAt">Date de soumission</option>
                  <option value="companyName">Nom de l'entreprise</option>
                  <option value="ceoName">Nom Prénom</option>
                  <option value="email">Email</option>
                  <option value="status">Statut</option>
                  <option value="createdAt">Date de création</option>
                </select>
              </div>

              {/* Sort Order */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Ordre :</label>
            <button
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
                  <ArrowUpDown className="w-4 h-4" />
                  {sortOrder === "asc" ? "Croissant" : "Décroissant"}
            </button>
              </div>
            </div>

            

            {/* Clear Filters */}
            {(statusFilter !== "" || searchTerm) && (
              <button
                onClick={() => {
                  setStatusFilter("");
                  setSearchTerm("");
                  setSortBy("submittedAt");
                  setSortOrder("desc");
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
              >
                <XCircle className="w-4 h-4" />
                Effacer les filtres
              </button>
            )}
          </div>

            {/* Active Filters Display */}
            {(statusFilter !== "" || searchTerm) && (
              <div className="flex flex-wrap gap-2">
                {statusFilter !== "" && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    Statut: {
                      statusFilter === "pending" ? "En attente" :
                      statusFilter === "processing" ? "En cours" :
                      statusFilter === "approved" ? "Approuvé" :
                      statusFilter === "unpaid" ? "Non payé" :
                      statusFilter === "failed_payment" ? "Impayé Stripe" :
                      "Rejeté"
                    }
                    <button
                      onClick={() => setStatusFilter("")}
                      className="ml-1 hover:text-blue-600"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {searchTerm && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    Recherche: "{searchTerm}"
                    <button
                      onClick={() => setSearchTerm("")}
                      className="ml-1 hover:text-green-600"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Liste des formulaires */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">
              Liste des Formulaires ({currentData.total})
              {isLoading && <span className="text-sm text-gray-600 ml-2">- Chargement...</span>}
            </h3>
            {hideUnpaidRejected && statusFilter === "" && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  <span>Par défaut, les statuts <strong>Non payé</strong> et <strong>Rejeté</strong> sont masqués.</span>
                </div>
                <button
                  onClick={() => setHideUnpaidRejected(false)}
                  className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >Afficher tout</button>
              </div>
            )}
          </div>

          <div className="divide-y divide-gray-200">
            {(currentData.data as Formulaire[]).map((formulaire: Formulaire) => {
              const emailLower = (formulaire.email || '').toLowerCase();
              const hasFailedPayment = failedPaymentEmailSet.has(emailLower);
              const failedSummary = failedPaymentSummaryByEmail[emailLower];

              return (
              <div key={formulaire._id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(formulaire.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(formulaire.status)}`}>
                          {formulaire.status === 'pending' ? 'En attente' : 
                           formulaire.status === 'processing' ? 'En cours' : 
                           formulaire.status === 'unpaid' ? 'Non payé' :
                           formulaire.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                        </span>
                        {hasFailedPayment && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            <AlertCircle className="w-3 h-3" />
                            Impayé Stripe
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mb-2">
                      <h4 className="font-medium text-gray-900 text-lg mb-1">
                        {formulaire.legalForm === 'Particulier' ?
                          `${formulaire.firstName || ''} ${formulaire.lastName || ''}`.trim() || `${formulaire.ceoFirstName} ${formulaire.ceoLastName}` :
                          `${formulaire.ceoFirstName} ${formulaire.ceoLastName}`
                        }
                      </h4>
                      <p className="text-sm text-gray-600 mb-1">{formulaire.email}</p>
                      <p className="text-sm text-gray-500">
                        {formulaire.legalForm === 'Particulier' ? (
                          'Particulier'
                        ) : (
                          <>
                            {formulaire.companyName && `${formulaire.companyName} • `}
                            {formulaire.legalForm}
                          </>
                        )}
                      </p>
                      {hasFailedPayment && (
                        <p className="mt-1 text-xs text-red-600">
                          {failedSummary?.count ? `${failedSummary.count} impayé(s) en cours` : 'Impayé Stripe détecté'}
                          {failedSummary?.totalAmount ? ` • ${(failedSummary.totalAmount / 100).toFixed(2)} €` : ''}
                        </p>
                      )}
                      {/* Affichage des informations de domiciliation */}
                      <div className="text-sm text-gray-500 mt-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                          {formulaire.domiciliationType === 'changement' ? 'Changement de siège' : 'Création d\'entreprise'}
                        </span>
                        {formulaire.domiciliationType === 'changement' && formulaire.currentSiret && (
                          <span className="text-xs text-gray-600">
                            SIRET: {formulaire.currentSiret}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        Soumis le {formatDate(formulaire.submittedAt)}
                      </p>
                      {/* Section PDFs - Plus visible */}
                      <div className="mt-3 p-2 bg-gray-50 rounded-lg border">
                        <p className="text-xs font-medium text-gray-700 mb-2">📄 Documents générés :</p>
                        <div className="flex flex-wrap gap-2">
                          {formulaire.contratPdf ? (
                            <button
                              onClick={() => handleViewContrat(formulaire)}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              📋 Voir contrat
                            </button>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              <FileText className="w-3 h-3 mr-1" />
                              Contrat non généré
                            </span>
                          )}
                          {formulaire.attestationPdf ? (
                            <button
                              onClick={() => handleViewAttestation(formulaire)}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              📄 Voir attestation
                            </button>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              <FileText className="w-3 h-3 mr-1" />
                              Attestation non générée
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    
                  </div>


                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setSelectedCustomer(formulaire); setIsCustomerModalOpen(true); }}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Info className="w-4 h-4" />
                      Infos client
                    </button>
                    
                
                    
                    
                      <button
                        onClick={() => handleEditForm(formulaire)}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        Modifier
                      </button>
                    
                                         {formulaire.status === 'approved' ? (
                       <div className="flex items-center gap-2 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md">
                         <CheckCircle className="w-4 h-4" />
                         Approuvé
                       </div>
                     ) : (
                    <select
                      value={formulaire.status}
                      onChange={(e) => handleStatusChange(formulaire._id, e.target.value)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="unpaid">Non payé</option>
                      <option value="pending">En attente</option>
                      <option value="processing">En cours</option>
                      <option value="approved">Approuvé</option>
                      <option value="rejected">Rejeté</option>
                    </select>
                     )}
                  </div>
                </div>
              </div>
            );
            })}
          </div>

          {currentData.total === 0 && !isLoading && (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun formulaire trouvé</h3>
              <p className="text-gray-500">Aucun formulaire ne correspond à vos critères de recherche.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && currentData.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Affichage {currentData.startIndex + 1}-{Math.min(currentData.endIndex, currentData.total)} sur {currentData.total} formulaires
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  Page {currentPage} sur {currentData.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === currentData.totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal infos client */}
        <CustomerInfoModal
          isOpen={isCustomerModalOpen}
          onClose={() => { setIsCustomerModalOpen(false); setSelectedCustomer(null); }}
          formulaire={selectedCustomer}
        />
      </div>

      {/* Modal pour afficher les documents */}
      <DocumentModal
        isOpen={isDocumentModalOpen}
        onClose={() => {
          setIsDocumentModalOpen(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
      />

      {/* Modal pour afficher le contrat PDF */}
      {/* Modal dédié pour le contrat PDF (aperçu PDF intégré) */}
      {isContratModalOpen && selectedContrat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Contrat PDF</h3>
                <button
                  onClick={() => { setIsContratModalOpen(false); setSelectedContrat(null); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => downloadFile(selectedContrat.fileUrl || '', selectedContrat.fileName || 'contrat.pdf')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors rounded-md"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger le contrat
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <iframe
                    src={selectedContrat.fileUrl}
                    className="w-full h-[70vh]"
                    title="Aperçu contrat"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* (Supprimé) Modal d'upload de contrat manuel */}

      {/* Modal de création sans paiement */}
      <CreateFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateForm}
        siteId={siteId || undefined}
      />

      {/* Modal d'édition de formulaire */}
      {isEditModalOpen && editingForm && (
        <EditFormModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingForm(null);
          }}
          onSave={handleSaveEdit}
          formData={editingForm}
          siteId={siteId || undefined}
        />
      )}
    </>
  );
}