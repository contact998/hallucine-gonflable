import type { Modele } from "./composition.js";
/** Où en est la visée. `anime` s'éteint tout seul, à l'arrivée. */
export interface Visee {
    cible: number;
    anime: boolean;
}
export declare const viseeNeuve: (cible?: number) => Visee;
/**
 * L'azimut de caméra qui présente ce côté de face.
 *
 * La caméra part du MÊME azimut que la pièce, à un quart de tour près —
 * l'écart entre le plan vu de dessus et la sphère de la caméra, rien d'autre.
 * Deux tables séparées auraient divergé au premier modèle dont la façade n'est
 * pas celle de la tente X : la N, justement.
 */
export declare function azimutPourCote(m: Modele, cote: string): number;
/** Viser ce côté, à partir de maintenant. */
export declare function viser(v: Visee, m: Modele, cote: string): void;
/**
 * Le prochain azimut, ou `null` quand il n'y a plus rien à faire (arrivé, ou
 * pas d'animation en cours). L'appelant pose la caméra, ce fichier ne sait pas
 * comment.
 *
 * L'écart est ramené dans [-π, π] : sans ça, viser « gauche » depuis « droite »
 * fait faire à la caméra le tour long, parfois deux fois.
 */
export declare function prochainAzimut(v: Visee, courant: number): number | null;
