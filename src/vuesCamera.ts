/*
 * Les vues toutes prêtes — Face, Côté, Dessus, ¾ — pour les trois scènes.
 *
 * Le visiteur qui veut convaincre sa mairie ou son patron n'a pas envie de
 * tourner la scène au doigt jusqu'à tomber sur un angle présentable : il veut
 * LA vue de face, LA vue de dessus, et les imprimer. Le commercial aussi, dans
 * le CRM — les huit endroits qui montent une scène ont donc ces vues d'office,
 * parce qu'elles vivent ici et dans `OutilsVue`, pas dans les pages.
 *
 * AUCUN NOMBRE PAR MODÈLE. Le cadrage se calcule sur la boîte englobante de ce
 * que la scène a VRAIMENT construit, avec `reculPourBoite` — le même calcul que
 * le cadrage d'ouverture du lounge. Une 3 × 3, une rangée de dix tentes et un
 * écran de 22 m remplissent le cadre pareil, sans table à tenir.
 *
 * Seule la FACE est propre à chaque scène : c'est l'azimut d'où la caméra
 * regarde le devant de l'objet, et c'est le visualiseur qui le sait (le côté
 * « avant » de la tente, la toile de l'écran, les assises du lounge). Le reste
 * s'en déduit : le côté est à un quart de tour, le ¾ à un huitième.
 *
 * Ce fichier ne connaît ni caméra ni contrôles : des boîtes et des vecteurs,
 * donc testable sans navigateur. Z est vertical, comme dans toutes nos scènes.
 */
import * as THREE from "three";
import { reculPourBoite } from "./renduStudio.js";

/** Les vues proposées, dans l'ordre des boutons. */
export const VUES = ["face", "cote", "dessus", "troisQuarts"] as const;
export type Vue = (typeof VUES)[number];

/**
 * Décalage d'azimut depuis la face, et hauteur de la caméra (radians).
 *
 * « Dessus » ne regarde PAS exactement à la verticale : la caméra de nos scènes
 * a Z pour haut, et une visée parallèle à son propre haut n'a plus d'orientation
 * — l'image tournerait au hasard. À deux centièmes de radian de la verticale,
 * elle garde un sens : la caméra penche vers la face, donc la face tombe en BAS
 * de l'image, comme sur un plan.
 *
 * Face et côté sont à l'horizontale — une élévation, au sens de l'architecte.
 * Le ¾ reprend à peu près la hauteur d'œil des cadrages d'ouverture.
 */
const REGLAGE: Record<Vue, { decalage: number; elevation: number }> = {
  face: { decalage: 0, elevation: 0 },
  cote: { decalage: Math.PI / 2, elevation: 0 },
  dessus: { decalage: 0, elevation: Math.PI / 2 - 0.02 },
  troisQuarts: { decalage: Math.PI / 4, elevation: 0.45 },
};

/** Où la caméra se tient et ce qu'elle regarde. */
export interface PoseCamera {
  position: THREE.Vector3;
  cible: THREE.Vector3;
}

/** Direction (unitaire) qui va du centre de la scène vers la caméra. */
export function directionVue(vue: Vue, azimutFace: number): THREE.Vector3 {
  const { decalage, elevation } = REGLAGE[vue];
  const az = azimutFace + decalage;
  return new THREE.Vector3(
    Math.cos(az) * Math.cos(elevation),
    Math.sin(az) * Math.cos(elevation),
    Math.sin(elevation),
  );
}

/**
 * La pose de caméra d'une vue : le centre de la boîte comme cible, et le recul
 * juste suffisant pour que ses huit coins tiennent dans le cadre.
 *
 * `azimutFace` : l'azimut (radians, vu de dessus, depuis +X) où se tient la
 * caméra qui regarde la scène de face — la convention de `azimutPourCote`.
 */
