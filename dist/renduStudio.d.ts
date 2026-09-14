import * as THREE from "three";
/** Éclairage commun, neutre et sans ombre portée. */
export declare function eclairerStudio(scene: THREE.Scene): void;
/** Distance nécessaire pour que les huit coins tiennent dans les deux axes.
 * La direction va du centre vers la caméra ; Z est vertical dans nos scènes.
 * Le calcul tient compte de la profondeur, sans éloigner inutilement les scènes longues.
 */
export declare function reculPourBoite(boite: THREE.Box3, direction: THREE.Vector3, fov: number, aspect: number): number;
/** Matière de toile commune aux tentes seules et aux abris du lounge. */
export declare function matiereTente(source: THREE.MeshStandardMaterial, structure: boolean): THREE.MeshPhysicalMaterial;
