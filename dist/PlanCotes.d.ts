import { type ReactNode } from "react";
import type { Modele } from "./composition.js";
export interface ClassesPlanCotes {
    cadre: string;
    colonne: string;
    colonneFin: string;
    titre: string;
    contour: string;
    pastilleActive: string;
    pastillePrise: string;
    pastilleVide: string;
    sigle: string;
    texte: string;
    /** Le nom du côté, en tête de ligne du récapitulatif. */
    nomCote: string;
    /** Une ligne de récapitulatif dont le côté ne porte rien — grisée. */
    ligneEteinte: string;
}
/** Le contour et les pastilles, en coordonnées du viewBox 170×158. */
export declare function planDeVisee(modele: Modele): {
    contour: string;
    pastilles: {
        c: string;
        x: number;
        y: number;
        sigle: string;
    }[];
};
export declare function PlanCotes({ modele, actif, onActif, occupe, nomCote, choix, recap, eteint, libelle, classes, }: {
    modele: Modele;
    actif: string;
    onActif: (cote: string) => void;
    /** Ce côté porte-t-il quelque chose ? Sert à remplir la pastille. */
    occupe: (cote: string) => boolean;
    nomCote: (cote: string) => string;
    /** « Votre choix » — le côté EN COURS seulement, rendu par l'application. */
    choix: ReactNode;
    /** Une ligne de récapitulatif par côté. */
    recap: (cote: string) => ReactNode;
    /** Ce côté ne porte rien : sa ligne se grise. */
    eteint?: (cote: string) => boolean;
    libelle: (cle: string) => string;
    classes: ClassesPlanCotes;
}): import("react").JSX.Element;
export default PlanCotes;
