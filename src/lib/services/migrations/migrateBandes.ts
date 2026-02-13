import { Types } from "mongoose";
import { connectToDatabase } from "../../db";
import { Page } from "../../models/Page";
import { Bande } from "../../models/Bande";
import { AbstractBande } from "../../models/AbstractBande";
import { Site } from "../../models/Site";

type LegacyComponent = {
  id: string;
  originalId?: string;
  name: string;
  type: string;
  service?: string;
  thumbnail: string;
  isImported: boolean;
  props: Record<string, unknown>;
};

export async function migrateBandes({ dryRun = true }: { dryRun?: boolean } = {}) {
  await connectToDatabase();

  const pages = await Page.find({}).lean();

  let totalPages = 0;
  let totalComponents = 0;
  let createdBandes = 0;
  let reusedBandes = 0;
  let pagesWithInvalidSiteId = 0;

  // Map pour stocker les bandes déjà créées par site et originalId
  const existingBandesMap = new Map<string, Types.ObjectId>();
  // Cache pour résoudre les sites une seule fois par siteId (string)
  const siteIdCache = new Map<string, Types.ObjectId | null>();

  async function resolveSiteObjectIdBySiteId(siteIdString: string): Promise<Types.ObjectId | null> {
    if (siteIdCache.has(siteIdString)) {
      return siteIdCache.get(siteIdString) ?? null;
    }
    try {
      const site = await Site.findOne({ siteId: String(siteIdString) }).select("_id");
      const objId = site ? ((site as any)._id as unknown as Types.ObjectId) : null;
      siteIdCache.set(siteIdString, objId);
      return objId;
    } catch (error) {
      console.warn(`Erreur lors de la recherche du site ${siteIdString}:`, error);
      siteIdCache.set(siteIdString, null);
      return null;
    }
  }

  for (const page of pages) {
    // Skip if already migrated (bandes exist and not empty)
    if (Array.isArray((page as any).bandes) && (page as any).bandes.length > 0) {
      continue;
    }

    // Read legacy embedded components if present
    const legacyComponents: LegacyComponent[] = Array.isArray((page as any).components)
      ? ((page as any).components as LegacyComponent[])
      : [];

    if (!legacyComponents.length) continue;
    totalPages += 1;
    totalComponents += legacyComponents.length;

    const newBandeIds: Types.ObjectId[] = [];

    // Vérification du site avant toute migration de bandes pour la page
    const siteIdValForPage = (page as any).siteId;
    let siteObjIdForPage: Types.ObjectId | null = null;
    if (siteIdValForPage) {
      siteObjIdForPage = await resolveSiteObjectIdBySiteId(String(siteIdValForPage));
      if (!siteObjIdForPage) {
        pagesWithInvalidSiteId += 1;
        console.warn(
          `Site introuvable pour page=${(page as any)._id?.toString?.() ?? "unknown"} avec siteId=${siteIdValForPage}. Migration des bandes pour cette page ignorée.`
        );
        continue; // On ignore complètement cette page si le site est invalide
      }
    }

    for (const component of legacyComponents) {

      // Resolve existing AbstractBande id
      const existingAbstract = await AbstractBande.findOne({
        originalId: component.originalId
      })
        .select("_id")
        .exec();

      let abstractId: Types.ObjectId;
      abstractId = existingAbstract?._id as unknown as Types.ObjectId;
      if (!abstractId) {
        throw new Error(`AbstractBande not found for ${component.originalId}`);
      }

      // Site déjà validé au niveau de la page
      const siteObjId = siteObjIdForPage ?? undefined;

      // Créer une clé unique pour identifier les bandes similaires
      // const bandeKey = `${siteObjId || 'global'}_${component.originalId}_${JSON.stringify(component.props)}`;
      const bandeKey = `${siteObjId || 'global'}_${component.originalId}`;
      
      if (dryRun) {
        // En mode dry-run, vérifier si la bande existe déjà
        if (existingBandesMap.has(bandeKey)) {
          reusedBandes += 1;
        } else {
          createdBandes += 1;
          existingBandesMap.set(bandeKey, new Types.ObjectId());
        }
        continue;
      }

      // Vérifier si une bande similaire existe déjà
      let bandeId = existingBandesMap.get(bandeKey);
      
      if (!bandeId) {
        // Créer une nouvelle bande seulement si elle n'existe pas
        const bande = await Bande.create({
          abstractBandeId: abstractId,
          siteId: siteObjId,
          global: false,
          values: component.props ?? {},
          isValid: false,
        });
        bandeId = bande._id as unknown as Types.ObjectId;
        existingBandesMap.set(bandeKey, bandeId);
        createdBandes += 1;
      } else {
        reusedBandes += 1;
      }
      
      newBandeIds.push(bandeId);
    }

    if (!dryRun) {
      await Page.updateOne(
        { _id: page._id },
        { $set: { bandes: newBandeIds } }
      );
    }
  }

  return { totalPages, totalComponents, createdBandes, reusedBandes, dryRun, pagesWithInvalidSiteId };
}


