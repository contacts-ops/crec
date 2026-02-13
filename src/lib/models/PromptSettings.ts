import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IPromptSettings extends Document {
  // Identifiant unique pour garantir un seul document
  _id: mongoose.Types.ObjectId;
  
  // Prompt OpenAI pour la description d'image
  openAIPrompt: string;
  
  // Prompt Claude pour la génération de bande
  claudePrompt: string;
  
  // Prompt de chat interactif Claude
  chatInteractifPrompt: string;
  
  // Commentaire pour expliquer le prompt, les choix, etc.
  commentaire?: string;
  
  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
}

const PromptSettingsSchema = new Schema<IPromptSettings>(
  {
    openAIPrompt: { type: String, required: true },
    claudePrompt: { type: String, required: true },
    chatInteractifPrompt: { type: String, required: true },
    commentaire: { type: String, required: false },
  },
  { 
    timestamps: true,
    collection: 'promptsettings'
  }
);

// Index pour trier par date de création décroissante (le dernier créé est le prompt actif)
PromptSettingsSchema.index({ createdAt: -1 });

export const PromptSettings: Model<IPromptSettings> =
  (mongoose.models.PromptSettings as Model<IPromptSettings>) ||
  mongoose.model<IPromptSettings>("PromptSettings", PromptSettingsSchema);

