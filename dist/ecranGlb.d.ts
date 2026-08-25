import * as THREE from "three";
import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { type MesuresEcran } from "./ecran.js";
export interface CorpsEcran {
    objet: THREE.Mesh;
    origine: Float32Array;
    /** La quincaillerie se DÉPLACE, elle ne s'étire pas : une valve allongée de
     *  huit centimètres se voit, une valve remontée d'autant, non. */
    rigide: boolean;
    centreZ: number;
}
export interface EcranCharge {
    /** Le groupe à poser dans la scène. Son échelle est fixée par `poserTaille`. */
    groupe: THREE.Group;
    corps: CorpsEcran[];
    mesures: MesuresEcran;
}
/** Ce qu'on obtient une fois la taille appliquée, en mètres. */
export interface TailleEcran {
    hauteurM: number;
    largeurM: number;
    /** Base de l'image obtenue — butée comprise, voir `calerEcran`. */
    baseM: number;
}
/**
 * Charge le modèle, le mesure, et rend de quoi le redimensionner.
 *
 * Les mesures sont PRISES sur le maillage, jamais écrites : une nouvelle
 * livraison Bayes ne doit pas obliger à retoucher des nombres à la main —
 * c'est ce qui avait fait dériver la tente N.
 */
export declare function chargerEcranGlb(loader: GLTFLoader): Promise<EcranCharge>;
/**
 * Donne sa taille à un écran déjà chargé — on réécrit des sommets déjà là,
 * rien ne se recharge.
 *
 * Lance quand la taille demandée est hors de ce que la géométrie sait rendre :
 * l'appelant décide alors quoi dire, ce fichier ne dessine pas d'à-peu-près.
 */
export declare function poserTaille(e: EcranCharge, toileLargeurM: number, baseImageM: number | null): TailleEcran;
