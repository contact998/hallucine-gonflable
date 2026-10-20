import * as THREE from "three";
import { type TailleEcran } from "./ecranGlb.js";
import type { GammeEcran3D } from "./ecran.js";
/** Remet une scène Z-haut dans le repère de la réalité augmentée (Y-haut, face +Z). */
export declare function versRepereAR(objet: THREE.Object3D): THREE.Group;
export interface EcranAR {
    /** Le GLB binaire, en mètres, Y-haut. */
    glb: ArrayBuffer;
    taille: TailleEcran;
}
/**
 * Charge l'écran de la gamme, lui donne la taille du catalogue, et l'exporte.
 * Lance quand la taille est hors de ce que la géométrie sait rendre (comme
 * `poserTaille`) : l'appelant n'offre alors pas la réalité augmentée.
 */
export declare function ecranPourRealiteAugmentee(gamme: GammeEcran3D, toileLargeurM: number, baseImageM: number | null): Promise<EcranAR>;
