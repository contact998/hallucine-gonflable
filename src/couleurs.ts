/*
 * Nuancier du configurateur de tente.
 *
 * Chez ce produit, une couleur EST une impression : la toile est blanche et on
 * imprime dessus. Choisir une couleur coche donc l'option d'impression de la
 * zone concernée, avec son prix — c'est tout l'intérêt commercial du nuancier,
 * qui rend visible ce qu'une case à cocher laissait abstrait.
 *
 * PANTONE (tranché le 18/09/2026). L'atelier Bayes travaille en Pantone Coated :
 * son outil de devis interne propose le piétement en Red 199 C, Grey 429 C,
 * Black C ou White, et l'impression dans toute la gamme C. Chaque teinte de ce
 * nuancier porte donc SA référence, qui part au devis ; le `hex` n'est qu'une
 * approximation d'écran — la couleur imprimée suit le nuancier physique.
 * Rouge, gris et noir SONT les trois teintes de stock de Bayes.
 *
 * TEINTE SUR MESURE. Une marque a sa couleur : le client la choisit au
 * sélecteur et donne, s'il la connaît, sa référence Pantone. La clé porte les
 * deux — `#C8102E` ou `#C8102E|186 C` — et voyage telle quelle dans la
 * composition envoyée au CRM, qui la dessine avec ce même module. Aucune table
 * Pantone → écran ici : le nuancier officiel n'est pas libre de droits, et un
 * aperçu approximatif choisi par le client vaut mieux qu'une conversion
 * approximative choisie par nous.
 */

export interface TeinteTente {
  /** Clé stable — sert au code de configuration partagé avec le CRM. */
  cle: string;
  /** Couleur affichée en 3D : une approximation d'écran de la référence. */
  hex: string;
  /** Clé i18n du libellé. */
  label: string;
  /** Référence Pantone Coated transmise à l'atelier — vide pour la toile nue. */
  pantone: string;
}

/** `blanc` = toile nue : aucune impression, donc aucun supplément. */
export const TEINTES: TeinteTente[] = [
  { cle: "blanc", hex: "#F2F2EE", label: "teinte_blanc", pantone: "" },
  { cle: "noir", hex: "#2D2926", label: "teinte_noir", pantone: "Black C" },
  { cle: "rouge", hex: "#D50032", label: "teinte_rouge", pantone: "199 C" },
  { cle: "bleu", hex: "#0057B8", label: "teinte_bleu", pantone: "2935 C" },
  { cle: "vert", hex: "#00843D", label: "teinte_vert", pantone: "348 C" },
  { cle: "jaune", hex: "#FFC72C", label: "teinte_jaune", pantone: "123 C" },
  { cle: "orange", hex: "#D86018", label: "teinte_orange", pantone: "1595 C" },
  { cle: "gris", hex: "#A2AAAD", label: "teinte_gris", pantone: "429 C" },
];

export const TEINTE_NUE = "blanc";

/** Zones colorables du socle — les pièces toujours présentes — et l'option
 *  d'impression que chacune déclenche. */
export const ZONES_COULEUR = [
  { cle: "toit", piece: "roof", impression: "imp_toit", label: "zone_toit" },
  { cle: "structure", piece: "LEG", impression: "imp_structure", label: "zone_structure" },
  { cle: "zip", piece: "zipper_cover", impression: "imp_zip", label: "zone_zip" },
] as const;

/* Restent en cases à cocher, faute de pouvoir les montrer : le bas PVC des
 * pieds (noyé dans les 120 morceaux de quincaillerie de `LEG`) et les trois
 * détails d'auvent — bandeau, pied, bas PVC — que Bayes livre dans une maille
 * unique. Une pastille de couleur qui ne changerait rien à l'image serait une
 * promesse que le dessin ne tient pas. À rebasculer ici le jour où le
 * fournisseur sépare ces pièces. */

