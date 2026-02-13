type EventCallback = (...args: unknown[]) => void;

class EventBus {
  private events: { [key: string]: EventCallback[] } = {};

  on(event: string, callback: EventCallback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: EventCallback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event: string, ...args: unknown[]) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Erreur dans l'événement ${event}:`, error);
      }
    });
  }

  // Méthode spécifique pour notifier les mises à jour de site
  notifySiteUpdate(siteId: string) {
    console.log(`🔄 EventBus: Notification de mise à jour pour le site ${siteId}`);
    this.emit('siteUpdate', siteId);
  }

  // Méthode spécifique pour notifier les mises à jour de page
  notifyPageUpdate(siteId: string, pageSlug: string) {
    console.log(`🔄 EventBus: Notification de mise à jour pour la page ${pageSlug} du site ${siteId}`);
    this.emit('pageUpdate', siteId, pageSlug);
  }
}

// Instance globale
export const eventBus = new EventBus();

// Types pour les événements
export const EVENTS = {
  SITE_UPDATE: 'siteUpdate',
  PAGE_UPDATE: 'pageUpdate',
  COMPONENT_UPDATE: 'componentUpdate',
  FORCE_REFRESH: 'forceRefresh'
} as const;
