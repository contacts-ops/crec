import {useEffect} from "react";

export const GoogleFontLoader = ({fontName}: { fontName: string }) => {
    useEffect(() => {
        if (!fontName) return;

        // Formater le nom de la police pour Google Fonts
        const formattedFontName = fontName.replace(/ /g, "+");

        // Charger plusieurs graisses pour permettre font-extralight/light/medium/etc.
        const fontUrl = `https://fonts.googleapis.com/css2?family=${formattedFontName}:wght@200;300;400;500;600;700&display=swap`;

        // Vérifier si la police est déjà chargée
        const existingLink = document.querySelector(`link[href="${fontUrl}"]`);
        if (existingLink) {
            return;
        }

        // Créer un nouveau lien pour charger la police
        const link = document.createElement("link");
        link.href = fontUrl;
        link.rel = "stylesheet";
        link.onerror = () => {
            console.warn(`Failed to load font: ${fontName}`);
            // Essayer avec une URL alternative si la première échoue
            const alternativeUrl = `https://fonts.googleapis.com/css2?family=${formattedFontName}:wght@200;300;400;500;600;700&display=swap`;
            link.href = alternativeUrl;
        };

        document.head.appendChild(link);

        return () => {
            // Nettoyer le lien si le composant est démonté
            if (link.parentNode) {
                link.parentNode.removeChild(link);
            }
        };
    }, [fontName]);

    return null;
};