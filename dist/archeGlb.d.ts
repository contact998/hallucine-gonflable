import * as THREE from "three";
import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { type CibleArche, type GammeArche3D, type MesuresArche } from "./arche.js";
export interface ArcheCharge {
    /** Le groupe à poser dans la scène, à l'échelle brute du modèle (mm). */
    groupe: THREE.Group;
    mesures: MesuresArche;
}
export interface TailleArche {
    largeurM: number;
    hauteurM: number;
    profondeurM: number;
}
/**
 * Charge le modèle et le mesure sur sa boîte englobante — pas de matière à
 * trier, le fichier livré par Bayes est un tube nu.
 */
export declare function chargerArcheGlb(loader: GLTFLoader, forme: GammeArche3D): Promise<ArcheCharge>;
/**
 * Donne sa taille à une arche déjà chargée : trois facteurs d'échelle, un par
 * axe — pas de sommets à réécrire, contrairement à la jupe de l'écran.
 */
export declare function poserTailleArche(e: ArcheCharge, cible: CibleArche): TailleArche;