/** L'auvent n'est pas du socle : il se monte côté par côté, et n'existe que si
 *  le client en a coché au moins un. Sa teinte suit donc un autre chemin dans
 *  le visualiseur, d'où cette entrée à part.
 *  Elle ne coche que l'impression de la TOILE d'auvent : le bandeau, le pied et
 *  le bas PVC se vendent séparément et gardent leurs cases. */
export const ZONE_AUVENT = {
  cle: "auvent",
  piece: "awning",
  impression: "imp_auv_toile",
  label: "choix_auvent",
} as const;

export type ZoneCouleur = (typeof ZONES_COULEUR)[number]["cle"] | typeof ZONE_AUVENT["cle"];

/* ── La teinte sur mesure ─────────────────────────────────────────────── */

const MOTIF_SUR_MESURE = /^#([0-9A-Fa-f]{6})(?:\|(.{1,24}))?$/;

/** Longueur maximale d'une référence Pantone saisie. « Cool Gray 11 C » tient
 *  en 14 ; au-delà, c'est une phrase, pas une référence. */
export const PANTONE_MAX = 24;

/**
 * Ce que le client a tapé, ramené à une référence présentable : espaces
 * resserrés, préfixe « Pantone » retiré (on l'écrit nous-mêmes), rien que des
 * lettres, des chiffres, des espaces et des tirets. Vide quand il ne reste rien.
 */
export function normaliserPantone(saisie: string | null | undefined): string {
  return (saisie ?? "")
    .replace(/^\s*(pantone|pms)\s*/i, "")
    .replace(/[^0-9A-Za-zÀ-ÿ -]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PANTONE_MAX)
    .trim();
}

/** La clé d'une teinte sur mesure : `#RRGGBB`, suivie de `|réf` quand le
 *  client a donné sa référence Pantone. */
export function teinteSurMesure(hex: string, pantone?: string): string {
  const h = /^#?([0-9A-Fa-f]{6})$/.exec(hex.trim());
  const base = `#${(h ? h[1] : "F2F2EE").toUpperCase()}`;
  const ref = normaliserPantone(pantone);
  return ref ? `${base}|${ref}` : base;
}

export const estTeinteSurMesure = (cle: string | null | undefined): boolean =>
  !!cle && MOTIF_SUR_MESURE.test(cle);

export interface TeinteLue {
  /** La clé telle qu'elle a été reçue — ou celle de la toile nue si elle
   *  n'était pas lisible. */
  cle: string;
  hex: string;
  /** Référence Pantone : celle du nuancier, celle donnée par le client, ou
   *  vide (toile nue, ou teinte sur mesure sans référence). */
  pantone: string;
  surMesure: boolean;
  /** Clé i18n du nom, pour les teintes du nuancier. */
  label: string | null;
}

/**
 * Toujours une teinte. Une clé inconnue — un lien écrit par une version plus
 * récente, une URL retouchée — retombe sur la toile nue : la couleur est un
 * détail, le prix et la composition ne le sont pas.
 */
export function lireTeinte(cle: string | null | undefined): TeinteLue {
  const m = cle ? MOTIF_SUR_MESURE.exec(cle) : null;
  if (m) {
    return { cle: cle!, hex: `#${m[1].toUpperCase()}`, pantone: normaliserPantone(m[2]), surMesure: true, label: null };
  }
  const t = TEINTES.find((x) => x.cle === cle) ?? TEINTES[0];
  return { cle: t.cle, hex: t.hex, pantone: t.pantone, surMesure: false, label: t.label };
}

export const hexDeTeinte = (cle: string): string => lireTeinte(cle).hex;

/** La référence à écrire sur un devis, « Pantone 199 C » — vide quand il n'y en
 *  a pas (toile nue, ou teinte sur mesure dont le client n'a pas donné la
 *  référence : le commercial la lui demandera). */
export function pantoneDeTeinte(cle: string): string {
  const p = lireTeinte(cle).pantone;
  return p ? `Pantone ${p}` : "";
}
