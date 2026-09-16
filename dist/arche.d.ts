/** Dossier du modèle sur R2, à côté de `ecran` et `tente-x`. */
export declare const DOSSIER_ARCHE = "arche";
/**
 * Les formes d'arche qui ont leur propre modèle 3D. Une forme = un fichier :
 * une arche ronde ne se dessine pas depuis le modèle de la droite. Recopié du
 * contrat `ArcheFormeV1` (CRM v0.16.0) plutôt qu'importé, pour ne pas embarquer
 * le contrat et zod dans ce paquet — même choix que côté site
 * (`ARCHE_FORMES_ORDRE`, `useArchesCatalogue.ts`).
 */
export type GammeArche3D = "droite" | "pieds" | "ronde" | "demi" | "soufflerie";
/**
 * Ce qu'on mesure sur le GLB au chargement, en millimètres du modèle.
 * Mesuré plutôt qu'écrit : une nouvelle livraison Bayes ne doit pas obliger à
 * retoucher des nombres à la main — c'est ce qui avait fait dériver la tente N.
 */
export interface MesuresArche {
    largeurMM: number;
    hauteurMM: number;
    profondeurMM: number;
}
export interface CibleArche {
    largeurM: number;
    hauteurM: number;
    profondeurM: number;
}
export interface CalageArche {
    /** Un facteur par axe : la géométrie du fournisseur (X = largeur, Y =
     *  profondeur, Z = hauteur — convention CAO reprise par toute la scène du
     *  lounge, `cam.up.set(0,0,1)`) s'étire indépendamment sur chacun, pour
     *  coller exactement aux trois cotes du catalogue plutôt qu'à une seule
     *  mise à l'échelle uniforme. */
    facteurX: number;
    facteurY: number;
    facteurZ: number;
}
/**
 * Le facteur d'échelle par axe pour une taille donnée.
 *
 * Lance quand une mesure ou une cible est inutilisable : mieux vaut ne pas
 * dessiner d'arche qu'en dessiner une aplatie ou retournée.
 */
export declare function calerArche(m: MesuresArche, cible: CibleArche): CalageArche;
