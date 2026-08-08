/*
 * Ce qu'une tente X peut être, et ce qu'elle ne peut pas être.
 *
 * C'est le cœur du module partagé : le site public et le CRM composent la même
 * tente parce qu'ils lisent ce fichier. Il a été écrit après avoir constaté que
 * les deux outils autorisaient des choses différentes — un commercial et son
 * client ne pouvaient pas composer la même chose, et personne ne s'en était
 * aperçu pendant des mois.
 *
 * RÈGLE DE TENUE : toute interdiction écrite ici DOIT dire pourquoi, juste à
 * côté. Trois interdits ont survécu des mois dans le calculateur du CRM faute
 * d'une phrase d'explication — personne ne pouvait les contester sans aller
 * réinterroger l'usine. Une règle sans raison est une règle qu'on ne peut plus
 * enlever.
 *
 * Aucun PRIX ici. Les tarifs vivent au catalogue du CRM, qui en est maître ;
 * ce fichier ne sait que construire les clés pour aller les y chercher.
 */

export const TAILLES = ["3x3", "4x4", "5x5", "6x6", "7x7", "8x8"] as const;
export type Taille = (typeof TAILLES)[number];

/** Ordre figé : il sert au code de configuration, qui voyage dans les devis. */
export const COTES = ["avant", "droit", "arriere", "gauche"] as const;
export type Cote = (typeof COTES)[number];

/**
 * Ce qu'un côté peut porter. Un côté porte UN seul type — ils sont exclusifs
 * par construction, ce qui rend inutile toute règle du genre « pas de porte sur
 * une jonction » : le côté est l'un ou l'autre.
 *
 * `slug` : suffixe de la clé catalogue, `tente-x-<taille>-<slug>`.
 * `impression` : l'option d'impression que ce type déclenche quand le client
 * choisit une couleur ou pose une image — chez ce produit, une couleur EST une
 * impression, la toile étant blanche.
 */
export const TYPES_COTE = [
  { valeur: "vide", libelle: "choix_vide", slug: null, impression: null },
  { valeur: "paroi", libelle: "choix_paroi", slug: "paroi", impression: "imp_paroi" },
  { valeur: "porte", libelle: "choix_porte", slug: "paroi-porte", impression: "imp_paroi" },
  { valeur: "fenetre", libelle: "choix_fenetre", slug: "paroi-fenetre", impression: "imp_paroi" },
  { valeur: "courbe", libelle: "choix_courbe", slug: "paroi-courbe", impression: "imp_courbe" },
  { valeur: "courbe_fenetre", libelle: "choix_courbe_fenetre", slug: "paroi-courbe-fenetre", impression: "imp_courbe" },
  { valeur: "jonction", libelle: "choix_jonction", slug: "jonction", impression: null },
] as const;

export type TypeCote = (typeof TYPES_COTE)[number]["valeur"];

export const typeCote = (valeur: string) =>
  TYPES_COTE.find((t) => t.valeur === valeur) ?? TYPES_COTE[0];

/* ── Les règles de fabrication ──────────────────────────────────────────────
 *
 * Il n'y en a que DEUX, et elles sont toutes deux géométriques : on les vérifie
 * à l'œil sur la 3D, sans rien demander à personne.
 *
 * Trois autres ont été retirées le 08/08/2026 après examen, parce qu'elles ne
 * décrivaient aucune impossibilité — elles sont listées ici pour qu'on ne les
 * réinvente pas :
 *
 *   · « 4 éléments au maximum, parois et auvents confondus ». Le compte
 *     plafonnait au nombre de côtés, comme si un auvent prenait la place d'une
 *     paroi. Il se monte AU-DESSUS. Quatre parois plus un auvent est une tente
 *     ordinaire, et la règle l'interdisait.
 *   · « une seule porte en 3×3 et 4×4 ». Une porte est une paroi avec une
 *     ouverture ; la taille ne change pas ce qu'un côté peut recevoir, c'est le
 *     même dessin agrandi.
 *   · « aucun auvent dès qu'un côté est en jonction ». La jonction concerne le
 *     côté collé à l'autre tente ; un auvent sur un autre côté est sur un autre
 *     côté. La portée de la règle n'avait aucun rapport avec sa cause.
 */

