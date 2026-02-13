import Ovh from 'ovh';

// Interface pour les informations de domaine
export interface DomainInfo {
  name: string;
  available: boolean;
  price?: number;
  currency?: string;
  period?: number;
  cartId?: string;
  itemId?: string;
  cartUrl?: string;
  action?: string; // 'create' ou 'transfer'
  offer?: any;
  prices?: {
    year1: number;
    year2: number;
    currency: string;
  };
}

// Interface pour la commande de domaine
export interface DomainOrder {
  domain: string;
  period: number;
  contactId?: string;
}

// Interface pour la réponse de vérification
export interface DomainCheckResponse {
  domains: DomainInfo[];
  totalPrice?: number;
  currency?: string;
}

// Interface pour le panier OVH
export interface OvhCart {
  cartId: string;
  items: DomainInfo[];
  totalPrice?: number;
  currency?: string;
}

// Configuration OVH
const ovhConfig = {
  appKey: process.env.OVH_APP_KEY,
  appSecret: process.env.OVH_APP_SECRET,
  consumerKey: process.env.OVH_CONSUMER_KEY,
  endpoint: 'ovh-eu',
};

// Vérifier si les clés OVH sont configurées
const isOvhConfigured = ovhConfig.appKey && ovhConfig.appSecret && ovhConfig.consumerKey;

// Initialisation du client OVH (seulement si configuré)
let ovh: any = null;
if (isOvhConfigured) {
  try {
    ovh = new Ovh(ovhConfig);
  } catch (error) {
    console.warn('⚠️ Erreur lors de l\'initialisation du client OVH:', error);
  }
} else {
  console.warn('⚠️ API OVH non configurée - variables d\'environnement manquantes');
}

/**
 * Service pour la gestion des domaines via l'API OVH
 */
