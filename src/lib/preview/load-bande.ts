import { IBandePopulated } from "../models/types/populated";
import { LoadedBande } from "./loaded-bande-type";

export const loadBande = async (
    bande: IBandePopulated,
    siteId?: string | null
): Promise<LoadedBande | null> => {
    try {
        const originalId = bande.abstractBandeId.originalId;
        let bandeModule: { default: React.ComponentType<Record<string, unknown>> };

        try {
            bandeModule = await import(`@/_sharedComponents/${originalId}/page`);
        } catch (e) {
            const { toPascalCase } = await import("@/lib/to-pascal-case");
            const pascal = toPascalCase(originalId);
            bandeModule = await import(`@/_sharedComponents/${pascal}/page`);
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
        console.error(`Erreur lors du chargement du composant ${bande?._id}:`, err);
        return null;
    }
};


