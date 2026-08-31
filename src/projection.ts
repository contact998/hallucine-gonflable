/*
 * La puissance qu'il faut pour remplir une toile — en lumens.
 *
 * La question se pose des deux côtés de la même vente : le client qui compose
 * son écran sur le site veut savoir quel projecteur prévoir, le commercial qui
 * le chiffre au CRM veut lui répondre. Ils doivent répondre le même nombre,
 * d'où ce module plutôt qu'une table recopiée dans chaque application.
 *
 * Deux seuils, en lumens par m² d'IMAGE (jamais le hors-tout — les boudins ne
 * reçoivent rien) :
 *  - CINÉMA : la norme DCI demande 48 cd/m² à l'écran ; sur une toile de gain 1
 *    il faut 48 × π ≈ 150 lm/m². C'est le seuil « image de cinéma ».
 *  - MINIMUM : ~100 lm/m² reste regardable en plein air par nuit noire, sans
 *    aucune lumière parasite. En dessous, l'image est délavée quelle que soit
 *    la toile.
 *
 * Les projecteurs DCP (cinéma numérique certifié) sont une table de RÉFÉRENCE,
 * pas un catalogue : Hallucine ne les vend pas, elle les conseille — ses
 * acheteurs d'écran sont des exploitants de cinéma itinérant. Comme partout
 * ailleurs dans ce module, aucun prix : les prix appartiennent au CRM.
 */

/** Norme cinéma DCI : 48 cd/m² × π ≈ 150 lm par m² d'image (toile gain 1). */
export const LUMENS_M2_CINEMA = 150;
/** Plancher plein air par nuit noire : en dessous de ~100 lm/m², image délavée. */
export const LUMENS_M2_MINIMUM = 100;

export interface BesoinLumens {
  /** Plancher nuit noire (LUMENS_M2_MINIMUM × surface), arrondi à la centaine. */
  minimum: number;
  /** Seuil image de cinéma (LUMENS_M2_CINEMA × surface), arrondi à la centaine. */
  cinema: number;
}

/** Besoin en lumens pour une surface d'IMAGE (pas la toile hors-tout), en m². */
export function besoinLumens(surfaceM2: number): BesoinLumens {
  const s = Math.max(surfaceM2, 0);
  const centaine = (n: number) => Math.round(n / 100) * 100;
  return { minimum: centaine(s * LUMENS_M2_MINIMUM), cinema: centaine(s * LUMENS_M2_CINEMA) };
}

/**
 * Lit la puissance annoncée dans un libellé de projecteur (« laser 14500 lm »,
 * « 9000 lumens »…). `null` quand rien n'est annoncé : un projecteur dont on ne
 * connaît pas la puissance ne peut pas être recommandé pour une surface.
 */
export function lireLumens(libelle: string): number | null {
  const m = libelle.match(/(\d[\d\s  ]*)\s*(?:lm\b|lumens?\b)/i);
  if (!m) return null;
  const n = Number(m[1].replace(/[\s  ]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export interface ProjecteurDcp {
  marque: "Barco" | "Christie" | "Sharp / NEC" | "GDC Espedeo";
  modele: string;
  /** Puissance nominale, bas de fourchette constructeur (conservateur). */
  lumens: number;
  /** Transportable en flight-case : le critère du cinéma itinérant. */
  flightCase: boolean;
}

/** Table de référence des DCP conseillés, triée par puissance croissante. */
export const PROJECTEURS_DCP: ProjecteurDcp[] = [
  { marque: "GDC Espedeo", modele: "Supra-5000",          lumens: 5000,  flightCase: true },
  { marque: "Barco",       modele: "SP2K-7S",             lumens: 6000,  flightCase: true },
  { marque: "Christie",    modele: "CP2406-RBe",          lumens: 6000,  flightCase: true },
  { marque: "Sharp / NEC", modele: "NC-624",              lumens: 6000,  flightCase: true },
  { marque: "Barco",       modele: "SP2K-9S",             lumens: 8000,  flightCase: true },
  { marque: "Christie",    modele: "CP2409-RBe",          lumens: 9000,  flightCase: true },
  { marque: "Sharp / NEC", modele: "NC900C / NC1000C",    lumens: 9000,  flightCase: true },
  { marque: "Barco",       modele: "SP2K-11S",            lumens: 11000, flightCase: true },
  { marque: "Christie",    modele: "CP2411-RBe",          lumens: 11000, flightCase: true },
  { marque: "Barco",       modele: "SP4K-12C",            lumens: 12000, flightCase: false },
  { marque: "Sharp / NEC", modele: "NC1201L",             lumens: 12500, flightCase: true },
  { marque: "Sharp / NEC", modele: "NC-1424",             lumens: 14000, flightCase: false },
  { marque: "Barco",       modele: "SP2K-15S",            lumens: 15000, flightCase: true },
  { marque: "Christie",    modele: "CP2415-RGB",          lumens: 15000, flightCase: false },
  { marque: "Sharp / NEC", modele: "NC-1824M",            lumens: 18000, flightCase: false },
  { marque: "Barco",       modele: "SP2K-20C / SP4K-20C", lumens: 20000, flightCase: false },
  { marque: "Sharp / NEC", modele: "NC-2024M",            lumens: 20000, flightCase: false },
  { marque: "Christie",    modele: "CP2420-RGB",          lumens: 21000, flightCase: false },
  { marque: "Barco",       modele: "SP2K-25C / SP4K-25C", lumens: 24000, flightCase: false },
  { marque: "Sharp / NEC", modele: "NC-2424M",            lumens: 24000, flightCase: false },
];

/**
 * Les DCP qui atteignent la cible, du plus juste au plus puissant (les `max`
 * premiers). Vide = au-delà du mono-projecteur DCP courant : il faut alors deux
 * machines, ou du RGB très haute puissance.
 */
export function dcpPourCible(lumensCible: number, max = 5): ProjecteurDcp[] {
  return PROJECTEURS_DCP.filter((p) => p.lumens >= lumensCible).slice(0, max);
}
