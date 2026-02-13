export const extractBandeDataFromHtmlElement = (element: HTMLElement, externalValues?: Record<string, any>) => {
    const bandeId = element.getAttribute("data-bande-id") || "";
    const bandeOriginalId = element.getAttribute("data-bande-original-id") || "";
    // Utiliser querySelectorAll avec toutes les variantes possibles pour trouver les éléments éditables
    // y compris ceux qui sont cachés (display: none)
    const allEditableElements = Array.from(element.querySelectorAll('[data-editable="true"]'));

    const editableFields = allEditableElements
        .map((field) => {
            const fieldType = field.getAttribute("data-type") || "text";
            let fieldValue = "";
            
            // Pour les liens
            if (fieldType === "link") {
                fieldValue = field.getAttribute("href") || "";
            }
            // Pour les images/médias
            else if (fieldType === "image" || fieldType === "media") {
                fieldValue = field.getAttribute("src") || field.getAttribute("data-src") || "";
            }
            // Pour les autres types (text, color, etc.), utiliser textContent même si l'élément est caché
            else {
                // textContent fonctionne même pour les éléments cachés
                fieldValue = field.textContent?.trim() || "";
                // Si textContent est vide mais que l'élément a un attribut value ou data-value, l'utiliser
                if (!fieldValue) {
                    fieldValue = field.getAttribute("value") || field.getAttribute("data-value") || "";
                }
            }

            return {
                id: field.getAttribute("data-id") || "",
                text: fieldValue,
                label: field.getAttribute("data-label") || "",
                type: fieldType,
            };
        })
        .filter((field) => {
            // Exclure le champ "mediaUrl" sans numéro (ne marche pas)
            // Garder seulement mediaUrl0, mediaUrl1, mediaUrl2, etc.
            // Exclure tous les champs qui se terminent par "mediaurl" sans numéro après
            const fieldIdLower = field.id.toLowerCase();
            
            // Vérifier si le champ se termine par "mediaurl" sans numéro après
            // Exemples à exclure: "mediaurl", "-mediaurl", "hero-mediaurl", "who-mediaurl", etc.
            // Exemples à garder: "mediaurl0", "-mediaurl0", "mediaurl1", "hero-mediaurl1", etc.
            const mediaUrlMatch = fieldIdLower.match(/mediaurl(\d*)$/);
            if (mediaUrlMatch) {
                const number = mediaUrlMatch[1]; // Le numéro après "mediaurl"
                // Si pas de numéro (chaîne vide), exclure le champ
                if (number === "") {
                    return false; // Exclure ce champ
                }
            }
            return true;
        })
        // Dédupliquer par id pour éviter les clés React dupliquées (ex: deux éléments avec data-id="-sectionTitle")
        .filter((field, index, arr) => arr.findIndex((f) => f.id === field.id) === index);

    // Ajouter automatiquement les champs mediaUrl0, mediaAlt0, mediaType0 pour le background si ils n'existent pas déjà
    const hasMediaUrl0 = editableFields.some(f => f.id.toLowerCase() === "-mediaurl0" || f.id.toLowerCase() === "mediaurl0");
    if (!hasMediaUrl0) {
        editableFields.push(
            {
                id: "-mediaUrl0",
                text: externalValues?.mediaUrl0 || "",
                label: "Media de fond",
                type: "media",
            },
            {
                id: "-mediaAlt0",
                text: externalValues?.mediaAlt0 || "",
                label: "Texte alternatif du media de fond",
                type: "text",
            },
            {
                id: "-mediaType0",
                text: externalValues?.mediaType0 || "image",
                label: "Type du media de fond",
                type: "text",
            }
        );
    } else {
        // Mettre à jour les valeurs existantes avec celles des externalValues si disponibles
        editableFields.forEach(field => {
            if (field.id.toLowerCase() === "-mediaurl0" && externalValues?.mediaUrl0) {
                field.text = externalValues.mediaUrl0;
            } else if (field.id.toLowerCase() === "-mediaalt0" && externalValues?.mediaAlt0) {
                field.text = externalValues.mediaAlt0;
            } else if (field.id.toLowerCase() === "-mediatype0" && externalValues?.mediaType0) {
                field.text = externalValues.mediaType0;
            }
        });
    }

    return { id: bandeId, originalId: bandeOriginalId, fields: editableFields };
};