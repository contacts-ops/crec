"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FileText,
  TrendingUp,
  Filter,
  Search,
  CheckCircle,
  Clock,
  Eye,
  Send
} from "lucide-react";

interface AdminVentesTemplateProps {
  siteId?: string;
  editableElements?: Record<string, any>;
}

interface Facture {
  id: string;
  numeroFacture: string;
  dateCreation: string;
  dateEcheance: string;
  datePaiement?: string;
  clientEmail: string;
  clientNom: string;
  produit: string;
  montantHT: number;
  montantTTC: number;
  tva: number;
  statut: 'payee' | 'impayee';
  stripePaymentId?: string;
  stripeInvoiceId?: string;
  moyenPaiement?: string;
}

export default function AdminVentesTemplate({
  siteId,
  editableElements = {}
}: AdminVentesTemplateProps) {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'toutes' | 'payees' | 'impayees'>('toutes');
  // Données de test pour l'affichage
  const mockFactures: Facture[] = [
    {
      id: "1",
      numeroFacture: "FAC-2024-001",
      dateCreation: "2024-01-15",
      dateEcheance: "2024-02-15",
      datePaiement: "2024-01-16",
      clientEmail: "client@example.com",
      clientNom: "Entreprise Alpha SARL",
      produit: "Domiciliation Standard",
      montantHT: 83.25,
      montantTTC: 99.90,
      tva: 16.65,
      statut: "payee",
      stripePaymentId: "pi_1234567890",
      stripeInvoiceId: "in_1234567890",
      moyenPaiement: "Carte bancaire"
    },
    {
      id: "2", 
      numeroFacture: "FAC-2024-002",
      dateCreation: "2024-01-14",
      dateEcheance: "2024-02-14",
      clientEmail: "entreprise@test.fr",
      clientNom: "Beta Consulting SAS",
      produit: "Domiciliation Premium",
      montantHT: 166.58,
      montantTTC: 199.90,
      tva: 33.32,
      statut: "impayee",
      stripeInvoiceId: "in_0987654321"
    },
    {
      id: "3",
      numeroFacture: "FAC-2024-003", 
      dateCreation: "2024-01-10",
      dateEcheance: "2024-01-25",
      clientEmail: "entreprise3@client.fr",
      clientNom: "Gamma Corp EURL",
      produit: "Bureau privatif",
      montantHT: 249.17,
      montantTTC: 299.00,
      tva: 49.83,
      statut: "impayee",
      stripeInvoiceId: "in_1111111111"
    },
    {
      id: "4",
      numeroFacture: "FAC-2024-004",
      dateCreation: "2024-01-20",
      dateEcheance: "2024-02-20",
      datePaiement: "2024-01-22",
      clientEmail: "delta@entreprise.com",
      clientNom: "Delta Industries SA",
      produit: "Pack Complet",
      montantHT: 415.83,
      montantTTC: 499.00,
      tva: 83.17,
      statut: "payee",
      stripePaymentId: "pi_2222222222",
      stripeInvoiceId: "in_2222222222",
      moyenPaiement: "Virement"
    }
  ];

  // Statistiques calculées
  const stats = {
    totalFactures: mockFactures.length,
    facturesPayees: mockFactures.filter(f => f.statut === 'payee').length,
    facturesImpayees: mockFactures.filter(f => f.statut === 'impayee').length,
    chiffreAffaires: mockFactures.filter(f => f.statut === 'payee').reduce((sum, facture) => sum + facture.montantTTC, 0),
    chiffreAffairesEnAttente: mockFactures.filter(f => f.statut === 'impayee').reduce((sum, facture) => sum + facture.montantTTC, 0),
    clientsActifs: new Set(mockFactures.map(f => f.clientEmail)).size,
    tauxPaiement: mockFactures.length > 0 ? (mockFactures.filter(f => f.statut === 'payee').length / mockFactures.length * 100) : 0
  };

  // Filtrer les factures selon l'onglet actif
  const filteredByTab = mockFactures.filter(facture => {
    switch (activeTab) {
      case 'payees':
        return facture.statut === 'payee';
      case 'impayees':
        return facture.statut === 'impayee';
      default:
        return true;
    }
  });
  // Filtrer selon le terme de recherche
  const filteredFactures = filteredByTab.filter(facture =>
    facture.clientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facture.clientNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facture.produit.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facture.numeroFacture.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facture.stripePaymentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facture.stripeInvoiceId?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleExportFactures = () => {
    // Logique d'export des factures
    console.log("Export des factures demandé");
    setShowExportDialog(false);
    // Ici, on pourrait générer un CSV ou PDF
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'payee':
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Payée
          </Badge>
        );
      case 'impayee':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Impayée
          </Badge>
        );
      default:
        return <Badge>Inconnue</Badge>;
    }
  };

  const handleRelanceClient = (factureId: string) => {
    console.log("Relance client pour facture:", factureId);
    // Ici, logique d'envoi de relance
  };

    return (
    <div className="p-6" data-type="service">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Gestion des Factures
              </h2>
              <p className="text-gray-600">
                Suivi des factures payées et impayées de vos services de domiciliation.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowExportDialog(true)}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exporter
              </Button>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">Total factures</h3>
                  <p className="text-2xl font-bold text-blue-700">{stats.totalFactures}</p>
                  <p className="text-sm text-blue-600">ce mois</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-green-900 mb-1">Factures payées</h3>
                  <p className="text-2xl font-bold text-green-700">{stats.facturesPayees}</p>
                  <p className="text-sm text-green-600">{stats.chiffreAffaires.toFixed(2)} €</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-yellow-900 mb-1">Factures impayées</h3>
                  <p className="text-2xl font-bold text-yellow-700">{stats.facturesImpayees}</p>
                  <p className="text-sm text-yellow-600">{stats.chiffreAffairesEnAttente.toFixed(2)} € en attente</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-purple-900 mb-1">Taux paiement</h3>
                  <p className="text-2xl font-bold text-purple-700">{stats.tauxPaiement.toFixed(1)}%</p>
                  <p className="text-sm text-purple-600">ce mois</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Onglets de filtrage */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <h3 className="font-medium text-gray-900">Filtrer par statut :</h3>
            <div className="flex gap-2">
              {[
                { key: 'toutes', label: 'Toutes', count: stats.totalFactures },
                { key: 'payees', label: 'Payées', count: stats.facturesPayees },
                { key: 'impayees', label: 'Impayées', count: stats.facturesImpayees }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par client, produit, n° facture ou ID Stripe..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
            </select>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtres
            </Button>
          </div>
        </div>

        {/* Liste des factures */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-4">
            Factures {activeTab !== 'toutes' ? `(${activeTab === 'payees' ? 'payées' : 'impayées'})` : ''}
          </h3>
          
          {filteredFactures.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Facture</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Montant TTC</TableHead>
                  <TableHead>Date création</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFactures.map((facture) => (
                  <TableRow key={facture.id}>
                    <TableCell className="font-medium">
                      {facture.numeroFacture}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{facture.clientNom}</div>
                        <div className="text-sm text-gray-500">{facture.clientEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>{facture.produit}</TableCell>
                    <TableCell className="font-medium">
                      {facture.montantTTC.toFixed(2)} €
                      <div className="text-xs text-gray-500">
                        HT: {facture.montantHT.toFixed(2)} € + TVA: {facture.tva.toFixed(2)} €
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(facture.dateCreation).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      {new Date(facture.dateEcheance).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>{getStatutBadge(facture.statut)}</TableCell>
                    <TableCell>
                      {facture.datePaiement ? (
                        <div>
                          <div className="text-sm font-medium text-green-600">
                            {new Date(facture.datePaiement).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="text-xs text-gray-500">{facture.moyenPaiement}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Voir
                        </Button>
                        {facture.statut === 'impayee' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleRelanceClient(facture.id)}
                            className="flex items-center gap-1 text-orange-600 hover:text-orange-700"
                          >
                            <Send className="w-3 h-3" />
                            Relancer
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchTerm 
                  ? "Aucune facture trouvée pour cette recherche" 
                  : activeTab === 'toutes' 
                    ? "Aucune facture pour le moment"
                    : `Aucune facture ${activeTab === 'payees' ? 'payée' : 'impayée'} pour le moment`
                }
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Les factures apparaîtront ici une fois qu'elles auront été générées
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Dialog d'export */}
              <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Exporter les factures</DialogTitle>
            </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Période d'export</Label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md">
                <option>Ce mois</option>
                <option>3 derniers mois</option>
                <option>6 derniers mois</option>
                <option>Cette année</option>
              </select>
            </div>
            <div>
              <Label>Format</Label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md">
                <option>CSV</option>
                <option>Excel (XLSX)</option>
                <option>PDF</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleExportFactures}>
              Exporter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 