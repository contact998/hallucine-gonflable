/*
 * Comment le visuel du client se pose sur un pan de tente.
 *
 * Partie SANS navigateur : les modes, et la règle qui dit si un curseur a lieu
 * d'être. Le dessin lui-même vit dans client/src/lib/visuelTente.ts — il lui
 * faut un canevas.
 */

/** Trois gestes, et le premier ne se règle pas.
 *
 *  « Remplir » a failli disparaître : il fait presque doublon avec « une fois »
 *  poussé au-delà de 100 %. On le garde pour une raison qui n'est pas
 *  technique — c'est le seul mode SANS réglage. Un clic, l'image couvre le pan,
 *  c'est fini. La plupart des clients ne veulent rien régler, et leur imposer
 *  un curseur pour obtenir l'évidence serait leur faire payer notre élégance. */
export const MODES_POSE = ["remplir", "une_fois", "mosaique"] as const;

export type ModePose = (typeof MODES_POSE)[number];

/** SUR QUOI le geste s'applique — et c'est une question distincte de CE QU'ON
 *  fait de l'image. Les deux avaient été mélangés : « sur tout le toit » était
 *  un quatrième mode, alors que ce n'est pas un geste de plus mais une portée.
 *  Séparés, les trois gestes valent pour les deux portées.
 *
 *  `pan`   : chaque panneau reçoit son propre dessin — quatre sur le toit.
 *  `zone`  : un seul dessin à cheval sur tous les panneaux de la zone.
 *  `tente` : un seul dessin ENROULÉ autour de la tente entière, parois
 *            comprises — le tour devient la largeur, la hauteur reste la
 *            hauteur. Le sommet du toit s'y étire, comme le pôle sur un
 *            planisphère : c'est inhérent à l'enroulement. */
export const PORTEES = ["pan", "zone", "tente"] as const;
export type Portee = (typeof PORTEES)[number];

/** Zones dont les pans peuvent porter UN dessin commun. Seul le toit : le
 *  cache-zip est aussi en quatre morceaux, mais répartis sur le pourtour — une
 *  projection vue du dessus les écraserait. La porte demanderait une projection
 *  dans le plan de la paroi, un autre calcul. */
const ZONES_ETALABLES = new Set(["toit"]);

/** Portées proposées pour une zone.
 *
 *  « Toute la tente » vaut PARTOUT, y compris sur une paroi : c'est justement
 *  son intérêt — la même image court du toit aux parois. « Sur tout le toit »,
 *  lui, ne concerne que les zones à plusieurs pans. */
export function porteesPour(zone?: string): Portee[] {
  return zone && ZONES_ETALABLES.has(zone) ? [...PORTEES] : ["pan", "tente"];
}

export interface VisuelPose {
  /** Image réduite, en data-URL. */
  url: string;
  mode: ModePose;
  taille: number;
  /** Par panneau, ou sur toute la zone. Voir `PORTEES`. */
  portee: Portee;
}

export interface PlageTaille {
  min: number;
  max: number;
  defaut: number;
}

/**
 * Plage du curseur, en part de la LARGEUR du pan — ou `null` quand le mode n'a
 * rien à régler. C'est cette fonction, et elle seule, qui décide si l'écran
 * montre un curseur : un mode sans plage n'en affiche pas.
 */
export function plageTaille(mode: ModePose): PlageTaille | null {
  if (mode === "remplir") return null; // il couvre : rien à régler
  return mode === "une_fois"
    ? { min: 5, max: 100, defaut: 60 }
    : { min: 5, max: 100, defaut: 40 };
}

/** Réglage de départ. « Remplir » par défaut : c'est le geste sans question. */
export function poseInitiale(url: string, mode: ModePose = "remplir"): VisuelPose {
  return { url, mode, taille: plageTaille(mode)?.defaut ?? 100, portee: "pan" };
}

/**
 * La clé d'IDENTITÉ d'une pose pour un cache de texture : ce qui, changé, oblige
 * à redessiner le canevas. Indexée sur l'URL COMPLÈTE, jamais sa longueur —
 * deux JPEG du même poids d'octets sont deux images différentes, et une clé sur
 * la longueur laissait l'ancienne maquette sur la nouvelle housse, capture de
 * devis comprise. Les deux viewers (tente et lounge) partagent cette recette
 * pour ne pas diverger sur la même question ; chacun y ajoute ce qui lui est
 * propre (le fond, le gabarit d'un pan) après ce préfixe commun.
 */
export const cleVisuelPose = (pose: VisuelPose): string =>
  `${pose.url}|${pose.mode}|${pose.taille}`;

/** Changer de mode repart du défaut du mode visé plutôt que de traîner un
 *  chiffre qui n'y veut plus rien dire. */
export function changerMode(pose: VisuelPose, mode: ModePose): VisuelPose {
  if (pose.mode === mode) return pose;
  return { ...pose, mode, taille: plageTaille(mode)?.defaut ?? pose.taille };
}
