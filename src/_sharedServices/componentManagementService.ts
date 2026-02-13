// Service de gestion autonome des composants
// Permet aux clients de modifier les props de leurs composants directement depuis leur site exporté

interface Component {
  id: string;
  originalId?: string;
  name: string;
  type: string;
  service?: string;
  thumbnail: string;
  isImported: boolean;
  props: Record<string, any>;
}

interface Page {
  id: string;
  pageId: string;
  name: string;
  slug: string;
  isHome: boolean;
  isPublished: boolean;
  components: Component[];
}

interface EditableField {
  id: string;
  text: string;
  label: string;
  type: string;
}

interface ComponentUpdateRequest {
  pageSlug: string;
  componentId: string;
  props: Record<string, any>;
}

interface ComponentDeleteRequest {
  pageSlug: string;
  componentId: string;
}

class ComponentManagementService {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  /**
   * Récupère toutes les pages d'un site avec leurs composants
   */
  async getSitePages(siteId: string): Promise<Page[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sites/${siteId}/pages`);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      // L'API retourne { success: true, pages: [...] }
      return data.pages || data;
    } catch (error) {
      console.error("Erreur lors de la récupération des pages:", error);
      throw new Error("Impossible de récupérer les pages du site");
    }
  }

  /**
   * Récupère les props d'un composant spécifique
   */
  async getComponentProps(
    siteId: string,
    pageSlug: string,
    componentId: string
  ): Promise<Component> {
    try {
      const params = new URLSearchParams({
        pageSlug,
        componentId,
      });

      const response = await fetch(
        `${this.baseUrl}/api/sites/${siteId}/components/props?${params}`
      );

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.component;
    } catch (error) {
      console.error("Erreur lors de la récupération des props:", error);
      throw new Error("Impossible de récupérer les props du composant");
    }
  }

  /**
   * Met à jour les props d'un composant
   */
  async updateComponentProps(
    siteId: string,
    pageSlug: string,
    componentId: string,
    props: Record<string, any>
  ): Promise<Component> {
    try {
      const params = new URLSearchParams({
        pageSlug,
        componentId,
      });

      console.log(`🔄 componentManagementService: Mise à jour des props pour ${componentId} sur ${pageSlug}`);
      console.log(`🔄 componentManagementService: URL: ${this.baseUrl}/api/sites/${siteId}/components/props?${params}`);
      console.log(`🔄 componentManagementService: Props à envoyer:`, props);

      const response = await fetch(
        `${this.baseUrl}/api/sites/${siteId}/components/props?${params}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Inclure les cookies
          body: JSON.stringify({ props }),
        }
      );

      console.log(`🔄 componentManagementService: Réponse reçue, status: ${response.status}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ componentManagementService: Erreur HTTP ${response.status}:`, errorText);
        throw new Error(`Erreur HTTP: ${response.status} - ${errorText}`);
      }

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.component;
    } catch (error) {
      console.error("Erreur lors de la mise à jour des props:", error);
      throw new Error("Impossible de mettre à jour les props du composant");
    }
  }

  /**
   * Supprime un composant
   */
  async deleteComponent(
    siteId: string,
    pageSlug: string,
    componentId: string
  ): Promise<void> {
    try {
      const params = new URLSearchParams({
        pageSlug,
        componentId,
      });

      const response = await fetch(
        `${this.baseUrl}/api/sites/${siteId}/components/props?${params}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du composant:", error);
      throw new Error("Impossible de supprimer le composant");
    }
  }

  /**
   * Met à jour tous les composants d'une page
   */
  async updatePageComponents(
    siteId: string,
    pageSlug: string,
    components: Component[]
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sites/${siteId}/update-components`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pageSlug,
          components,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour des composants:", error);
      throw new Error("Impossible de mettre à jour les composants de la page");
    }
  }

  /**
   * Extrait les champs éditables d'un composant
   */
  extractEditableFields(component: Component): EditableField[] {
    const fields: EditableField[] = [];

    // Analyser les props du composant pour identifier les champs éditables
    Object.entries(component.props).forEach(([key, value]) => {
      // Ignorer les props système
      if (['primaryColor', 'secondaryColor', 'fontFamily', 'secondaryFontFamily'].includes(key)) {
        return;
      }

      // Déterminer le type de champ
      let fieldType = "text";
      if (typeof value === "string") {
        if (value.includes("http") || value.includes("/")) {
          fieldType = "image";
        } else if (value.length > 100) {
          fieldType = "textarea";
        }
      }

      fields.push({
        id: `${component.id}-${key}`,
        text: String(value || ""),
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        type: fieldType,
      });
    });

    return fields;
  }

  /**
   * Convertit les champs éditables en props
   */
  convertFieldsToProps(fields: EditableField[]): Record<string, any> {
    const props: Record<string, any> = {};

    fields.forEach(field => {
      const [, propName] = field.id.split("-");
      if (propName) {
        props[propName] = field.text;
      }
    });

    return props;
  }

  /**
   * Valide les props avant sauvegarde
   */
  validateProps(props: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Vérifications de base
    if (!props || typeof props !== "object") {
      errors.push("Les props doivent être un objet valide");
    }

    // Vérifier les URLs d'images
    Object.entries(props).forEach(([key, value]) => {
      if (typeof value === "string" && value.includes("http")) {
        try {
          new URL(value);
        } catch {
          errors.push(`L'URL pour ${key} n'est pas valide`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Récupère les statistiques des composants
   */
  async getComponentStats(siteId: string): Promise<{
    totalPages: number;
    totalComponents: number;
    componentsByType: Record<string, number>;
  }> {
    try {
      const pages = await this.getSitePages(siteId);

      const totalPages = pages.length;
      const totalComponents = pages.reduce((acc, page) => acc + page.components.length, 0);

      const componentsByType: Record<string, number> = {};
      pages.forEach(page => {
        page.components.forEach(component => {
          componentsByType[component.type] = (componentsByType[component.type] || 0) + 1;
        });
      });

      return {
        totalPages,
        totalComponents,
        componentsByType,
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      throw new Error("Impossible de récupérer les statistiques");
    }
  }

  /**
   * Recherche des composants par texte
   */
  searchComponents(
    pages: Page[],
    searchTerm: string,
    filterType: string = "all"
  ): { page: Page; component: Component; index: number }[] {
    const results: { page: Page; component: Component; index: number }[] = [];

    pages.forEach(page => {
      page.components.forEach((component, index) => {
        const matchesSearch =
          component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          component.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          Object.values(component.props).some(value =>
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
          );

        const matchesFilter = filterType === "all" || component.type === filterType;

        if (matchesSearch && matchesFilter) {
          results.push({ page, component, index });
        }
      });
    });

    return results;
  }

  /**
   * Sauvegarde automatique avec retry
   */
  async saveWithRetry(
    siteId: string,
    pageSlug: string,
    componentId: string,
    props: Record<string, any>,
    maxRetries: number = 3
  ): Promise<Component> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.updateComponentProps(siteId, pageSlug, componentId, props);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Tentative ${attempt}/${maxRetries} échouée:`, error);

        if (attempt < maxRetries) {
          // Attendre avant de réessayer (backoff exponentiel)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error("Échec de la sauvegarde après plusieurs tentatives");
  }
}

// Instance par défaut du service
export const componentManagementService = new ComponentManagementService();

// Export de la classe pour utilisation personnalisée
export { ComponentManagementService };

// Types exportés
export type {
  Component,
  Page,
  EditableField,
  ComponentUpdateRequest,
  ComponentDeleteRequest,
};
