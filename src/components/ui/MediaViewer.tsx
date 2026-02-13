import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, Video, Download, Eye, X } from 'lucide-react';

export interface MediaViewerProps {
  media: {
    _id: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    fileName: string;
    fileSize: number;
    mimeType: string;
    title?: string;
    description?: string;
    altText?: string;
    componentName: string;
    componentType: string;
    fieldId: string;
    pageName?: string;
    createdAt: string;
  };
  children?: React.ReactNode;
  showPreview?: boolean;
  className?: string;
}

export function MediaViewer({ 
  media, 
  children, 
  showPreview = true,
  className = '' 
}: MediaViewerProps) {
  const [showDialog, setShowDialog] = useState(false);

  // Formater la taille du fichier
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  // Ouvrir le dialogue de visualisation
  const openMediaDialog = () => {
    setShowDialog(true);
  };

  // Fermer le dialogue
  const closeMediaDialog = () => {
    setShowDialog(false);
  };

  // Télécharger le média
  const downloadMedia = () => {
    window.open(media.mediaUrl, '_blank');
  };

  return (
    <>
      {/* Aperçu du média */}
      <div className={`relative group ${className}`}>
        {children || (
          <div className="relative w-full h-32 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
            {media.mediaType === 'image' ? (
              <Image
                src={media.mediaUrl}
                alt={media.altText || media.fileName}
                fill
                className="object-cover transition-transform duration-200 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <Video className="h-8 w-8 text-gray-500" />
              </div>
            )}
            
            {/* Overlay avec informations */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-end">
              <div className="w-full p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <p className="text-xs font-medium truncate">{media.fileName}</p>
                <p className="text-xs opacity-80">{media.componentName}</p>
              </div>
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        {showPreview && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
            <Button
              onClick={openMediaDialog}
              variant="secondary"
              size="sm"
              className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              onClick={downloadMedia}
              variant="secondary"
              size="sm"
              className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Dialog de visualisation */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {media.mediaType === 'image' ? (
                <ImageIcon className="h-5 w-5" />
              ) : (
                <Video className="h-5 w-5" />
              )}
              {media.fileName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Média */}
            <div className="flex justify-center">
              {media.mediaType === 'image' ? (
                <div className="relative w-full max-w-2xl aspect-video">
                  <Image
                    src={media.mediaUrl}
                    alt={media.altText || media.fileName}
                    fill
                    className="object-contain rounded-lg"
                  />
                </div>
              ) : (
                <video
                  src={media.mediaUrl}
                  controls
                  className="w-full max-w-2xl rounded-lg"
                >
                  Votre navigateur ne supporte pas la lecture de vidéos.
                </video>
              )}
            </div>

            {/* Informations détaillées */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Informations du fichier</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nom:</span>
                    <span className="font-medium">{media.fileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <Badge variant="outline">{media.mediaType}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taille:</span>
                    <span className="font-medium">{formatFileSize(media.fileSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">MIME:</span>
                    <span className="font-medium text-xs">{media.mimeType}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Contexte d'utilisation</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Composant:</span>
                    <span className="font-medium">{media.componentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <Badge variant="secondary">{media.componentType}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Champ:</span>
                    <span className="font-medium">{media.fieldId}</span>
                  </div>
                  {media.pageName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Page:</span>
                      <span className="font-medium">{media.pageName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{formatDate(media.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Métadonnées */}
            {(media.title || media.description || media.altText) && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Métadonnées</h4>
                <div className="space-y-2 text-sm">
                  {media.title && (
                    <div>
                      <span className="text-gray-600">Titre:</span>
                      <p className="font-medium">{media.title}</p>
                    </div>
                  )}
                  {media.description && (
                    <div>
                      <span className="text-gray-600">Description:</span>
                      <p className="font-medium">{media.description}</p>
                    </div>
                  )}
                  {media.altText && (
                    <div>
                      <span className="text-gray-600">Texte alternatif:</span>
                      <p className="font-medium">{media.altText}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                onClick={downloadMedia}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
              <Button
                onClick={closeMediaDialog}
              >
                Fermer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
