"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building,
  Mail,
  Phone,
  MapPin,
  FileText,
  Download,
  Eye,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Euro,
  FileImage,
  XCircle
} from "lucide-react";

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

interface ClientEntrepriseTemplateProps {
  siteId?: string;
  userId?: string;
}

interface DomiciliationForm {
  _id: string;
  siteId: string;
  
  // Étape 1 - Adresse et contact
  street?: string;
  suite?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  email: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  
  // Étape 2 - Informations entreprise
  legalForm?: string;
  companyName?: string;
  ceoFirstName?: string;
  ceoMiddleName?: string;
  ceoLastName?: string;
  companyCreated?: string;
  birthDate?: string;
  nationality?: string;
  
  // Type de domiciliation et SIRET
  domiciliationType: 'creation' | 'changement';
  currentSiret?: string;
  
  // Documents
  idCardFile?: string; // Legacy - premier fichier
  domicileProofFile?: string; // Legacy - premier fichier
  idCardFiles?: string[];
  domicileProofFiles?: string[];
  kbisFiles?: string[];
  
  // Paiement / abonnement
  abonnementId?: string;
  abonnementType?: string;
  stripeSessionId?: string;
  stripePriceId?: string;
  ipAddress?: string;
  selectedAbonnementPrix?: number;
  
  // PDFs générés
  contratPdf?: string;
  attestationPdf?: string;
  
  // Signature
  signature?: string;
  
  // Métadonnées
  submittedAt?: string;
  currentStep?: number;
  status: 'unpaid' | 'pending' | 'processing' | 'approved' | 'rejected' | 'paid' | 'draft';
  createdAt: string;
  updatedAt: string;
}

interface EntrepriseInfo {
  _id?: string;
  siteId?: string;
  nom?: string;
  telephone?: string;
  email?: string;
  nomRepresentant?: string;
  dateCreation?: string;
  dateAgrement?: string;
  adresseCentreAffaires?: {
    adresse?: string;
    codePostal?: string;
    ville?: string;
    pays?: string;
  };
  cachetSignature?: string;
  agrementPrefectoral?: string;
  numeroAgrement?: string;
  villeRcs?: string;
  siren?: string;
}

