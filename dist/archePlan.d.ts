import type { GammeArche3D } from "./arche.js";
import { type VisuelPose } from "./pose.js";
export interface CotesArche {
    forme: GammeArche3D;
    largeurCm: number;
    hauteurCm: number;
    /** La profondeur de l'arche — le DIAMÈTRE du boudin. */
    profondeurCm: number;
    /** Arches à pieds : la longueur des tubes posés au sol (voir l'en-tête). */
    hauteurPiedsCm?: number | null;
}
export type CleCote = "largeur" | "hauteur" | "diametre" | "pieds";
export interface CoteTracee {
    cle: CleCote;
    valeurCm: number;
    /** La ligne de cote, d'un bout à l'autre. */
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    /** Les lignes d'attache, de l'objet jusqu'un peu au-delà de la cote. */
    attaches: [number, number, number, number][];
    /** Où écrire la valeur. `vertical` : le texte tourne d'un quart de tour. */
    texte: {
        x: number;
        y: number;
        ancre: "start" | "middle" | "end";
        vertical: boolean;
    };
}
export interface GeometrieArche {
    forme: GammeArche3D;
    /** La boîte de la vue de face, en cm. */
    largeur: number;
    hauteur: number;
    /** Le contour de l'arche vue de face : un chemin SVG fermé. */
    contour: string;
    /** Les sommets de ce contour quand il est polygonal — toutes les formes
     *  sauf la ronde, dont le contour est fait d'arcs. */
    sommets: [number, number][] | null;
    /** La vue de côté des arches à pieds : le montant sur son tube de pied. */
    profil: {
        contour: string;
        x: number;
        largeur: number;
    } | null;
    cotes: CoteTracee[];
    /** La ligne de sol, sous la vue de face et le profil. */
    sol: {
        x1: number;
        x2: number;
        y: number;
    };
    viewBox: {
        x: number;
        y: number;
        largeur: number;
        hauteur: number;
    };
    /** La taille du texte des cotes, en unités du dessin — proportionnelle à
     *  l'arche, donc constante à l'écran quelle que soit sa taille. */
    police: number;
    /** Où poser un visuel unique, en part de la boîte : le milieu du bandeau. */
    centreVisuel: {
        x: number;
        y: number;
    };
}
/**
 * La géométrie cotée d'une arche, ou `null` si ses cotes ne se dessinent pas.
 * Mieux vaut pas de plan qu'un plan faux : une cote nulle ou négative vient
 * d'une fiche incomplète, pas d'une arche plate.
 */
export declare function geometrieArche(a: CotesArche): GeometrieArche | null;
/**
 * Où poser un visuel unique : au milieu du BANDEAU, là où l'œil lit une arche.
 * Le centre de la boîte tomberait dans l'ouverture — du vide, que la 3D et le
 * plan ne montreraient pas. En part de la boîte (0 à 1, y vers le bas).
 */
export declare function centreVisuelArche(a: CotesArche): {
    x: number;
    y: number;
};
/**
 * La première pose d'un visuel déposé sur une arche — deux cas bien distincts :
 *
 *  · une MAQUETTE de toute la face (proportions voisines de l'arche) : elle la
 *    recouvre, comme le gabarit d'impression du fournisseur ;
 *  · un LOGO : posé une fois, au milieu du bandeau, assez petit pour y tenir en
 *    hauteur (80 % du boudin). « Remplir » l'aurait agrandi à toute la boîte,
 *    et l'essentiel serait tombé dans l'ouverture.
 */
export declare function poseInitialeArche(url: string, ratioImage: number, a: CotesArche): VisuelPose;
/**
 * La face imprimée d'une arche, telle qu'elle se projette : un canevas aux
 * proportions de l'arche (largeur × hauteur hors-tout), rempli de la teinte,
 * le visuel posé par `composerPan` — la même fonction que les pans de tente.
 * La 3D et le plan coté lisent LE MÊME canevas, ils ne peuvent pas diverger.
 */
export declare function composerFaceArche(image: HTMLImageElement, pose: VisuelPose, a: CotesArche, fond: string): HTMLCanvasElement;
