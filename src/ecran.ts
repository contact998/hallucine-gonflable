/*
 * L'écran gonflable étanche : comment le dessiner à n'importe quelle taille à
 * partir de l'unique modèle livré par Bayes.
 *
 * Bayes n'a modelé QU'UNE taille — l'étanche 3 m — comme pour la tente. Toutes
 * les autres se déduisent d'un facteur pris sur la LARGEUR DE LA TOILE : au
 * catalogue, « 6 m » désigne six mètres de toile, jamais le hors-tout (qui
 * déborde des D-rings et des sangles).
 *
 * ⚠️ UNE cote ne suit pas ce facteur : la hauteur de la base de l'image. Le
 * catalogue la met à 0,50 m sur le 3 m et à 1,50 m sur le 6 m — trois fois plus
 * haute pour un écran deux fois plus grand, parce qu'un écran plus large se
 * regarde de plus loin, au-dessus de plus de têtes. Doubler bêtement donnerait
 * 1,33 m et ferait mentir le dessin sur la seule cote qui décide si le public
 * voit le film.
 *
 * D'où l'étirement en trois zones, ci-dessous : le socle ne bouge pas, la jupe
 * noire absorbe tout l'écart, et la toile garde sa hauteur exacte.
 *
 * Ce module ne connaît AUCUN prix ni aucune taille commerciale : les deux
 * nombres dont il a besoin — largeur de toile, hauteur de base — viennent du
 * catalogue du CRM (`CatalogueSpecs.toileLargeurM` / `hauteurBaseImageM`), qui
 * en est la seule source. Les écrire ici en ferait une deuxième vérité.
 */

/** Dossier du modèle sur R2, à côté de `tente-x` et `mobilier`. */
export const DOSSIER_ECRAN = "ecran";

/**
 * Ce qu'on mesure sur le GLB au chargement, en millimètres du modèle.
 * Mesuré plutôt qu'écrit : une nouvelle livraison Bayes ne doit pas obliger à
 * retoucher des nombres à la main — c'est ce qui avait fait dériver la tente N.
 */
export interface MesuresEcran {
  /** Largeur de la seule toile de projection (matière `toile`). */
  largeurToileMM: number;
  /** Haut du renfort d'usure : sous lui, c'est le contact au sol, rien ne bouge. */
  zSocleMM: number;
  /** Bas de la toile de projection = la base de l'image. */
  zToileMM: number;
  /** Hauteur hors tout du modèle brut. */
  hauteurBruteMM: number;
}

export interface CalageEcran {
  /** Mise à l'échelle du modèle entier. */
  facteur: number;
  /** Millimètres du modèle → millimètres du modèle, jupe étirée. */
  etirer: (z: number) => number;
  /** Hauteur hors tout obtenue, en mètres. */
  hauteurM: number;
  /** Base de l'image obtenue, en mètres. Égale la cote visée — sauf si la jupe
   *  avait dû se replier sur elle-même, cas où elle est butée. */
  baseM: number;
  /** Vrai quand la butée a joué : la cote visée n'est pas atteinte. */
  butee: boolean;
}

/** Une jupe ne se replie pas sur elle-même : on lui en garde toujours un
 *  cinquième. Sans cette butée, une cote aberrante retournerait la géométrie. */
const PART_MINIMALE_JUPE = 0.2;

/**
 * Le facteur d'échelle et l'étirement de jupe pour une taille donnée.
 *
 * `baseImageM` absente (le catalogue ne la connaît pas pour cette taille) : on
 * se contente de la mise à l'échelle, sans toucher à la géométrie du
 * fournisseur. Mieux vaut un dessin fidèle au modèle qu'un dessin corrigé
 * d'après un nombre qu'on n'a pas.
 */
export function calerEcran(
  m: MesuresEcran,
  toileLargeurM: number,
  baseImageM: number | null,
): CalageEcran {
  if (!(m.largeurToileMM > 0) || !(toileLargeurM > 0)) {
    throw new Error("calerEcran : largeur de toile inutilisable");
  }
  const jupeMM = m.zToileMM - m.zSocleMM;
  if (!(jupeMM > 0)) throw new Error("calerEcran : jupe de hauteur nulle");

  const facteur = (toileLargeurM * 1000) / m.largeurToileMM;

  let delta = 0;
  let butee = false;
  if (baseImageM != null && baseImageM > 0) {
    const viseeMM = (baseImageM * 1000) / facteur;
    delta = viseeMM - m.zToileMM;
    const plancher = -jupeMM * (1 - PART_MINIMALE_JUPE);
    if (delta < plancher) {
      delta = plancher;
      butee = true;
    }
  }

  /* Trois zones : sous le socle rien ne bouge, la jupe s'étire, et tout ce qui
     est au-dessus se translate d'un bloc — la toile garde donc sa hauteur. */
  const etirer = (z: number): number => {
    if (z <= m.zSocleMM) return z;
    if (z >= m.zToileMM) return z + delta;
    return m.zSocleMM + ((z - m.zSocleMM) * (jupeMM + delta)) / jupeMM;
  };

  return {
    facteur,
    etirer,
    hauteurM: ((m.hauteurBruteMM + delta) / 1000) * facteur,
    baseM: ((m.zToileMM + delta) / 1000) * facteur,
    butee,
  };
}