export default function ClientEntrepriseTemplate({
  siteId,
  userId
}: ClientEntrepriseTemplateProps) {
  const [domiciliationForms, setDomiciliationForms] = useState<DomiciliationForm[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [domiciliationForm, setDomiciliationForm] = useState<DomiciliationForm | null>(null);
  const [pendingForms, setPendingForms] = useState<DomiciliationForm[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<{url: string, title: string} | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedForm, setEditedForm] = useState<DomiciliationForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [entrepriseInfo, setEntrepriseInfo] = useState<EntrepriseInfo | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  // Utils dessin
  const getCanvasContext = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    return ctx;
  };

  const getRelativePos = (e: MouseEvent | TouchEvent) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0, clientY = 0;
    if (e instanceof MouseEvent) {
      clientX = e.clientX; clientY = e.clientY;
    } else if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: MouseEvent | TouchEvent) => {
    isDrawingRef.current = true;
    lastPointRef.current = getRelativePos(e);
  };

  const drawStroke = (e: MouseEvent | TouchEvent) => {
    if (!isDrawingRef.current) return;
    const ctx = getCanvasContext();
    const canvas = signatureCanvasRef.current;
    if (!ctx || !canvas) return;
    const current = getRelativePos(e);
    const last = lastPointRef.current || current;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();
    lastPointRef.current = current;
    e.preventDefault();
  };

  const endDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    const ctx = getCanvasContext();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const resizeCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const width = Math.min(parent ? parent.clientWidth : 600, 800);
    const height = Math.floor(width * 0.35);
    const data = canvas.toDataURL();
    canvas.width = width;
    canvas.height = height;
    const img = new Image();
    img.onload = () => {
      const ctx = getCanvasContext();
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = data;
  };

  useEffect(() => {
    if (!showSignaturePad) return;
    resizeCanvas();
    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showSignaturePad]);
  const saveSignature = async () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], 'signature.png', { type: 'image/png' });
    await handleSignatureUpload(file);
    setShowSignaturePad(false);
  };

  // Charger les données du profil utilisateur connecté et le formulaire de domiciliation
  const loadData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/sharedServices/auth/me", {
        credentials: "include"
      });
      if (response.ok) {
        const userData = await response.json();
        setIsAuthenticated(true);
        // Charger les formulaires de domiciliation et les informations de l'entreprise
        await Promise.all([
          loadDomiciliationForms(userData.email),
          loadEntrepriseInfo()
        ]);
      } else if (response.status === 401) {
        setIsAuthenticated(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors du chargement");
      }
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
      setError(error instanceof Error ? error.message : "Erreur lors du chargement");
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les informations de l'entreprise depuis la base de données
  const loadEntrepriseInfo = async () => {
    if (!siteId) {
      console.warn('[MonEntreprise] SiteId manquant pour charger les infos entreprise');
      return;
    }

    try {
      const response = await fetch(`/api/sharedServices/entreprise?siteId=${siteId}&t=${Date.now()}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setEntrepriseInfo(data);
        console.log('[MonEntreprise] Informations entreprise chargées:', data);
      } else {
        console.error('[MonEntreprise] Erreur lors du chargement des infos entreprise:', response.status);
      }
    } catch (error) {
      console.error('[MonEntreprise] Erreur lors du chargement des infos entreprise:', error);
    }
  };

  // Charger tous les formulaires de domiciliation de l'utilisateur
  const loadDomiciliationForms = async (userEmail: string) => {
    const buildUrl = (base: string, params: Record<string, string | number | undefined>) => {
      const usp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") usp.append(k, String(v));
      });
      return `${base}?${usp.toString()}`;
    };

    try {
      // Récupération de TOUS les formulaires avec une limite élevée
      const url = buildUrl('/api/formulaires/list', {
        limit: 1000, // Limite très élevée pour récupérer tous les formulaires
        siteId
      });
      console.log('[MonEntreprise] URL de récupération:', url);
      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const list = data.data || [];
        console.log('[MonEntreprise] Total formulaires récupérés:', list.length);
        if (Array.isArray(list) && list.length > 0) {
          // Filtrer les formulaires qui matchent avec l'email de l'utilisateur
          const matchingForms = list.filter((f: any) => (
            f?.email === userEmail ||
            f?.contactEmail === userEmail ||
            f?.dirigeantEmail === userEmail
          ));
          console.log('[MonEntreprise] Formulaires correspondants trouvés:', matchingForms.length);
          if (matchingForms.length > 0) {
            // Séparer les formulaires approuvés des formulaires en cours
            const approvedForms = matchingForms.filter((f: any) => f.status === 'approved');
            const pendingForms = matchingForms.filter((f: any) => 
              f.status === 'unpaid' || f.status === 'pending' || f.status === 'draft'
            );
            setDomiciliationForms(approvedForms);
            setPendingForms(pendingForms);
            // Sélectionner le premier formulaire approuvé ou le premier en cours
            const firstForm = approvedForms[0] || pendingForms[0];
            if (firstForm) {
              setSelectedFormId(firstForm._id);
              setDomiciliationForm(firstForm);
            }
            
            console.log('[MonEntreprise] Formulaires approuvés:', approvedForms.length);
            console.log('[MonEntreprise] Formulaires en cours:', pendingForms.length);
            return;
          }
        }
      }

      console.warn('[MonEntreprise] Aucun formulaire trouvé pour', userEmail);
      console.log('[MonEntreprise] Vérifiez les logs serveur');
    } catch (error) {
      console.error("Erreur lors du chargement des formulaires de domiciliation:", error);
    }
  };

  // Gérer le changement de sélection d'entreprise
  const handleFormChange = (formId: string) => {
    setSelectedFormId(formId);
    const selectedForm = domiciliationForms.find(form => form._id === formId);
    setDomiciliationForm(selectedForm || null);
  };

  // Reprendre un formulaire en cours
  const handleResumeForm = (formId: string) => {
    if (window.location.hostname === 'localhost') {
      window.location.href = `http://localhost:3000/sites/${siteId}/formulaire?form_id=${formId}`;
    } else {
      window.location.href = `https://${window.location.hostname}/formulaire?form_id=${formId}`;
    }
  };

  // Télécharger un document
  const handleDownloadDocument = async (documentUrl: string, filename: string) => {
    if (!documentUrl) {
      setError('URL du document non disponible');
      return;
    }
    
    try {
      // Si c'est une URL S3 ou une URL directe, essayer de télécharger directement
      if (documentUrl.startsWith('http')) {
        const response = await fetch(documentUrl);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          throw new Error('Impossible de télécharger le document');
        }
      } else {
        // Si c'est un data URL ou autre format
        const link = document.createElement('a');
        link.href = documentUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      setError('Erreur lors du téléchargement du document');
      setTimeout(() => setError(''), 5000);
    }
  };

  // Voir un document
  const handleViewDocument = async (documentUrl: string, title: string) => {
    if (!documentUrl) {
      setError('URL du document non disponible');
      return;
    }
    
    // Vérifier si l'URL est valide
    if (!documentUrl.startsWith('http') && !documentUrl.startsWith('data:')) {
      setError('Format de document non supporté');
      setTimeout(() => setError(''), 5000);
      return;
    }
    
    // Si c'est le contrat, récupérer la dernière version depuis la BDD avec les infos entreprise
    if (title === 'Contrat de domiciliation' && domiciliationForm) {
      try {
        console.log('[MonEntreprise] Récupération de la dernière version du contrat depuis la BDD');
        console.log('[MonEntreprise] Informations entreprise disponibles:', entrepriseInfo);
        // Récupérer la dernière version du formulaire depuis la BDD
        const formResponse = await fetch(`/api/formulaires/${domiciliationForm._id}`, {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (formResponse.ok) {
          const updatedForm = await formResponse.json();
          console.log('[MonEntreprise] Formulaire mis à jour récupéré:', updatedForm);
          // Si on a les infos entreprise, essayer de générer un contrat complet
          if (entrepriseInfo && updatedForm.contratPdf) {
            try {
              console.log('[MonEntreprise] Tentative de génération du contrat complet avec infos entreprise');
              // Générer le contrat complet avec les infos entreprise
              const contractResponse = await fetch('/api/sharedServices/generate-contract', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  formData: updatedForm,
                  entrepriseInfo: entrepriseInfo,
                  includeSignature: true
                })
              });
              console.log('[MonEntreprise] Réponse API contrat:', contractResponse.status);
              if (contractResponse.ok) {
                const contractData = await contractResponse.json();
                console.log('[MonEntreprise] Contrat généré avec succès:', contractData);
                if (contractData.contratUrl) {
                  // Utiliser le contrat généré avec les infos entreprise
                  setCurrentDocument({ 
                    url: contractData.contratUrl, 
                    title: 'Contrat de domiciliation complet (avec infos entreprise)' 
                  });
                  setShowDocumentModal(true);
                  return;
                } else {
                  console.warn('[MonEntreprise] Pas de contratUrl dans la réponse');
                }
              } else {
                const errorData = await contractResponse.text();
                console.error('[MonEntreprise] Erreur API contrat:', errorData);
              }
            } catch (error) {
              console.error('[MonEntreprise] Erreur lors de la génération du contrat complet:', error);
            }
          }
          
          // Fallback : utiliser le contrat existant avec timestamp
          if (updatedForm.contratPdf) {
            let finalUrl = updatedForm.contratPdf;
            if (finalUrl.includes('s3') || finalUrl.includes('amazonaws')) {
              const separator = finalUrl.includes('?') ? '&' : '?';
              finalUrl = `${finalUrl}${separator}t=${Date.now()}`;
            }
            
            console.log('[MonEntreprise] Affichage du contrat mis à jour:', { originalUrl: updatedForm.contratPdf, finalUrl });
            setCurrentDocument({ url: finalUrl, title: 'Contrat de domiciliation (dernière version)' });
            setShowDocumentModal(true);
            return;
          } else {
            console.warn('[MonEntreprise] Pas de contrat PDF dans le formulaire mis à jour');
          }
        } else {
          console.error('[MonEntreprise] Erreur lors de la récupération du formulaire:', formResponse.status);
        }
      } catch (error) {
        console.error('[MonEntreprise] Erreur lors de la récupération du contrat:', error);
      }
    }
    
    // Fallback : utiliser l'URL fournie avec timestamp pour éviter le cache
    let finalUrl = documentUrl;
    if (documentUrl.includes('s3') || documentUrl.includes('amazonaws')) {
      const separator = documentUrl.includes('?') ? '&' : '?';
      finalUrl = `${documentUrl}${separator}t=${Date.now()}`;
    }
    
    console.log('[MonEntreprise] Affichage du document:', { originalUrl: documentUrl, finalUrl, title });
    setCurrentDocument({ url: finalUrl, title });
    setShowDocumentModal(true);
  };

  // Fermer la modal
  const handleCloseModal = () => {
    setShowDocumentModal(false);
    setCurrentDocument(null);
  };

  // Gérer les changements dans les champs éditables
  const handleInputChange = (field: keyof DomiciliationForm, value: string) => {
    if (!editedForm) return;
    setEditedForm({
      ...editedForm,
      [field]: value
    });
  };

  // Activer le mode édition
  const handleStartEditing = () => {
    if (domiciliationForm) {
      setEditedForm({ ...domiciliationForm });
      setIsEditing(true);
    }
  };

  // Mettre à jour editedForm quand domiciliationForm change
  useEffect(() => {
    if (isEditing && domiciliationForm) {
      setEditedForm({ ...domiciliationForm });
    }
  }, [domiciliationForm, isEditing]);
  // Annuler les modifications
  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditedForm(null);
  };

  // Sauvegarder les modifications
  const handleSaveChanges = async () => {
    if (!editedForm || !domiciliationForm) return;
    
    setSaving(true);
    try {
      const requestBody = {
        companyName: editedForm.companyName || domiciliationForm.companyName,
        ceoFirstName: editedForm.ceoFirstName || domiciliationForm.ceoFirstName,
        ceoLastName: editedForm.ceoLastName || domiciliationForm.ceoLastName,
        email: editedForm.email || domiciliationForm.email,
        phone: editedForm.phone || domiciliationForm.phone,
        legalForm: editedForm.legalForm || domiciliationForm.legalForm,
        street: editedForm.street || domiciliationForm.street,
        suite: editedForm.suite || domiciliationForm.suite,
        city: editedForm.city || domiciliationForm.city,
        state: editedForm.state || domiciliationForm.state,
        postalCode: editedForm.postalCode || domiciliationForm.postalCode,
        country: editedForm.country || domiciliationForm.country,
        // Inclure les champs de documents pour s'assurer qu'ils sont sauvegardés
        idCardFile: domiciliationForm.idCardFile,
        domicileProofFile: domiciliationForm.domicileProofFile,
        // Inclure la signature si modifiée/existante
        signature: editedForm.signature || domiciliationForm.signature,
      };
      
      console.log('[MonEntreprise] Données envoyées à l\'API:', requestBody);
      const response = await fetch(`/api/formulaires/${domiciliationForm._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });
      if (response.ok) {
        const updatedForm = await response.json();
        console.log('[MonEntreprise] Réponse API après sauvegarde:', updatedForm);
        // L'API retourne directement l'objet MongoDB mis à jour
        const updatedPayload = updatedForm;

        // S'assurer que les données sont dans le bon format
        const formattedForm: DomiciliationForm = {
          ...domiciliationForm,
          ...updatedPayload,
          // Garder les champs qui ne sont pas retournés par l'API
          _id: domiciliationForm._id,
          status: updatedPayload?.status || domiciliationForm.status,
          createdAt: updatedPayload?.createdAt || domiciliationForm.createdAt,
          updatedAt: updatedPayload?.updatedAt || new Date().toISOString(),
          selectedAbonnementPrix: updatedPayload?.selectedAbonnementPrix ?? domiciliationForm.selectedAbonnementPrix,
          abonnementType: updatedPayload?.abonnementType ?? domiciliationForm.abonnementType,
          signature: updatedPayload?.signature ?? domiciliationForm.signature,
          contratPdf: updatedPayload?.contratPdf ?? domiciliationForm.contratPdf,
          // S'assurer que les documents sont bien préservés
          idCardFile: updatedPayload?.idCardFile ?? domiciliationForm.idCardFile,
          domicileProofFile: updatedPayload?.domicileProofFile ?? domiciliationForm.domicileProofFile,
        } as DomiciliationForm;
        
        console.log('[MonEntreprise] Formulaire formaté après sauvegarde:', formattedForm);
        // Mettre à jour le formulaire courant
        setDomiciliationForm(formattedForm);
        // Mettre à jour la liste (dropdown) si présente
        setDomiciliationForms((prev) => prev.map(f => f._id === formattedForm._id ? formattedForm : f));
        // Conserver la sélection
        setSelectedFormId(formattedForm._id);
        // Régénérer et enregistrer le contrat si signature présente
        if (formattedForm.signature && entrepriseInfo) {
          try {
            const contractResponse = await fetch('/api/sharedServices/generate-contract', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                formData: formattedForm,
                entrepriseInfo: entrepriseInfo,
                includeSignature: true
              })
            });
            if (contractResponse.ok) {
              const contractData = await contractResponse.json();
              if (contractData?.contratUrl) {
                // Sauvegarder l'URL du contrat dans le formulaire
                const savePdfRes = await fetch(`/api/formulaires/${formattedForm._id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ contratPdf: contractData.contratUrl })
                });
                if (savePdfRes.ok) {
                  setDomiciliationForm(prev => prev ? { ...prev, contratPdf: contractData.contratUrl } : prev);
                  setDomiciliationForms(prev => prev.map(f => f._id === formattedForm._id ? { ...f, contratPdf: contractData.contratUrl } : f));
                }
              }
            }
          } catch (e) {
            console.warn('[MonEntreprise] Régénération du contrat échouée (non bloquant)', e);
          }
        }

        setIsEditing(false);
        setEditedForm(null);
        setSuccess('Modifications sauvegardées avec succès');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Gérer l'upload de fichiers
  const handleFileUpload = async (field: 'idCardFile' | 'domicileProofFile' | 'idCardFiles' | 'domicileProofFiles' | 'kbisFiles', file: File) => {
    if (!domiciliationForm) return;
    
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('formId', domiciliationForm._id);
      formData.append('siteId', siteId || '');
      const response = await fetch('/api/formulaires/upload-images', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      if (response.ok) {
        const result = await response.json();
        const imageUrl = result.imageUrl || result.url;
        
        let updatedForm;
        
        if (field === 'idCardFile') {
          // Mise à jour du champ legacy
          updatedForm = {
          ...domiciliationForm,
            idCardFile: imageUrl
          };
        } else if (field === 'domicileProofFile') {
          // Mise à jour du champ legacy
          updatedForm = {
            ...domiciliationForm,
            domicileProofFile: imageUrl
          };
        } else if (field === 'idCardFiles') {
          // Ajout à la liste des CNI
          updatedForm = {
            ...domiciliationForm,
            idCardFiles: [...(domiciliationForm.idCardFiles || []), imageUrl],
            idCardFile: imageUrl // Mise à jour du champ legacy avec le dernier upload
          };
        } else if (field === 'domicileProofFiles') {
          // Ajout à la liste des justificatifs
          updatedForm = {
            ...domiciliationForm,
            domicileProofFiles: [...(domiciliationForm.domicileProofFiles || []), imageUrl],
            domicileProofFile: imageUrl // Mise à jour du champ legacy avec le dernier upload
          };
        } else if (field === 'kbisFiles') {
          // Ajout à la liste des KBIS
          updatedForm = {
            ...domiciliationForm,
            kbisFiles: [...(domiciliationForm.kbisFiles || []), imageUrl]
          };
        }
        
        if (updatedForm) {
        // Mettre à jour le formulaire courant
        setDomiciliationForm(updatedForm);
        // Mettre à jour la liste (dropdown) si présente
        setDomiciliationForms((prev) => prev.map(f => f._id === updatedForm._id ? updatedForm : f));
        }
        
        setSuccess('Document mis à jour avec succès');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de l\'upload');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Supprimer un fichier d'une liste
  const handleRemoveFile = (field: 'idCardFiles' | 'domicileProofFiles' | 'kbisFiles', index: number) => {
    if (!domiciliationForm) return;
    
    let updatedForm;
    
    if (field === 'idCardFiles') {
      const newFiles = domiciliationForm.idCardFiles?.filter((_, i) => i !== index) || [];
      updatedForm = {
        ...domiciliationForm,
        idCardFiles: newFiles,
        idCardFile: newFiles.length > 0 ? newFiles[0] : undefined
      };
    } else if (field === 'domicileProofFiles') {
      const newFiles = domiciliationForm.domicileProofFiles?.filter((_, i) => i !== index) || [];
      updatedForm = {
        ...domiciliationForm,
        domicileProofFiles: newFiles,
        domicileProofFile: newFiles.length > 0 ? newFiles[0] : undefined
      };
    } else if (field === 'kbisFiles') {
      const newFiles = domiciliationForm.kbisFiles?.filter((_, i) => i !== index) || [];
      updatedForm = {
        ...domiciliationForm,
        kbisFiles: newFiles
      };
    }
    
    if (updatedForm) {
      setDomiciliationForm(updatedForm);
      setDomiciliationForms((prev) => prev.map(f => f._id === updatedForm._id ? updatedForm : f));
      setSuccess('Document supprimé avec succès');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // Gérer l'upload de la signature
  const handleSignatureUpload = async (file: File) => {
    if (!domiciliationForm) return;
 
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('formId', domiciliationForm._id);
      formData.append('siteId', siteId || '');
      // Upload du fichier
      const uploadResponse = await fetch('/api/formulaires/upload-images', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Erreur lors de l\'upload de la signature');
      }
 
      const uploadResult = await uploadResponse.json();
      const signatureUrl = uploadResult.imageUrl || uploadResult.url;
 
      // Sauvegarder la signature dans le formulaire avec les champs requis existants
      const putResponse = await fetch(`/api/formulaires/${domiciliationForm._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          // Champs requis renvoyés avec leurs valeurs existantes
          companyName: domiciliationForm.companyName || '',
          ceoFirstName: domiciliationForm.ceoFirstName || '',
          ceoLastName: domiciliationForm.ceoLastName || '',
          email: domiciliationForm.email || '',
          phone: domiciliationForm.phone || '',
          legalForm: domiciliationForm.legalForm || '',
          street: domiciliationForm.street || '',
          suite: domiciliationForm.suite || '',
          city: domiciliationForm.city || '',
          state: domiciliationForm.state || '',
          postalCode: domiciliationForm.postalCode || '',
          country: domiciliationForm.country || '',
          // Conserver les documents existants (legacy + listes)
          idCardFile: domiciliationForm.idCardFile,
          domicileProofFile: domiciliationForm.domicileProofFile,
          idCardFiles: domiciliationForm.idCardFiles || [],
          domicileProofFiles: domiciliationForm.domicileProofFiles || [],
          // Mettre à jour la signature
          signature: signatureUrl,
        })
      });
      if (!putResponse.ok) {
        const errorData = await putResponse.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde de la signature');
      }
 
      // Mettre à jour l'état local
      const updatedForm = { ...domiciliationForm, signature: signatureUrl } as DomiciliationForm;
      setDomiciliationForm(updatedForm);
      setDomiciliationForms((prev) => prev.map(f => f._id === updatedForm._id ? updatedForm : f));
      if (isEditing && editedForm) {
        setEditedForm({ ...editedForm, signature: signatureUrl });
      }
 
      // Régénérer et enregistrer le contrat si infos entreprise disponibles
      if (entrepriseInfo) {
        try {
          const contractResponse = await fetch('/api/sharedServices/generate-contract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              formData: { ...updatedForm, signature: signatureUrl },
              entrepriseInfo: entrepriseInfo,
              includeSignature: true
            })
          });
          if (contractResponse.ok) {
            const contractData = await contractResponse.json();
            if (contractData?.contratUrl) {
              const savePdfRes = await fetch(`/api/formulaires/${updatedForm._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ contratPdf: contractData.contratUrl })
              });
              if (savePdfRes.ok) {
                setDomiciliationForm(prev => prev ? { ...prev, contratPdf: contractData.contratUrl } : prev);
                setDomiciliationForms(prev => prev.map(f => f._id === updatedForm._id ? { ...f, contratPdf: contractData.contratUrl } : f));
              }
            }
          }
        } catch (e) {
          console.warn('[MonEntreprise] Régénération du contrat après signature échouée (non bloquant)', e);
        }
      }
 
      setSuccess('Signature mise à jour avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Erreur lors de l\'upload de la signature:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de l\'upload de la signature');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Connexion requise</h3>
          <p className="text-gray-500">
            Vous devez être connecté pour accéder aux informations de votre entreprise.
          </p>
        </div>
      </div>
    );
  }

  if (!domiciliationForm) {
    return (
      <div className="p-6">
        <div className="text-center">
          <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune entreprise trouvée</h3>
          <p className="text-gray-500">
            Vous n'avez pas encore soumis de formulaire de domiciliation d'entreprise.
          </p>
        </div>
      </div>
    );
  }

  const isApproved = domiciliationForm.status === 'approved';

  return (
    <div className="p-6" data-type="service">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Mon Entreprise
              </h2>
              <p className="text-gray-600">
                Informations de votre entreprise et contrat de domiciliation.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isApproved ? 'default' : 'secondary'} className="text-sm">
                {isApproved ? 'Approuvé' : 'En attente'}
              </Badge>
              {!isApproved && !isEditing && (
                <Button
                  onClick={handleStartEditing}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  Modifier
                </Button>
              )}
              {!isApproved && isEditing && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                  <Button
                    onClick={handleCancelEditing}
                    disabled={saving}
                    variant="outline"
                    size="sm"
                  >
                    Annuler
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Dropdown de sélection d'entreprise */}
          {domiciliationForms.length > 1 && (
            <div className="mb-4">
              <Label htmlFor="entreprise-select" className="text-sm font-medium text-gray-700 mb-2 block">
                Sélectionner une entreprise
              </Label>
              <Select value={selectedFormId} onValueChange={handleFormChange}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Choisir une entreprise" />
                </SelectTrigger>
                <SelectContent>
                  {domiciliationForms.map((form) => (
                    <SelectItem key={form._id} value={form._id}>
                      {form.legalForm === 'Particulier' ?
                        `${form.firstName || ''} ${form.lastName || ''}`.trim() || `${form.ceoFirstName} ${form.ceoLastName}` :
                        `${form.companyName || 'Entreprise'} - ${form.ceoFirstName} ${form.ceoLastName}`
                      }
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {error && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                <AlertCircle className="inline w-4 h-4 mr-1" />
                <strong>Erreur :</strong> {error}
              </p>
            </div>
          )}
          {success && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">
                <CheckCircle className="inline w-4 h-4 mr-1" />
                <strong>Succès :</strong> {success}
              </p>
            </div>
          )}
        </div>

        {/* Section des formulaires en cours */}
        {pendingForms.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-yellow-600" />
              <h3 className="text-lg font-medium text-yellow-800">
                Formulaires en cours ({pendingForms.length})
              </h3>
            </div>
            <p className="text-yellow-700 mb-4">
              Vous avez des formulaires de domiciliation en cours de traitement. Vous pouvez les reprendre pour les finaliser.
            </p>
            <div className="space-y-2">
              {pendingForms.map((form) => (
                <div key={form._id} className="flex items-center justify-between bg-white border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-yellow-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {form.companyName || `${form.firstName} ${form.lastName}` || 'Formulaire sans nom'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {form.email} • Étape {form.currentStep || 1}/4
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                      {form.status === 'unpaid' ? 'Non payé' : 
                       form.status === 'pending' ? 'En attente' : 
                       form.status === 'draft' ? 'Brouillon' : form.status}
                    </Badge>
                    <Button
                      onClick={() => handleResumeForm(form._id)}
                      size="sm"
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      Reprendre
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informations de l'entreprise */}
        <div className="space-y-6">
          {/* Informations de base */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5" />
              {domiciliationForm.legalForm === 'Particulier' ? 'Informations personnelles' : 'Informations de l\'entreprise'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nom de l'entreprise - uniquement pour entreprises */}
              {domiciliationForm.legalForm !== 'Particulier' && (
                <div>
                  <Label htmlFor="companyName">Nom de l'entreprise *</Label>
                  <Input
                    id="companyName"
                    value={isEditing ? (editedForm?.companyName || domiciliationForm.companyName || "") : (domiciliationForm.companyName || "")}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    disabled={isApproved || !isEditing}
                    className="mt-1"
                  />
                </div>
              )}

              {/* Champs nom/prénom adaptés selon le type */}
              {domiciliationForm.legalForm === 'Particulier' ? (
                <>
                  <div>
                    <Label htmlFor="firstName">Prénom *</Label>
                    <Input
                      id="firstName"
                      placeholder="Prénom"
                      value={isEditing ? (editedForm?.firstName || domiciliationForm.firstName || "") : (domiciliationForm.firstName || "")}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      disabled={isApproved || !isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Nom *</Label>
                    <Input
                      id="lastName"
                      placeholder="Nom"
                      value={isEditing ? (editedForm?.lastName || domiciliationForm.lastName || "") : (domiciliationForm.lastName || "")}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      disabled={isApproved || !isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="birthDate">Date de naissance</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={isEditing ? (editedForm?.birthDate || domiciliationForm.birthDate || "") : (domiciliationForm.birthDate || "")}
                      onChange={(e) => handleInputChange('birthDate', e.target.value)}
                      disabled={isApproved || !isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nationality">Nationalité</Label>
                    <Input
                      id="nationality"
                      placeholder="Française"
                      value={isEditing ? (editedForm?.nationality || domiciliationForm.nationality || "") : (domiciliationForm.nationality || "")}
                      onChange={(e) => handleInputChange('nationality', e.target.value)}
                      disabled={isApproved || !isEditing}
                      className="mt-1"
                    />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ceoFirstName">Prénom du représentant *</Label>
                    <Input
                      id="ceoFirstName"
                      placeholder="Prénom"
                      value={isEditing ? (editedForm?.ceoFirstName || domiciliationForm.ceoFirstName || "") : (domiciliationForm.ceoFirstName || "")}
                      onChange={(e) => handleInputChange('ceoFirstName', e.target.value)}
                      disabled={isApproved || !isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ceoLastName">Nom du représentant *</Label>
                    <Input
                      id="ceoLastName"
                      placeholder="Nom"
                      value={isEditing ? (editedForm?.ceoLastName || domiciliationForm.ceoLastName || "") : (domiciliationForm.ceoLastName || "")}
                      onChange={(e) => handleInputChange('ceoLastName', e.target.value)}
                      disabled={isApproved || !isEditing}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={isEditing ? (editedForm?.email || domiciliationForm.email || "") : (domiciliationForm.email || "")}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={isApproved || !isEditing}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone *</Label>
                <Input
                  id="phone"
                  value={isEditing ? (editedForm?.phone || domiciliationForm.phone || "") : (domiciliationForm.phone || "")}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={isApproved || !isEditing}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="legalForm">Forme juridique *</Label>
                <Input
                  id="legalForm"
                  value={isEditing ? (editedForm?.legalForm || domiciliationForm.legalForm || "") : (domiciliationForm.legalForm || "")}
                  onChange={(e) => handleInputChange('legalForm', e.target.value)}
                  disabled={isApproved || !isEditing}
                  className="mt-1"
                />
              </div>
              
              {/* Type de domiciliation */}
              <div>
                <Label htmlFor="domiciliationType">Type de domiciliation *</Label>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="domiciliationType"
                      value="creation"
                      checked={(isEditing ? editedForm?.domiciliationType : domiciliationForm.domiciliationType) === 'creation'}
                      onChange={(e) => handleInputChange('domiciliationType', e.target.value)}
                      disabled={isApproved || !isEditing}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="ml-2 text-gray-700">Création d'une nouvelle entreprise</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="domiciliationType"
                      value="changement"
                      checked={(isEditing ? editedForm?.domiciliationType : domiciliationForm.domiciliationType) === 'changement'}
                      onChange={(e) => handleInputChange('domiciliationType', e.target.value)}
                      disabled={isApproved || !isEditing}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="ml-2 text-gray-700">Changement de siège social</span>
                  </label>
                </div>
              </div>
              
              {/* SIRET actuel (conditionnel) */}
              {(isEditing ? editedForm?.domiciliationType : domiciliationForm.domiciliationType) === 'changement' && (
                <div>
                  <Label htmlFor="currentSiret">SIRET actuel *</Label>
                  <Input
                    id="currentSiret"
                    value={isEditing ? (editedForm?.currentSiret || domiciliationForm.currentSiret || "") : (domiciliationForm.currentSiret || "")}
                    onChange={(e) => handleInputChange('currentSiret', e.target.value)}
                    disabled={isApproved || !isEditing}
                    placeholder="123 456 789 00012"
                    maxLength={14}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Format : 14 chiffres (espaces autorisés pour la lisibilité)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Documents générés */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents générés
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="text-sm font-medium text-gray-700 mb-3">📄 Documents disponibles :</p>
                <div className="flex flex-wrap gap-3">
                  {domiciliationForm.contratPdf ? (
                    <button
                      onClick={() => window.open(domiciliationForm.contratPdf, '_blank')}
                      className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      📋 Voir contrat signé
                    </button>
                  ) : (
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                      <FileText className="w-4 h-4 mr-2" />
                      Contrat non généré
                    </span>
                  )}

                  {domiciliationForm.attestationPdf ? (
                    <button
                      onClick={() => window.open(domiciliationForm.attestationPdf, '_blank')}
                      className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      📄 Voir attestation
                    </button>
                  ) : (
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                      <FileText className="w-4 h-4 mr-2" />
                      Attestation non générée
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Adresse de l'entreprise
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="street">Rue *</Label>
                <Input
                  id="street"
                  value={isEditing ? (editedForm?.street || domiciliationForm.street || "") : (domiciliationForm.street || "")}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  disabled={isApproved || !isEditing}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="suite">Complément d'adresse</Label>
                <Input
                  id="suite"
                  value={isEditing ? (editedForm?.suite || domiciliationForm.suite || "") : (domiciliationForm.suite || "")}
                  onChange={(e) => handleInputChange('suite', e.target.value)}
                  disabled={isApproved || !isEditing}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="postalCode">Code postal *</Label>
                <Input
                  id="postalCode"
                  value={isEditing ? (editedForm?.postalCode || domiciliationForm.postalCode || "") : (domiciliationForm.postalCode || "")}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  disabled={isApproved || !isEditing}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="city">Ville *</Label>
                <Input
                  id="city"
                  value={isEditing ? (editedForm?.city || domiciliationForm.city || "") : (domiciliationForm.city || "")}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  disabled={isApproved || !isEditing}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="country">Pays *</Label>
                <Input
                  id="country"
                  value={isEditing ? (editedForm?.country || domiciliationForm.country || "") : (domiciliationForm.country || "")}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  disabled={isApproved || !isEditing}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Abonnement */}
          {domiciliationForm.selectedAbonnementPrix && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Euro className="w-5 h-5" />
                Abonnement
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="abonnementPrix">Prix de l'abonnement</Label>
                  <Input
                    id="abonnementPrix"
                    value={`${domiciliationForm.selectedAbonnementPrix}€`}
                    disabled={true}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="abonnementType">Type d'abonnement</Label>
                  <Input
                    id="abonnementType"
                    value={domiciliationForm.abonnementType || ""}
                    disabled={true}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pièce d'identité */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <FileImage className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Pièce d'identité</span>
                </div>
                
                {/* Affichage des listes de fichiers multiples */}
                {(domiciliationForm.idCardFiles && domiciliationForm.idCardFiles.length > 0) || domiciliationForm.idCardFile ? (
                  <>
                    {/* Aperçu des documents multiples */}
                    {domiciliationForm.idCardFiles && domiciliationForm.idCardFiles.length > 0 ? (
                    <div className="mb-3">
                        <p className="text-xs text-green-600 mb-2">✓ {domiciliationForm.idCardFiles.length} CNI enregistrée(s)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {domiciliationForm.idCardFiles.map((url: string, index: number) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-3 border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-700">CNI {index + 1}</span>
                                {!isApproved && isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFile('idCardFiles', index)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                )}
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
                                  <FileText className="w-6 h-6 mb-1" />
                                  <span>Aperçu indisponible</span>
                                </div>
                              </div>
                              {/* Boutons d'action */}
                              <div className="mt-2 flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(url);
                                      if (!res.ok) throw new Error('Téléchargement impossible');
                                      const blob = await res.blob();
                                      const contentType = blob.type || res.headers.get('Content-Type') || '';
                                      const ext = contentType.includes('pdf') ? '.pdf' : contentType.includes('png') ? '.png' : contentType.includes('jpeg') || contentType.includes('jpg') ? '.jpg' : '';
                                      const downloadUrl = window.URL.createObjectURL(blob);
                                      const link = document.createElement('a');
                                      link.href = downloadUrl;
                                      link.download = `piece-identite-${index + 1}${ext}`;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      window.URL.revokeObjectURL(downloadUrl);
                                    } catch (error) {
                                      console.error('Erreur téléchargement:', error);
                                      setError('Erreur lors du téléchargement');
                                      setTimeout(() => setError(''), 5000);
                                    }
                                  }}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Télécharger
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Fallback pour l'ancien système */
                      <div className="mb-3">
                        {domiciliationForm.idCardFile?.toLowerCase().includes('.pdf') ? (
                        <div className="bg-gray-100 rounded-lg p-2">
                          <iframe
                            src={domiciliationForm.idCardFile}
                            className="w-full h-32 border-0 rounded"
                            style={{ maxWidth: '100%', maxHeight: '128px' }}
                            title="Aperçu carte d'identité"
                            onError={() => {
                              setError('Impossible de charger l\'aperçu de la carte d\'identité');
                              setTimeout(() => setError(''), 5000);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="bg-gray-100 rounded-lg p-2">
                          <img
                            src={domiciliationForm.idCardFile}
                            alt="Aperçu carte d'identité"
                            className="w-full h-32 object-contain rounded"
                            style={{ maxWidth: '100%', maxHeight: '128px' }}
                            onError={() => {
                              setError('Impossible de charger l\'aperçu de la carte d\'identité');
                              setTimeout(() => setError(''), 5000);
                              setTimeout(() => setError(''), 5000);
                            }}
                          />
                        </div>
                      )}
                    </div>
                    )}
                    
                    {/* Boutons d'action */}
                    <div className="flex gap-2">
                      {!isApproved && isEditing && (
                        <>
                          {/* Upload multiple */}
                          <div className="flex items-center">
                            <input
                              type="file"
                              id="idCardFiles"
                              accept="image/*,.pdf"
                              multiple
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                files.forEach(file => handleFileUpload('idCardFiles', file));
                              }}
                              className="hidden"
                            />
                      <Button
                        size="sm"
                        variant="outline"
                              onClick={() => document.getElementById('idCardFiles')?.click()}
                              disabled={saving}
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            >
                              {saving ? 'Upload...' : 'Ajouter'}
                      </Button>
                          </div>
                          {/* Upload simple (legacy) */}
                        <div className="flex items-center">
                          <input
                            type="file"
                            id="idCardFile"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload('idCardFile', file);
                            }}
                            className="hidden"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById('idCardFile')?.click()}
                            disabled={saving}
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            {saving ? 'Upload...' : 'Remplacer'}
                          </Button>
                        </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500 text-sm mb-3">Aucun document uploadé</p>
                    {!isApproved && isEditing && (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id="idCardFiles"
                          accept="image/*,.pdf"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            files.forEach(file => handleFileUpload('idCardFiles', file));
                          }}
                          className="hidden"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => document.getElementById('idCardFiles')?.click()}
                          disabled={saving}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          {saving ? 'Upload...' : 'Ajouter'}
                        </Button>
                        <input
                          type="file"
                          id="idCardFile"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload('idCardFile', file);
                          }}
                          className="hidden"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => document.getElementById('idCardFile')?.click()}
                          disabled={saving}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          {saving ? 'Upload...' : 'Upload'}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Justificatif de domicile */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-5 h-5 text-red-600" />
                  <span className="font-medium">Justificatif de domicile</span>
                </div>
                
                {/* Affichage des listes de fichiers multiples */}
                {(domiciliationForm.domicileProofFiles && domiciliationForm.domicileProofFiles.length > 0) || domiciliationForm.domicileProofFile ? (
                  <>
                    {/* Aperçu des documents multiples */}
                    {domiciliationForm.domicileProofFiles && domiciliationForm.domicileProofFiles.length > 0 ? (
                    <div className="mb-3">
                        <p className="text-xs text-green-600 mb-2">✓ {domiciliationForm.domicileProofFiles.length} justificatif(s) enregistré(s)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {domiciliationForm.domicileProofFiles.map((url: string, index: number) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-3 border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-700">Justif. {index + 1}</span>
                                {!isApproved && isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFile('domicileProofFiles', index)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                )}
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
                                  <FileText className="w-6 h-6 mb-1" />
                                  <span>Aperçu indisponible</span>
                                </div>
                              </div>
                              {/* Boutons d'action */}
                              <div className="mt-2 flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(url);
                                      if (!res.ok) throw new Error('Téléchargement impossible');
                                      const blob = await res.blob();
                                      const contentType = blob.type || res.headers.get('Content-Type') || '';
                                      const ext = contentType.includes('pdf') ? '.pdf' : contentType.includes('png') ? '.png' : contentType.includes('jpeg') || contentType.includes('jpg') ? '.jpg' : '';
                                      const downloadUrl = window.URL.createObjectURL(blob);
                                      const link = document.createElement('a');
                                      link.href = downloadUrl;
                                      link.download = `justificatif-domicile-${index + 1}${ext}`;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      window.URL.revokeObjectURL(downloadUrl);
                                    } catch (error) {
                                      console.error('Erreur téléchargement:', error);
                                      setError('Erreur lors du téléchargement');
                                      setTimeout(() => setError(''), 5000);
                                    }
                                  }}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Télécharger
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Fallback pour l'ancien système */
                      <div className="mb-3">
                        {domiciliationForm.domicileProofFile?.toLowerCase().includes('.pdf') ? (
                        <div className="bg-gray-100 rounded-lg p-2">
                          <iframe
                            src={domiciliationForm.domicileProofFile}
                            className="w-full h-32 border-0 rounded"
                            style={{ maxWidth: '100%', maxHeight: '128px' }}
                            title="Aperçu justificatif de domicile"
                            onError={() => {
                              setError('Impossible de charger l\'aperçu du justificatif de domicile');
                              setTimeout(() => setError(''), 5000);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="bg-gray-100 rounded-lg p-2">
                          <img
                            src={domiciliationForm.domicileProofFile}
                            alt="Aperçu justificatif de domicile"
                            className="w-full h-32 object-contain rounded"
                            style={{ maxWidth: '100%', maxHeight: '128px' }}
                            onError={() => {
                              setError('Impossible de charger l\'aperçu du justificatif de domicile');
                              setTimeout(() => setError(''), 5000);
                            }}
                          />
                        </div>
                      )}
                    </div>
                    )}
                    
                    {/* Boutons d'action */}
                    <div className="flex gap-2">
                      {!isApproved && isEditing && (
                        <>
                          {/* Upload multiple */}
                          <div className="flex items-center">
                            <input
                              type="file"
                              id="domicileProofFiles"
                              accept="image/*,.pdf"
                              multiple
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                files.forEach(file => handleFileUpload('domicileProofFiles', file));
                              }}
                              className="hidden"
                            />
                      <Button
                        size="sm"
                        variant="outline"
                              onClick={() => document.getElementById('domicileProofFiles')?.click()}
                              disabled={saving}
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            >
                              {saving ? 'Upload...' : 'Ajouter'}
                      </Button>
                          </div>
                          {/* Upload simple (legacy) */}
                        <div className="flex items-center">
                          <input
                            type="file"
                            id="domicileProofFile"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload('domicileProofFile', file);
                            }}
                            className="hidden"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById('domicileProofFile')?.click()}
                            disabled={saving}
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            {saving ? 'Upload...' : 'Remplacer'}
                          </Button>
                        </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500 text-sm mb-3">Aucun document uploadé</p>
                    {!isApproved && isEditing && (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id="domicileProofFiles"
                          accept="image/*,.pdf"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            files.forEach(file => handleFileUpload('domicileProofFiles', file));
                          }}
                          className="hidden"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => document.getElementById('domicileProofFiles')?.click()}
                          disabled={saving}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          {saving ? 'Upload...' : 'Ajouter'}
                        </Button>
                        <input
                          type="file"
                          id="domicileProofFile"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload('domicileProofFile', file);
                          }}
                          className="hidden"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => document.getElementById('domicileProofFile')?.click()}
                          disabled={saving}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          {saving ? 'Upload...' : 'Upload'}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* KBIS - Uniquement pour les entreprises */}
          {domiciliationForm.legalForm !== 'Particulier' && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents entreprise (KBIS/Statuts)
              </h3>

              <div className="grid grid-cols-1 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <span className="font-medium">Extrait KBIS ou statuts</span>
                  </div>

                  {/* Affichage des KBIS existants */}
                  {domiciliationForm.kbisFiles && domiciliationForm.kbisFiles.length > 0 ? (
                    <>
                      <div className="mb-3">
                        <p className="text-xs text-green-600 mb-2">✓ {domiciliationForm.kbisFiles.length} document(s) enregistré(s)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {domiciliationForm.kbisFiles.map((url: string, index: number) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-3 border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-700">KBIS {index + 1}</span>
                                {!isApproved && isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFile('kbisFiles', index)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              {/* Aperçu du document */}
                              <div className="w-full h-24 bg-gray-100 rounded border overflow-hidden">
                                {url.toLowerCase().includes('.pdf') ? (
                                  <iframe
                                    src={url}
                                    className="w-full h-full border-0"
                                    title={`Aperçu KBIS ${index + 1}`}
                                  />
                                ) : (
                                  <img
                                    src={url}
                                    alt={`Aperçu KBIS ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      target.nextElementSibling!.classList.remove('hidden');
                                    }}
                                  />
                                )}
                                <div className="hidden flex items-center justify-center h-full text-gray-500 text-xs">
                                  <FileText className="w-6 h-6 mb-1" />
                                  <span>Aperçu indisponible</span>
                                </div>
                              </div>
                              {/* Boutons d'action */}
                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownloadDocument(url, `kbis-${index + 1}`)}
                                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Télécharger
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {!isApproved && isEditing && (
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id="kbisFiles"
                            accept=".pdf,.jpg,.jpeg,.png"
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              files.forEach(file => handleFileUpload('kbisFiles', file));
                            }}
                            className="hidden"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById('kbisFiles')?.click()}
                            disabled={saving}
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            {saving ? 'Upload...' : 'Ajouter'}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500 text-sm mb-3">Aucun document uploadé</p>
                      {!isApproved && isEditing && (
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id="kbisFiles"
                            accept=".pdf,.jpg,.jpeg,.png"
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              files.forEach(file => handleFileUpload('kbisFiles', file));
                            }}
                            className="hidden"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById('kbisFiles')?.click()}
                            disabled={saving}
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            {saving ? 'Upload...' : 'Ajouter'}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Signature du domiciliataire */}
          {(domiciliationForm.signature || entrepriseInfo?.cachetSignature || (!isApproved && isEditing)) && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Signature du domiciliataire
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {domiciliationForm.signature && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Signature du client</span>
                    </div>
                    
                    {/* Aperçu de la signature */}
                    <div className="mb-3">
                      {domiciliationForm.signature.toLowerCase().includes('.pdf') ? (
                        <div className="bg-gray-100 rounded-lg p-2">
                          <iframe
                            src={domiciliationForm.signature}
                            className="w-full h-32 border-0 rounded"
                            style={{ maxWidth: '100%', maxHeight: '128px' }}
                            title="Aperçu signature client"
                            onError={() => {
                              setError('Impossible de charger l\'aperçu de la signature');
                              setTimeout(() => setError(''), 5000);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="bg-gray-100 rounded-lg p-2">
                          <img
                            src={domiciliationForm.signature}
                            alt="Aperçu signature client"
                            className="w-full h-32 object-contain rounded"
                            style={{ maxWidth: '100%', maxHeight: '128px' }}
                            onError={() => {
                              setError('Impossible de charger l\'aperçu de la signature');
                              setTimeout(() => setError(''), 5000);
                            }}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(domiciliationForm.signature!, 'Signature du client')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Voir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDocument(domiciliationForm.signature!, 'signature-client.pdf')}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Télécharger
                      </Button>
                      {!isApproved && isEditing && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowSignaturePad(true)}
                            disabled={saving}
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            Signer à la main
                          </Button>
                          <input
                            type="file"
                            id="signatureUpload"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleSignatureUpload(file);
                            }}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById('signatureUpload')?.click()}
                            disabled={saving}
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            {saving ? 'Upload...' : 'Remplacer la signature'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {entrepriseInfo?.cachetSignature && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Cachet/Signature du domiciliataire</span>
                    </div>
                    
                    {/* Aperçu du cachet/signature */}
                    <div className="mb-3">
                      {entrepriseInfo.cachetSignature.toLowerCase().includes('.pdf') ? (
                        <div className="bg-gray-100 rounded-lg p-2">
                          <iframe
                            src={entrepriseInfo.cachetSignature}
                            className="w-full h-32 border-0 rounded"
                            style={{ maxWidth: '100%', maxHeight: '128px' }}
                            title="Aperçu cachet domiciliataire"
                            onError={() => {
                              setError('Impossible de charger l\'aperçu du cachet');
                              setTimeout(() => setError(''), 5000);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="bg-gray-100 rounded-lg p-2">
                          <img
                            src={entrepriseInfo.cachetSignature}
                            alt="Aperçu cachet domiciliataire"
                            className="w-full h-32 object-contain rounded"
                            style={{ maxWidth: '100%', maxHeight: '128px' }}
                            onError={() => {
                              setError('Impossible de charger l\'aperçu du cachet');
                              setTimeout(() => setError(''), 5000);
                            }}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(entrepriseInfo.cachetSignature!, 'Cachet du domiciliataire')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Voir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDocument(entrepriseInfo.cachetSignature!, 'cachet-domiciliataire.pdf')}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Télécharger
                      </Button>
                    </div>
                  </div>
                )}

                {/* Ajouter une signature si absente */}
                {!domiciliationForm.signature && (!isApproved && isEditing) && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Ajouter une signature</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Téléversez votre signature (image ou PDF).</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowSignaturePad(true)}
                        disabled={saving}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        Signer à la main
                      </Button>
                      {isEditing && (
                        <input
                          type="file"
                          id="signatureAdd"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleSignatureUpload(file);
                          }}
                        />
                      )}
                      {isEditing && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => document.getElementById('signatureAdd')?.click()}
                          disabled={saving}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          {saving ? 'Upload...' : 'Ajouter une signature'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contrat de domiciliation - Affiché même si en attente */}
          {domiciliationForm.contratPdf && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Contrat de domiciliation
              </h3>
              
              <div className="border border-gray-200 rounded-lg p-4">
                {isApproved ? (
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-red-600" />
                  <div>
                    <span className="font-medium">Contrat de domiciliation signé</span>
                      <p className="text-sm text-gray-500">Contrat approuvé et en vigueur</p>
                  </div>
                </div>
                ) : (
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-6 h-6 text-orange-600" />
                    <div>
                      <span className="font-medium">Contrat en attente d'approbation</span>
                      <p className="text-sm text-gray-500">Prévisualisation du contrat en attente d'approbation</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await handleViewDocument(domiciliationForm.contratPdf!, 'Contrat de domiciliation');
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Voir le contrat
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleDownloadDocument(
                        domiciliationForm.contratPdf!,
                        buildDomiciliationFilename(
                          "contrat",
                          domiciliationForm,
                          domiciliationForm?.createdAt ? new Date(domiciliationForm.createdAt) : new Date()
                        )
                      )
                    }
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Informations de date */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Informations de date
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="createdAt">Date de création</Label>
                <Input
                  id="createdAt"
                  value={new Date(domiciliationForm.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  disabled={true}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="updatedAt">Dernière modification</Label>
                <Input
                  id="updatedAt"
                  value={new Date(domiciliationForm.updatedAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  disabled={true}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Statut et actions */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Statut et actions
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant={isApproved ? 'default' : 'secondary'}>
                  {isApproved ? 'Approuvé' : 'En attente d\'approbation'}
                </Badge>
                <span className="text-sm text-gray-600">
                  {isApproved 
                    ? 'Votre contrat de domiciliation est approuvé et en vigueur'
                    : 'Votre demande est en cours d\'examen par nos services'
                  }
                </span>
              </div>
              
              {!isApproved && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">En attente d'approbation</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Votre formulaire de domiciliation est en cours d'examen. 
                        Vous recevrez une notification dès que votre demande sera approuvée.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {isApproved && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-900">Contrat approuvé</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Votre contrat de domiciliation est approuvé et en vigueur. 
                        Vous pouvez télécharger votre contrat signé ci-dessus.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal pour afficher les documents */}
      {showDocumentModal && currentDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header de la modal */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {currentDocument.title}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Contenu de la modal */}
            <div className="flex-1 p-4 overflow-auto">
              {currentDocument.url.toLowerCase().includes('.pdf') ? (
                <div className="w-full h-full min-h-[500px]">
                  <iframe
                    src={currentDocument.url}
                    className="w-full h-full min-h-[500px] border-0"
                    title={currentDocument.title}
                    onError={() => {
                      setError('Impossible de charger le PDF. Vérifiez que le document est accessible.');
                      setTimeout(() => setError(''), 5000);
                    }}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={currentDocument.url}
                    alt={currentDocument.title}
                    className="w-full h-auto max-h-full object-contain"
                    onError={() => {
                      setError('Impossible de charger l\'image. Vérifiez que le document est accessible.');
                      setTimeout(() => setError(''), 5000);
                    }}
                  />
                </div>
              )}
            </div>
            
            {/* Footer avec bouton de téléchargement */}
            <div className="p-4 border-t flex justify-end">
              <Button
                onClick={() => {
                  const filename = currentDocument.title === 'Pièce d\'identité' 
                    ? 'piece-identite.pdf' 
                    : 'justificatif-domicile.pdf';
                  handleDownloadDocument(currentDocument.url, filename);
                }}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Télécharger
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Signature manuscrite */}
      {showSignaturePad && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Signature manuscrite</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSignaturePad(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4">
              <div className="border rounded-lg bg-gray-50">
                <div className="p-2 text-xs text-gray-600">Signez ci-dessous avec votre souris ou votre doigt (mobile)</div>
                <div
                  className="w-full"
                  onMouseDown={(e) => startDrawing(e.nativeEvent)}
                  onMouseMove={(e) => drawStroke(e.nativeEvent)}
                  onMouseUp={endDrawing}
                  onMouseLeave={endDrawing}
                  onTouchStart={(e) => startDrawing(e.nativeEvent)}
                  onTouchMove={(e) => drawStroke(e.nativeEvent)}
                  onTouchEnd={endDrawing}
                >
                  <canvas ref={signatureCanvasRef} className="w-full block" style={{ touchAction: 'none' }} />
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-between gap-2 flex-wrap">
              <Button variant="outline" onClick={clearSignature}>Effacer</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowSignaturePad(false)}>Annuler</Button>
                <Button onClick={saveSignature} className="bg-green-600 hover:bg-green-700 text-white">Enregistrer</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
