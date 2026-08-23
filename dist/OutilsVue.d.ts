import { type RefObject } from "react";
/** Imprime une image seule, sans quitter la page. Rendue exportée : le CRM
 *  imprime aussi des captures qu'il a déjà en main. */
export declare function imprimerImage(dataUrl: string, titre?: string): void;
export declare function OutilsVue({ hote, capture, libelles, sombre, }: {
    /** L'élément à passer en plein écran — la racine du visualiseur. */
    hote: RefObject<HTMLDivElement | null>;
    /** Rend la scène en JPEG (data-URL), ou null si elle n'est pas prête. */
    capture: () => string | null;
    libelles?: {
        pleinEcran?: string;
        quitter?: string;
        imprimer?: string;
    };
    /** Habillage clair sur fond sombre, pour les scènes qui en ont un. */
    sombre?: boolean;
}): import("react").JSX.Element;
export default OutilsVue;
