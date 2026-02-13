import { IBandePopulated } from "../models/types/populated";
import { LoadedBande } from "./loaded-bande-type";
import { toPascalCase } from "@/lib/to-pascal-case";
import { getSharedComponentLoader } from "./shared-component-manifest";


export const loadBandes = async (bandes: IBandePopulated[], siteId?: string | null): Promise<LoadedBande[]> => {
    try {
        const bandePromises: Array<Promise<LoadedBande | null>> = (bandes || []).map(async (bande): Promise<LoadedBande | null> => {
            try {
                const originalId = bande.abstractBandeId.originalId;
                let bandeModule: { default: React.ComponentType<Record<string, unknown>> };

                const manifestLoader = getSharedComponentLoader(originalId);
                if (manifestLoader) {
                    bandeModule = await manifestLoader();
                } else {
                    try {
                        bandeModule = await import(`@/_sharedComponents/${originalId}/page`);
                    } catch {
                        try {
                            const pascal = toPascalCase(originalId);
                            bandeModule = await import(`@/_sharedComponents/${pascal}/page`);
                        } catch (e) {
                            console.warn(`Bande "${originalId}" introuvable (aucun composant dans _sharedComponents). Ignorée.`);
                            return null;
                        }
                    }
                }

                const enhancedProps: LoadedBande["props"] = {
                    ...bande.values,
                    siteId: siteId ?? "",
                };

                const loaded: LoadedBande = {
                    Bande: bandeModule.default,
                    props: enhancedProps,
                    id: bande._id as string,
                    originalId: bande.abstractBandeId.originalId ?? undefined,
                    name: bande.abstractBandeId.name,
                };
                return loaded;
            } catch (err) {
                console.error(`Erreur lors du chargement du composant ${bande._id}:`, err);
                return null;
            }
        });

        if (bandePromises) {
            const loadedBandes = await Promise.all(bandePromises);
            const validBandes = loadedBandes.filter(
                (comp): comp is LoadedBande => comp !== null
            );
            return validBandes;
        } else {
            return [];
        }
    } catch (err) {
        console.error("Erreur lors du chargement des composants:", err);
        return [];
    }
};