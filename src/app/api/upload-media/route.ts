import { NextResponse } from 'next/server';
import { 
  uploadMediaToS3, 
  isValidMediaType, 
  isValidFileSize, 
  isVideoFile 
} from '@/lib/s3';
import { connectToDatabase } from '@/lib/db';
import { Media } from '@/lib/models/Media';
import { Site } from '@/lib/models/Site';
import { Page } from '@/lib/models/Page';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const media = formData.get('media') as File;
    const componentId = formData.get('componentId') as string;
    const fieldId = formData.get('fieldId') as string;
    const siteId = formData.get('siteId') as string;
    const pageId = formData.get('pageId') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;


    if (!media || !componentId || !fieldId ) {
      console.log('❌ Données manquantes');
      return NextResponse.json(
        { error: 'Données manquantes (media, componentId, fieldId)' },
        { status: 400 }
      );
    }

    // siteId est optionnel pour les bandes de test
    const hasSiteId = siteId && siteId.trim() !== '';

    // Validation du type de fichier
    console.log('🔍 Validation du type de fichier...');
    if (!isValidMediaType(media.name)) {
      console.log('❌ Type de fichier non supporté:', media.name);
      return NextResponse.json(
        { error: 'Type de fichier non supporté. Utilisez JPG, PNG, GIF, WebP, SVG, MP4, GIF, WebM, OGG, MOV, AVI ou MKV.' },
        { status: 400 }
      );
    }

    if (!isValidFileSize(media.size, media.name)) {
      const isVideo = isVideoFile(media.name);
      const maxSize = isVideo ? '100MB' : '5MB';
      console.log('❌ Fichier trop volumineux:', media.size);
      return NextResponse.json(
        { error: `Fichier trop volumineux. Taille maximum : ${maxSize}.` },
        { status: 400 }
      );
    }
    const bytes = await media.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Générer un nom de fichier unique avec le préfixe du composant
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = media.name.split('.').pop();
    const fileName = `${componentId}-${fieldId}-${timestamp}-${randomString}.${fileExtension}`;
    // Upload vers S3
    const uploadResult = await uploadMediaToS3(
      buffer,
      fileName,
      media.type
    );

    if (!uploadResult.success) {
      console.error('❌ Échec de l\'upload vers S3:', uploadResult.error);
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload vers S3' },
        { status: 500 }
      );
    }

    const isVideo = isVideoFile(media.name);
    const mediaUrl = isVideo ? uploadResult.videoUrl : uploadResult.imageUrl;
    

    // Enregistrer automatiquement le média dans la base de données (seulement si siteId est fourni)
    try {
      if (hasSiteId) {
        await connectToDatabase();
        
        // Récupérer les informations du site et du composant
        const site = await Site.findOne({ siteId });
        if (!site) {
          console.warn('⚠️ Site non trouvé pour l\'enregistrement du média');
        }

      // Récupérer les informations de la page si pageId est fourni
      let pageName = undefined;
      if (pageId) {
        const page = await Page.findOne({ pageId });
        if (page) {
          pageName = page.name;
        }
      }

      // Récupérer la configuration du composant pour obtenir son nom et type
      let componentName = componentId;
      let componentType = 'unknown';
      
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const configPath = path.join(process.cwd(), 'src', '_sharedComponents', componentId, 'config.json');
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        componentName = config.name || componentId;
        componentType = config.type || 'unknown';
      } catch (error) {
        console.warn('⚠️ Impossible de lire la config du composant:', error);
      }

        // Déterminer la prochaine position (fin de liste)
        let nextPosition = 0;
        try {
          const last = await Media.find({ siteId, componentId }).sort({ position: -1 }).limit(1).lean();
          nextPosition = (last?.[0]?.position ?? -1) + 1;
        } catch (_) {
          nextPosition = 0;
        }

        // Créer ou mettre à jour l'entrée média
        const mediaData = {
          siteId,
          pageId: pageId || undefined,
          componentId,
          componentName,
          componentType,
          pageName,
          mediaUrl,
          mediaType: isVideo ? 'video' : 'image',
          fileName: media.name,
          fileSize: media.size,
          mimeType: media.type,
          fieldId,
          title: title || undefined,
          description: description || undefined,
          isActive: true,
          position: nextPosition
        };

        // Vérifier si un média existe déjà pour ce composant et ce champ
        const existingMedia = await Media.findOne({ 
          siteId, 
          componentId, 
          fieldId 
        });

        if (existingMedia) {
          // Mettre à jour le média existant
          await Media.findByIdAndUpdate(existingMedia._id, {
            ...mediaData,
            updatedAt: new Date()
          });
          console.log('✅ Média mis à jour dans la base de données');
        } else {
          // Créer un nouveau média
          await Media.create(mediaData);
          console.log('✅ Nouveau média enregistré dans la base de données');
        }
      } else {
        console.log('ℹ️ siteId non fourni, média uploadé mais non enregistré en base (mode test)');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement du média dans la base:', error);
      // Ne pas faire échouer l'upload si l'enregistrement en base échoue
    }

    // Mettre à jour les props du composant avec la nouvelle URL (seulement si siteId est fourni)
    if (hasSiteId) {
      try {
        console.log('🔄 Mise à jour des props du composant...');
        
        // Parser le fieldId pour extraire les informations de mise à jour
        const fieldParts = fieldId.split('-');
        console.log('📋 Parts du fieldId:', fieldParts);
        
        if (fieldParts.length >= 3) {
          const [componentPrefix, serviceId, property] = fieldParts;
          console.log(`🎯 Mise à jour: ${componentPrefix}.${serviceId}.${property} = ${mediaUrl}`);
          
          // Récupérer la page qui contient ce composant
          const page = await Page.findOne({ 
            siteId, 
            'components.id': { $regex: componentId, $options: 'i' } 
          });
          
          if (page) {
            console.log('✅ Page trouvée:', page.slug);
            
            // Trouver le composant
            const componentIndex = page.components.findIndex(comp => 
              comp.id.toLowerCase().includes(componentId.toLowerCase()) || 
              comp.originalId?.toLowerCase() === componentId.toLowerCase()
            );
            
            if (componentIndex !== -1) {
              console.log('✅ Composant trouvé à l\'index:', componentIndex);
              
              const component = page.components[componentIndex];
              const props = component.props || {};
              
              // Créer une copie des props pour la mise à jour
              const updatedProps = JSON.parse(JSON.stringify(props));
              
              // Mettre à jour la propriété dans le tableau
              if (updatedProps[componentPrefix] && Array.isArray(updatedProps[componentPrefix])) {
                const serviceIndex = updatedProps[componentPrefix].findIndex((s: any) => s.id === serviceId);
                if (serviceIndex !== -1) {
                  updatedProps[componentPrefix][serviceIndex][property] = mediaUrl;
                  console.log(`✅ Propriété mise à jour: ${componentPrefix}[${serviceIndex}].${property} = ${mediaUrl}`);
                  
                  // Sauvegarder les props mises à jour
                  page.components[componentIndex].props = updatedProps;
                  page.lastUpdated = new Date();
                  await page.save();
                  console.log('✅ Props du composant mises à jour avec succès');
                } else {
                  console.warn(`⚠️ Service avec ID '${serviceId}' non trouvé dans ${componentPrefix}`);
                }
              } else {
                console.warn(`⚠️ Propriété '${componentPrefix}' non trouvée ou n'est pas un tableau`);
              }
            } else {
              console.warn('⚠️ Composant non trouvé dans la page');
            }
          } else {
            console.warn('⚠️ Page contenant le composant non trouvée');
          }
        } else {
          console.warn('⚠️ Format fieldId invalide pour la mise à jour des props:', fieldId);
        }
      } catch (error) {
        console.error('❌ Erreur lors de la mise à jour des props du composant:', error);
        // Ne pas faire échouer l'upload si la mise à jour des props échoue
      }
    }

    return NextResponse.json({
      mediaUrl,
      mediaType: isVideo ? 'video' : 'image',
      success: true
    });

  } catch (error) {
    console.error('❌ Erreur lors du téléchargement:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'Pas de stack trace');
    return NextResponse.json(
      { error: 'Erreur lors du téléchargement du média' },
      { status: 500 }
    );
  }
} 