export class OvhDomainService {
  /**
   * Ajoute un domaine au panier OVH (méthode exacte du test-domain.ts)
   * @param domain - Nom du domaine à ajouter
   * @returns Promise<DomainInfo>
   */
  static async addDomainToCart(domain: string): Promise<DomainInfo> {
    try {

      // Vérifier si OVH est configuré
      if (!ovh) {
        throw new Error('API OVH non configurée. Veuillez configurer les clés API OVH.');
      }

      // 1. Créer un panier
      const cart = await ovh.requestPromised('POST', '/order/cart', {
        ovhSubsidiary: 'FR'
      });
      const cartId = cart.cartId;

      // 2. Récupérer les offres disponibles pour le domaine
      const offers = await ovh.requestPromised(
        'GET',
        `/order/cart/${cartId}/domain`,
        { domain: domain }
      );

      if (!offers.length) {
        console.log(`❌ Aucune offre disponible pour ${domain}`);
        return {
          name: domain,
          available: false,
          price: undefined,
          currency: 'EUR',
          period: 1,
        };
      }

      const offer = offers[0];

      // 3. Ajouter le domaine au panier
      const item = await ovh.requestPromised(
        'POST',
        `/order/cart/${cartId}/domain`,
        {
          domain: domain,
          duration: 'P1Y',
          planCode: offer.productId || 'domain',
          pricingMode: offer.pricingMode,
          quantity: 1
        }
      );


      // 4. Obtenir les détails de l'item
      const itemDetails = await ovh.requestPromised(
        'GET',
        `/order/cart/${cartId}/item/${item.itemId}`
      );


      // Déterminer l'action (create ou transfer)
      const action = offer.action || 'create';

      // Extraire le prix - analyser plusieurs structures possibles
      let price = 0;
      let currency = 'EUR';


      // Analyser toutes les propriétés possibles
      const tryExtractPrice = (obj: any, path: string): boolean => {
        if (!obj) return false;

        // Test direct number
        if (typeof obj === 'number') {
          price = obj;
          return true;
        }

        // Test .value
        if (obj.value !== undefined) {
          price = obj.value;
          currency = obj.currencyCode || obj.currency || 'EUR';
          return true;
        }

        // Test .unitPrice.value
        if (obj.unitPrice && obj.unitPrice.value !== undefined) {
          price = obj.unitPrice.value;
          currency = obj.unitPrice.currencyCode || obj.unitPrice.currency || 'EUR';
          return true;
        }

        // Test .price.value
        if (obj.price && obj.price.value !== undefined) {
          price = obj.price.value;
          currency = obj.price.currencyCode || obj.price.currency || 'EUR';
          return true;
        }

        return false;
      };

            // Analyser les prix dans itemDetails.prices (tableau)
      if (itemDetails.prices && Array.isArray(itemDetails.prices)) {
        for (const priceItem of itemDetails.prices) {
          // Chercher le prix TOTAL en priorité, sinon PRICE
          if (priceItem.label === 'TOTAL' || priceItem.label === 'PRICE') {
            if (tryExtractPrice(priceItem.price, `itemDetails.prices[${priceItem.label}]`)) {
              break;
            }
          }
        }
      }

      // Si pas trouvé, analyser les prix dans offer.prices (tableau)
      if (price === 0 && offer.prices && Array.isArray(offer.prices)) {
        for (const priceItem of offer.prices) {
          // Chercher le prix TOTAL en priorité, sinon PRICE
          if (priceItem.label === 'TOTAL' || priceItem.label === 'PRICE') {
            if (tryExtractPrice(priceItem.price, `offer.prices[${priceItem.label}]`)) {
              break;
            }
          }
        }
      }

      // Méthodes de fallback
      if (price === 0) {
        // Essayer dans itemDetails
        if (tryExtractPrice(itemDetails.price, 'itemDetails.price')) {
          // Prix trouvé
        } else if (tryExtractPrice(itemDetails, 'itemDetails')) {
          // Prix trouvé
        }
        // Si pas trouvé, essayer dans offer
        else if (tryExtractPrice(offer.price, 'offer.price')) {
          // Prix trouvé
        } else if (tryExtractPrice(offer, 'offer')) {
          // Prix trouvé
        }
      }

      // Si toujours aucun prix trouvé, utiliser un prix par défaut et alerter
      if (price === 0) {
        console.warn(`⚠️ Aucun prix trouvé pour ${domain}, utilisation du prix par défaut`);
        price = 15; // Prix par défaut
      }


      // Récupérer les prix pour les 2 premières années
      const prices = await this.getDomainPrices(domain, cartId, offer);

      return {
        name: domain,
        available: true,
        price: price,
        currency: currency,
        period: 1,
        cartId: cartId,
        itemId: item.itemId,
        cartUrl: `https://www.ovh.com/manager/#/billing/order/cart/${cartId}`,
        action: action,
        offer: offer,
        prices: prices,
      };

    } catch (error: any) {
      console.error(`❌ Erreur lors de l'ajout du domaine ${domain} au panier:`, error.message || error);

      // En cas d'erreur, on retourne le domaine comme indisponible
      return {
        name: domain,
        available: false,
        price: undefined,
        currency: 'EUR',
        period: 1,
      };
    }
  }

