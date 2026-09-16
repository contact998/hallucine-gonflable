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
 * Les formes qui ont VRAIMENT un fichier sur R2 aujourd'hui — pas les cinq de
 * `GammeArche3D`, qui ne fait que lister ce que le catalogue vend. Une seule
 * livraison Bayes à ce jour (droite, 16/09/2026) : les quatre autres
 * tenteraient un GET qui échoue à coup sûr. Même mécanique que
 * `gammeEcran3D`/`ecranModelise`, qui figent aussi les gammes livrées plutôt
 * que de deviner — à élargir d'une ligne à chaque nouvelle livraison.
 */
export declare const ARCHE_FORMES_MODELISEES: readonly GammeArche3D[];
/** Vrai quand un modèle 3D sait dessiner cette forme. */
export declare const archeModelisee: (forme: GammeArche3D) => boolean;
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
