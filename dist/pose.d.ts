/** Trois gestes, et le premier ne se règle pas.
 *
 *  « Remplir » a failli disparaître : il fait presque doublon avec « une fois »
 *  poussé au-delà de 100 %. On le garde pour une raison qui n'est pas
 *  technique — c'est le seul mode SANS réglage. Un clic, l'image couvre le pan,
 *  c'est fini. La plupart des clients ne veulent rien régler, et leur imposer
 *  un curseur pour obtenir l'évidence serait leur faire payer notre élégance. */
export declare const MODES_POSE: readonly ["remplir", "une_fois", "mosaique"];
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
export declare const PORTEES: readonly ["pan", "zone", "tente"];
export type Portee = (typeof PORTEES)[number];
/** Portées proposées pour une zone.
 *
 *  « Toute la tente » vaut PARTOUT, y compris sur une paroi : c'est justement
 *  son intérêt — la même image court du toit aux parois. « Sur tout le toit »,
 *  lui, ne concerne que les zones à plusieurs pans. */
export declare function porteesPour(zone?: string): Portee[];
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
export declare function plageTaille(mode: ModePose): PlageTaille | null;
/** Réglage de départ. « Remplir » par défaut : c'est le geste sans question. */
export declare function poseInitiale(url: string, mode?: ModePose): VisuelPose;
/**
 * La clé d'IDENTITÉ d'une pose pour un cache de texture : ce qui, changé, oblige
 * à redessiner le canevas. Indexée sur l'URL COMPLÈTE, jamais sa longueur —
 * deux JPEG du même poids d'octets sont deux images différentes, et une clé sur
 * la longueur laissait l'ancienne maquette sur la nouvelle housse, capture de
 * devis comprise. Les deux viewers (tente et lounge) partagent cette recette
 * pour ne pas diverger sur la même question ; chacun y ajoute ce qui lui est
 * propre (le fond, le gabarit d'un pan) après ce préfixe commun.
 */
export declare const cleVisuelPose: (pose: VisuelPose) => string;
/** Changer de mode repart du défaut du mode visé plutôt que de traîner un
 *  chiffre qui n'y veut plus rien dire. */
export declare function changerMode(pose: VisuelPose, mode: ModePose): VisuelPose;
