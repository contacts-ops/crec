"use client";
type ProductMediaType = "image" | "video";

interface ProductMediaItem {
  url: string;
  type: ProductMediaType;
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Building,
  Package,
  Layers,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Euro,
  Calendar,
  Tag,
  CreditCard,
  Zap,
  Loader2,
  ExternalLink,
  Image,
  FileText,
  Upload,
  TrashIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface AdminShowcaseProps {
  siteId?: string;
  editableElements?: {
    [key: string]: string;
  };
}

// Interface basée sur le modèle ProductsShowcase
interface ProductShowcase {
  _id?: string;
  title: string;
  siteId: string;
  description: string;
  category: "Magasinage - de 3H/j" | "Magasinage intensif" | "Chariots 3 roues" | "Chariots électriques" | "Chariots diesel et gaz";
  blockId: string;
  imageUrl?: string;
  imageUrls?: string[];
  mediaGallery?: ProductMediaItem[];
  caracteristics: string[];
  dataSheetUrl?: string;
  altCtaText?: string;
  altCtaLink?: string;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface pour l'édition (avec champs optionnels)
interface EditingProduct {
  _id?: string;
  title?: string;
  siteId?: string;
  description?: string;
  category?: "Magasinage - de 3H/j" | "Magasinage intensif" | "Chariots 3 roues" | "Chariots électriques" | "Chariots diesel et gaz";
  blockId?: string;
  imageUrl?: string;
  imageUrls?: string[];
  mediaGallery?: ProductMediaItem[];
  caracteristics?: string[];
  dataSheetUrl?: string;
  altCtaText?: string;
  altCtaLink?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Valeurs par défaut pour les caractéristiques (affichées comme placeholders)
const DEFAULT_CARACTERISTICS: string[] = [
  "Caractéristique 1",
  "Caractéristique 2",
  "Caractéristique 3",
  "Caractéristique 4",
];

const isDefaultCaracteristics = (list?: string[]) => {
  if (!list) return false;
  if (list.length !== DEFAULT_CARACTERISTICS.length) return false;
  return list.every((v, i) => v === DEFAULT_CARACTERISTICS[i]);
};

const normalizeMediaType = (value: unknown): ProductMediaType =>
  value === "video" ? "video" : "image";

/**
 * Normalise les champs imageUrl / imageUrls / mediaGallery.
 * On renvoie une structure cohérente contenant mediaGallery, imageUrl et imageUrls.
 * Gère correctement les objets Mongoose non désérialisés.
 */
const normalizeProductMedia = <T extends { imageUrl?: string; imageUrls?: string[]; mediaGallery?: ProductMediaItem[] | any[] }>(item: T) => {
  // Normalise mediaGallery en gérant les objets Mongoose bruts
  let mediaGallery: ProductMediaItem[] = [];
  
  if (Array.isArray(item.mediaGallery) && item.mediaGallery.length > 0) {
    // Si mediaGallery existe et n'est pas vide, on le normalise
    mediaGallery = item.mediaGallery
      .map((media: any) => {
        // Gère les objets Mongoose (qui peuvent avoir .toObject() ou être des objets simples)
        // Aussi gère les cas où media est déjà un objet simple ou un sous-document Mongoose
        let url = "";
        let type = "image";
        
        // Si media est un objet Mongoose avec toObject()
        if (media && typeof media.toObject === 'function') {
          const mediaObj = media.toObject();
          url = mediaObj?.url || "";
          type = mediaObj?.type || "image";
        } 
        // Si media est un objet simple
        else if (media && typeof media === 'object') {
          url = media.url || media.get?.('url') || "";
          type = media.type || media.get?.('type') || "image";
        }
        // Si media est une string (ancien format)
        else if (typeof media === 'string') {
          url = media;
          type = "image";
        }
        
        return {
          url: typeof url === "string" ? url.trim() : "",
          type: normalizeMediaType(type),
        };
      })
      .filter((media: ProductMediaItem) => media.url.length > 0);
  }

  const imageUrls = (item.imageUrls ?? [])
    .filter((url) => typeof url === "string" && url.trim().length > 0)
    .map((url) => url.trim());
  // Si mediaGallery est vide après normalisation, on essaie de le reconstruire
  // à partir de imageUrl et imageUrls (pour compatibilité avec les anciennes données)
  if (mediaGallery.length === 0) {
    if (item.imageUrl) {
      mediaGallery.push({ url: item.imageUrl, type: "image" as const });
    }
    imageUrls.forEach((url) => {
      if (!mediaGallery.find((media) => media.url === url)) {
        mediaGallery.push({ url, type: "image" as const });
      }
    });
  }

  const imagesOnly = mediaGallery.filter((media) => media.type === "image").map((media) => media.url);
  const primaryImage = imagesOnly[0];
  const fallbackPrimary = mediaGallery[0]?.url || "";

  return {
    ...item,
    mediaGallery,
    imageUrls: imagesOnly,
    imageUrl: primaryImage || fallbackPrimary,
  };
};

const getMediaTypeFromFile = (file: File): ProductMediaType => {
  if (file.type.startsWith("video")) return "video";
  return "image";
};

const getMediaTypeFromUrl = (url: string): ProductMediaType => {
  const extension = url.split(".").pop()?.toLowerCase() ?? "";
  const videoExtensions = ["mp4", "webm", "ogg", "mov", "m4v"];
  return videoExtensions.includes(extension) ? "video" : "image";
};

const CATEGORIES = [
  "Magasinage - de 3H/j",
  "Magasinage intensif", 
  "Chariots 3 roues",
  "Chariots électriques",
  "Chariots diesel et gaz"
] as const;

export default function AdminShowcase({
  siteId,
  editableElements = {}
}: AdminShowcaseProps) {
  
  const [products, setProducts] = useState<ProductShowcase[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [success, setSuccess] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [stats, setStats] = useState({ totalProducts: 0, totalCategories: 0 });
  const [selectedCategory, setSelectedCategory] = useState<"" | typeof CATEGORIES[number]>("");
  // États pour l'upload de médias
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDataSheet, setUploadingDataSheet] = useState(false);
  // États pour la modal de visualisation des médias
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<ProductMediaItem[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  /**
   * Met à jour la galerie média de l'élément en cours d'édition
   * tout en conservant la synchronisation entre mediaGallery, imageUrl et imageUrls.
   */
  const updateEditingProductMedia = (updater: (current: ProductMediaItem[]) => ProductMediaItem[]) => {
    setEditingProduct((previous) => {
      if (!previous) return previous;
      const currentGallery: ProductMediaItem[] = (previous.mediaGallery ?? []).map((media) => ({
        url: media.url,
        type: normalizeMediaType(media.type),
      }));
      const updatedGalleryRaw = updater(currentGallery);
      const normalizedUpdatedGallery: ProductMediaItem[] = updatedGalleryRaw
        .map((media) => ({
          url: typeof media?.url === "string" ? media.url.trim() : "",
          type: normalizeMediaType(media?.type),
        }))
        .filter((media) => media.url.length > 0);
      return normalizeProductMedia({
        ...previous,
        mediaGallery: normalizedUpdatedGallery,
      });
    });
  };

  // Charger les produits au montage du composant
  useEffect(() => {
    if (siteId) {
      loadProducts();
    }
  }, [siteId]);
  // Navigation au clavier dans la modal de visualisation
  useEffect(() => {
    if (!showMediaViewer || viewingMedia.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setCurrentMediaIndex((prev) => (prev > 0 ? prev - 1 : viewingMedia.length - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentMediaIndex((prev) => (prev < viewingMedia.length - 1 ? prev + 1 : 0));
      } else if (e.key === "Escape") {
        setShowMediaViewer(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showMediaViewer, viewingMedia.length]);
  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/productsShowcase?siteId=${siteId}`);
      if (response.ok) {
        const data = await response.json();
        // Log pour déboguer - à retirer en production
        console.log("Produits bruts reçus de l'API:", data);
        const normalizedProducts: ProductShowcase[] = (data || []).map((product: ProductShowcase) => {
          // Log pour déboguer chaque produit avant normalisation
          console.log("Produit avant normalisation:", {
            _id: product._id,
            title: product.title,
            blockId: product.blockId,
            order: product.order,
            mediaGallery: product.mediaGallery,
            mediaGalleryType: typeof product.mediaGallery,
            mediaGalleryIsArray: Array.isArray(product.mediaGallery),
            mediaGalleryLength: Array.isArray(product.mediaGallery) ? product.mediaGallery.length : 0,
          });
          const normalized = normalizeProductMedia(product);
          // S'assurer que l'ordre est préservé lors de la normalisation
          if (product.order !== undefined && product.order !== null) {
            normalized.order = product.order;
          }
          // Log pour déboguer chaque produit après normalisation
          console.log("Produit après normalisation:", {
            _id: normalized._id,
            title: normalized.title,
            blockId: normalized.blockId,
            order: normalized.order,
            mediaGallery: normalized.mediaGallery,
            mediaGalleryLength: normalized.mediaGallery?.length || 0,
          });
          return normalized;
        });
        // Normaliser l'ordre pour qu'il soit toujours séquentiel (1, 2, 3, 4, 5...) dans chaque bloc
        // Grouper les produits par blockId
        const productsByBlock = new Map<string, ProductShowcase[]>();
        normalizedProducts.forEach(product => {
          const blockId = product.blockId || '';
          if (!productsByBlock.has(blockId)) {
            productsByBlock.set(blockId, []);
          }
          productsByBlock.get(blockId)!.push(product);
        });
        // Normaliser l'ordre dans chaque bloc pour qu'il soit séquentiel (1, 2, 3, 4, 5...)
        const normalizedWithSequentialOrder: ProductShowcase[] = [];
        productsByBlock.forEach((blockProducts, blockId) => {
          // Trier les produits du bloc par ordre actuel (ou par position dans le tableau si pas d'ordre)
          blockProducts.sort((a, b) => {
            const orderA = a.order ?? 999999;
            const orderB = b.order ?? 999999;
            return orderA - orderB;
          });
          // Réassigner un ordre séquentiel (1, 2, 3, 4, 5...)
          blockProducts.forEach((product, index) => {
            normalizedWithSequentialOrder.push({
              ...product,
              order: index + 1 // Ordre séquentiel qui commence à 1
            });
          });
        });
        // Trier les produits normalisés par blockId puis par ordre pour maintenir l'ordre global
        normalizedWithSequentialOrder.sort((a, b) => {
          const blockIdA = parseInt(a.blockId || '999999') || 999999;
          const blockIdB = parseInt(b.blockId || '999999') || 999999;
          if (blockIdA !== blockIdB) {
            return blockIdA - blockIdB;
          }
          return (a.order ?? 999999) - (b.order ?? 999999);
        });
        // Les produits arrivent déjà triés par l'API (blockId puis order)
        // On normalise l'ordre pour qu'il soit séquentiel dans chaque bloc
        setProducts(normalizedWithSequentialOrder);
        const items: ProductShowcase[] = normalizedWithSequentialOrder || [];
        const categoriesSet = new Set(items.map((p) => p.category).filter(Boolean));
        setStats({ totalProducts: items.length, totalCategories: categoriesSet.size });
        // Log pour vérifier l'ordre final
        console.log("Ordre final des produits chargés (normalisé):", normalizedWithSequentialOrder.map((p, idx) => ({
          index: idx,
          id: p._id,
          title: p.title,
          blockId: p.blockId,
          order: p.order
        })));
      } else {
        setError("Erreur lors du chargement des produits");
      }
    } catch (err) {
      setError("Erreur lors du chargement des produits");
    } finally {
      setLoading(false);
    }
  };

  // Fonction d'upload de média (image ou vidéo)
  const handleMediaUpload = async (file: File) => {
    if (!editingProduct || !siteId) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("media", file);
      formData.append("componentId", "adminShowcase");
      formData.append("fieldId", `product-${editingProduct._id || 'new'}-image`);
      formData.append("siteId", siteId);
      formData.append("pageId", "");
      const response = await fetch("/api/upload-media", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        console.log("URL du média uploadé :", data.mediaUrl);
        const mediaType = getMediaTypeFromFile(file);
        updateEditingProductMedia((current) => [...current, { url: data.mediaUrl, type: mediaType }]);
        setSuccess(mediaType === "video" ? "Vidéo uploadée avec succès !" : "Image uploadée avec succès !");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Erreur lors de l'upload du média");
      }
    } catch (err) {
      console.error("Erreur upload image:", err);
      setError("Erreur lors de l'upload du média");
    } finally {
      setUploadingImage(false);
    }
  };

  /**
   * Permet d'uploader plusieurs images en séquence pour conserver l'ordre.
   */
  const handleMultipleMediaUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      await handleMediaUpload(file);
    }
  };

  // Fonction d'upload de fiche technique
  const handleDataSheetUpload = async (file: File) => {
    if (!editingProduct || !siteId) return;

    try {
      setUploadingDataSheet(true);
      const formData = new FormData();
      formData.append("media", file);
      formData.append("componentId", "adminShowcase");
      formData.append("fieldId", `product-${editingProduct._id || 'new'}-datasheet`);
      formData.append("siteId", siteId);
      formData.append("pageId", "");
      const response = await fetch("/api/upload-media", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        console.log("URL de la fiche technique uploadée :", data.mediaUrl);
        setEditingProduct({ ...editingProduct, dataSheetUrl: data.mediaUrl });
        setSuccess("Fiche technique uploadée avec succès !");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Erreur lors de l'upload de la fiche technique");
      }
    } catch (err) {
      console.error("Erreur upload fiche technique:", err);
      setError("Erreur lors de l'upload de la fiche technique");
    } finally {
      setUploadingDataSheet(false);
    }
  };

  const openProductForm = (product?: ProductShowcase) => {
    if (product) {
      // Log pour déboguer - à retirer en production
      console.log("Produit chargé depuis la base:", {
        _id: product._id,
        mediaGallery: product.mediaGallery,
        imageUrls: product.imageUrls,
        imageUrl: product.imageUrl,
      });
    }
    
    const initial: EditingProduct = product
      ? normalizeProductMedia(product)
      : normalizeProductMedia({
          title: "",
          siteId: siteId || "",
          description: "",
          category: "Magasinage - de 3H/j",
          blockId: "1",
          imageUrl: "",
          imageUrls: [],
          mediaGallery: [],
          // Démarre avec 2 champs vides, l'utilisateur garde seulement ceux remplis
          caracteristics: ["", ""],
          dataSheetUrl: "",
          altCtaText: "",
          altCtaLink: "",
        });
    // Log après normalisation
    if (product) {
      console.log("Produit normalisé:", {
        _id: initial._id,
        mediaGallery: initial.mediaGallery,
        imageUrls: initial.imageUrls,
        imageUrl: initial.imageUrl,
      });
    }

    setEditingProduct(initial);
    setShowProductForm(true);
  };

  /**
   * Ouvre la modal de visualisation des médias avec navigation
   */
  const openMediaViewer = (mediaGallery: ProductMediaItem[], initialIndex: number = 0) => {
    if (!mediaGallery || mediaGallery.length === 0) return;
    console.log("Ouverture de la modal avec médias:", mediaGallery);
    setViewingMedia(mediaGallery);
    setCurrentMediaIndex(Math.max(0, Math.min(initialIndex, mediaGallery.length - 1)));
    setShowMediaViewer(true);
  };

  /**
   * Navigation vers le média précédent
   */
  const goToPreviousMedia = () => {
    setCurrentMediaIndex((prev) => (prev > 0 ? prev - 1 : viewingMedia.length - 1));
  };

  /**
   * Navigation vers le média suivant
   */
  const goToNextMedia = () => {
    setCurrentMediaIndex((prev) => (prev < viewingMedia.length - 1 ? prev + 1 : 0));
  };

  /**
   * Sauvegarde l'ordre des produits d'un bloc sur le serveur
   */
  const saveOrder = async (blockProducts: ProductShowcase[], blockId: string, newOrderedProducts: ProductShowcase[]) => {
    try {
      const orderedIds = blockProducts.map((p) => p._id?.toString()).filter(Boolean) as string[];
      
      console.log('Sauvegarde de l\'ordre pour le bloc:', {
        blockId,
        nombreProduits: blockProducts.length,
        orderedIds,
        produits: blockProducts.map((p, idx) => ({ id: p._id, title: p.title, blockId: p.blockId, order: idx, oldOrder: p.order }))
      });
      const response = await fetch('/api/productsShowcase/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          siteId: siteId,
          blockId: blockId,
          orderedIds: orderedIds,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erreur serveur:', errorData);
        throw new Error(errorData.error || 'Server error');
      }
      
      const result = await response.json();
      console.log('Ordre sauvegardé avec succès:', result);
      // Mettre à jour l'ordre local des produits dans newOrderedProducts pour refléter le nouvel ordre sauvegardé
      // IMPORTANT: On préserve l'ordre de newOrderedProducts (qui est déjà dans le bon ordre)
      // et on met juste à jour le champ 'order' pour chaque produit du bloc
      // L'ordre commence à 1 (pas 0) pour chaque bloc
      const updatedProducts = newOrderedProducts.map(p => {
        if (p.blockId === blockId) {
          // Trouver la nouvelle position dans blockProducts (qui est dans l'ordre final)
          const newOrderIndex = blockProducts.findIndex(bp => bp._id?.toString() === p._id?.toString());
          if (newOrderIndex !== -1) {
            // Mettre à jour l'ordre avec la nouvelle position + 1 (car l'ordre commence à 1, pas 0)
            // S'assurer que l'ordre ne dépasse jamais le nombre de produits dans le bloc
            const order = Math.min(newOrderIndex + 1, blockProducts.length);
            return { ...p, order };
          }
        }
        // Pour les produits d'autres blocs, on garde leur ordre actuel
        return p;
      });
      console.log('Produits mis à jour avec nouvel ordre:', updatedProducts
        .filter(p => p.blockId === blockId)
        .map(p => ({ id: p._id, title: p.title, order: p.order }))
        .sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999))
      );
      // Mettre à jour l'état local avec le nouvel ordre
      // newOrderedProducts est déjà dans le bon ordre, donc on l'utilise directement
      // mais on met à jour les valeurs 'order' pour qu'elles correspondent à la DB
      setProducts(updatedProducts);
      setSuccess('Ordre enregistré avec succès');
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error('Erreur réordonnancement:', error);
      setError("Impossible de changer l'ordre");
      setTimeout(() => setError(""), 3000);
      // En cas d'erreur, recharger pour revenir à l'état du serveur
      await loadProducts();
    }
  };

  /**
   * Déplacer un produit vers le haut (uniquement dans son bloc)
   */
  const moveUp = (id: string) => {
    setProducts((prev) => {
      // Trouver le produit dans le tableau complet
      const currentIndex = prev.findIndex((p) => p._id?.toString() === id);
      if (currentIndex <= 0) return prev;
      
      const currentProduct = prev[currentIndex];
      
      // Trouver le produit précédent dans le MÊME BLOC
      let previousIndex = -1;
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (prev[i].blockId === currentProduct.blockId) {
          previousIndex = i;
          break;
        }
      }
      
      if (previousIndex === -1) return prev; // Pas de produit précédent dans le même bloc
      
      // Échanger les produits
      const reordered = [...prev];
      [reordered[previousIndex], reordered[currentIndex]] = [reordered[currentIndex], reordered[previousIndex]];
      
      // Récupérer TOUS les produits du même bloc dans l'ordre où ils apparaissent maintenant
      const blockId = currentProduct.blockId;
      const blockProducts: ProductShowcase[] = [];
      reordered.forEach(p => {
        if (p.blockId === blockId) {
          blockProducts.push(p);
        }
      });
      // Sauvegarder l'ordre
      saveOrder(blockProducts, blockId, reordered);
      return reordered;
    });
  };

  /**
   * Déplacer un produit vers le bas (uniquement dans son bloc)
   */
  const moveDown = (id: string) => {
    setProducts((prev) => {
      // Trouver le produit dans le tableau complet
      const currentIndex = prev.findIndex((p) => p._id?.toString() === id);
      if (currentIndex === -1 || currentIndex >= prev.length - 1) return prev;
      
      const currentProduct = prev[currentIndex];
      
      // Trouver le produit suivant dans le MÊME BLOC
      let nextIndex = -1;
      for (let i = currentIndex + 1; i < prev.length; i++) {
        if (prev[i].blockId === currentProduct.blockId) {
          nextIndex = i;
          break;
        }
      }
      
      if (nextIndex === -1) return prev; // Pas de produit suivant dans le même bloc
      
      // Échanger les produits
      const reordered = [...prev];
      [reordered[currentIndex], reordered[nextIndex]] = [reordered[nextIndex], reordered[currentIndex]];
      
      // Récupérer TOUS les produits du même bloc dans l'ordre où ils apparaissent maintenant
      const blockId = currentProduct.blockId;
      const blockProducts: ProductShowcase[] = [];
      reordered.forEach(p => {
        if (p.blockId === blockId) {
          blockProducts.push(p);
        }
      });
      // Sauvegarder l'ordre
      saveOrder(blockProducts, blockId, reordered);
      return reordered;
    });
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const cleanedCaracteristics = (editingProduct.caracteristics || [])
      .filter((c) => c.trim() !== "");
    const mediaGallery = (editingProduct.mediaGallery || []).filter(
      (media) => media.url && media.url.trim() !== ""
    );
    if (mediaGallery.length === 0) {
      setError("Ajoutez au moins un média (image ou vidéo) avant d'enregistrer.");
      return;
    }

    const imagesOnly = mediaGallery.filter((media) => media.type === "image").map((media) => media.url);
    const productToSave: ProductShowcase = {
      _id: editingProduct._id,
      title: editingProduct.title || "",
      siteId: editingProduct.siteId || siteId || "",
      description: editingProduct.description || "",
      category: editingProduct.category || "Magasinage - de 3H/j",
      blockId: (editingProduct.blockId || "1").toString(),
      imageUrl: imagesOnly[0] || mediaGallery[0]?.url || "",
      imageUrls: imagesOnly,
      mediaGallery,
      caracteristics: cleanedCaracteristics,
      dataSheetUrl: editingProduct.dataSheetUrl || "",
      altCtaText: editingProduct.altCtaText || "",
      altCtaLink: editingProduct.altCtaLink || "",
      createdAt: editingProduct.createdAt,
      updatedAt: editingProduct.updatedAt
    };

    try {
      setLoading(true);
      const isEdit = !!productToSave._id;
      let response;
      
      if (isEdit) {
        response = await fetch(`/api/productsShowcase/${productToSave._id}`, {
          method: 'PUT', 
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productToSave),
        });
      }

      else {
        response = await fetch('/api/productsShowcase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productToSave),
        });
      }

      if (response.ok) {
        setSuccess(isEdit ? "Produit mis à jour avec succès" : "Produit créé avec succès");
        setEditingProduct(null);
        setShowProductForm(false);
        await loadProducts(); // Recharger la liste
        setTimeout(() => setSuccess(""), 5000);
      } else {
        try {
        const errorData = await response.json();
        setError(errorData.error || "Erreur lors de la sauvegarde");
        } catch (jsonError) {
          console.error("Erreur lors du parsing JSON:", jsonError);
          setError(`Erreur serveur (${response.status}): ${response.statusText}`);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde du produit:', err);
      setError("Erreur lors de la sauvegarde du produit");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
      try {
        setLoading(true);
        const response = await fetch(`/api/productsShowcase/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setSuccess("Produit supprimé avec succès");
          await loadProducts(); // Recharger la liste
          setTimeout(() => setSuccess(""), 3000);
        } else {
          setError("Erreur lors de la suppression du produit");
        }
      } catch (err) {
        console.error('Erreur lors de la suppression du produit:', err);
        setError("Erreur lors de la suppression du produit");
      } finally {
        setLoading(false);
      }
    }
  };

    const filteredProducts = products.filter((p) => (selectedCategory === "" ? true : p.category === selectedCategory));
    return (
    <div className="p-6" data-type="service">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
        <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Gestion des Produits 
              </h2>
              <p className="text-gray-600">
                Gérez vos produits par catégorie.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => openProductForm()}
                variant="outline"
                disabled={loading}
              >
                <Plus className="w-4 h-4" />
                Ajouter un produit
              </Button>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Produits</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Catégories</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCategories}</p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Layers className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filtre par état (catégorie) */}
          <div className="px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm font-medium text-gray-700">Filtrer par catégorie</div>
            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
              >
                <option value="">Toutes les catégories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Tableau des produits showcase */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2">Chargement des produits...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                Aucun produit trouvé. Cliquez sur "Ajouter un produit" pour commencer.
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Titre</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Catégorie</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Bloc</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Image</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Fiche technique</th>
                    {selectedCategory !== "" && (
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Ordre</th>
                    )}
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, index) => (
                    <tr key={product._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{product.title}</div>
                        {product.caracteristics && product.caracteristics.length > 0 && (
                          <div className="mt-1">
                            <p className="text-xs text-gray-500 mb-1">Caractéristiques :</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {product.caracteristics.slice(0, 2).map((caracteristique: string, index: number) => (
                                <li key={index} className="flex items-start gap-1">
                                  <span className="text-gray-500 mt-1">•</span>
                                  <span>{caracteristique}</span>
                                </li>
                              ))}
                              {product.caracteristics.length > 2 && (
                                <li className="text-gray-400 italic">
                                  +{product.caracteristics.length - 2} autres...
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {product.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-900 text-sm">{product.blockId}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm max-w-xs">
                        <div className="truncate" title={product.description}>
                          {product.description}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {product.mediaGallery && product.mediaGallery.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                              {product.mediaGallery[0].type === "video" ? (
                                <video
                                  src={product.mediaGallery[0].url}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLVideoElement).style.display = "none";
                                    (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove("hidden");
                                  }}
                                  muted
                                />
                              ) : (
                                <img
                                  src={product.mediaGallery[0].url}
                                  alt={product.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    e.currentTarget.nextElementSibling?.classList.remove("hidden");
                                  }}
                                />
                              )}
                              <div className="hidden w-full h-full items-center justify-center bg-gray-100">
                                <Image className="w-4 h-4 text-gray-400" />
                              </div>
                              {product.mediaGallery.length > 1 && (
                                <span className="absolute bottom-1 right-1 rounded bg-gray-900/70 px-1 text-[10px] font-medium text-white">
                                  +{product.mediaGallery.length - 1}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => openMediaViewer(product.mediaGallery || [], 0)}
                              className="text-blue-600 hover:text-blue-800 text-xs underline"
                            >
                              {product.mediaGallery[0].type === "video" ? "Voir la vidéo" : "Voir en grand"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-12 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                              <Image className="w-4 h-4 text-gray-400" />
                            </div>
                            <span className="text-gray-400 text-xs">Aucune image</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {product.dataSheetUrl ? (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <a 
                              href={product.dataSheetUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              Voir la fiche
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Aucune fiche</span>
                        )}
                      </td>
                      {selectedCategory !== "" && (
                        <td className="py-3 px-4">
                          <div className="flex flex-col items-center gap-1">
                            {(() => {
                              // Calculer la position dans le bloc FILTRÉ par catégorie
                              // Ainsi, l'ordre recommence à 1 pour chaque bloc dans la catégorie sélectionnée
                              const productsInBlock = filteredProducts.filter(p => p.blockId === product.blockId);
                              const positionInBlock = productsInBlock.findIndex(p => p._id === product._id) + 1;
                              const isFirstInBlock = positionInBlock === 1;
                              const isLastInBlock = positionInBlock === productsInBlock.length;
                              
                              // Désactiver les boutons si aucune catégorie spécifique n'est sélectionnée
                              const isCategorySelected = Boolean(selectedCategory);
                              const isMoveUpDisabled = !isCategorySelected || isFirstInBlock;
                              const isMoveDownDisabled = !isCategorySelected || isLastInBlock;
                              
                              return (
                                <>
                                  <button
                                    onClick={() => moveUp(product._id?.toString() || '')}
                                    disabled={isMoveUpDisabled}
                                    className="flex items-center justify-center p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded transition-all duration-200 hover:shadow-sm border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={isCategorySelected ? "Monter dans le bloc" : "Sélectionnez une catégorie pour réorganiser"}
                                  >
                                    <ArrowUp className="w-4 h-4" />
                                  </button>
                                  <span className="text-sm text-gray-600 font-medium min-w-[2ch] text-center" title={`Position ${positionInBlock} dans le bloc ${product.blockId}`}>
                                    {positionInBlock}
                                  </span>
                                  <button
                                    onClick={() => moveDown(product._id?.toString() || '')}
                                    disabled={isMoveDownDisabled}
                                    className="flex items-center justify-center p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded transition-all duration-200 hover:shadow-sm border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={isCategorySelected ? "Descendre dans le bloc" : "Sélectionnez une catégorie pour réorganiser"}
                                  >
                                    <ArrowDown className="w-4 h-4" />
                                  </button>
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openProductForm(product)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product._id?.toString() || '')}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Product Form Modal */}
        <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
          <DialogContent className="w-[95vw] max-w-[520px] sm:max-w-[640px] md:max-w-[720px] lg:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct?._id ? "Modifier le produit" : "Ajouter un produit"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct?._id 
                  ? "Modifiez les informations du produit."
                  : "Ajoutez un nouveau produit à votre catalogue."
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Titre</Label>
                  <Input
                    id="title"
                    value={editingProduct?.title || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct!, title: e.target.value })}
                    required
                    placeholder="Nom du produit"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Catégorie</Label>
                  <Select 
                    value={editingProduct?.category || "Magasinage - de 3H/j"} 
                    onValueChange={(value) => setEditingProduct({ ...editingProduct!, category: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="blockId">Identifiant du bloc</Label>
                  <Input
                    id="blockId"
                    type="number"
                    value={editingProduct?.blockId || "1"}
                    onChange={(e) => setEditingProduct({ ...editingProduct!, blockId: e.target.value })}
                    placeholder="Ex: 1"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingProduct?.description || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct!, description: e.target.value })}
                  rows={3}
                  placeholder="Description du produit"
                  required
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Caractéristiques du produit</Label>
                </div>
                <div className="space-y-2">
                  {editingProduct?.caracteristics?.map((caracteristique: string, index: number) => (
                    <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Input
                        value={caracteristique}
                        onChange={(e) => {
                          const current = editingProduct!.caracteristics || [];
                          const newCaracteristiques = [...current];
                          newCaracteristiques[index] = e.target.value;
                          setEditingProduct({
                            ...editingProduct!,
                            caracteristics: newCaracteristiques,
                          });
                        }}
                        placeholder={DEFAULT_CARACTERISTICS[index] || "Caractéristique"}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newCaracteristiques = (editingProduct!.caracteristics || []).filter((_: string, i: number) => i !== index);
                          setEditingProduct({ 
                            ...editingProduct!, 
                            caracteristics: newCaracteristiques 
                          });
                        }}
                        className=""
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const current = editingProduct!.caracteristics || [];
                      const newCaracteristiques = [...current, ""];
                      setEditingProduct({
                        ...editingProduct!,
                        caracteristics: newCaracteristiques,
                      });
                    }}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une caractéristique
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Ajoutez les caractéristiques techniques du produit
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Galerie média</Label>
                  <div className="space-y-3">
                    {editingProduct?.mediaGallery && editingProduct.mediaGallery.length > 0 ? (
                      <div className="space-y-3">
                        {editingProduct.mediaGallery.map((media, index) => (
                          <div key={`${media.url}-${index}`} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Image className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm font-medium text-gray-700">
                                    {index === 0 ? "Média principal" : `Média ${index + 1}`}
                                    {media.type === "video" ? " (vidéo)" : ""}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {index > 0 && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        updateEditingProductMedia((current) => {
                                          const next = [...current];
                                          const [selected] = next.splice(index, 1);
                                          next.unshift(selected);
                                          return next;
                                        })
                                      }
                                    >
                                      Définir principale
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateEditingProductMedia((current) =>
                                        current.filter((_, idx) => idx !== index)
                                      )
                                    }
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              {media.type === "video" ? (
                                <video
                                  src={media.url}
                                  controls
                                  className="w-full h-40 object-cover rounded border"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLVideoElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <img
                                  src={media.url}
                                  alt={`Aperçu du produit ${index + 1}`}
                                  className="w-full h-40 object-cover rounded border"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Image className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-600 mb-3">Ajoutez le premier média du produit (image ou vidéo)</p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById("image-upload")?.click()}
                          disabled={uploadingImage}
                        >
                          {uploadingImage ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Upload...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Ajouter un média
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("image-upload")?.click()}
                      disabled={uploadingImage}
                      className="w-full"
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Téléversement en cours...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          {editingProduct?.mediaGallery && editingProduct.mediaGallery.length > 0
                            ? "Ajouter un nouveau média"
                            : "Ajouter un média"}
                        </>
                      )}
                    </Button>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          await handleMultipleMediaUpload(files);
                          e.target.value = "";
                        }
                      }}
                    />
                    <p className="text-xs text-gray-500">
                      Formats acceptés : images (JPG, PNG, GIF, WebP, SVG) et vidéos (MP4, WebM, MOV). Le premier média est utilisé comme miniature principale.
                    </p>
                  </div>
                </div>
                <div>
                  <Label>Fiche technique</Label>
                  <div className="space-y-3">
                    {editingProduct?.dataSheetUrl ? (
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Fiche technique actuelle</span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingProduct({ ...editingProduct!, dataSheetUrl: "" })}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white rounded border">
                          <FileText className="w-8 h-8 text-red-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Document PDF</p>
                            <p className="text-xs text-gray-500">Fiche technique du produit</p>
                          </div>
                          <a 
                            href={editingProduct.dataSheetUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Ouvrir
                          </a>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('datasheet-upload')?.click()}
                            disabled={uploadingDataSheet}
                            className="flex-1"
                          >
                            {uploadingDataSheet ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Remplacement...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Remplacer la fiche
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-600 mb-3">Aucune fiche technique sélectionnée</p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('datasheet-upload')?.click()}
                          disabled={uploadingDataSheet}
                        >
                          {uploadingDataSheet ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Upload...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Ajouter une fiche technique
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    <input
                      id="datasheet-upload"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDataSheetUpload(file);
                      }}
                    />
                    <p className="text-xs text-gray-500">
                      Formats acceptés : PDF, DOC, DOCX (max 10MB)
                    </p>
                  </div>
                </div>
                
                {/* Bouton alternatif si pas de fiche technique */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Bouton alternatif (si pas de fiche technique)</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="altCtaText">Texte du bouton</Label>
                      <Input
                        id="altCtaText"
                        value={editingProduct?.altCtaText || ""}
                        onChange={(e) => setEditingProduct({ ...editingProduct!, altCtaText: e.target.value })}
                        placeholder="Ex: Contactez-nous"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Si rempli, ce bouton remplacera "Fiche technique" quand aucune fiche n'est définie
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="altCtaLink">Lien du bouton</Label>
                      <Input
                        id="altCtaLink"
                        value={editingProduct?.altCtaLink || ""}
                        onChange={(e) => setEditingProduct({ ...editingProduct!, altCtaLink: e.target.value })}
                        placeholder="Ex: /contact ou https://..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Lien vers lequel le bouton pointera
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowProductForm(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="default" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingProduct?._id ? "Modification..." : "Création..."}
                    </>
                  ) : (
                    editingProduct?._id ? "Modifier" : "Ajouter"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de visualisation des médias */}
        <Dialog open={showMediaViewer} onOpenChange={setShowMediaViewer}>
          <DialogContent className="!w-[95vw] !max-w-[95vw] !h-[90vh] !max-h-[90vh] p-0 overflow-hidden !translate-x-[-50%] !translate-y-[-50%] !left-[50%] !top-[50%] !border-0 !bg-white !shadow-lg !grid-cols-1 [&>button]:hidden">
            <div className="relative w-full h-full flex items-center justify-center bg-white rounded-lg">
              {/* Bouton de fermeture */}
              <button
                onClick={() => setShowMediaViewer(false)}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/90 hover:bg-gray-100 border border-gray-200 text-gray-700 transition-colors shadow-sm"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Bouton précédent */}
              {viewingMedia.length > 1 && (
                <button
                  onClick={goToPreviousMedia}
                  className="absolute left-4 z-50 p-3 rounded-full bg-white/90 hover:bg-gray-100 border border-gray-200 text-gray-700 transition-colors shadow-sm"
                  aria-label="Média précédent"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Contenu média */}
              {viewingMedia.length > 0 && viewingMedia[currentMediaIndex] && (
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8">
                  {viewingMedia[currentMediaIndex].type === "video" ? (
                    <video
                      src={viewingMedia[currentMediaIndex].url}
                      controls
                      autoPlay
                      className="max-w-full max-h-[85vh] object-contain z-10 rounded-lg"
                      onError={(e) => {
                        console.error("Erreur lors du chargement de la vidéo:", e);
                      }}
                    />
                  ) : (
                    <img
                      src={viewingMedia[currentMediaIndex].url}
                      alt={`Média ${currentMediaIndex + 1}`}
                      className="max-w-full max-h-[85vh] object-contain z-10 rounded-lg shadow-lg"
                      onError={(e) => {
                        console.error("Erreur lors du chargement de l'image:", e);
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </div>
              )}

              {/* Bouton suivant */}
              {viewingMedia.length > 1 && (
                <button
                  onClick={goToNextMedia}
                  className="absolute right-4 z-50 p-3 rounded-full bg-white/90 hover:bg-gray-100 border border-gray-200 text-gray-700 transition-colors shadow-sm"
                  aria-label="Média suivant"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              {/* Indicateur de position (ex: 1/3) */}
              {viewingMedia.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-white/90 border border-gray-200 text-gray-700 text-sm shadow-sm">
                  {currentMediaIndex + 1} / {viewingMedia.length}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
        </div>
    );
}