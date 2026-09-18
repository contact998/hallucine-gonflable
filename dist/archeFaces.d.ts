import * as THREE from "three";
import type { MesuresArche } from "./arche.js";
/** Les trois matières d'une arche, dans l'ordre des groupes de triangles. */
export declare const GROUPE_FLANC = 0;
export declare const GROUPE_AVANT = 1;
export declare const GROUPE_ARRIERE = 2;
/**
 * Part de la demi-profondeur au-delà de laquelle un triangle appartient à une
 * face : 0,5, c'est ± 60° autour de l'axe avant sur un boudin rond — ce que
 * l'œil lit comme « la face » de l'arche, et ce que Bayes imprime.
 */
export declare const SEUIL_FACE = 0.5;
/** Un triangle de la membrane médiane (voir l'en-tête) : ses trois sommets à
 *  moins d'un dixième de demi-profondeur du plan y = 0, et sa normale le long
 *  de y — à plat dans le plan médian. */
export declare function estMembrane(profondeurs: readonly [number, number, number], normaleY: number): boolean;
/** Le groupe d'un triangle, d'après la profondeur de son centre (−1 = tout
 *  devant, +1 = tout derrière). La caméra de face est côté y négatif. */
export declare function groupeDeProfondeur(s: number): number;
/**
 * Découpe chaque maille du groupe en flanc / avant / arrière et pose la
 * projection plane : `uv` pour la face avant, `uv1` — le même, en miroir — pour
 * la face arrière, qui se lit depuis l'autre côté.
 *
 * À appeler UNE fois, sur le groupe tel que `chargerArcheGlb` le rend : centré
 * en x et en y, pieds à z = 0, avant toute mise à l'échelle. Les mesures sont
 * celles du chargeur, dans le repère de ce groupe.
 */
export declare function preparerFacesArche(groupe: THREE.Object3D, m: MesuresArche): void;
/**
 * La matière d'une arche : un tissu mat, vu des deux côtés, dont la normale
 * regarde TOUJOURS la caméra.
 *
 * Le fichier a des normales retournées par endroits (voir l'en-tête). En double
 * face, three.js oriente la normale d'après le sens de parcours du triangle —
 * juste quand normale et parcours s'accordent, faux sinon : ces triangles-là
 * sortaient sombres, en plaques. Sur une surface fermée, tout ce qu'on voit fait
 * face à l'œil : on retourne donc la normale qui s'en détourne. La retouche se
 * pose DANS le bloc d'origine de three.js ; si une version future le réécrit,
 * elle ne s'applique plus et la matière retombe sur le rendu standard — jamais
 * sur un shader cassé.
 */
export declare function matiereArche(): THREE.MeshStandardMaterial;
