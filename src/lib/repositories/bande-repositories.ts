import { Page } from "@/lib/models/Page";
import mongoose from "mongoose";
import { AbstractBande } from "@/lib/models/AbstractBande";
import { Bande } from "@/lib/models/Bande";
import  "@/lib/models/User";


export const getPopulatedBande = async (bandeId: mongoose.Types.ObjectId) => {
    return await Bande.findById(bandeId)
        .populate("abstractBandeId")
        .populate({
            path: "abstractBandeId.tester",
            select: "_id firstName lastName email"
        })
        .lean();
};

export const addBandeToAllPages = async (bandeId: mongoose.Types.ObjectId, siteIdString: string) => {
    const pages = await Page.find({
        siteId: siteIdString,
        slug: { $not: { $regex: /(admin|login|reset-password)/i } }
    });

    const updatePromises = pages.map(page =>
        Page.findByIdAndUpdate(
            page._id,
            { $addToSet: { bandes: bandeId } },
            { new: true }
        )
    );

    await Promise.all(updatePromises);
    return pages.length;
};

export const addBandeToSpecificPage = async (bandeId: mongoose.Types.ObjectId, pageId: string) => {
    if (!pageId) return;
    
    const page = await Page.findById(pageId);
    if (!page) {
        throw new Error("Page non trouvée");
    }

    page.bandes.push(bandeId);
    await page.save();
};

// Fonction utilitaire pour créer une bande template
export const createTemplateBande = async (
    templateId: string, 
    siteIdString: string, 
    siteObjectId: mongoose.Types.ObjectId
) => {
    const abstractBande = await AbstractBande.findOne({ originalId: templateId });
    
    return await Bande.create({
        abstractBandeId: abstractBande?._id,
        siteId: siteObjectId?._id,
        global: false,
        values: { siteId: siteIdString }
    });
};