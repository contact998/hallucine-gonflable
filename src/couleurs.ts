/*
 * Nuancier du configurateur de tente.
 *
 * Chez ce produit, une couleur EST une impression : la toile est blanche et on
 * imprime dessus. Choisir une couleur coche donc l'option d'impression de la
 * zone concernée, avec son prix — c'est tout l'intérêt commercial du nuancier,
 * qui rend visible ce qu'une case à cocher laissait abstrait.
 *
 * ⚠️ À CONFIRMER AVEC BAYES : leur gabarit demande un « Printing Pantone NO. »,
 * ce qui laisse penser à une gamme fermée. Ces teintes sont des valeurs
 * courantes, choisies pour être reproductibles en quadrichromie ; si le
 * fournisseur impose une charte Pantone, remplacer les codes ici — et nulle
 * part ailleurs, c'est la source unique.
 */

export interface TeinteTente {
  /** Clé stable — sert au code de configuration partagé avec le CRM. */
  cle: string;
  /** Couleur affichée en 3D. */
  hex: string;
  /** Clé i18n du libellé. */
  label: string;
}

/** `blanc` = toile nue : aucune impression, donc aucun supplément. */
export const TEINTES: TeinteTente[] = [
  { cle: "blanc", hex: "#F2F2EE", label: "teinte_blanc" },
  { cle: "noir", hex: "#2B2E33", label: "teinte_noir" },
  { cle: "rouge", hex: "#C8322B", label: "teinte_rouge" },
  { cle: "bleu", hex: "#1F5FA8", label: "teinte_bleu" },
  { cle: "vert", hex: "#2E7D4F", label: "teinte_vert" },
  { cle: "jaune", hex: "#E8B531", label: "teinte_jaune" },
  { cle: "orange", hex: "#D9682A", label: "teinte_orange" },
  { cle: "gris", hex: "#6E7479", label: "teinte_gris" },
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

export const hexDeTeinte = (cle: string): string =>
  TEINTES.find((t) => t.cle === cle)?.hex ?? TEINTES[0].hex;
