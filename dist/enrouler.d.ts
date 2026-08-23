/**
 * L'enroulement « toute la tente » — partagé entre les deux viewers.
 *
 * Vit dans son propre fichier parce que le viewer tente et le viewer lounge
 * sont chargés en différé indépendamment : importer l'un depuis l'autre pour
 * une fonction fondrait leurs paquets. Ici, chacun ne tire que ces trente
 * lignes.
 */
import * as THREE from "three";
/**
 * Enroule une grille autour de la tente ENTIÈRE, comme une banderole : le tour
 * devient la largeur, la hauteur reste la hauteur.
 *
 * Pourquoi pas la projection du dessus : elle est juste pour un toit, mais les
 * parois sont verticales — vues d'en haut elles se réduiraient à des traînées.
 * L'enroulement les rend parfaitement, au prix d'un SOMMET DE TOIT ÉTIRÉ,
 * comme le pôle sur un planisphère. C'est inhérent, pas un défaut d'exécution.
 *
 * Le repère est celui de la tente, pas de la pièce : c'est ce qui raccorde une
 * paroi au toit. `u` part de l'arrière (angle 0) et fait le tour ; `v` monte du
 * sol au sommet, mesuré sur la hauteur totale passée en paramètre.
 */
export declare function enroulerAutourDeLaTente(groupe: THREE.Object3D, hauteur: number): void;
