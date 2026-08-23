import * as THREE from "three";
/** Toile blanche translucide — l'opacité 0,42 est celle que portait la matière
 *  « vitre » du STEP, reprise telle quelle plutôt que redevinée. */
export declare const VITRE_MAT: THREE.MeshStandardMaterial;
/** Repère la vitre par la géométrie plutôt que par un indice de morceau : Bayes
 *  réordonne ses exports. La vitre est le morceau dont la boîte est la plus
 *  petite ET tient entièrement dans celle du plus grand. Si rien ne correspond
 *  — nouvel export, découpe différente — on ne marque rien : la paroi reste
 *  unie, elle ne casse pas.
 *
 *  On compare des AIRES, pas des volumes. Les panneaux de la N sont des plans
 *  d'épaisseur nulle : leur volume vaut zéro, celui de la toile comme celui de
 *  la vitre, et la comparaison ne départageait rien. L'aire de la plus grande
 *  face vaut pour les deux découpes — 697 000 contre 5 762 000 mm² sur la X,
 *  880 000 contre 4 617 000 sur la N. */
export declare function marquerVitre(scene: THREE.Object3D): void;
/** La vitre ne se teint pas, ne s'imprime pas, ne s'éclaircit pas : c'est du
 *  transparent, pas de la toile. Un seul test, appelé partout où on peint. */
export declare const estVitre: (o: THREE.Object3D) => boolean;
