import { Page} from "@/lib/models/Page";
import { IPagePopulated } from "../models/types/populated";
import { createTemplateBande } from "./bande-repositories";
import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';
import { getSiteName } from "@/lib/repositories/site-repositorie";


// Configuration des templates de pages
const PAGE_TEMPLATES = {
    admin: {
        name: 'Administration',
        slug: '/admin',
        title: 'Administration',
        description: 'Interface d\'administration du site',
        order: 1,
        seo: {
            title: 'Administration',
            description: 'Espace réservé à l\'administration du site',
            keywords: 'administration, gestion site, interface admin'
        }
    },
    login: {
        name: 'Connexion',
        slug: '/login',
        title: 'Connexion',
        description: 'Page de connexion du site',
        order: 2,
        seo: {
            title: 'Connexion',
            description: 'Page de connexion du site',
            keywords: 'connexion, connexion site, page connexion'
        }
    },
    resetPassword: {
        name: 'Réinitialisation du mot de passe',
        slug: '/reset-password',
        title: 'Réinitialisation du mot de passe',
        description: 'Page de réinitialisation du mot de passe',
        order: 3,
        seo: {
            title: 'Réinitialisation du mot de passe',
            description: 'Page de réinitialisation du mot de passe du site',
            keywords: 'réinitialisation, mot de passe, reset password, récupération compte'
        }
    },
    monCompte: {
        name: 'Espace client',
        slug: '/landing-client',
        title: 'Mon compte',
        description: 'Espace client du site',
        order: 4,
        seo: {
            title: 'Mon compte',
            description: 'Espace client du site',
            keywords: 'espace client, compte, client, mon compte'
        }
    }
} as const;


export async function getPagesBySiteId(siteId: string) {
    return Page.find({siteId}).lean().populate({
        path: "bandes",
        populate: {
            path: "abstractBandeId"
        }
    }) as unknown as IPagePopulated[];
}

// Fonction générique pour créer une page template
const createTemplatePage = async (
    templateType: keyof typeof PAGE_TEMPLATES,
    siteIdString: string,
    siteObjectId: mongoose.Types.ObjectId
) => {
    const template = PAGE_TEMPLATES[templateType];
    const siteName = await getSiteName(siteIdString);
    
    const templateBande = await createTemplateBande(
        `${templateType}Template`,
        siteIdString,
        siteObjectId
    );

    return await Page.create({
        pageId: uuidv4(),
        siteId: siteIdString,
        name: template.name,
        slug: template.slug,
        title: `${template.title} - ${siteName}`,
        description: template.description,
        isHome: false,
        isPublished: true,
        order: template.order,
        bandes: [templateBande._id],
        seo: {
            title: `${template.seo.title} – ${siteName}`,
            description: `${template.seo.description} ${siteName}.`,
            keywords: template.seo.keywords
        }
    });
};

// Fonctions spécifiques pour chaque type de page
export const createAdminPage = (siteIdString: string, siteObjectId: mongoose.Types.ObjectId) =>
    createTemplatePage('admin', siteIdString, siteObjectId);

export const createLoginPage = (siteIdString: string, siteObjectId: mongoose.Types.ObjectId) =>
    createTemplatePage('login', siteIdString, siteObjectId);

export const createResetPasswordPage = (siteIdString: string, siteObjectId: mongoose.Types.ObjectId) =>
    createTemplatePage('resetPassword', siteIdString, siteObjectId);

export const createMonComptePage = (siteIdString: string, siteObjectId: mongoose.Types.ObjectId) =>
    createTemplatePage('monCompte', siteIdString, siteObjectId);