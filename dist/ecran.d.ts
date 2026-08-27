/** Dossier du modèle sur R2, à côté de `tente-x` et `mobilier`. */
export declare const DOSSIER_ECRAN = "ecran";
/** Les gammes d'écran qui ont leur propre modèle 3D. Une gamme = un fichier :
 *  l'étanche se ferme et se gonfle une fois, la soufflerie garde sa soufflerie
 *  et son manchon. Plaquer l'un sur l'autre montrerait au client un écran qu'il
 *  ne recevra pas. */
export type GammeEcran3D = "etanche" | "soufflerie";
/**
 * La gamme dont relève ce slug, ou `null` quand aucun modèle ne la représente.
 *
 * Le KEMI, l'économique, n'a rien — pas même des cotes au catalogue : pas de
 * 3D, comme la jonction de tente tant que Bayes ne l'a pas livrée. Mieux vaut
 * rien qu'un à-peu-près, et le visualiseur le DIT.
 *
 * Le drive-in, lui, EST dessiné : c'est une soufflerie 9 m dont le catalogue
 * relève la base d'image à 3 m. Même modèle, bandeau noir plus haut — très
 * exactement ce que `calerEcran` sait faire.
 */
export declare const gammeEcran3D: (slugSite: string) => GammeEcran3D | null;
/** Vrai quand un modèle 3D sait dessiner cet écran du catalogue. */
export declare const ecranModelise: (slugSite: string) => boolean;
/**
 * Ce qu'on mesure sur le GLB au chargement, en millimètres du modèle.
 * Mesuré plutôt qu'écrit : une nouvelle livraison Bayes ne doit pas obliger à
 * retoucher des nombres à la main — c'est ce qui avait fait dériver la tente N.
 */
export interface MesuresEcran {
    /** Largeur de la seule toile de projection (matière `toile`). */
    largeurToileMM: number;
    /**
     * Le plancher du bandeau noir : sous lui, c'est le contact au sol, rien ne
     * bouge. Haut de la bande d'usure quand il y en a une (l'étanche), sinon bas
     * du bandeau lui-même (la soufflerie, dont l'armature en étoile monte jusqu'au
     * sommet et ne dit donc rien du socle).
     */
    zSocleMM: number;
    /** Bas de la toile de projection = la base de l'image. */
    zToileMM: number;
    /** Hauteur hors tout du modèle brut. */
    hauteurBruteMM: number;
}
export interface CalageEcran {
    /** Mise à l'échelle du modèle entier. */
    facteur: number;
    /** Millimètres du modèle → millimètres du modèle, jupe étirée. */
    etirer: (z: number) => number;
    /** Hauteur hors tout obtenue, en mètres. */
    hauteurM: number;
    /** Base de l'image obtenue, en mètres. Égale la cote visée — sauf si la jupe
     *  avait dû se replier sur elle-même, cas où elle est butée. */
    baseM: number;
    /** Vrai quand la butée a joué : la cote visée n'est pas atteinte. */
    butee: boolean;
}
/**
 * Le facteur d'échelle et l'étirement de jupe pour une taille donnée.
 *
 * `baseImageM` absente (le catalogue ne la connaît pas pour cette taille) : on
 * se contente de la mise à l'échelle, sans toucher à la géométrie du
 * fournisseur. Mieux vaut un dessin fidèle au modèle qu'un dessin corrigé
 * d'après un nombre qu'on n'a pas.
 */
export declare function calerEcran(m: MesuresEcran, toileLargeurM: number, baseImageM: number | null): CalageEcran;
