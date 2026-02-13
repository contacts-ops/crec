export const abstractBandeChecklistBooleanKeys = [
  // 1. Infos générales
  'info_nom_coherent',
  'info_textes_modifiables',
  'info_images_modifiables',
  'info_images_next_image',
  'info_couleurs_modifiables',
  'info_fonts_modifiables',
  'info_icones_modifiables',
  'info_liens_modifiables',
  'info_liens_operationnels',
  'info_liens_next_link',

  // 2. Visuel
  'visuel_aspect_maquette',
  'visuel_polices_couleurs',
  'visuel_espacements',
  'visuel_animations',
  'visuel_hovers_clics',

  // 3. Responsive (simple)
  'responsive_pas_debordement',
  'responsive_images_adaptees',
  'responsive_scroll_fluide',
  'responsive_lisibilite_mobile',
  'responsive_xxs',
  'responsive_small',
  'responsive_medium',
  'responsive_large',
  'responsive_xl',
  'responsive_xxl',

  // 4. Tests techniques
  'technique_performance',
  'technique_console',
  'technique_chrome',
  'technique_firefox',
  'technique_safari',
] as const;

export type AbstractBandeChecklistBooleanKey = typeof abstractBandeChecklistBooleanKeys[number];

export type AbstractBandeChecklist = Partial<Record<AbstractBandeChecklistBooleanKey, boolean>> & {
  notes?: string;
};

