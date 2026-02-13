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

// GET - Récupérer un produit par ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    // Utilise .lean() pour obtenir un objet JavaScript simple plutôt qu'un document Mongoose
    // Cela garantit une sérialisation JSON correcte, notamment pour les champs imbriqués comme mediaGallery
    const product = await ProductsShowcase.findById(id).lean();
    if (!product) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }
    
    // Sérialise manuellement pour garantir que tous les sous-documents sont correctement convertis
    const serializedProduct: any = { ...product };
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
    
    return NextResponse.json(serializedProduct, { status: 200 });
  } catch (error) {
    console.error("Erreur dans getProductShowcase:", error);
    return NextResponse.json({ error: "Une erreur est survenue lors du traitement de votre demande" }, { status: 500 });
  }
}

// PATCH - Mettre à jour une caractéristique d'un produit
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const updateData = await request.json();
    
    console.log("Données reçues pour la mise à jour de la caractéristique:", updateData);
    
    // Validation des données requises
    if (!updateData.caracteristics) {
      return NextResponse.json({ error: "Les caractéristiques sont requises" }, { status: 400 });
    }
    
    // Utilise .lean() pour obtenir un objet JavaScript simple plutôt qu'un document Mongoose
    const updatedProduct = await ProductsShowcase.findByIdAndUpdate(
      id,
      {
        caracteristics: updateData.caracteristics,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).lean();
    
    if (!updatedProduct) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }
    
    console.log("Caractéristique mise à jour avec succès:", updatedProduct);
    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (error) {
    console.error("Erreur dans updateCaracteristicProductShowcase:", error);
    return NextResponse.json({ error: "Une erreur est survenue lors de la mise à jour de la caractéristique du produit" }, { status: 500 });
  }
}

// PUT - Mettre à jour un produit
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const updateData = await request.json();
    
    console.log("Données reçues pour la mise à jour du produit:", updateData);
    
    // Validation des données requises
    if (!updateData.title) {
      return NextResponse.json({ error: "Le titre est requis" }, { status: 400 });
    }
    if (!updateData.category) {
      return NextResponse.json({ error: "La catégorie est requise" }, { status: 400 });
    }
    if (!updateData.description) {
      return NextResponse.json({ error: "La description est requise" }, { status: 400 });
    }
    const normalizedMedia: ProductMediaItem[] = Array.isArray(updateData.mediaGallery)
      ? updateData.mediaGallery
          .map(mapMediaPayloadToItem)
          .filter((item: ProductMediaItem) => item.url.length > 0)
      : [];

    const normalizedImages = Array.isArray(updateData.imageUrls)
      ? updateData.imageUrls.filter((url: string) => typeof url === "string" && url.trim().length > 0)
      : [];

    if (normalizedMedia.length === 0) {
      if (updateData.imageUrl) {
        normalizedMedia.push({ url: updateData.imageUrl, type: "image" });
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

    updateData.mediaGallery = normalizedMedia;
    updateData.imageUrls = imageOnlyList;
    updateData.imageUrl = primaryImage || fallbackPrimary || updateData.imageUrl;
    
    console.log("Données normalisées avant sauvegarde:", {
      mediaGalleryLength: normalizedMedia.length,
      mediaGallery: normalizedMedia,
      imageUrlsLength: imageOnlyList.length,
    });
    
    // Utilise .lean() pour obtenir un objet JavaScript simple plutôt qu'un document Mongoose
    // Cela garantit une sérialisation JSON correcte, notamment pour les champs imbriqués comme mediaGallery
    const updatedProduct = await ProductsShowcase.findByIdAndUpdate(
      id,
      {
        title: updateData.title,
        siteId: updateData.siteId,
        description: updateData.description,
        category: updateData.category,
        blockId: updateData.blockId,
        imageUrl: updateData.imageUrl,
        imageUrls: updateData.imageUrls,
        mediaGallery: updateData.mediaGallery,
        caracteristics: updateData.caracteristics,
        dataSheetUrl: updateData.dataSheetUrl,
        altCtaText: updateData.altCtaText,
        altCtaLink: updateData.altCtaLink,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).lean();
    
    if (!updatedProduct) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }
    
    // Sérialise manuellement pour garantir que tous les sous-documents sont correctement convertis
    const serializedProduct: any = { ...updatedProduct };
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
    
    console.log("Produit mis à jour avec succès:", {
      _id: serializedProduct._id,
      mediaGalleryLength: serializedProduct.mediaGallery?.length || 0,
      mediaGallery: serializedProduct.mediaGallery,
    });
    return NextResponse.json(serializedProduct, { status: 200 });
  } catch (error) {
    console.error("Erreur dans updateProductShowcase:", error);
    return NextResponse.json({ error: "Une erreur est survenue lors de la mise à jour du produit" }, { status: 500 });
  }
}

// DELETE - Supprimer un produit
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    const deletedProduct = await ProductsShowcase.findByIdAndDelete(id);
    if (!deletedProduct) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }
    
    console.log("Produit supprimé avec succès:", deletedProduct);
    return NextResponse.json({ message: "Produit supprimé avec succès" }, { status: 200 });
  } catch (error) {
    console.error("Erreur dans deleteProductShowcase:", error);
    return NextResponse.json({ error: "Une erreur est survenue lors de la suppression du produit" }, { status: 500 });
  }
}
