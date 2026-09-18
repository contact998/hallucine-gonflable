import * as THREE from "three";
/** Les vues proposées, dans l'ordre des boutons. */
export declare const VUES: readonly ["face", "cote", "dessus", "troisQuarts"];
export type Vue = (typeof VUES)[number];
/** Où la caméra se tient et ce qu'elle regarde. */
export interface PoseCamera {
    position: THREE.Vector3;
    cible: THREE.Vector3;
}
/** Direction (unitaire) qui va du centre de la scène vers la caméra. */
export declare function directionVue(vue: Vue, azimutFace: number): THREE.Vector3;
/**
 * La pose de caméra d'une vue : le centre de la boîte comme cible, et le recul
 * juste suffisant pour que ses huit coins tiennent dans le cadre.
 *
 * `azimutFace` : l'azimut (radians, vu de dessus, depuis +X) où se tient la
 * caméra qui regarde la scène de face — la convention de `azimutPourCote`.
 */
export declare function poseVue(vue: Vue, boite: THREE.Box3, { azimutFace, fov, aspect }: {
    azimutFace: number;
    fov: number;
    aspect: number;
}): PoseCamera & {
    distance: number;
};
/**
 * Une pose intermédiaire, à `k` ∈ [0, 1] du trajet.
 *
 * On interpole AUTOUR de la cible — distance, azimut, hauteur — et pas la
 * position en ligne droite : passer de la face au côté opposé en ligne droite
 * traverserait l'objet. L'azimut prend le chemin court, comme la visée d'un
 * côté (`viseeCote`).
 */
export declare function interpolerPose(de: PoseCamera, vers: PoseCamera, k: number): PoseCamera;
/**
 * La durée d'un changement de vue. Courte — on veut voir la scène tourner,
 * pas l'attendre — et NULLE pour qui a demandé au système de réduire les
 * animations : on saute alors directement à la vue.
 */
export declare function dureeTransition(): number;
/**
 * Le trajet de la caméra vers une vue, avancé image par image par la boucle de
 * rendu. Un état minuscule, sans horloge à lui : l'appelant fournit l'instant,
 * ce qui le rend testable.
 */
export declare class TransitionVue {
    private de;
    private vers;
    private debut;
    private duree;
    /** Partir de `de` vers `vers`. Une durée nulle arrive à la première image. */
    lancer(de: PoseCamera, vers: PoseCamera, maintenant: number, duree: number): void;
    /** Abandonner — un geste du visiteur passe avant tout trajet en cours. */
    annuler(): void;
    get active(): boolean;
    /** La pose à appliquer maintenant, ou `null` s'il n'y a pas de trajet. La
     *  dernière image rend la pose d'arrivée exacte, puis le trajet s'éteint. */
    avancer(maintenant: number): PoseCamera | null;
}
