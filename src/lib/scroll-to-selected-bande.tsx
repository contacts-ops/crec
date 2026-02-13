// Fonction pour faire défiler vers le composant sélectionné

import { EditableField } from "@/app/sites/[siteId]/SitePreviewClient";


interface ScrollToSelectedBandeProps {
    selectedComponentRef: React.RefObject<HTMLElement>;
    selectedComponent: { id: string, originalId: string, fields: EditableField[] } | null;
}

export const scrollToSelectedBande = ({ selectedComponentRef, selectedComponent }: ScrollToSelectedBandeProps) => {
    // Attendre un peu plus longtemps pour s'assurer que le DOM est complètement mis à jour
    setTimeout(() => {
        if (selectedComponentRef.current) {
            try {
                // Vérifier si l'élément est toujours dans le DOM et est un Node valide
                if (
                    selectedComponentRef.current instanceof Node &&
                    document.contains(selectedComponentRef.current)
                ) {
                    selectedComponentRef.current.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });
                } else {
                    // Essayer de trouver le composant par son ID
                    const componentElement = document.querySelector(`[data-id="${selectedComponent?.id}"]`) as HTMLElement;
                    if (componentElement) {
                        componentElement.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                        });
                    }
                }
            } catch (error) {
                console.error("❌ Erreur lors du défilement vers le composant:", error);
            }
        } else {
            // Essayer de trouver le composant par son ID
            const componentElement = document.querySelector(`[data-id="${selectedComponent?.id}"]`) as HTMLElement;
            if (componentElement) {
                componentElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }
        }
    }, 200); // Attendre 200ms pour s'assurer que le DOM est mis à jour
};