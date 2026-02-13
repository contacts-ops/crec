import { Types } from "mongoose";
import { connectToDatabase } from "../../db";
import { Bande } from "../../models/Bande";
import { AbstractBande } from "../../models/AbstractBande";

interface BandeAnalysis {
  totalBandes: number;
  uniqueBandes: number;
  duplicates: Array<{
    originalId: string;
    siteId: string;
    props: Record<string, unknown>;
    count: number;
    bandeIds: string[];
  }>;
  potentialSavings: number;
}

export async function analyzeBandes(): Promise<BandeAnalysis> {
  await connectToDatabase();

  // Récupérer toutes les bandes avec leurs relations
  const bandes = await Bande.find({})
    .populate('abstractBandeId', 'originalId name')
    .populate('siteId', 'siteId')
    .lean();

  const bandeMap = new Map<string, {
    originalId: string;
    siteId: string;
    props: Record<string, unknown>;
    bandeIds: string[];
  }>();

  // Grouper les bandes par clé unique
  for (const bande of bandes) {
    const abstractBande = bande.abstractBandeId as any;
    const site = bande.siteId as any;
    
    const key = `${site?.siteId || 'global'}_${abstractBande?.originalId}_${JSON.stringify(bande.values)}`;
    
    if (!bandeMap.has(key)) {
      bandeMap.set(key, {
        originalId: abstractBande?.originalId || 'unknown',
        siteId: site?.siteId || 'global',
        props: bande.values || {},
        bandeIds: []
      });
    }
    
    bandeMap.get(key)!.bandeIds.push(bande._id.toString());
  }

  // Analyser les doublons
  const duplicates: Array<{
    originalId: string;
    siteId: string;
    props: Record<string, unknown>;
    count: number;
    bandeIds: string[];
  }> = [];

  let potentialSavings = 0;

  for (const [key, bandeGroup] of bandeMap) {
    if (bandeGroup.bandeIds.length > 1) {
      duplicates.push({
        originalId: bandeGroup.originalId,
        siteId: bandeGroup.siteId,
        props: bandeGroup.props,
        count: bandeGroup.bandeIds.length,
        bandeIds: bandeGroup.bandeIds
      });
      potentialSavings += bandeGroup.bandeIds.length - 1; // -1 car on garde une bande
    }
  }

  return {
    totalBandes: bandes.length,
    uniqueBandes: bandeMap.size,
    duplicates,
    potentialSavings
  };
}

export async function getBandeUsageStats(): Promise<{
  mostUsedBandes: Array<{
    originalId: string;
    name: string;
    usageCount: number;
  }>;
  bandesByType: Record<string, number>;
}> {
  await connectToDatabase();

  // Récupérer les statistiques d'utilisation
  const usageStats = await Bande.aggregate([
    {
      $lookup: {
        from: 'abstract_bande',
        localField: 'abstractBandeId',
        foreignField: '_id',
        as: 'abstractBande'
      }
    },
    {
      $unwind: '$abstractBande'
    },
    {
      $group: {
        _id: '$abstractBande.originalId',
        name: { $first: '$abstractBande.name' },
        usageCount: { $sum: 1 }
      }
    },
    {
      $sort: { usageCount: -1 }
    },
    {
      $limit: 10
    }
  ]);

  // Récupérer les bandes par type
  const bandesByType = await Bande.aggregate([
    {
      $lookup: {
        from: 'abstract_bande',
        localField: 'abstractBandeId',
        foreignField: '_id',
        as: 'abstractBande'
      }
    },
    {
      $unwind: '$abstractBande'
    },
    {
      $group: {
        _id: '$abstractBande.type',
        count: { $sum: 1 }
      }
    }
  ]);

  const bandesByTypeMap: Record<string, number> = {};
  for (const item of bandesByType) {
    bandesByTypeMap[item._id] = item.count;
  }

  return {
    mostUsedBandes: usageStats.map(stat => ({
      originalId: stat._id,
      name: stat.name,
      usageCount: stat.usageCount
    })),
    bandesByType: bandesByTypeMap
  };
}
