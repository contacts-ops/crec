"use client";
import { useEffect } from "react";

export default function CrispInjector({
    isEnabled,
    websiteId,
    themeColor,
}: {
    isEnabled: boolean;
    websiteId: string;
    themeColor: string;
}) {
    type CrispWindow = Window & { $crisp?: unknown; CRISP_WEBSITE_ID?: string };
    useEffect(() => {
        const SCRIPT_SELECTOR = 'script[data-crisp-script="true"]';

        // Désactiver: tenter de masquer/fermer et nettoyer le script
        if (!isEnabled || (typeof window !== "undefined" && window.location.pathname.includes("admin"))) {
            try {
                (window as unknown as CrispWindow).$crisp?.push(["do", "chat:close"]);
                (window as unknown as CrispWindow).$crisp?.push(["do", "chat:hide"]);
            } catch { }
            const existing = document.querySelector(SCRIPT_SELECTOR);
            if (existing) existing.parentElement?.removeChild(existing);
            try {
                (window as unknown as { $crisp?: unknown }).$crisp = undefined;
                (window as unknown as { CRISP_WEBSITE_ID?: string }).CRISP_WEBSITE_ID =
                    undefined;
            } catch { }
            return;
        }

        // Activer: injecter si ID valide
        if (!websiteId) return;

        const existing = document.querySelector(
            SCRIPT_SELECTOR
        ) as HTMLScriptElement | null;
        const currentId = (window as unknown as CrispWindow).CRISP_WEBSITE_ID;

        // Recharger si l'ID a changé
        if (existing && currentId && currentId !== websiteId) {
            existing.parentElement?.removeChild(existing);
            try {
                (window as unknown as { $crisp?: unknown }).$crisp = undefined;
            } catch { }
        }

        const crispWin = window as unknown as CrispWindow;
        if (!Array.isArray(crispWin.$crisp)) {
            (crispWin as unknown as { $crisp?: unknown[] }).$crisp = [] as unknown[];
        }
        crispWin.CRISP_WEBSITE_ID = websiteId;

        if (!document.querySelector(SCRIPT_SELECTOR)) {
            const s = document.createElement("script");
            s.src = "https://client.crisp.chat/l.js";
            s.async = true;
            s.setAttribute("data-crisp-script", "true");
            document.head.appendChild(s);
        }

        // Appliquer la couleur de thème si fournie
        if (
            themeColor &&
            Array.isArray((window as unknown as CrispWindow).$crisp)
        ) {
            (window as unknown as { $crisp: unknown[] }).$crisp.push([
                "config",
                "color:theme",
                themeColor,
            ]);
        }
    }, [isEnabled, websiteId, themeColor]);

    return null;
}