/** Types de côté qui acceptent un auvent PAR-DESSUS. L'auvent n'est pas un
 *  choix de côté : il se cumule (décision du 06/08/2026). */
const AUVENT_COMPATIBLE = new Set<string>(["vide", "paroi", "porte", "fenetre"]);

/**
 * L'auvent se monte-t-il sur ce côté ?
 *
 * Non sur une paroi COURBE : le bandeau déborde vers l'extérieur, l'auvent n'a
 * pas où se fixer. Non sur une JONCTION : ce côté est collé à une autre tente,
 * il n'y a pas d'air libre au-dessus. Rien d'autre ne l'empêche.
 */
export function auventPossible(type: string): boolean {
  return AUVENT_COMPATIBLE.has(type);
}

/* ── Impressions et accessoires ─────────────────────────────────────────── */

/** Option d'impression → suffixe de clé catalogue. */
export const IMPRESSIONS = {
  imp_toit: "impression-toit",
  imp_zip: "impression-cache-zip",
  imp_structure: "impression-structure",
  imp_pvc: "impression-pvc-pieds",
  imp_paroi: "impression-paroi",
  imp_courbe: "impression-paroi-courbe",
  imp_auv_bandeau: "impression-auvent-bandeau",
  imp_auv_toile: "impression-auvent-toile",
  imp_auv_pied: "impression-auvent-pied",
  imp_auv_pvc: "impression-auvent-pvc",
  imp_jonction: "impression-jonction",
} as const;
export type Impression = keyof typeof IMPRESSIONS;

/** Toujours proposées. */
export const IMP_SOCLE: Impression[] = ["imp_toit", "imp_zip", "imp_structure", "imp_pvc"];
/** Proposées seulement si la composition porte un auvent. */
export const IMP_AUVENT: Impression[] = [
  "imp_auv_bandeau", "imp_auv_toile", "imp_auv_pied", "imp_auv_pvc",
];
/** Proposée seulement si la composition porte une jonction. */
export const IMP_JONCTION: Impression[] = ["imp_jonction"];

/** Accessoires. `slug` nul = la clé dépend de la taille (le lest en eau). */
export const ACCESSOIRES = [
  { valeur: "acc_sac", slug: "tente-accessoire-sac" },
  { valeur: "acc_led", slug: "tente-accessoire-led" },
  { valeur: "acc_pompe_main", slug: "tente-accessoire-pompe-main" },
  { valeur: "acc_valves", slug: "tente-accessoire-valves" },
  { valeur: "acc_lest_eau", slug: null },
] as const;
export type Accessoire = (typeof ACCESSOIRES)[number]["valeur"];

/* ── Les clés du catalogue ──────────────────────────────────────────────────
 *
 * C'est le CONTRAT avec le catalogue du CRM. Les deux applications doivent
 * construire exactement les mêmes clés, sinon l'une trouve un prix là où
 * l'autre n'en trouve pas — et c'est indétectable à l'œil.
 */

/** La tente nue : toit + structure, sans aucun côté. */
export const cleTente = (taille: string) => `tente-x-${taille}`;

/** Un type de côté. `null` si ce type ne se facture pas (côté ouvert). */
export function cleTypeCote(taille: string, type: string): string | null {
  const t = typeCote(type);
  return t.slug ? `tente-x-${taille}-${t.slug}` : null;
}

export const cleAuvent = (taille: string) => `tente-x-${taille}-auvent`;

export const cleImpression = (taille: string, imp: Impression) =>
  `tente-x-${taille}-${IMPRESSIONS[imp]}`;

/** Les accessoires ne dépendent pas tous de la taille — le lest, si. */
export function cleAccessoire(taille: string, acc: string): string {
  const a = ACCESSOIRES.find((x) => x.valeur === acc);
  return a?.slug ?? `tente-x-${taille}-lest-eau`;
}
