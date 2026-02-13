import React, { useState, useRef } from 'react';
import { Upload, X, Play, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface MediaUploaderProps {
  onMediaUpload: (mediaUrl: string, mediaType: 'image' | 'video') => void;
  componentId: string;
  fieldId: string;
  currentMediaUrl?: string;
  currentMediaType?: 'image' | 'video';
  className?: string;
}

export function MediaUploader({
  onMediaUpload,
  componentId,
  fieldId,
  currentMediaUrl,
  currentMediaType,
  className = ''
}: MediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentMediaUrl || null);
  const [previewType, setPreviewType] = useState<'image' | 'video'>(currentMediaType || 'image');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validation côté client
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Type de fichier non supporté. Utilisez JPG, PNG, GIF, WebP, SVG, MP4, GIF, WebM, OGG, MOV, AVI ou MKV.');
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024; // 100MB pour vidéo, 5MB pour image

    if (file.size > maxSize) {
      const maxSizeText = isVideo ? '100MB' : '5MB';
      toast.error(`Fichier trop volumineux. Taille maximum : ${maxSizeText}.`);
      return;
    }

    setIsUploading(true);

    try {
      // Créer un aperçu local
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setPreviewType(isVideo ? 'video' : 'image');

      // Upload vers le serveur
      const formData = new FormData();
      formData.append('media', file);
      formData.append('componentId', componentId);
      formData.append('fieldId', fieldId);

      const response = await fetch('/api/upload-media', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }

      const data = await response.json();
      
      if (data.success) {
        onMediaUpload(data.mediaUrl, data.mediaType);
        toast.success(`${isVideo ? 'Vidéo' : 'Image'} téléchargée avec succès`);
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(`Erreur lors du téléchargement de ${isVideo ? 'la vidéo' : 'l\'image'}`);
      // Réinitialiser l'aperçu en cas d'erreur
      setPreviewUrl(currentMediaUrl || null);
      setPreviewType(currentMediaType || 'image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveMedia = () => {
    setPreviewUrl(null);
    setPreviewType('image');
    onMediaUpload('', 'image');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Zone d'upload */}
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {!previewUrl ? (
          // Zone d'upload vide
          <div
            onClick={handleClickUpload}
            className={`
              border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer
              hover:border-gray-400 hover:bg-gray-50 transition-colors
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div className="flex flex-col items-center space-y-2">
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              ) : (
                <Upload className="h-8 w-8 text-gray-400" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {isUploading ? 'Téléchargement en cours...' : 'Cliquez pour sélectionner un fichier'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Images (JPG, PNG, GIF, WebP, SVG) ou Vidéos (MP4, GIF, WebM, OGG, MOV, AVI, MKV)
                </p>
                <p className="text-xs text-gray-500">
                  Max: 5MB pour images, 100MB pour vidéos
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Aperçu du média
          <div className="relative group">
            <div className="relative rounded-lg overflow-hidden border border-gray-200">
              {previewType === 'video' ? (
                <video
                  src={previewUrl}
                  controls
                  className="w-full h-auto max-h-64 object-cover"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Aperçu"
                  className="w-full h-auto max-h-64 object-cover"
                />
              )}
              
              {/* Overlay avec boutons */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                  <button
                    onClick={handleClickUpload}
                    disabled={isUploading}
                    className="bg-white text-gray-700 px-3 py-1 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    {previewType === 'video' ? <Play className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                    Remplacer
                  </button>
                  <button
                    onClick={handleRemoveMedia}
                    className="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
            
            {/* Indicateur de type */}
            <div className="absolute top-2 right-2">
              <div className={`
                px-2 py-1 rounded-full text-xs font-medium
                ${previewType === 'video' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
                }
              `}>
                {previewType === 'video' ? 'Vidéo' : 'Image'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Indicateur de chargement */}
      {isUploading && (
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Téléchargement en cours...</span>
        </div>
      )}
    </div>
  );
} 