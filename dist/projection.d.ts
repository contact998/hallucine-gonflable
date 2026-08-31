/** Norme cinéma DCI : 48 cd/m² × π ≈ 150 lm par m² d'image (toile gain 1). */
export declare const LUMENS_M2_CINEMA = 150;
/** Plancher plein air par nuit noire : en dessous de ~100 lm/m², image délavée. */
export declare const LUMENS_M2_MINIMUM = 100;
export interface BesoinLumens {
    /** Plancher nuit noire (LUMENS_M2_MINIMUM × surface), arrondi à la centaine. */
    minimum: number;
    /** Seuil image de cinéma (LUMENS_M2_CINEMA × surface), arrondi à la centaine. */
    cinema: number;
}
/** Besoin en lumens pour une surface d'IMAGE (pas la toile hors-tout), en m². */
export declare function besoinLumens(surfaceM2: number): BesoinLumens;
/**
 * Lit la puissance annoncée dans un libellé de projecteur (« laser 14500 lm »,
 * « 9000 lumens »…). `null` quand rien n'est annoncé : un projecteur dont on ne
 * connaît pas la puissance ne peut pas être recommandé pour une surface.
 */
export declare function lireLumens(libelle: string): number | null;
export interface ProjecteurDcp {
    marque: "Barco" | "Christie" | "Sharp / NEC" | "GDC Espedeo";
    modele: string;
    /** Puissance nominale, bas de fourchette constructeur (conservateur). */
    lumens: number;
    /** Transportable en flight-case : le critère du cinéma itinérant. */
    flightCase: boolean;
}
/** Table de référence des DCP conseillés, triée par puissance croissante. */
export declare const PROJECTEURS_DCP: ProjecteurDcp[];
/**
 * Les DCP qui atteignent la cible, du plus juste au plus puissant (les `max`
 * premiers). Vide = au-delà du mono-projecteur DCP courant : il faut alors deux
 * machines, ou du RGB très haute puissance.
 */
export declare function dcpPourCible(lumensCible: number, max?: number): ProjecteurDcp[];
