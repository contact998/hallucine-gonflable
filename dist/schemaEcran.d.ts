export type GammeSchema = "etanche" | "soufflerie";
/** Les formats proposés. Le 16/9 est la référence : c'est lui qui fixe la hauteur. */
export declare const RATIOS_PROJECTION: {
    value: number;
    label: string;
}[];
/** Le format de référence : la hauteur hors-tout est toujours celle du 16/9. */
export declare const RATIO_REF: number;
/**
 * Bandeau noir (mm) sous l'image quand on masque un format plus large que le
 * 16/9 (le 1.85) : la hauteur hors-tout ne bouge pas, le bandeau absorbe
 * l'écart. Zéro en 16/9, et zéro sur les formats plus hauts (4/3).
 */
export declare function bandeauMasque(twMm: number, ratio: number): number;
/** Plage des réglages par gamme : ce qu'un écran de cette famille sait faire. */
export declare const PLAGE_GAMME: Record<GammeSchema, {
    largeurMinMm: number;
    largeurMaxMm: number;
    largeurPasMm: number;
    largeurDefautMm: number;
    basMinMm: number;
    basMaxMm: number;
    basPasMm: number;
}>;
/**
 * Ø boudin de l'étanche (mm) selon la largeur de toile. Table de seuils : le
 * fournisseur ne fabrique pas un boudin continu, il a ses diamètres.
 */
export declare function boudinEtanche(twMm: number): number;
/**
 * Ø boudin de la soufflerie (mm) selon la largeur de toile. Dimensionné pour une
 * rigidité au vent à peu près constante (Ø ≈ 0,15 × largeur, ancré sur le 10 m à
 * 1,50 m) ; le petit bout est remonté pour compenser son faible volume d'air, le
 * haut infléchi pour rester réaliste.
 */
export declare function boudinSoufflerie(twMm: number): number;
/** Le Ø que porte cette gamme à cette largeur, sans avoir à choisir la table. */
export declare const boudinPourLargeur: (gamme: GammeSchema, twMm: number) => number;
/** Plancher du bas d'image : le demi-boudin, arrondi au cran supérieur. */
export declare function planchierBasImage(gamme: GammeSchema, boudinMm: number): number;
export interface CotesEcran {
    /** Ø du boudin (mm) et son rayon. */
    boudinMm: number;
    rayonMm: number;
    /** Hauteur de l'image (mm) — la toile blanche seule. */
    imageHauteurMm: number;
    /** Hors-tout, structure gonflée (mm). */
    horsToutLargeurMm: number;
    horsToutHauteurMm: number;
    /** Jupe : la toile sombre entre le bas de l'image et le boudin du bas (mm). */
    jupeMm: number;
    /** Plancher imposé, et le bas d'image réellement retenu (mm). */
    basPlancherMm: number;
    basRetenuMm: number;
    /** Bandeau de masquage (mm) et bas de l'image réel = bas retenu + bandeau. */
    bandeauMm: number;
    basImageMm: number;
}
export interface EntreeCotes {
    gamme: GammeSchema;
    /** Largeur de la toile blanche (mm). */
    largeurToileMm: number;
    /** Bas d'image souhaité (mm) — remonté au plancher s'il est trop bas. */
    basImageMm: number;
    ratio: number;
    /** Ø imposé (mm). Omis : la table de la gamme décide. */
    boudinMm?: number;
    /** Bandeau de masquage (mm) — voir bandeauMasque. */
    bandeauMm?: number;
}
/**
 * Toutes les cotes d'un écran. Fonction PURE : mêmes entrées, mêmes cotes, du
 * serveur au navigateur.
 */
export declare function coterEcran(e: EntreeCotes): CotesEcran;
