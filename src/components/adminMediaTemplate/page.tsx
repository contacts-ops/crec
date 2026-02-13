"use client"

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import {
  Image as ImageIcon,
  Video,
  Trash2,
  Eye,
  Download,
  Plus,
  EyeOff,
  Monitor,
  Edit,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { useSiteLink } from "@/hooks/use-site-link";

interface MediaItem {
  _id: string
  siteId: string
  pageId?: string
  componentId: string
  componentName: string
  componentType: string
  pageName?: string
  mediaUrl: string
  mediaType: "image" | "video"
  fileName: string
  fileSize: number
  mimeType: string
  title?: string
  description?: string
  altText?: string
  fieldId: string
  isActive: boolean
  position?: number
  createdAt: string
  updatedAt: string
}

interface MediaResponse {
  success: boolean
  media: MediaItem[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

interface AdminMediaTemplateProps {
  siteId?: string
  editableElements?: {
    [key: string]: string
  }
}

export default function AdminMediaTemplate({ siteId, editableElements = {} }: AdminMediaTemplateProps) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null)
  const [showMediaDialog, setShowMediaDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [mediaToDelete, setMediaToDelete] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(1000)
  const [showMediaSelectionDialog, setShowMediaSelectionDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedTitle, setSelectedTitle] = useState("")
  const [selectedDescription, setSelectedDescription] = useState("")
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const { transformLink } = useSiteLink()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { toast } = useToast()


  // Charger les médias
  const loadMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        // Suppression du filtre componentId pour afficher TOUS les médias du site
      });
      const response = await fetch(`/api/${transformLink(`/media?${params}`)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ siteId }),
      });
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des médias');
      }

      const data: MediaResponse = await response.json();
      setMedia(data.media);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les médias",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [siteId, currentPage, itemsPerPage, toast]);
  // Charger les médias au montage et quand la pagination change
  useEffect(() => {
    if (siteId) {
      loadMedia();
    }
  }, [loadMedia, siteId]);
  // Changer de page
  const changePage = (page: number) => {
    setCurrentPage(page);
  };

  // Sauvegarder l'ordre sur le serveur
  const saveOrder = useCallback(async (newOrder: MediaItem[]) => {
    try {
      const response = await fetch(`/api/${transformLink('/media/reorder')}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          siteId: siteId,
          orderedIds: newOrder.map((m) => m._id),
          baseIndex: (currentPage - 1) * itemsPerPage
        }),
      });
      if (!response.ok) {
        throw new Error('Server error');
      }
      // Ne pas recharger automatiquement: conserver l'ordre local affiché
      setMedia(newOrder);
      toast({ title: 'Ordre enregistré', description: 'Le nouvel ordre a été sauvegardé.' });
    } catch (error) {
      console.error('Erreur réordonnancement:', error);
      toast({ title: 'Erreur', description: "Impossible de changer l'ordre", variant: 'destructive' });
    }
  }, [siteId, toast]);
  // Déplacer un média vers le haut
  const moveUp = (id: string) => {
    setMedia((prev) => {
      const index = prev.findIndex((m) => m._id === id);
      if (index <= 0) return prev;
      const reordered = [...prev];
      [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
      // Déclencher la sauvegarde serveur en arrière-plan
      saveOrder(reordered);
      return reordered;
    });
  };

  // Déplacer un média vers le bas
  const moveDown = (id: string) => {
    setMedia((prev) => {
      const index = prev.findIndex((m) => m._id === id);
      if (index === -1 || index >= prev.length - 1) return prev;
      const reordered = [...prev];
      [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
      // Déclencher la sauvegarde serveur en arrière-plan
      saveOrder(reordered);
      return reordered;
    });
  };

  // Ouvrir le dialogue de visualisation
  const openMediaDialog = (media: MediaItem) => {
    setSelectedMedia(media);
    setShowMediaDialog(true);
  };

  // Gérer l'ajout de médias
  const handleAddMedia = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Afficher la popup de sélection avec le premier fichier
    setSelectedFile(files[0]);
    setSelectedTitle(files[0].name.replace(/\.[^/.]+$/, ""));
    setSelectedDescription("");
    setIsEditMode(false);
    setEditingMedia(null);
    setShowMediaSelectionDialog(true);
    // Réinitialiser l'input
    event.target.value = '';
  };

  // Fonction pour ouvrir le mode édition
  const handleEditMedia = (media: MediaItem) => {
    setEditingMedia(media);
    setSelectedFile(null);
    setSelectedTitle(media.title || '');
    setSelectedDescription(media.description || '');
    setIsEditMode(true);
    setShowMediaSelectionDialog(true);
  };

  // Fonction pour gérer le changement de fichier en mode édition
  const handleFileChangeInEdit = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setSelectedFile(files[0]);
    // Réinitialiser l'input pour permettre de sélectionner le même fichier à nouveau
    event.target.value = '';
  };

     // Fonction pour uploader le média sélectionné ou mettre à jour
     const uploadMedia = async () => {
    // Validation des champs obligatoires
    if (selectedTitle.trim() === "" || selectedDescription.trim() === "") {
      toast({
        title: "Erreur",
        description: "Le titre et la description sont obligatoires",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setShowMediaSelectionDialog(false)

    try {
      if (isEditMode && editingMedia) {
        // Mode édition : vérifier si un nouveau fichier a été sélectionné
        if (selectedFile) {
          // Un nouveau fichier a été sélectionné : uploader et remplacer le média
          // Step 1: Get presigned URL from API
          const presignedResponse = await fetch("/api/media/presigned-url", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileName: selectedFile.name,
              fileSize: selectedFile.size,
              fileType: selectedFile.type,
              componentId: editingMedia.componentId,
              fieldId: editingMedia.fieldId,
            }),
          })

          if (!presignedResponse.ok) {
            const errorData = await presignedResponse.json()
            throw new Error(errorData.error || "Erreur lors de la génération de l'URL signée")
          }

          const { presignedUrl, fileUrl } = await presignedResponse.json()

          // Step 2: Upload file directly to S3 using presigned URL
          const uploadResponse = await fetch(presignedUrl, {
            method: "PUT",
            headers: {
              "Content-Type": selectedFile.type,
            },
            body: selectedFile,
          })

          if (!uploadResponse.ok) {
            throw new Error("Erreur lors de l'upload vers S3")
          }

          // Step 3: Update existing media with new file URL and metadata
          const response = await fetch(`/api/${transformLink("/media")}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              siteId: siteId,
              mediaId: editingMedia._id,
              title: selectedTitle,
              description: selectedDescription,
              mediaUrl: fileUrl,
              fileName: selectedFile.name,
              fileSize: selectedFile.size,
              mimeType: selectedFile.type,
            }),
          })

          if (!response.ok) {
            throw new Error("Erreur lors de la mise à jour du média")
          }

          toast({
            title: "Succès",
            description: "Média et fichier mis à jour avec succès",
          })
        } else {
          // Pas de nouveau fichier : mettre à jour uniquement les métadonnées
          const response = await fetch(`/api/${transformLink("/media")}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              siteId: siteId,
              mediaId: editingMedia._id,
              title: selectedTitle,
              description: selectedDescription,
            }),
          })

          if (!response.ok) {
            throw new Error("Erreur lors de la mise à jour")
          }

          toast({
            title: "Succès",
            description: "Média mis à jour avec succès",
          })
        }
      } else if (selectedFile) {
        // Step 1: Get presigned URL from API
        const presignedResponse = await fetch("/api/media/presigned-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            fileType: selectedFile.type,
            componentId: "adminMediaTemplate",
            fieldId: `media_${Date.now()}_0`,
          }),
        })

        if (!presignedResponse.ok) {
          const errorData = await presignedResponse.json()
          throw new Error(errorData.error || "Erreur lors de la génération de l'URL signée")
        }

        const { presignedUrl, fileUrl } = await presignedResponse.json()

        // Step 2: Upload file directly to S3 using presigned URL (no API overhead)
        const uploadResponse = await fetch(presignedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": selectedFile.type,
          },
          body: selectedFile,
        })

        if (!uploadResponse.ok) {
          throw new Error("Erreur lors de l'upload vers S3")
        }

        // Step 3: Save metadata to database
        const metadataResponse = await fetch("/api/media/save-media-metadata", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mediaUrl: fileUrl,
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            mimeType: selectedFile.type,
            componentId: "adminMediaTemplate",
            fieldId: `media_${Date.now()}_0`,
            siteId: siteId || "",
            title: selectedTitle,
            description: selectedDescription,
          }),
        })

        if (!metadataResponse.ok) {
          const errorData = await metadataResponse.json()
          throw new Error(errorData.error || "Erreur lors de la sauvegarde des métadonnées")
        }

        toast({
          title: "Succès",
          description: `${selectedFile.name} uploadé avec succès`,
        })
      }

      // Recharger la liste des médias
      await loadMedia()
    } catch (error) {
      console.error("Erreur:", error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de l'opération",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setSelectedFile(null)
      setEditingMedia(null)
      setIsEditMode(false)
      setSelectedTitle("")
      setSelectedDescription("")
      setUploadProgress(0)
    }
  };

  // Supprimer des médias
  const deleteMedia = async (mediaIds: string[]) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/${transformLink('/media')}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mediaIds, siteId: siteId }),
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      const result = await response.json();
      toast({
        title: "Succès",
        description: `${result.deletedCount} média(x) supprimé(s)`,
      });
      // Recharger les médias
      await loadMedia();
      setShowDeleteDialog(false);
      setMediaToDelete([]);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les médias",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  

  // Formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Sélectionner/désélectionner tous les médias
  const toggleSelectAll = () => {
    if (mediaToDelete.length === media.length) {
      setMediaToDelete([]);
    } else {
      setMediaToDelete(media.map(m => m._id));
    }
  };

  // Toggle sélection d'un média
  const toggleMediaSelection = (mediaId: string) => {
    setMediaToDelete(prev => 
      prev.includes(mediaId) 
        ? prev.filter(id => id !== mediaId)
        : [...prev, mediaId]
    );
  };



  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Gestion des Médias
              </h2>
              <p className="text-gray-600">
                Gérez tous les médias de votre site
              </p>
            </div>
            <Button
              variant="solidGray"
              onClick={handleAddMedia}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Ajouter un média
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Médias</p>
                <p className="text-2xl font-bold text-gray-900">{media.length}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {mediaToDelete.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-end">
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer ({mediaToDelete.length})
              </Button>
            </div>
          </div>
        )}

        {/* Input file caché pour l'ajout de médias */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Table des médias */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Liste des Médias ({media.length})
              {loading && <span className="text-sm text-gray-500 ml-2">- Chargement...</span>}
            </h3>
          </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Chargement...</span>
              </div>
                         ) : media.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Aucun média trouvé</p>
                <Button
                  onClick={handleAddMedia}
                  variant="outline"
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter votre premier média
                </Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                                                     checked={mediaToDelete.length === media.length}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead className="w-[55%]">Média</TableHead>
                      <TableHead className="w-[15%] text-center">Type</TableHead>
                      <TableHead className="w-[15%] text-center">Position</TableHead>
                      <TableHead className="w-[15%] text-center">Date</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                                         {media.map((item, index) => (
                      <TableRow key={item._id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={mediaToDelete.includes(item._id)}
                            onChange={() => toggleMediaSelection(item._id)}
                            className="rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                              {item.mediaType === 'image' ? (
                                <Image
                                  src={item.mediaUrl}
                                  alt={item.altText || item.fileName}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                  <Video className="h-6 w-6 text-gray-500" />
                                </div>
                              )}
                            </div>
                            <div>
                               {item.title && (
                                 <p className="font-medium text-sm text-gray-900">
                                   {item.title}
                                 </p>
                               )}
                                {item.description && (
                                  <p className="text-[11px] text-gray-500 truncate max-w-[280px]">
                                    {item.description}
                                  </p>
                                )}
                             </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Badge 
                              className={`inline-flex items-center gap-1 ${
                                item.mediaType === 'image' 
                                  ? 'bg-blue-50 text-blue-600 border-blue-200' 
                                  : 'bg-purple-100 text-purple-600 border-purple-200'
                              } text-xs`}
                            >
                              {item.mediaType === 'image' ? (
                                <ImageIcon className="h-3 w-3" />
                              ) : (
                                <Video className="h-3 w-3" />
                              )}
                              {item.mediaType}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => moveUp(item._id)}
                              className="flex items-center gap-2 px-2 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-all duration-200 hover:shadow-sm border border-gray-200"
                              title="Monter"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-gray-600 min-w-[2ch] text-center">
                              {item.position !== undefined ? item.position : ((currentPage - 1) * itemsPerPage + index + 1)}
                            </span>
                            <button
                              onClick={() => moveDown(item._id)}
                              className="flex items-center gap-2 px-2 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-all duration-200 hover:shadow-sm border border-gray-200"
                              title="Descendre"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm text-gray-600">
                            {formatDate(item.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                           <div className="flex items-center justify-center gap-2">
                             <button 
                               onClick={() => openMediaDialog(item)}
                               className="flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-all duration-200 hover:shadow-sm border border-green-200 hover:border-green-300"
                               title="Aperçu"
                             >
                               <Monitor className="w-4 h-4" />
                               <span className="text-sm font-medium">Voir</span>
                             </button>
                             <button 
                               onClick={() => handleEditMedia(item)}
                               className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all duration-200 hover:shadow-sm border border-blue-200 hover:border-blue-300"
                               title="Modifier le titre et la description"
                             >
                               <Edit className="w-4 h-4" />
                               <span className="text-sm font-medium">Modifier</span>
                             </button>
                             <button 
                               onClick={async () => {
                                 try {
                                   const res = await fetch(`/api/${transformLink('/media')}`, {
                                     method: 'PATCH',
                                     headers: { 'Content-Type': 'application/json' },
                                     body: JSON.stringify({ mediaId: item._id, isActive: !item.isActive, siteId: siteId })
                                   });
                                   if (!res.ok) throw new Error('Erreur lors de la mise à jour');
                                   await loadMedia();
                                   toast({ 
                                     title: 'Mis à jour', 
                                     description: `Média ${item.isActive ? 'masqué' : 'affiché'}` 
                                   });
                                 } catch (e) {
                                   toast({ 
                                     title: 'Erreur', 
                                     description: "Impossible de changer la visibilité", 
                                     variant: 'destructive' 
                                   });
                                 }
                               }}
                                                               className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-sm border ${
                                  item.isActive 
                                    ? 'bg-purple-50 hover:bg-purple-100 text-purple-600 border-purple-200 hover:border-purple-300' 
                                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300'
                                }`}
                               title={item.isActive ? 'Masquer' : 'Afficher'}
                             >
                               {item.isActive ? (
                                 <Eye className="w-4 h-4" />
                               ) : (
                                 <EyeOff className="w-4 h-4" />
                               )}
                               <span className="text-sm font-medium">{item.isActive ? 'Masquer' : 'Afficher'}</span>
                             </button>
                             <button 
                               onClick={() => deleteMedia([item._id])}
                               className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg transition-all duration-200 hover:shadow-sm border border-red-200 hover:border-red-300"
                               title="Supprimer"
                             >
                               <Trash2 className="w-4 h-4" />
                               <span className="text-sm font-medium">Supprimer</span>
                             </button>
                           </div>
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                                 {Math.ceil(media.length / itemsPerPage) > 1 && (
                  <div className="mt-6 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => changePage(Math.max(1, currentPage - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                                                 {Array.from({ length: Math.ceil(media.length / itemsPerPage) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => changePage(page)}
                                isActive={page === currentPage}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                                                       onClick={() => changePage(Math.min(Math.ceil(media.length / itemsPerPage), currentPage + 1))}
                             className={currentPage === Math.ceil(media.length / itemsPerPage) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
        </div>
      </div>

      {/* Dialog de visualisation du média */}
      <Dialog open={showMediaDialog} onOpenChange={setShowMediaDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aperçu du média</DialogTitle>
          </DialogHeader>
          {selectedMedia && (
            <div className="space-y-4">
              {/* Média */}
              <div className="flex justify-center">
                {selectedMedia.mediaType === 'image' ? (
                  <div className="relative w-full max-w-2xl aspect-video group">
                    <Image
                      src={selectedMedia.mediaUrl}
                      alt={selectedMedia.altText || selectedMedia.fileName}
                      fill
                      className="object-contain rounded-lg"
                    />
                    {/* Icône de modification au survol */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                      <button
                        onClick={() => {
                          setEditingMedia(selectedMedia);
                          setSelectedTitle(selectedMedia.title || '');
                          setSelectedDescription(selectedMedia.description || '');
                          setIsEditMode(true);
                          setShowMediaDialog(false);
                          setShowMediaSelectionDialog(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Modifier
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full max-w-2xl group">
                    <video
                      src={selectedMedia.mediaUrl}
                      controls
                      className="w-full rounded-lg"
                    >
                      Votre navigateur ne supporte pas la lecture de vidéos.
                    </video>
                    {/* Icône de modification au survol */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                      <button
                        onClick={() => {
                          setEditingMedia(selectedMedia);
                          setSelectedTitle(selectedMedia.title || '');
                          setSelectedDescription(selectedMedia.description || '');
                          setIsEditMode(true);
                          setShowMediaDialog(false);
                          setShowMediaSelectionDialog(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Modifier
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {(selectedMedia.title || selectedMedia.description) && (
                <div className="text-center space-y-1">
                  {selectedMedia.title && (
                    <p className="text-base font-semibold text-gray-900">{selectedMedia.title}</p>
                  )}
                  {selectedMedia.description && (
                    <p className="text-sm text-gray-600">{selectedMedia.description}</p>
                  )}
                </div>
              )}

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Êtes-vous sûr de vouloir supprimer {mediaToDelete.length} média(x) ? 
              Cette action est irréversible.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMedia(mediaToDelete)}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de sélection de fichier */}
      <Dialog open={showMediaSelectionDialog} onOpenChange={setShowMediaSelectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Modifier le média" : "Média sélectionné"}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {(selectedFile || isEditMode) && (
              <div className="space-y-6">
                {/* Afficher le nouveau fichier sélectionné s'il y en a un, sinon afficher le média actuel en mode édition */}
                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      {selectedFile.type.startsWith('image/') ? (
                        <div className="relative w-full max-w-2xl aspect-video">
                          <Image
                            src={URL.createObjectURL(selectedFile)}
                            alt={selectedFile.name}
                            fill
                            className="object-contain rounded-lg"
                          />
                        </div>
                      ) : (
                        <video
                          src={URL.createObjectURL(selectedFile)}
                          controls
                          className="w-full max-w-2xl rounded-lg"
                        />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                      Nouveau fichier sélectionné : {selectedFile.name}
                    </p>
                  </div>
                ) : isEditMode && editingMedia ? (
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      {editingMedia.mediaType === 'image' ? (
                        <div className="relative w-full max-w-2xl aspect-video">
                          <Image
                            src={editingMedia.mediaUrl}
                            alt={editingMedia.altText || editingMedia.fileName}
                            fill
                            className="object-contain rounded-lg"
                          />
                        </div>
                      ) : (
                        <video
                          src={editingMedia.mediaUrl}
                          controls
                          className="w-full max-w-2xl rounded-lg"
                        />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                      Fichier actuel : {editingMedia.fileName}
                    </p>
                  </div>
                ) : null}

                {/* Bouton pour sélectionner un nouveau fichier en mode édition */}
                {isEditMode && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {selectedFile ? "Remplacer le fichier" : "Remplacer le fichier média"}
                    </label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileChangeInEdit}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {selectedFile && (
                      <p className="text-xs text-blue-600">
                        ✓ Un nouveau fichier a été sélectionné et remplacera le fichier actuel
                      </p>
                    )}
                  </div>
                )}

                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Titre <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={selectedTitle}
                      onChange={(e) => setSelectedTitle(e.target.value)}
                      placeholder="Titre du média"
                      className={selectedTitle.trim() === '' ? 'border-red-300 focus:ring-red-500' : ''}
                    />
                    {selectedTitle.trim() === '' && (
                      <p className="text-xs text-red-500 mt-1">Le titre est obligatoire</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      value={selectedDescription}
                      onChange={(e) => setSelectedDescription(e.target.value)}
                      placeholder="Décrivez ce média"
                      rows={4}
                      className={selectedDescription.trim() === '' ? 'border-red-300 focus:ring-red-500' : ''}
                    />
                    {selectedDescription.trim() === '' && (
                      <p className="text-xs text-red-500 mt-1">La description est obligatoire</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowMediaSelectionDialog(false);
                      setSelectedFile(null);
                      setEditingMedia(null);
                      setIsEditMode(false);
                      setSelectedTitle("");
                      setSelectedDescription("");
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={uploadMedia}
                    disabled={selectedTitle.trim() === '' || selectedDescription.trim() === ''}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedTitle.trim() === '' || selectedDescription.trim() === ''
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    {isEditMode ? (
                      <>
                        <Edit className="h-4 w-4" />
                        {selectedFile ? "Confirmer le remplacement" : "Confirmer la modification"}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Confirmer l'ajout
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
