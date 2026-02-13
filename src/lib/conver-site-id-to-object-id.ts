import { Site } from "@/lib/models/Site";

export const convertSiteIdToObjectId = async (siteId: string) => {
    const site = await Site.findOne({ siteId: siteId });
    if (site) {
        return site._id;
    } else {
        throw new Error("Site non trouvé");
    }
};