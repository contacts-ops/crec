import { connectToDatabase } from "@/lib/db";
import { NextResponse } from "next/server";
import { ProductsShowcase, type ProductMediaItem, type ProductMediaType } from "@/lib/models/ProductsShowcase";

type MediaPayload = { url?: string; type?: string };

const normalizeMediaType = (value: unknown): ProductMediaType =>
    value === "video" ? "video" : "image";

const mapMediaPayloadToItem = (item: MediaPayload): ProductMediaItem => ({
    url: typeof item?.url === "string" ? item.url.trim() : "",
    type: normalizeMediaType(item?.type),
});

export async function POST(request: Request) {
    try {
        await connectToDatabase();
        const productsShowcaseData = await request.json();
        console.log("Données reçues pour la création du produit showcase:", productsShowcaseData);
        
        // Validation du siteId
        if (!productsShowcaseData.siteId) {
            return NextResponse.json({ error: "Le siteId est requis" }, { status: 400 });
        }
        if (!productsShowcaseData.title) {
            return NextResponse.json({ error: "Le titre est requis" }, { status: 400 });
        }
        if (!productsShowcaseData.category) {
            return NextResponse.json({ error: "La catégorie est requise" }, { status: 400 });
        }

        const rawMedia: MediaPayload[] = Array.isArray(productsShowcaseData.mediaGallery)
            ? productsShowcaseData.mediaGallery
            : [];

        const normalizedMedia: ProductMediaItem[] = rawMedia
            .map(mapMediaPayloadToItem)
            .filter((item: ProductMediaItem) => item.url.length > 0);

        const normalizedImages = Array.isArray(productsShowcaseData.imageUrls)
            ? productsShowcaseData.imageUrls.filter((url: string) => typeof url === "string" && url.trim().length > 0)
            : [];

        if (normalizedMedia.length === 0) {
            if (productsShowcaseData.imageUrl) {
                normalizedMedia.push({ url: productsShowcaseData.imageUrl, type: "image" });
            }
            normalizedImages.forEach((url: string) => {
                if (!normalizedMedia.find((item) => item.url === url)) {
                    normalizedMedia.push({ url, type: "image" });
                }
            });
        }

        if (normalizedMedia.length === 0) {
            return NextResponse.json({ error: "Au moins un média (image ou vidéo) est requis" }, { status: 400 });
        }

        const imageOnlyList = normalizedMedia
            .filter((media) => media.type === "image")
            .map((media) => media.url);

        const primaryImage = imageOnlyList[0];
        const fallbackPrimary = normalizedMedia[0]?.url;

        productsShowcaseData.mediaGallery = normalizedMedia;
        productsShowcaseData.imageUrls = imageOnlyList.length > 0 ? imageOnlyList : normalizedImages;
        productsShowcaseData.imageUrl = primaryImage || fallbackPrimary || productsShowcaseData.imageUrl;

        // Si aucun ordre n'est fourni, assigner un ordre par défaut dans le bloc (dernier ordre du bloc + 1)
        // L'ordre commence à 1 pour chaque bloc
        if (productsShowcaseData.order === undefined || productsShowcaseData.order === null) {
          const maxOrderProduct = await ProductsShowcase.findOne({ 
            siteId: productsShowcaseData.siteId,
            blockId: productsShowcaseData.blockId 
          })
            .sort({ order: -1 })
            .select('order')
            .lean();
          const maxOrder = maxOrderProduct?.order ?? 0; // Si aucun produit n'a d'ordre, on commence à 0 pour que +1 = 1
          productsShowcaseData.order = maxOrder + 1; // L'ordre commence à 1
        }

        const newProductsShowcase = await ProductsShowcase.create(productsShowcaseData);
        // Convertit le document Mongoose en objet JavaScript simple pour garantir une sérialisation JSON correcte
        const productObject = newProductsShowcase.toObject();
        
        // Sérialise manuellement pour garantir que tous les sous-documents sont correctement convertis
        const serializedProduct: any = { ...productObject };
        if (serializedProduct.mediaGallery && Array.isArray(serializedProduct.mediaGallery)) {
          serializedProduct.mediaGallery = serializedProduct.mediaGallery.map((media: any) => {
            // Si c'est un objet Mongoose, on le convertit en objet simple
            if (media && typeof media.toObject === 'function') {
              return media.toObject();
            }
            // Sinon, on s'assure que c'est un objet simple avec url et type
            return {
              url: typeof media.url === 'string' ? media.url : String(media.url || ''),
              type: media.type || 'image'
            };
          });
        }
        
        console.log("Produit créé avec succès:", {
          _id: serializedProduct._id,
          mediaGalleryLength: serializedProduct.mediaGallery?.length || 0,
          mediaGallery: serializedProduct.mediaGallery,
        });
        return NextResponse.json(serializedProduct, { status: 201 });
    } catch (error) {
        console.error("Erreur dans createProductsShowcase:", error);
        return NextResponse.json({ error: "Une erreur est survenue lors du traitement de votre demande" }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('siteId') || undefined;
        // Trier d'abord par blockId, puis STRICTEMENT par ordre dans chaque bloc (les produits sans ordre sont en dernier)
        // IMPORTANT: Ne pas trier par createdAt pour préserver l'ordre défini par l'utilisateur
        // Utiliser une agrégation pour gérer les produits sans ordre
        const productsShowcase = await ProductsShowcase.aggregate([
            { $match: { siteId } },
            { $addFields: { 
                // Convertir blockId en nombre, avec gestion des erreurs
                __blockIdNum: {
                    $cond: {
                        if: { $eq: [{ $type: '$blockId' }, 'string'] },
                        then: {
                            $cond: {
                                if: { $regexMatch: { input: '$blockId', regex: /^\d+$/ } },
                                then: { $toInt: '$blockId' },
                                else: 999999
                            }
                        },
                        else: {
                            $cond: {
                                if: { $eq: [{ $type: '$blockId' }, 'number'] },
                                then: '$blockId',
                                else: 999999
                            }
                        }
                    }
                },
                // Utiliser l'ordre si défini, sinon mettre une valeur très élevée pour les mettre en dernier
                __orderEff: { $ifNull: ['$order', 999999999] } 
            } },
            { $sort: { __blockIdNum: 1, __orderEff: 1 } },
            { $project: { __blockIdNum: 0, __orderEff: 0 } }
        ]);
        if (!productsShowcase) {
            return NextResponse.json({ error: "Aucun produit showcase trouvé" }, { status: 404 });
        }
        // Utilise .lean() pour obtenir des objets JavaScript simples plutôt que des documents Mongoose
        // Cela garantit une sérialisation JSON correcte, notamment pour les champs imbriqués comme mediaGallery
        // Sérialise manuellement pour garantir que tous les sous-documents sont correctement convertis
        const serializedProducts = productsShowcase.map((product: any) => {
            // S'assure que mediaGallery est correctement sérialisé
            if (product.mediaGallery && Array.isArray(product.mediaGallery)) {
                product.mediaGallery = product.mediaGallery.map((media: any) => {
                    // Si c'est un objet Mongoose, on le convertit en objet simple
                    if (media && typeof media.toObject === 'function') {
                        return media.toObject();
                    }
                    // Sinon, on s'assure que c'est un objet simple avec url et type
                    return {
                        url: typeof media.url === 'string' ? media.url : String(media.url || ''),
                        type: media.type || 'image'
                    };
                });
            }
            // S'assurer que l'ordre est préservé (peut être null/undefined, c'est normal)
            const serialized = { ...product };
            if (product.order !== undefined && product.order !== null) {
                serialized.order = Number(product.order);
            }
            return serialized;
        });
        console.log("Produits sérialisés pour GET:", serializedProducts.map((p: any) => ({
            _id: p._id,
            title: p.title,
            blockId: p.blockId,
            order: p.order,
            mediaGalleryLength: p.mediaGallery?.length || 0,
        })));
        return NextResponse.json(serializedProducts, { status: 200 });
    } catch (error) {
        console.error("Erreur dans getProductsShowcase:", error);
        return NextResponse.json({ error: "Une erreur est survenue lors du traitement de votre demande" }, { status: 500 });
    }
}