  /**
   * Récupère les domaines existants avec leurs informations détaillées
   * @returns Promise<{ domains: string[]; details?: any[] }>
   */
  static async getExistingDomains(): Promise<{ domains: string[]; details?: any[] }> {
    try {

      // Vérifier si OVH est configuré
      if (!ovh) {
        console.warn('⚠️ API OVH non configurée - retour de données de test');
        // Retourner des données de test si OVH n'est pas configuré
        return {
          domains: ['exemple.com', 'test.fr', 'demo.net'],
          details: [
            { name: 'exemple.com', status: 'active', expiration: '2025-08-21', price: 12.99 },
            { name: 'test.fr', status: 'active', expiration: '2025-09-15', price: 8.99 },
            { name: 'demo.net', status: 'active', expiration: '2025-10-30', price: 14.99 }
          ]
        };
      }

      // 1. Récupérer la liste des domaines
      const domainsList = await ovh.requestPromised('GET', '/domain');

      if (!Array.isArray(domainsList) || domainsList.length === 0) {
        return { domains: [], details: [] };
      }

      // 2. Récupérer les détails de chaque domaine
      const domainsDetails = [];
      for (const domainName of domainsList) {
        try {

          // Récupérer les informations du domaine
          const domainInfo = await ovh.requestPromised('GET', `/domain/${domainName}`);

          // Récupérer les informations de facturation et service
          const serviceInfos = await ovh.requestPromised('GET', `/domain/${domainName}/serviceInfos`);

          // Récupérer les informations de renouvellement avec les vrais prix
          let renewalInfo = null;
          try {
            renewalInfo = await ovh.requestPromised('GET', `/domain/${domainName}/renew`);
          } catch (renewalError) {
            console.log(`⚠️ Impossible de récupérer les infos de renouvellement pour ${domainName}:`, renewalError);
          }

          // Récupérer les informations de facturation détaillées
          let billingInfo = null;
          try {
            billingInfo = await ovh.requestPromised('GET', `/domain/${domainName}/billing`);
          } catch (billingError) {
            console.log(`⚠️ Impossible de récupérer les infos de facturation pour ${domainName}:`, billingError);
          }

          // Récupérer les informations de prix depuis l'API de renouvellement
          let price = 0;
          try {
            const priceInfo = await ovh.requestPromised('GET', `/domain/${domainName}/renew/price`);
            if (priceInfo && priceInfo.price && priceInfo.price.value) {
              price = priceInfo.price.value;
            }
          } catch (priceError) {
            console.log(`⚠️ Impossible de récupérer le prix pour ${domainName}:`, priceError);
            // Essayer de récupérer le prix depuis renewalInfo
            if (renewalInfo && renewalInfo.prices && renewalInfo.prices.length > 0) {
              const firstPrice = renewalInfo.prices[0];
              if (firstPrice.price && firstPrice.price.value) {
                price = firstPrice.price.value;
              }
            }
          }

          // Calculer la date d'expiration depuis serviceInfos
          let expirationDate = 'N/A';
          if (serviceInfos && serviceInfos.expiration) {
            expirationDate = new Date(serviceInfos.expiration).toISOString().split('T')[0];
          }

          // Déterminer le mode de renouvellement depuis serviceInfos
          let renewalMode = 'auto';
          if (serviceInfos && serviceInfos.renew) {
            renewalMode = serviceInfos.renew.mode || 'auto';
          }

          // Calculer la prochaine date de facturation
          let nextBilling = 'N/A';
          if (serviceInfos && serviceInfos.nextBillingDate) {
            nextBilling = new Date(serviceInfos.nextBillingDate).toISOString().split('T')[0];
          } else if (serviceInfos && serviceInfos.expiration) {
            // Si pas de nextBillingDate, utiliser la date d'expiration
            const expirationDate = new Date(serviceInfos.expiration);
            const nextBillingDate = new Date(expirationDate);
            nextBillingDate.setDate(expirationDate.getDate() - 30); // 30 jours avant expiration
            nextBilling = nextBillingDate.toISOString().split('T')[0];
          }

          domainsDetails.push({
            name: domainName,
            status: domainInfo.state || 'active',
            expiration: expirationDate,
            price: price,
            renewalMode: renewalMode,
            nextBilling: nextBilling
          });

        } catch (domainError) {
          console.error(`❌ Erreur lors de la récupération des détails pour ${domainName}:`, domainError);
          // Ajouter le domaine avec des informations de base
          domainsDetails.push({
            name: domainName,
            status: 'unknown',
            expiration: 'N/A',
            price: 0,
            renewalMode: 'unknown',
            nextBilling: 'N/A'
          });
        }
      }

      return {
        domains: domainsList,
        details: domainsDetails
      };

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des domaines existants:', error);

      // Gérer les erreurs OVH spécifiques
      if (error && typeof error === 'object' && 'error' in error) {
        const ovhError = error as { error: number; message: string };
        if (ovhError.error === 403) {
          console.warn('⚠️ Droits API insuffisants pour récupérer les domaines existants');
          return { domains: [], details: [] };
        }
        throw new Error(`Erreur OVH (${ovhError.error}): ${ovhError.message}`);
      }

      // En cas d'erreur, retourner des données de test pour le développement
      console.warn('⚠️ Erreur OVH - utilisation de données de test');
      return {
        domains: ['exemple.com', 'test.fr', 'demo.net'],
        details: [
          { name: 'exemple.com', status: 'active', expiration: '2025-08-21', price: 12.99 },
          { name: 'test.fr', status: 'active', expiration: '2025-09-15', price: 8.99 },
          { name: 'demo.net', status: 'active', expiration: '2025-10-30', price: 14.99 }
        ]
      };
    }
  }

  /**
   * Génère des suggestions de domaines basées sur un nom
   * @param baseName - Nom de base pour les suggestions
   * @returns string[]
   */
  static generateDomainSuggestions(baseName: string): string[] {
    const cleanName = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const suggestions = [
      `${cleanName}.com`,
      `${cleanName}.fr`,
      `${cleanName}.net`,
      `${cleanName}.org`,
      `${cleanName}.io`,
      `${cleanName}.co`,
      `${cleanName}.me`,
      `${cleanName}.app`,
      `${cleanName}-site.com`,
      `${cleanName}-web.com`,
      `${cleanName}online.com`,
      `${cleanName}pro.com`
    ];

    return suggestions.slice(0, 12); // Limiter à 12 suggestions
  }

