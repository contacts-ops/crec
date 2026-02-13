"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEntreprise } from "@/hooks/use-entreprise";
import {
  Building,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  Upload,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  Users,
  Eye,
  FileCheck
} from "lucide-react";

interface AdminEntrepriseTemplateProps {
  siteId?: string;
  editableElements?: {
    [key: string]: string;
  };
}

export default function AdminEntrepriseTemplate({
  siteId,
  editableElements = {}
}: AdminEntrepriseTemplateProps) {
  const [success, setSuccess] = useState<string>("");
  const [uploadingFiles, setUploadingFiles] = useState<{[key: string]: boolean}>({});
  const [localEntreprise, setLocalEntreprise] = useState<any>(null);
  const {
    entreprise,
    loading: isLoading,
    error,
    saveEntreprise,
    refreshEntreprise
  } = useEntreprise(siteId || "");
  // Synchroniser l'état local avec les données du hook
  useEffect(() => {
    if (entreprise) {
      setLocalEntreprise(entreprise);
    }
  }, [entreprise]);
  const handleInputChange = (field: string, value: any) => {
    if (!localEntreprise) return;
    
    console.log(`🔄 Modification champ ${field}:`, value);
    // Mise à jour locale immédiate pour l'UI seulement
    const updatedEntreprise = {
      ...localEntreprise,
      [field]: value
    };
    
    setLocalEntreprise(updatedEntreprise);
    // Pas de sauvegarde automatique - seulement mise à jour locale
  };

  const handleAddressChange = (type: 'centreAffaires' | 'siege', field: string, value: string) => {
    if (!localEntreprise) return;
    
    console.log(`🔄 Modification adresse ${type}.${field}:`, value);
    const updatedEntreprise = {
      ...localEntreprise,
      [`adresse${type === 'centreAffaires' ? 'CentreAffaires' : 'Siege'}`]: {
        ...localEntreprise[`adresse${type === 'centreAffaires' ? 'CentreAffaires' : 'Siege'}`],
        [field]: value
      }
    };
    
    setLocalEntreprise(updatedEntreprise);
    // Pas de sauvegarde automatique - seulement mise à jour locale
  };

  const handleFileUpload = async (field: string, file: File) => {
    if (!siteId) {
      console.error("SiteId manquant pour l'upload");
      setSuccess("Erreur: SiteId manquant");
      return;
    }

    setUploadingFiles(prev => ({ ...prev, [field]: true }));
    try {
      console.log(`📁 Upload fichier ${field}:`, file.name);
      // Créer FormData pour l'upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('field', field);
      formData.append('siteId', siteId);
      // Appeler l'API d'upload
      const response = await fetch('/api/sharedServices/entreprise/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'upload');
      }

      const result = await response.json();
      console.log(`✅ Upload réussi pour ${field}:`, result);
      // Mettre à jour l'état local avec l'URL du fichier
      if (result.url && localEntreprise) {
        const updatedEntreprise = {
          ...localEntreprise,
          [field]: result.url
        };
        setLocalEntreprise(updatedEntreprise);
      }

      setSuccess(`Fichier ${field} uploadé avec succès`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Erreur upload:", err);
      setSuccess(`Erreur lors de l'upload: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      setTimeout(() => setSuccess(""), 5000);
    } finally {
      setUploadingFiles(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleSave = async () => {
    if (!localEntreprise) return;

    try {
      console.log("💾 Sauvegarde manuelle...");
      console.log("💾 Données à sauvegarder:", localEntreprise);
      console.log("🔍 Champ nomRepresentant dans localEntreprise:", localEntreprise.nomRepresentant);
      console.log("🔍 SiteId:", siteId);
      console.log("🔍 Entreprise ID:", entreprise?._id);
      console.log("🔍 Est nouvelle entreprise:", !entreprise?._id);
      const success = await saveEntreprise(localEntreprise);
      console.log("🔍 Résultat de la sauvegarde:", success);
      if (success) {
        setSuccess("Informations de l'entreprise sauvegardées avec succès");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setSuccess("Erreur lors de la sauvegarde");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde manuelle:', err);
      setSuccess("Erreur lors de la sauvegarde: " + (err instanceof Error ? err.message : 'Erreur inconnue'));
      setTimeout(() => setSuccess(""), 5000);
    }
  };

  const handleRefresh = async () => {
    // Rafraîchir uniquement les données
    await refreshEntreprise();
    setSuccess("Données rafraîchies avec succès");
    setTimeout(() => setSuccess(""), 2000);
  };

  // Si pas d'entreprise, afficher un loading
  if (!localEntreprise) {
    return (
      <div className="p-6" data-type="service">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Chargement...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-type="service">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Configuration de l'Entreprise
            </h2>
            <p className="text-gray-600">
              Gestion des informations de votre entreprise de domiciliation.
            </p>
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
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Sauvegarder
          </button>
        </div>

        {/* Formulaire */}
        <div className="space-y-6">
          {/* Informations de base */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5" />
              Informations de base
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nom">Nom de l'entreprise</Label>
                <Input
                  id="nom"
                  value={localEntreprise.nom || ""}
                  onChange={(e) => handleInputChange('nom', e.target.value)}
                  placeholder="Nom de votre entreprise"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={localEntreprise.telephone || ""}
                  onChange={(e) => handleInputChange('telephone', e.target.value)}
                  placeholder="01 23 45 67 89"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={localEntreprise.email || ""}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contact@entreprise.com"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="nomRepresentant">Nom du représentant</Label>
                <Input
                  id="nomRepresentant"
                  value={localEntreprise.nomRepresentant || ""}
                  onChange={(e) => handleInputChange('nomRepresentant', e.target.value)}
                  placeholder="Nom du représentant légal"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="siren">Numéro SIREN</Label>
                <Input
                  id="siren"
                  value={localEntreprise.siren || ""}
                  onChange={(e) => handleInputChange('siren', e.target.value)}
                  placeholder="123456789"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="dateCreation">Date de création</Label>
                <Input
                  id="dateCreation"
                  type="date"
                  value={localEntreprise.dateCreation || ""}
                  onChange={(e) => handleInputChange('dateCreation', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="dateAgrement">Date d'agrément préfectoral</Label>
                <Input
                  id="dateAgrement"
                  type="date"
                  value={localEntreprise.dateAgrement || ""}
                  onChange={(e) => handleInputChange('dateAgrement', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Adresses */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Adresses
            </h3>
            
            {/* Adresse du centre d'affaires */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-800 mb-3">Adresse du centre d'affaires</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="adresseCentre">Adresse</Label>
                  <Input
                    id="adresseCentre"
                    value={localEntreprise.adresseCentreAffaires?.adresse || ""}
                    onChange={(e) => handleAddressChange('centreAffaires', 'adresse', e.target.value)}
                    placeholder="123 Rue de la Paix"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="codePostalCentre">Code postal</Label>
                  <Input
                    id="codePostalCentre"
                    value={localEntreprise.adresseCentreAffaires?.codePostal || ""}
                    onChange={(e) => handleAddressChange('centreAffaires', 'codePostal', e.target.value)}
                    placeholder="75001"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="villeCentre">Ville</Label>
                  <Input
                    id="villeCentre"
                    value={localEntreprise.adresseCentreAffaires?.ville || ""}
                    onChange={(e) => handleAddressChange('centreAffaires', 'ville', e.target.value)}
                    placeholder="Paris"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="paysCentre">Pays</Label>
                  <Input
                    id="paysCentre"
                    value={localEntreprise.adresseCentreAffaires?.pays || ""}
                    onChange={(e) => handleAddressChange('centreAffaires', 'pays', e.target.value)}
                    placeholder="France"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Siège différent */}
            <div className="flex items-center space-x-2 mb-4">
              <Switch
                id="siegeDifferent"
                checked={localEntreprise.siegeDifferent || false}
                onCheckedChange={(checked) => handleInputChange('siegeDifferent', checked)}
              />
              <Label htmlFor="siegeDifferent">Siège social différent</Label>
            </div>

            {localEntreprise.siegeDifferent && (
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-800 mb-3">Adresse du siège social</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="adresseSiege">Adresse</Label>
                    <Input
                      id="adresseSiege"
                      value={localEntreprise.adresseSiege?.adresse || ""}
                      onChange={(e) => handleAddressChange('siege', 'adresse', e.target.value)}
                      placeholder="123 Rue du Siège"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="codePostalSiege">Code postal</Label>
                    <Input
                      id="codePostalSiege"
                      value={localEntreprise.adresseSiege?.codePostal || ""}
                      onChange={(e) => handleAddressChange('siege', 'codePostal', e.target.value)}
                      placeholder="75001"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="villeSiege">Ville</Label>
                    <Input
                      id="villeSiege"
                      value={localEntreprise.adresseSiege?.ville || ""}
                      onChange={(e) => handleAddressChange('siege', 'ville', e.target.value)}
                      placeholder="Paris"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="paysSiege">Pays</Label>
                    <Input
                      id="paysSiege"
                      value={localEntreprise.adresseSiege?.pays || ""}
                      onChange={(e) => handleAddressChange('siege', 'pays', e.target.value)}
                      placeholder="France"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Informations légales */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Informations légales
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="villeRcs">Ville du RCS</Label>
                <Input
                  id="villeRcs"
                  value={localEntreprise.villeRcs || ""}
                  onChange={(e) => handleInputChange('villeRcs', e.target.value)}
                  placeholder="Paris"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="arreteActivite">N° d'arrêté d'activité</Label>
                <Input
                  id="arreteActivite"
                  value={localEntreprise.arreteActivite || ""}
                  onChange={(e) => handleInputChange('arreteActivite', e.target.value)}
                  placeholder="2024-001"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Gestion des formulaires de domiciliation */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Formulaires de domiciliation
            </h3>

            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Gestion des demandes de domiciliation</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Consultez et gérez les formulaires soumis par les clients (Particuliers, SCI, Entreprises).
                      Visualisez les contrats, attestations et documents justificatifs.
                    </p>
                  </div>
                  <button
                    onClick={() => window.open('/componentsManager', '_blank')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Voir les formulaires
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <FileText className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium text-orange-900">Contrats</p>
                      <p className="text-xs text-orange-700">Générés automatiquement</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <FileCheck className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Attestations</p>
                      <p className="text-xs text-blue-700">Envoyées par email</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-purple-900">KBIS</p>
                      <p className="text-xs text-purple-700">Pour entreprises uniquement</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upload de fichiers */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Documents et images
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="photo">Photo de l'entreprise</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload('photo', file);
                  }}
                  className="mt-1"
                />
                {uploadingFiles.photo && (
                  <p className="text-sm text-blue-600 mt-1">Upload en cours...</p>
                )}
                {localEntreprise.photo && (
                  <>
                    <p className="text-sm text-green-600 mt-1">✓ Photo uploadée</p>
                    <div className="mt-2">
                      {String(localEntreprise.photo).toLowerCase().includes('.pdf') ? (
                        <iframe
                          src={localEntreprise.photo}
                          className="w-full h-40 border rounded"
                          title="Aperçu photo"
                        />
                      ) : (
                        <img
                          src={localEntreprise.photo}
                          alt="Aperçu photo"
                          className="h-24 object-contain border rounded"
                        />
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" onClick={() => window.open(localEntreprise.photo, '_blank')}>Voir</Button>
                        <Button
                          variant="outline"
                          onClick={() => { const a = document.createElement('a'); a.href = localEntreprise.photo; a.download = 'photo'; document.body.appendChild(a); a.click(); a.remove(); }}
                        >Télécharger</Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div>
                <Label htmlFor="logo">Logo</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload('logo', file);
                  }}
                  className="mt-1"
                />
                {uploadingFiles.logo && (
                  <p className="text-sm text-blue-600 mt-1">Upload en cours...</p>
                )}
                {localEntreprise.logo && (
                  <>
                    <p className="text-sm text-green-600 mt-1">✓ Logo uploadé</p>
                    <div className="mt-2">
                      {String(localEntreprise.logo).toLowerCase().includes('.pdf') ? (
                        <iframe
                          src={localEntreprise.logo}
                          className="w-full h-40 border rounded"
                          title="Aperçu logo"
                        />
                      ) : (
                        <img
                          src={localEntreprise.logo}
                          alt="Aperçu logo"
                          className="h-24 object-contain border rounded"
                        />
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" onClick={() => window.open(localEntreprise.logo, '_blank')}>Voir</Button>
                        <Button
                          variant="outline"
                          onClick={() => { const a = document.createElement('a'); a.href = localEntreprise.logo; a.download = 'logo'; document.body.appendChild(a); a.click(); a.remove(); }}
                        >Télécharger</Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div>
                <Label htmlFor="cachetSignature">Cachet et signature</Label>
                <Input
                  id="cachetSignature"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload('cachetSignature', file);
                  }}
                  className="mt-1"
                />
                {uploadingFiles.cachetSignature && (
                  <p className="text-sm text-blue-600 mt-1">Upload en cours...</p>
                )}
                {localEntreprise.cachetSignature && (
                  <>
                    <p className="text-sm text-green-600 mt-1">✓ Cachet uploadé</p>
                    <div className="mt-2">
                      {String(localEntreprise.cachetSignature).toLowerCase().includes('.pdf') ? (
                        <iframe
                          src={localEntreprise.cachetSignature}
                          className="w-full h-40 border rounded"
                          title="Aperçu cachet"
                        />
                      ) : (
                        <img
                          src={localEntreprise.cachetSignature}
                          alt="Aperçu cachet"
                          className="h-24 object-contain border rounded"
                        />
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" onClick={() => window.open(localEntreprise.cachetSignature, '_blank')}>Voir</Button>
                        <Button
                          variant="outline"
                          onClick={() => { const a = document.createElement('a'); a.href = localEntreprise.cachetSignature; a.download = 'cachet-signature'; document.body.appendChild(a); a.click(); a.remove(); }}
                        >Télécharger</Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div>
                <Label htmlFor="kbis">KBIS</Label>
                <Input
                  id="kbis"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload('kbis', file);
                  }}
                  className="mt-1"
                />
                {uploadingFiles.kbis && (
                  <p className="text-sm text-blue-600 mt-1">Upload en cours...</p>
                )}
                {localEntreprise.kbis && (
                  <>
                    <p className="text-sm text-green-600 mt-1">✓ KBIS uploadé</p>
                    <div className="mt-2">
                      {String(localEntreprise.kbis).toLowerCase().includes('.pdf') ? (
                        <iframe
                          src={localEntreprise.kbis}
                          className="w-full h-40 border rounded"
                          title="Aperçu KBIS"
                        />
                      ) : (
                        <img
                          src={localEntreprise.kbis}
                          alt="Aperçu KBIS"
                          className="h-24 object-contain border rounded"
                        />
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" onClick={() => window.open(localEntreprise.kbis, '_blank')}>Voir</Button>
                        <Button
                          variant="outline"
                          onClick={() => { const a = document.createElement('a'); a.href = localEntreprise.kbis; a.download = 'kbis'; document.body.appendChild(a); a.click(); a.remove(); }}
                        >Télécharger</Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div>
                <Label htmlFor="agrementPrefectoral">Agrément préfectoral</Label>
                <Input
                  id="agrementPrefectoral"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload('agrementPrefectoral', file);
                  }}
                  className="mt-1"
                />
                {uploadingFiles.agrementPrefectoral && (
                  <p className="text-sm text-blue-600 mt-1">Upload en cours...</p>
                )}
                {localEntreprise.agrementPrefectoral && (
                  <>
                    <p className="text-sm text-green-600 mt-1">✓ Agrément uploadé</p>
                    <div className="mt-2">
                      {String(localEntreprise.agrementPrefectoral).toLowerCase().includes('.pdf') ? (
                        <iframe
                          src={localEntreprise.agrementPrefectoral}
                          className="w-full h-40 border rounded"
                          title="Aperçu agrément"
                        />
                      ) : (
                        <img
                          src={localEntreprise.agrementPrefectoral}
                          alt="Aperçu agrément"
                          className="h-24 object-contain border rounded"
                        />
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" onClick={() => window.open(localEntreprise.agrementPrefectoral, '_blank')}>Voir</Button>
                        <Button
                          variant="outline"
                          onClick={() => { const a = document.createElement('a'); a.href = localEntreprise.agrementPrefectoral; a.download = 'agrement-prefectoral'; document.body.appendChild(a); a.click(); a.remove(); }}
                        >Télécharger</Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 