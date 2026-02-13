import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Vérification des variables d'environnement
// console.log('🔍 Vérification des variables S3:');
// console.log('S3_REGION:', process.env.S3_REGION || 'NON DÉFINIE');
// console.log('S3_ACCESS_KEY_ID:', process.env.S3_ACCESS_KEY_ID ? 'DÉFINIE' : 'NON DÉFINIE');
// console.log('S3_SECRET_ACCESS_KEY:', process.env.S3_SECRET_ACCESS_KEY ? 'DÉFINIE' : 'NON DÉFINIE');
// console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME || 'NON DÉFINIE');

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});

export interface UploadResult {
  success: boolean;
  imageUrl?: string;
  videoUrl?: string;
  error?: string;
}

/**
 * Upload une image vers S3
 */
export const uploadToS3 = async (file: Buffer, fileName: string, contentType: string): Promise<string> => {
  try {
    console.log('🚀 Début upload S3:', { fileName, contentType, bucketName: process.env.S3_BUCKET_NAME });

    // Définition du cache pour les fichiers statiques (images / médias)
    // Ici on met un max-age de 7 jours et immutable pour que le navigateur garde le fichier en cache.
    const cacheControl = 'public, max-age=604800, immutable';

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Body: file,
      ContentType: contentType,
      CacheControl: cacheControl,
      Metadata: {
        // Dupliqué en metadata pour certains CDN / outils qui lisent les métadonnées S3
        'Cache-Control': cacheControl,
      },
    });

    const result = await s3Client.send(command);
    console.log('✅ Upload S3 réussi:', result);

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;
    console.log('🔗 URL générée:', fileUrl);

    return fileUrl;
  } catch (error) {
    console.error('❌ Erreur upload S3:', error);
    throw error;
  }
};

/**
 * Supprime un fichier de S3
 */
export const deleteFromS3 = async (fileName: string): Promise<void> => {
  try {
    console.log('🗑️ Début suppression S3:', { fileName, bucketName: process.env.S3_BUCKET_NAME });

    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
    });

    await s3Client.send(command);
    console.log('✅ Suppression S3 réussie');
  } catch (error) {
    console.error('❌ Erreur suppression S3:', error);
    throw error;
  }
};

/**
 * Valide le type de fichier image
 */
export const isValidImageType = (fileName: string): boolean => {
  const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.pdf'];
  const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return allowedTypes.includes(fileExtension);
};

/**
 * Valide le type de fichier vidéo
 */
export const isValidVideoType = (fileName: string): boolean => {
  const allowedTypes = ['.mp4', '.gif', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
  const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return allowedTypes.includes(fileExtension);
};

/**
 * Valide le type de fichier (image ou vidéo)
 */
export const isValidMediaType = (fileName: string): boolean => {
  return isValidImageType(fileName) || isValidVideoType(fileName);
};

/**
 * Détermine si c'est une vidéo
 */
export const isVideoFile = (fileName: string): boolean => {
  return isValidVideoType(fileName);
};

/**
 * Valide la taille du fichier image (max 5MB)
 */
export const isValidImageFileSize = (fileSize: number): boolean => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  return fileSize <= maxSize;
};

/**
 * Valide la taille du fichier vidéo (max 100MB)
 */
export const isValidVideoFileSize = (fileSize: number): boolean => {
  const maxSize = 100 * 1024 * 1024; // 100MB
  return fileSize <= maxSize;
};

/**
 * Valide la taille du fichier selon son type
 */
export const isValidFileSize = (fileSize: number, fileName: string): boolean => {
  if (isVideoFile(fileName)) {
    return isValidVideoFileSize(fileSize);
  }
  return isValidImageFileSize(fileSize);
};

// Fonction d'upload d'image avec validation
export const uploadImageToS3 = async (
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<UploadResult> => {
  try {
    console.log('🚀 Début upload image S3:', { fileName, contentType, bucketName: process.env.S3_BUCKET_NAME });

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Body: file,
      ContentType: contentType,
    });

    const result = await s3Client.send(command);
    console.log('✅ Upload image S3 réussi:', result);

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;
    console.log('🔗 URL image générée:', fileUrl);

    return {
      success: true,
      imageUrl: fileUrl,
    };
  } catch (error) {
    console.error('❌ Erreur upload image S3:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
};

// Fonction d'upload de vidéo avec validation
export const uploadVideoToS3 = async (
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<UploadResult> => {
  try {
    console.log('🎬 Début upload vidéo S3:', { fileName, contentType, bucketName: process.env.S3_BUCKET_NAME });

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Body: file,
      ContentType: contentType,
    });

    const result = await s3Client.send(command);
    console.log('✅ Upload vidéo S3 réussi:', result);

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;
    console.log('🔗 URL vidéo générée:', fileUrl);

    return {
      success: true,
      videoUrl: fileUrl,
    };
  } catch (error) {
    console.error('❌ Erreur upload vidéo S3:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
};

// Fonction d'upload unifiée pour images et vidéos
export const uploadMediaToS3 = async (
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<UploadResult> => {
  if (isVideoFile(fileName)) {
    return await uploadVideoToS3(file, fileName, contentType);
  } else {
    return await uploadImageToS3(file, fileName, contentType);
  }
};
