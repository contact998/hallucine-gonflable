/** Dossier du modèle sur R2, à côté de `tente-x` et `mobilier`. */
export declare const DOSSIER_ECRAN = "ecran";
/**
 * Quels écrans du catalogue ce modèle représente : la gamme ÉTANCHE, et elle
 * seule.
 *
 * La gamme SOUFFLERIE n'est pas le même produit — manchon de gonflage, autres
 * proportions, autre structure — et lui plaquer ce modèle montrerait au client
 * un écran qu'il ne recevra pas. La gamme KEMI (l'économique), elle, n'a même
 * pas de cotes au catalogue. Dans les deux cas : pas de 3D, comme la jonction
 * de tente tant que Bayes ne l'a pas livrée. Mieux vaut rien qu'un à-peu-près.
 */
export declare const ecranModelise: (slugSite: string) => boolean;
/**
 * Ce qu'on mesure sur le GLB au chargement, en millimètres du modèle.
 * Mesuré plutôt qu'écrit : une nouvelle livraison Bayes ne doit pas obliger à
 * retoucher des nombres à la main — c'est ce qui avait fait dériver la tente N.
 */
export interface MesuresEcran {
    /** Largeur de la seule toile de projection (matière `toile`). */
    largeurToileMM: number;
    /** Haut du renfort d'usure : sous lui, c'est le contact au sol, rien ne bouge. */
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
