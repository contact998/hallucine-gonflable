import { type RefObject } from "react";
import type { Vue } from "./vuesCamera.js";
/** Les mots des outils. Le site les traduit en six langues, le CRM n'en parle
 *  qu'une — d'où des mots injectés. Absents : le français par défaut. */
export interface LibellesOutils {
    pleinEcran?: string;
    quitter?: string;
    imprimer?: string;
    telecharger?: string;
    /** Le nom du groupe de vues, pour les lecteurs d'écran. */
    vues?: string;
    face?: string;
    cote?: string;
    dessus?: string;
    troisQuarts?: string;
}
/** Une vue proposée par le visualiseur : son nom, et le geste qui y mène. */
export interface VueOutil {
    cle: Vue;
    aller: () => void;
}
/** Le nom de fichier par défaut d'une image téléchargée. */
export declare const NOM_IMAGE_DEFAUT = "hallucine-configuration.png";
/**
 * Enregistre une image (data-URL) sous ce nom, sans quitter la page.
 *
 * Passée par un Blob plutôt que par la data-URL elle-même : un lien de
 * plusieurs mégaoctets dans `href` est refusé par certains navigateurs, et
 * Safari sur iPhone ouvre alors l'image au lieu de la proposer à
 * l'enregistrement. Exportée : le CRM enregistre aussi des captures qu'il a
 * déjà en main.
 */
export declare function telechargerImage(dataUrl: string, nom?: string): void;
/** Imprime une image seule, sans quitter la page. Rendue exportée : le CRM
 *  imprime aussi des captures qu'il a déjà en main. */
export declare function imprimerImage(dataUrl: string, titre?: string): void;
export declare function OutilsVue({ hote, capture, libelles, sombre, vues, nomFichier, }: {
    /** L'élément à passer en plein écran — la racine du visualiseur. */
    hote: RefObject<HTMLDivElement | null>;
    /** Rend la scène en data-URL — JPEG par défaut, PNG sur demande — ou null si
     *  elle n'est pas prête. */
    capture: (format?: "image/jpeg" | "image/png") => string | null;
    libelles?: LibellesOutils;
    /** Habillage clair sur fond sombre, pour les scènes qui en ont un. */
    sombre?: boolean;
    /** Les vues toutes prêtes de CETTE scène. Absentes : pas de boutons. */
    vues?: readonly VueOutil[];
    /** Le nom du fichier téléchargé. */
    nomFichier?: string;
}): import("react").JSX.Element;
export default OutilsVue;
