import mongoose, { Schema, type Document, type Model, Types } from "mongoose";
import type { AbstractBandeChecklist } from "./abstract-bande-checklist";

export type AbstractBandeStatus = 'valid' | 'not_valid' | 'in_dev' | 'in_test';

// Structure simplifiée de la checklist

export interface IAbstractBande extends Document {
  name: string;
  originalId: string;
  type: string;
  service: string;
  thumbnail?: string;
  pageTsxUrl?: string;
  configJsonUrl?: string;
  storageKeyPrefix?: string;
  isInUse: boolean;
  isValid: boolean;
  status: AbstractBandeStatus;
  createdBy?: Types.ObjectId;
  tester?: Types.ObjectId;
  developerChecklist?: AbstractBandeChecklist;
  testerChecklist?: AbstractBandeChecklist;
  createdAt: Date;
  updatedAt: Date;
}

const AbstractBandeSchema = new Schema<IAbstractBande>(
  {
    name: { type: String, required: true },
    originalId: { type: String, required: true },
    type: { type: String, required: true },
    service: { type: String, required: false },
    thumbnail: { type: String },
    pageTsxUrl: { type: String },
    configJsonUrl: { type: String },
    storageKeyPrefix: { type: String },
    isInUse: { type: Boolean, default: false },
    isValid: { type: Boolean, default: false },
    status: { type: String, enum: ['valid', 'not_valid', 'in_dev', 'in_test'], default: 'in_dev' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    tester: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    developerChecklist: {
      // 1. Infos générales
      info_nom_coherent: { type: Boolean, default: false },
      info_textes_modifiables: { type: Boolean, default: false },
      info_images_modifiables: { type: Boolean, default: false },
      info_images_next_image: { type: Boolean, default: false },
      info_couleurs_modifiables: { type: Boolean, default: false },
      info_fonts_modifiables: { type: Boolean, default: false },
      info_icones_modifiables: { type: Boolean, default: false },
      info_liens_modifiables: { type: Boolean, default: false },
      info_liens_operationnels: { type: Boolean, default: false },
      info_liens_next_link: { type: Boolean, default: false },

      // 2. Visuel
      visuel_aspect_maquette: { type: Boolean, default: false },
      visuel_polices_couleurs: { type: Boolean, default: false },
      visuel_espacements: { type: Boolean, default: false },
      visuel_animations: { type: Boolean, default: false },
      visuel_hovers_clics: { type: Boolean, default: false },

      // 3. Responsive (simple)
      responsive_pas_debordement: { type: Boolean, default: false },
      responsive_images_adaptees: { type: Boolean, default: false },
      responsive_scroll_fluide: { type: Boolean, default: false },
      responsive_lisibilite_mobile: { type: Boolean, default: false },
      responsive_xxs: { type: Boolean, default: false },
      responsive_small: { type: Boolean, default: false },
      responsive_medium: { type: Boolean, default: false },
      responsive_large: { type: Boolean, default: false },
      responsive_xl: { type: Boolean, default: false },
      responsive_xxl: { type: Boolean, default: false },

      // 4. Tests techniques
      technique_performance: { type: Boolean, default: false },
      technique_console: { type: Boolean, default: false },
      technique_chrome: { type: Boolean, default: false },
      technique_firefox: { type: Boolean, default: false },
      technique_safari: { type: Boolean, default: false },

      notes: { type: String, default: '' },
    },
    testerChecklist: {
      // 1. Infos générales
      info_nom_coherent: { type: Boolean, default: false },
      info_textes_modifiables: { type: Boolean, default: false },
      info_images_modifiables: { type: Boolean, default: false },
      info_images_next_image: { type: Boolean, default: false },
      info_couleurs_modifiables: { type: Boolean, default: false },
      info_fonts_modifiables: { type: Boolean, default: false },
      info_icones_modifiables: { type: Boolean, default: false },
      info_liens_modifiables: { type: Boolean, default: false },
      info_liens_operationnels: { type: Boolean, default: false },
      info_liens_next_link: { type: Boolean, default: false },

      // 2. Visuel
      visuel_aspect_maquette: { type: Boolean, default: false },
      visuel_polices_couleurs: { type: Boolean, default: false },
      visuel_espacements: { type: Boolean, default: false },
      visuel_animations: { type: Boolean, default: false },
      visuel_hovers_clics: { type: Boolean, default: false },

      // 3. Responsive (simple)
      responsive_pas_debordement: { type: Boolean, default: false },
      responsive_images_adaptees: { type: Boolean, default: false },
      responsive_scroll_fluide: { type: Boolean, default: false },
      responsive_lisibilite_mobile: { type: Boolean, default: false },
      responsive_xxs: { type: Boolean, default: false },
      responsive_small: { type: Boolean, default: false },
      responsive_medium: { type: Boolean, default: false },
      responsive_large: { type: Boolean, default: false },
      responsive_xl: { type: Boolean, default: false },
      responsive_xxl: { type: Boolean, default: false },

      // 4. Tests techniques
      technique_performance: { type: Boolean, default: false },
      technique_console: { type: Boolean, default: false },
      technique_chrome: { type: Boolean, default: false },
      technique_firefox: { type: Boolean, default: false },
      technique_safari: { type: Boolean, default: false },

      notes: { type: String, default: '' },
    },
  },
  { timestamps: true, collection: "abstract_bande" }
);

export const AbstractBande: Model<IAbstractBande> =
  (mongoose.models.AbstractBande as Model<IAbstractBande>) ||
  mongoose.model<IAbstractBande>("AbstractBande", AbstractBandeSchema);


