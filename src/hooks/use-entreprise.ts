import { useState, useEffect } from 'react';

export interface Entreprise {
  _id?: string;
  siteId?: string;
  photo?: string;
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
  siegeDifferent?: boolean;
  adresseSiege?: {
    adresse?: string;
    codePostal?: string;
    ville?: string;
    pays?: string;
  };
  description?: string;
  logo?: string;
  cachetSignature?: string;
  kbis?: string;
  agrementPrefectoral?: string;
  villeRcs?: string;
  siren?: string;
  arreteActivite?: string;
  tauxCommission?: number;
  tauxCommissionClientsExistants?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const useEntreprise = (siteId: string) => {
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    const fetchEntreprise = async () => {
      if (!siteId) {
        console.log("❌ Pas de siteId fourni");
        setLoading(false);
        return;
      }

      try {
        console.log("🔄 Chargement entreprise pour siteId:", siteId);
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/sharedServices/entreprise?siteId=${siteId}`);
        console.log("📡 Response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const entreprises = await response.json();
        console.log("📦 Entreprises reçues:", entreprises.length);
        
        if (entreprises.length > 0) {
          console.log("✅ Entreprise trouvée:", entreprises[0]._id);
          setEntreprise(entreprises[0]); // Prendre la première entreprise du site
          setIsNew(false);
        } else {
          console.log("🆕 Création entreprise par défaut");
          // Créer une entreprise par défaut si elle n'existe pas
          const defaultEntreprise: Entreprise = {
            siteId,
            nom: "Mon Entreprise de Domiciliation",
            telephone: "",
            email: "",
            nomRepresentant: "",
            dateCreation: "",
            dateAgrement: "",
            adresseCentreAffaires: {
              adresse: "",
              codePostal: "",
              ville: "",
              pays: "France"
            },
            siegeDifferent: false,
            adresseSiege: {
              adresse: "",
              codePostal: "",
              ville: "",
              pays: "France"
            },
            description: "",
            logo: "",
            cachetSignature: "",
            kbis: "",
            agrementPrefectoral: "",
            villeRcs: "",
            siren: "",
            arreteActivite: "",
            tauxCommission: 0,
            tauxCommissionClientsExistants: 0
          };
          setEntreprise(defaultEntreprise);
          setIsNew(true);
        }
      } catch (err) {
        console.error('❌ Erreur lors de la récupération de l\'entreprise:', err);
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchEntreprise();
  }, [siteId]);

  const saveEntreprise = async (data: Partial<Entreprise>) => {
    if (!siteId) {
      console.log("❌ Pas de siteId pour sauvegarder");
      return false;
    }

    try {
      console.log("💾 Sauvegarde entreprise...");
      console.log("📤 Données à sauvegarder:", data);
      console.log("🔍 Champ nomRepresentant dans les données:", data.nomRepresentant);
      console.log("🆕 Est nouvelle entreprise:", isNew);
      console.log("🆔 ID existant:", entreprise?._id);
      
      setLoading(true);
      setError(null);

      let response;
      const requestData = { ...data, siteId };

      if (!isNew && entreprise?._id && entreprise._id !== '') {
        console.log("🔄 Mise à jour entreprise existante:", entreprise._id);
        // Mettre à jour l'entreprise existante
        response = await fetch(`/api/sharedServices/entreprise/${entreprise._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });
      } else {
        console.log("🆕 Création nouvelle entreprise");
        console.log("📤 Données POST:", requestData);
        // Créer une nouvelle entreprise
        response = await fetch('/api/sharedServices/entreprise', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });
      }

      console.log("📡 Response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Erreur API:", errorData);
        throw new Error(errorData.error || errorData.details || 'Erreur lors de la sauvegarde');
      }

      const savedEntreprise = await response.json();
      console.log("✅ Entreprise sauvegardée:", savedEntreprise._id);
      setEntreprise(savedEntreprise);
      setIsNew(false);
      return true;
    } catch (err) {
      console.error('❌ Erreur saveEntreprise:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshEntreprise = async () => {
    if (!siteId) {
      console.log("❌ Pas de siteId pour rafraîchir");
      return;
    }

    try {
      console.log("🔄 Rafraîchissement entreprise pour siteId:", siteId);
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/sharedServices/entreprise?siteId=${siteId}`);
      console.log("📡 Response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const entreprises = await response.json();
      console.log("📦 Entreprises reçues:", entreprises.length);
      
      if (entreprises.length > 0) {
        console.log("✅ Entreprise rafraîchie:", entreprises[0]._id);
        setEntreprise(entreprises[0]);
        setIsNew(false);
      } else {
        console.log("🆕 Création entreprise par défaut");
        const defaultEntreprise: Entreprise = {
          siteId,
          nom: "Mon Entreprise de Domiciliation",
          telephone: "",
          email: "",
          nomRepresentant: "",
          dateCreation: "",
          dateAgrement: "",
          adresseCentreAffaires: {
            adresse: "",
            codePostal: "",
            ville: "",
            pays: "France"
          },
          siegeDifferent: false,
          adresseSiege: {
            adresse: "",
            codePostal: "",
            ville: "",
            pays: "France"
          },
          description: "",
          logo: "",
          cachetSignature: "",
          kbis: "",
          agrementPrefectoral: "",
          villeRcs: "",
          siren: "",
          arreteActivite: "",
          tauxCommission: 0,
          tauxCommissionClientsExistants: 0
        };
        setEntreprise(defaultEntreprise);
        setIsNew(true);
      }
    } catch (err) {
      console.error('❌ Erreur lors du rafraîchissement de l\'entreprise:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return { entreprise, loading, error, saveEntreprise, refreshEntreprise };
}; 