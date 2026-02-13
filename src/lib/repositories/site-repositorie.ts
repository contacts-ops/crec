import { Site } from "@/lib/models/Site";

export const getSiteName = async (siteIdString: string): Promise<string> => {
    const site = await Site.findOne({ siteId: siteIdString });
    return site?.name || 'Site';
};
