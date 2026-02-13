import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ProductsShowcase } from '@/lib/models/ProductsShowcase';
import mongoose from 'mongoose';

/**
 * Route API pour réorganiser l'ordre des produits showcase dans un bloc
 * Accepte un tableau d'IDs ordonnés d'un même bloc et met à jour le champ 'order' de chaque produit
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderedIds, siteId, blockId } = body as { orderedIds?: string[]; siteId?: string; blockId?: string };

    if (!orderedIds || !Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: 'orderedIds est requis et doit être un tableau non vide' }, { status: 400 });
    }

    if (!siteId) {
      return NextResponse.json({ error: 'siteId est requis' }, { status: 400 });
    }

    if (!blockId) {
      return NextResponse.json({ error: 'blockId est requis' }, { status: 400 });
    }

    await connectToDatabase();

    // Vérifier que tous les produits appartiennent au même bloc
    const products = await ProductsShowcase.find({
      _id: { $in: orderedIds.map(id => new mongoose.Types.ObjectId(id)) },
      siteId
    }).select('blockId');

    console.log('Réorganisation des produits:', {
      blockId,
      siteId,
      orderedIds,
      produitsTrouves: products.map(p => ({ id: p._id, blockId: p.blockId }))
    });

    // Comparer les blockId en les convertissant en string pour éviter les problèmes de type
    const invalidProducts = products.filter(p => String(p.blockId) !== String(blockId));
    if (invalidProducts.length > 0) {
      console.error('Produits invalides trouvés:', invalidProducts);
      return NextResponse.json({ 
        error: 'Tous les produits doivent appartenir au même bloc',
        details: { 
          expectedBlockId: blockId, 
          invalidProducts: invalidProducts.map(p => ({ id: p._id, blockId: p.blockId }))
        }
      }, { status: 400 });
    }

    // Mettre à jour la position pour chaque produit du bloc, en conservant le siteId et blockId comme garde-fou
    // L'ordre commence à 1 (pas 0) pour chaque bloc
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id), siteId, blockId: String(blockId) },
        update: { $set: { order: index + 1, updatedAt: new Date() } },
      },
    }));

    console.log('Opérations de mise à jour:', bulkOps.map(op => ({
      filter: op.updateOne.filter,
      order: op.updateOne.update.$set.order
    })));

    if (bulkOps.length > 0) {
      const result = await ProductsShowcase.bulkWrite(bulkOps);
      console.log('Résultat de la mise à jour:', {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount
      });
      
      // Vérifier que l'ordre a bien été sauvegardé en récupérant les produits mis à jour
      const updatedProducts = await ProductsShowcase.find({
        _id: { $in: orderedIds.map(id => new mongoose.Types.ObjectId(id)) },
        siteId,
        blockId: String(blockId)
      }).select('_id title blockId order').lean().sort({ order: 1 });
      
      console.log('Vérification de l\'ordre sauvegardé:', updatedProducts.map((p: any) => ({
        id: p._id,
        title: p.title,
        blockId: p.blockId,
        order: p.order
      })));
      
      // Vérifier que tous les produits ont bien été mis à jour
      if (result.modifiedCount !== orderedIds.length) {
        console.warn(`⚠️ Attention: ${result.modifiedCount} produits modifiés sur ${orderedIds.length} attendus`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur lors du réordonnancement des produits showcase:', error);
    return NextResponse.json({ error: 'Erreur lors du réordonnancement des produits' }, { status: 500 });
  }
}

