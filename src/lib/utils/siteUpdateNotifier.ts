// Utilitaire pour notifier les mises à jour de site
// Permet de déclencher le rafraîchissement automatique des composants

import { eventBus, EVENTS } from './eventBus';

/**
 * Notifie qu'un site a été mis à jour
 * @param siteId - L'ID du site mis à jour
 * @param updateType - Le type de mise à jour (component, page, site)
 */
export function notifySiteUpdate(siteId: string, updateType: 'component' | 'page' | 'site' = 'component') {
  console.log(`🔄 notifySiteUpdate: Notification de mise à jour pour ${siteId} (type: ${updateType})`);

  // Déclencher l'événement de mise à jour du site
  eventBus.emit(EVENTS.SITE_UPDATE, siteId, updateType);

  // Déclencher aussi un événement spécifique pour les composants si nécessaire
  if (updateType === 'component') {
    eventBus.emit(EVENTS.COMPONENT_UPDATE, siteId);
  }
}

/**
 * Notifie qu'une page spécifique a été mise à jour
 * @param siteId - L'ID du site
 * @param pageSlug - Le slug de la page mise à jour
 */
export function notifyPageUpdate(siteId: string, pageSlug: string) {
  console.log(`🔄 notifyPageUpdate: Notification de mise à jour de page ${pageSlug} pour ${siteId}`);

  // Déclencher l'événement de mise à jour du site
  eventBus.emit(EVENTS.SITE_UPDATE, siteId, 'page');

  // Déclencher un événement spécifique pour la page
  eventBus.emit(EVENTS.PAGE_UPDATE, siteId, pageSlug);
}

/**
 * Notifie qu'un composant spécifique a été mis à jour
 * @param siteId - L'ID du site
 * @param componentId - L'ID du composant mis à jour
 * @param pageSlug - Le slug de la page contenant le composant
 */
export function notifyComponentUpdate(siteId: string, componentId: string, pageSlug?: string) {
  console.log(`🔄 notifyComponentUpdate: Notification de mise à jour du composant ${componentId} pour ${siteId}`);

  // Déclencher l'événement de mise à jour du site
  eventBus.emit(EVENTS.SITE_UPDATE, siteId, 'component');

  // Déclencher un événement spécifique pour le composant
  eventBus.emit(EVENTS.COMPONENT_UPDATE, siteId, componentId, pageSlug);
}



