'use client';

import React, { useState, useEffect } from 'react';
import { useContacts } from '../../hooks/use-contacts';
import { Eye, Mail, Clock, CheckCircle, MessageSquare, Search, Filter, RefreshCw } from 'lucide-react';

interface Contact {
  _id: string;
  name: string;
  firstName: string;
  email: string;
  subject: string;
  message: string;
  submittedAt: string;
  status: 'new' | 'read' | 'replied';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminContactProps {
  siteId?: string;
  editableElements?: {
    [key: string]: string;
  };
}

export default function AdminContact({
  siteId,
  editableElements = {}
}: AdminContactProps) {
  const { getContacts, updateContactStatus, loading, error } = useContacts();
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const itemsPerPage = 10;

  // Fonction pour récupérer les données
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await getContacts({
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter || undefined,
        search: searchTerm || undefined,
      });
      if (result) {
        setContacts(result.data);
        console.log("Contacts récupérés:", result.data);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des contacts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les données au montage et quand les filtres changent
  useEffect(() => {
    fetchData();
  }, [currentPage, statusFilter, searchTerm]);
  // Fonction pour mettre à jour le statut
  const handleStatusChange = async (id: string, newStatus: string) => {
    const success = await updateContactStatus(id, newStatus, adminNotes);
    if (success) {
      fetchData(); // Recharger les données
      setAdminNotes("");
      setIsModalOpen(false);
      setSelectedContact(null);
    }
  };

  // Fonction pour rafraîchir les données
  const handleRefreshData = () => {
    fetchData();
  };

  // Fonction pour ouvrir le modal de détails
  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setAdminNotes(contact.adminNotes || "");
    setIsModalOpen(true);
  };

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fonction pour obtenir la couleur du statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'read':
        return 'bg-yellow-100 text-yellow-800';
      case 'replied':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Fonction pour obtenir l'icône du statut
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <Mail className="w-4 h-4" />;
      case 'read':
        return <Eye className="w-4 h-4" />;
      case 'replied':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Fonction pour obtenir le texte du statut
  const getStatusText = (status: string) => {
    switch (status) {
      case 'new':
        return 'Nouveau';
      case 'read':
        return 'Lu';
      case 'replied':
        return 'Répondu';
      default:
        return 'Inconnu';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestion des Messages de Contact
          </h1>
          <p className="text-gray-600">
            Gérez les messages reçus via le formulaire de contact
          </p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total messages</p>
                <p className="text-2xl font-bold text-gray-900">{contacts.length}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Nouveaux</p>
                <p className="text-2xl font-bold text-blue-600">
                  {contacts.filter(c => c.status === 'new').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Lus</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {contacts.filter(c => c.status === 'read').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Répondus</p>
                <p className="text-2xl font-bold text-green-600">
                  {contacts.filter(c => c.status === 'replied').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, sujet..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tous les statuts</option>
                <option value="new">Nouveaux</option>
                <option value="read">Lus</option>
                <option value="replied">Répondus</option>
              </select>
              <button
                onClick={handleRefreshData}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>
          </div>
        </div>

        {/* Liste des contacts */}
        <div className="bg-white rounded-lg border border-gray-200">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement...</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun message trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sujet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contacts.map((contact) => (
                    <tr key={contact._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {contact.firstName} {contact.name}
                          </div>
                          <div className="text-sm text-gray-500">{contact.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {contact.subject}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(contact.submittedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contact.status)}`}>
                          {getStatusIcon(contact.status)}
                          <span className="ml-1">{getStatusText(contact.status)}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewContact(contact)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Voir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de détails */}
      {isModalOpen && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Détails du message
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedContact(null);
                    setAdminNotes("");
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Informations du contact</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p><strong>Nom :</strong> {selectedContact.firstName} {selectedContact.name}</p>
                    <p><strong>Email :</strong> {selectedContact.email}</p>
                    <p><strong>Date d'envoi :</strong> {formatDate(selectedContact.submittedAt)}</p>
                    <p><strong>Statut :</strong> 
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedContact.status)}`}>
                        {getStatusIcon(selectedContact.status)}
                        <span className="ml-1">{getStatusText(selectedContact.status)}</span>
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Sujet</h4>
                  <p className="text-gray-700">{selectedContact.subject}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Message</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="whitespace-pre-wrap text-gray-700">{selectedContact.message}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Notes administrateur</h4>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Ajouter des notes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  {selectedContact.status !== 'read' && (
                    <button
                      onClick={() => handleStatusChange(selectedContact._id, 'read')}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                    >
                      Marquer comme lu
                    </button>
                  )}
                  {selectedContact.status !== 'replied' && (
                    <button
                      onClick={() => handleStatusChange(selectedContact._id, 'replied')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Marquer comme répondu
                    </button>
                  )}
                  {selectedContact.status === 'replied' && (
                    <button
                      onClick={() => handleStatusChange(selectedContact._id, 'read')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Marquer comme lu
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 