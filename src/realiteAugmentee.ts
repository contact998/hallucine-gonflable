/*
 * L'écran à sa vraie taille, prêt pour la réalité augmentée du téléphone.
 *
 * Le fichier brut de R2 ne convient pas : Bayes ne modèle qu'UNE taille par
 * gamme, et toutes les autres naissent de `poserTaille`, qui réécrit les
 * sommets (la jupe s'étire, la toile garde sa hauteur exacte — voir ecran.ts).
 * On exporte donc l'écran APRÈS ce calage : c'est la seule version qui ait les
 * cotes du catalogue. Un simple facteur d'échelle sur le fichier brut
 * fausserait la hauteur de la base de l'image, la cote qui décide si le public
 * voit le film.
 *
 * Repère : nos scènes sont Z-haut, face de projection vers −Y. La réalité
 * augmentée (glTF) attend Y-haut et pose l'objet face à l'utilisateur selon
 * +Z. Un quart de tour autour de X fait les deux : Z devient Y, −Y devient +Z.
 *
 * L'affichage AR lui-même (model-viewer, Quick Look, WebXR) appartient à
 * l'application : ce module rend un GLB en mètres, rien de plus.
 */
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { chargeurGLB } from "./chargeurGlb.js";
import { chargerEcranGlb, poserTaille, type TailleEcran } from "./ecranGlb.js";
import type { GammeEcran3D } from "./ecran.js";

/** Remet une scène Z-haut dans le repère de la réalité augmentée (Y-haut, face +Z). */
export function versRepereAR(objet: THREE.Object3D): THREE.Group {
  const racine = new THREE.Group();
  racine.rotation.x = -Math.PI / 2;
  racine.add(objet);
  racine.updateMatrixWorld(true);
  return racine;
}

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
export async function ecranPourRealiteAugmentee(
  gamme: GammeEcran3D,
  toileLargeurM: number,
  baseImageM: number | null,
): Promise<EcranAR> {
  const ecran = await chargerEcranGlb(chargeurGLB(), gamme);
  const taille = poserTaille(ecran, toileLargeurM, baseImageM);
  const scene = versRepereAR(ecran.groupe);
  const glb = (await new GLTFExporter().parseAsync(scene, { binary: true })) as ArrayBuffer;
  return { glb, taille };
}