  /**
   * Finalise une commande OVH (assignation et checkout)
   * @param cartId - ID du panier OVH
   * @returns Promise<{ success: boolean; orderId?: string; error?: string }>
   */
  static async finalizeOrder(cartId: string): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {

      if (!ovh) {
        throw new Error('API OVH non configurée. Veuillez configurer les clés API OVH.');
      }

      // 1. Assigner le panier au consumer key
      console.log(`📋 Assignation du panier ${cartId} au consumer key`);
      await ovh.requestPromised('POST', `/order/cart/${cartId}/assign`);

      // 2. Finaliser la commande (checkout)
      console.log(`💳 Finalisation de la commande (checkout)`);
      const checkoutResult = await ovh.requestPromised('POST', `/order/cart/${cartId}/checkout`, {
        autoPayWithPreferredPaymentMethod: true,
        waiveRetractationPeriod: false
      });


      return {
        success: true,
        orderId: checkoutResult.orderId || checkoutResult.order?.orderId
      };

    } catch (error: any) {
      console.error(`❌ Erreur lors de la finalisation de la commande:`, error.message || error);

      return {
        success: false,
        error: error.message || 'Erreur lors de la finalisation de la commande'
      };
    }
  }

  /**
   * Récupère les prix des domaines directement depuis l'API OVH
   * @param domain - Nom du domaine
   * @returns Promise<{ price: number; currency: string; action: string }>
   */
  static async getDomainPricing(domain: string): Promise<{ price: number; currency: string; action: string }> {
    try {

      if (!ovh) {
        throw new Error('API OVH non configurée. Veuillez configurer les clés API OVH.');
      }

      // Créer un panier temporaire pour récupérer les prix
      const cart = await ovh.requestPromised('POST', '/order/cart', {
        ovhSubsidiary: 'FR'
      });
      const cartId = cart.cartId;

      // Récupérer les offres disponibles
      const offers = await ovh.requestPromised(
        'GET',
        `/order/cart/${cartId}/domain`,
        { domain: domain }
      );

      if (!offers.length) {
        throw new Error(`Aucune offre disponible pour ${domain}`);
      }

      const offer = offers[0];
      const action = offer.action || 'create';

      // Récupérer les détails de l'offre avec les prix
      const offerDetails = await ovh.requestPromised(
        'GET',
        `/order/cart/${cartId}/domain/${offer.productId || 'domain'}`,
        { domain: domain }
      );


      // Extraire le prix
      let price = 0;
      let currency = 'EUR';

      if (offerDetails.prices) {
        if (offerDetails.prices.price) {
          price = offerDetails.prices.price.value;
          currency = offerDetails.prices.price.currencyCode || 'EUR';
        } else if (offerDetails.prices.unitPrice) {
          price = offerDetails.prices.unitPrice.value;
          currency = offerDetails.prices.unitPrice.currencyCode || 'EUR';
        }
      }

      // Supprimer le panier temporaire
      try {
        await ovh.requestPromised('DELETE', `/order/cart/${cartId}`);
      } catch (deleteError) {
        console.warn('⚠️ Impossible de supprimer le panier temporaire:', deleteError);
      }

      return { price, currency, action };

    } catch (error: any) {
      console.error(`❌ Erreur lors de la récupération du prix pour ${domain}:`, error.message || error);
      throw error;
    }
  }

  /**
   * Récupère les détails d'un panier OVH
   * @param cartId - ID du panier OVH
   * @returns Promise<{ cart: any; items: any[]; total: number }>
   */
  static async getCartDetails(cartId: string): Promise<{ cart: any; items: any[]; total: number }> {
    try {

      if (!ovh) {
        throw new Error('API OVH non configurée. Veuillez configurer les clés API OVH.');
      }

      // Récupérer les détails du panier
      const cart = await ovh.requestPromised('GET', `/order/cart/${cartId}`);

      // Récupérer les items du panier
      const items = await ovh.requestPromised('GET', `/order/cart/${cartId}/item`);

      // Calculer le total avec les vrais prix
      let total = 0;
      for (const item of items) {
        const itemDetails = await ovh.requestPromised('GET', `/order/cart/${cartId}/item/${item.itemId}`);

        // Extraire le prix de l'item
        let itemPrice = 0;
        if (itemDetails.price) {
          if (typeof itemDetails.price === 'number') {
            itemPrice = itemDetails.price;
          } else if (itemDetails.price.value !== undefined) {
            itemPrice = itemDetails.price.value;
          } else if (itemDetails.price.unitPrice !== undefined) {
            itemPrice = itemDetails.price.unitPrice.value;
          }
        }

        total += itemPrice;
      }

      return {
        cart,
        items,
        total
      };

    } catch (error: any) {
      console.error(`❌ Erreur lors de la récupération des détails du panier:`, error.message || error);
      throw error;
    }
  }

  /**
   * Récupère les prix pour les 2 premières années d'un domaine
   * @param domain - Nom du domaine
   * @param cartId - ID du panier OVH
   * @param offer - Offre OVH
   * @returns Promise<{ year1: number; year2: number; currency: string }>
   */
  static async getDomainPrices(domain: string, cartId: string, offer: any): Promise<{ year1: number; year2: number; currency: string }> {
    try {
      console.log(`💰 Récupération des prix multi-années pour ${domain}`);

      if (!ovh) {
        throw new Error('API OVH non configurée.');
      }

      let year1Price = 0;
      let year2Price = 0;
      let currency = 'EUR';

      // Récupérer le prix pour la 1ère année (P1Y)
      try {
        const item1Y = await ovh.requestPromised(
          'POST',
          `/order/cart/${cartId}/domain`,
          {
            domain: domain,
            duration: 'P1Y',
            planCode: offer.productId || 'domain',
            pricingMode: offer.pricingMode,
            quantity: 1
          }
        );

        const itemDetails1Y = await ovh.requestPromised(
          'GET',
          `/order/cart/${cartId}/item/${item1Y.itemId}`
        );

        // Extraire le prix de la 1ère année
        if (itemDetails1Y.prices && Array.isArray(itemDetails1Y.prices)) {
          for (const priceItem of itemDetails1Y.prices) {
            if (priceItem.label === 'TOTAL' || priceItem.label === 'PRICE') {
              if (priceItem.price && priceItem.price.value !== undefined) {
                year1Price = priceItem.price.value;
                currency = priceItem.price.currencyCode || 'EUR';
                break;
              }
            }
          }
        }

        // Supprimer l'item de test
        await ovh.requestPromised('DELETE', `/order/cart/${cartId}/item/${item1Y.itemId}`);
      } catch (error) {
        console.warn(`⚠️ Erreur lors de la récupération du prix 1ère année:`, error);
      }

      // Récupérer le prix pour la 2ème année (P2Y)
      try {
        const item2Y = await ovh.requestPromised(
          'POST',
          `/order/cart/${cartId}/domain`,
          {
            domain: domain,
            duration: 'P2Y',
            planCode: offer.productId || 'domain',
            pricingMode: offer.pricingMode,
            quantity: 1
          }
        );

        const itemDetails2Y = await ovh.requestPromised(
          'GET',
          `/order/cart/${cartId}/item/${item2Y.itemId}`
        );

        // Extraire le prix de la 2ème année
        if (itemDetails2Y.prices && Array.isArray(itemDetails2Y.prices)) {
          for (const priceItem of itemDetails2Y.prices) {
            if (priceItem.label === 'TOTAL' || priceItem.label === 'PRICE') {
              if (priceItem.price && priceItem.price.value !== undefined) {
                year2Price = priceItem.price.value;
                break;
              }
            }
          }
        }

        // Supprimer l'item de test
        await ovh.requestPromised('DELETE', `/order/cart/${cartId}/item/${item2Y.itemId}`);
      } catch (error) {
        console.warn(`⚠️ Erreur lors de la récupération du prix 2ème année:`, error);
      }

      console.log(`💰 Prix multi-années pour ${domain}: 1ère année = ${year1Price} ${currency}, 2ème année = ${year2Price} ${currency}`);

      return {
        year1: year1Price,
        year2: year2Price,
        currency: currency
      };

    } catch (error: any) {
      console.error(`❌ Erreur lors de la récupération des prix multi-années pour ${domain}:`, error.message || error);
      return {
        year1: 0,
        year2: 0,
        currency: 'EUR'
      };
    }
  }
}
