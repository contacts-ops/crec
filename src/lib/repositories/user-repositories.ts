import { User } from "../models/User";
import "@/lib/models/Bande";
import "@/lib/models/AbstractBande";
import mongoose from "mongoose";

// Récupère un utilisateur par son ID avec ses currentBandes populées
// Les currentBandes incluent leurs abstractBandes et les testeurs associés
export const getUserByIdWithCurrentBande = async (userId: mongoose.Types.ObjectId) => {
    const user = await User.findById(userId)
        .select("-password")
        .populate({
            path: "currentBandes",
            model: "Bande",
            populate: [
                {
                    path: "abstractBandeId",
                    model: "AbstractBande",
                    populate: [
                        {
                            path: "tester",
                            model: "User",
                            select: "firstName lastName email role"
                        },
                        {
                            path: "createdBy",
                            model: "User",
                            select: "firstName lastName email role"
                        }
                    ]
                }
            ]
        })
        .lean();

    return user;
};

// Ajouter une ou plusieurs bandes à la liste currentBandes (maximum 2 au total)
export const addBandesToUserCurrentBandes = async (userId: mongoose.Types.ObjectId, bandeIds: mongoose.Types.ObjectId[]) => {
    // Récupérer l'utilisateur pour vérifier le nombre actuel de bandes
    const user = await User.findById(userId).select('currentBandes').lean();
    const currentBandes = (user?.currentBandes || []) as mongoose.Types.ObjectId[];
    
    // Filtrer les bandes déjà présentes et limiter à 2 au total
    const existingBandeIds = currentBandes.map(id => id.toString());
    const newBandeIds = bandeIds
      .filter(id => !existingBandeIds.includes(id.toString()))
      .slice(0, 2 - currentBandes.length);
    
    if (newBandeIds.length === 0) {
      // Aucune nouvelle bande à ajouter
      return await User.findById(userId).lean();
    }
    
    // Ajouter les nouvelles bandes à la liste
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          $addToSet: { currentBandes: { $each: newBandeIds } }
        },
        { new: true, runValidators: true }
    ).lean();
    
    return updatedUser;
};

// Retirer une bande de la liste currentBandes
export const removeBandeFromUserCurrentBandes = async (userId: mongoose.Types.ObjectId, bandeId: mongoose.Types.ObjectId) => {
    const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { currentBandes: bandeId } },
        { new: true, runValidators: true }
    ).lean();
    return user;
};

// Fonction de compatibilité (utilisée pour une seule bande)
export const updateUserCurrentBandeByBandeId = async (userId: mongoose.Types.ObjectId, bandeId: mongoose.Types.ObjectId) => {
    return await addBandesToUserCurrentBandes(userId, [bandeId]);
};