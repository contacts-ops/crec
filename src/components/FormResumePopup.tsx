"use client";

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { FileText, X, Clock } from 'lucide-react';

interface PendingForm {
  _id: string;
  currentStep: number;
  status: string;
  legalForm: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  updatedAt: string;
}

export default function FormResumePopup() {
  const [showPopup, setShowPopup] = useState(false);
  const [pendingForm, setPendingForm] = useState<PendingForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier si l'utilisateur a un formulaire en cours
    const checkPendingForm = async () => {
      try {
        // Ne pas afficher si on est déjà sur la page du formulaire
        if (window.location.pathname.includes('/formulaire') ||
            window.location.pathname.includes('/form-dom')) {
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/formulaires/by-ip');
        const data = await response.json();

        if (data.success && data.forms && data.forms.length > 0) {
          const latestForm = data.forms[0];

          // Ne pas afficher si le formulaire est terminé
          if (latestForm.status === 'completed') {
            setIsLoading(false);
            return;
          }

          setPendingForm(latestForm);
          setShowPopup(true);
        }
      } catch (error) {
        console.warn('Erreur lors de la vérification des formulaires en cours:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Délai pour ne pas bloquer le chargement initial
    const timeoutId = setTimeout(checkPendingForm, 2000);

    return () => clearTimeout(timeoutId);
  }, []);

  const handleResume = () => {
    if (pendingForm) {
      window.location.href = `/formulaire?form_id=${pendingForm._id}`;
    }
  };

  const handleDismiss = () => {
    setShowPopup(false);
    // Stocker dans sessionStorage pour ne plus afficher pendant cette session
    sessionStorage.setItem('formResumeDismissed', 'true');
  };

  const getFormTitle = () => {
    if (!pendingForm) return '';

    if (pendingForm.legalForm === 'Particulier') {
      return `${pendingForm.firstName || ''} ${pendingForm.lastName || ''}`.trim() || 'Formulaire personnel';
    } else {
      return pendingForm.companyName || 'Formulaire entreprise';
    }
  };

  const getStepLabel = (step: number) => {
    switch (step) {
      case 1: return 'Informations personnelles';
      case 2: return 'Adresse et documents';
      case 3: return 'Paiement et signature';
      default: return `Étape ${step}`;
    }
  };

  if (isLoading || !showPopup || !pendingForm) {
    return null;
  }

  // Vérifier si déjà masqué pendant cette session
  if (sessionStorage.getItem('formResumeDismissed')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="shadow-lg border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Formulaire en cours
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 hover:bg-blue-100"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {getFormTitle()}
              </p>
              <p className="text-xs text-gray-600">
                {getStepLabel(pendingForm.currentStep)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Modifié {new Date(pendingForm.updatedAt).toLocaleDateString('fr-FR')}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleResume}
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText className="w-3 h-3 mr-1" />
                Reprendre
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                size="sm"
                className="border-blue-200 hover:bg-blue-100"
              >
                Plus tard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