export function poseVue(
  vue: Vue,
  boite: THREE.Box3,
  { azimutFace, fov, aspect }: { azimutFace: number; fov: number; aspect: number },
): PoseCamera & { distance: number } {
  const cible = boite.getCenter(new THREE.Vector3());
  const direction = directionVue(vue, azimutFace);
  const distance = reculPourBoite(boite, direction, fov, aspect);
  return { position: cible.clone().addScaledVector(direction, distance), cible, distance };
}

/** Ramène un angle dans [-π, π] : le chemin court, jamais le tour long. */
function angleCourt(a: number): number {
  let d = a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/**
 * Une pose intermédiaire, à `k` ∈ [0, 1] du trajet.
 *
 * On interpole AUTOUR de la cible — distance, azimut, hauteur — et pas la
 * position en ligne droite : passer de la face au côté opposé en ligne droite
 * traverserait l'objet. L'azimut prend le chemin court, comme la visée d'un
 * côté (`viseeCote`).
 */
export function interpolerPose(de: PoseCamera, vers: PoseCamera, k: number): PoseCamera {
  const t = Math.min(1, Math.max(0, k));
  const cible = de.cible.clone().lerp(vers.cible, t);
  const a = de.position.clone().sub(de.cible);
  const b = vers.position.clone().sub(vers.cible);
  const ra = a.length(), rb = b.length();
  const aza = Math.atan2(a.y, a.x), azb = Math.atan2(b.y, b.x);
  const ela = ra > 0 ? Math.asin(Math.max(-1, Math.min(1, a.z / ra))) : 0;
  const elb = rb > 0 ? Math.asin(Math.max(-1, Math.min(1, b.z / rb))) : 0;
  const r = ra + (rb - ra) * t;
  const az = aza + angleCourt(azb - aza) * t;
  const el = ela + (elb - ela) * t;
  const position = cible.clone().add(
    new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)).multiplyScalar(r),
  );
  return { position, cible };
}

/** Accélère puis freine : un départ sec et une arrivée brusque se lisent comme
 *  un saut raté. */
const adoucir = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * La durée d'un changement de vue. Courte — on veut voir la scène tourner,
 * pas l'attendre — et NULLE pour qui a demandé au système de réduire les
 * animations : on saute alors directement à la vue.
 */
export function dureeTransition(): number {
  const reduit = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  return reduit ? 0 : 450;
}

/**
 * Le trajet de la caméra vers une vue, avancé image par image par la boucle de
 * rendu. Un état minuscule, sans horloge à lui : l'appelant fournit l'instant,
 * ce qui le rend testable.
 */
export class TransitionVue {
  private de: PoseCamera | null = null;
  private vers: PoseCamera | null = null;
  private debut = 0;
  private duree = 0;

  /** Partir de `de` vers `vers`. Une durée nulle arrive à la première image. */
  lancer(de: PoseCamera, vers: PoseCamera, maintenant: number, duree: number): void {
    this.de = { position: de.position.clone(), cible: de.cible.clone() };
    this.vers = { position: vers.position.clone(), cible: vers.cible.clone() };
    this.debut = maintenant;
    this.duree = Math.max(0, duree);
  }

  /** Abandonner — un geste du visiteur passe avant tout trajet en cours. */
  annuler(): void {
    this.de = null;
    this.vers = null;
  }

  get active(): boolean {
    return this.vers !== null;
  }

  /** La pose à appliquer maintenant, ou `null` s'il n'y a pas de trajet. La
   *  dernière image rend la pose d'arrivée exacte, puis le trajet s'éteint. */
  avancer(maintenant: number): PoseCamera | null {
    if (!this.de || !this.vers) return null;
    const k = this.duree > 0 ? (maintenant - this.debut) / this.duree : 1;
    if (k >= 1) {
      const fin = this.vers;
      this.annuler();
      return fin;
    }
    return interpolerPose(this.de, this.vers, adoucir(Math.max(0, k)));
  }
}
