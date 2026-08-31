/*
 * La géométrie cotée d'un écran gonflable — les cotes, et rien d'autre.
 *
 * Le CRM la dessine pour l'atelier, le site la dessine pour le client : les
 * deux doivent annoncer LA MÊME cote, sinon un client mesure son terrain sur un
 * chiffre que la production ne connaît pas. D'où ce module, plutôt qu'une
 * formule recopiée de chaque côté.
 *
 * ⚠️ Ce qui n'est PAS ici, et n'y viendra pas : les laizes de tissu, le nombre
 * de coutures, la surface de toile du cadre, les longueurs de corde. Ce sont des
 * données de FABRICATION — elles restent dans le CRM, qui est privé. Le site est
 * lu par la concurrence.
 *
 * La règle : la toile recouvre un demi-boudin tout autour ; hors-tout largeur =
 * toile + Ø ; hors-tout hauteur = bas d'image + image + demi-boudin haut. Le bas
 * d'image ne descend jamais sous le demi-boudin.
 */

export type GammeSchema = "etanche" | "soufflerie";

/** Les formats proposés. Le 16/9 est la référence : c'est lui qui fixe la hauteur. */
export const RATIOS_PROJECTION: { value: number; label: string }[] = [
  { value: 16 / 9, label: "16/9" },
  { value: 1.85, label: "1.85" },
  { value: 4 / 3, label: "4/3" },
];

/** Le format de référence : la hauteur hors-tout est toujours celle du 16/9. */
export const RATIO_REF = 16 / 9;

/**
 * Bandeau noir (mm) sous l'image quand on masque un format plus large que le
 * 16/9 (le 1.85) : la hauteur hors-tout ne bouge pas, le bandeau absorbe
 * l'écart. Zéro en 16/9, et zéro sur les formats plus hauts (4/3).
 */
export function bandeauMasque(twMm: number, ratio: number): number {
  if (ratio <= RATIO_REF + 1e-9) return 0;
  return Math.round(twMm / RATIO_REF - twMm / ratio);
}

/** Plage des réglages par gamme : ce qu'un écran de cette famille sait faire. */
export const PLAGE_GAMME: Record<GammeSchema, {
  largeurMinMm: number; largeurMaxMm: number; largeurPasMm: number; largeurDefautMm: number;
  basMinMm: number; basMaxMm: number; basPasMm: number;
}> = {
  etanche:    { largeurMinMm: 2000, largeurMaxMm: 10000, largeurPasMm: 500, largeurDefautMm: 6000,  basMinMm: 0,   basMaxMm: 2000, basPasMm: 10 },
  soufflerie: { largeurMinMm: 8000, largeurMaxMm: 24000, largeurPasMm: 500, largeurDefautMm: 10000, basMinMm: 200, basMaxMm: 3500, basPasMm: 50 },
};

/**
 * Ø boudin de l'étanche (mm) selon la largeur de toile. Table de seuils : le
 * fournisseur ne fabrique pas un boudin continu, il a ses diamètres.
 */
export function boudinEtanche(twMm: number): number {
  if (twMm <= 3000) return 220;
  if (twMm <= 4500) return 370;
  if (twMm <= 5500) return 400;
  if (twMm <= 8000) return 450;
  return 600;
}

/**
 * Ø boudin de la soufflerie (mm) selon la largeur de toile. Dimensionné pour une
 * rigidité au vent à peu près constante (Ø ≈ 0,15 × largeur, ancré sur le 10 m à
 * 1,50 m) ; le petit bout est remonté pour compenser son faible volume d'air, le
 * haut infléchi pour rester réaliste.
 */
export function boudinSoufflerie(twMm: number): number {
  if (twMm <= 11000) return 1590;
  if (twMm <= 13000) return 1910;
  if (twMm <= 15000) return 2230;
  if (twMm <= 18000) return 2550;
  return 2860;
}

/** Le Ø que porte cette gamme à cette largeur, sans avoir à choisir la table. */
export const boudinPourLargeur = (gamme: GammeSchema, twMm: number): number =>
  gamme === "etanche" ? boudinEtanche(twMm) : boudinSoufflerie(twMm);

/** Plancher du bas d'image : le demi-boudin, arrondi au cran supérieur. */
export function planchierBasImage(gamme: GammeSchema, boudinMm: number): number {
  const p = PLAGE_GAMME[gamme];
  return Math.max(p.basMinMm, Math.ceil(boudinMm / 2 / p.basPasMm) * p.basPasMm);
}

export interface CotesEcran {
  /** Ø du boudin (mm) et son rayon. */
  boudinMm: number;
  rayonMm: number;
  /** Hauteur de l'image (mm) — la toile blanche seule. */
  imageHauteurMm: number;
  /** Hors-tout, structure gonflée (mm). */
  horsToutLargeurMm: number;
  horsToutHauteurMm: number;
  /** Jupe : la toile sombre entre le bas de l'image et le boudin du bas (mm). */
  jupeMm: number;
  /** Plancher imposé, et le bas d'image réellement retenu (mm). */
  basPlancherMm: number;
  basRetenuMm: number;
  /** Bandeau de masquage (mm) et bas de l'image réel = bas retenu + bandeau. */
  bandeauMm: number;
  basImageMm: number;
}

export interface EntreeCotes {
  gamme: GammeSchema;
  /** Largeur de la toile blanche (mm). */
  largeurToileMm: number;
  /** Bas d'image souhaité (mm) — remonté au plancher s'il est trop bas. */
  basImageMm: number;
  ratio: number;
  /** Ø imposé (mm). Omis : la table de la gamme décide. */
  boudinMm?: number;
  /** Bandeau de masquage (mm) — voir bandeauMasque. */
  bandeauMm?: number;
}

/**
 * Toutes les cotes d'un écran. Fonction PURE : mêmes entrées, mêmes cotes, du
 * serveur au navigateur.
 */
export function coterEcran(e: EntreeCotes): CotesEcran {
  const boudinMm = e.boudinMm && e.boudinMm > 0 ? e.boudinMm : boudinPourLargeur(e.gamme, e.largeurToileMm);
  const rayonMm = boudinMm / 2;
  const basPlancherMm = planchierBasImage(e.gamme, boudinMm);
  const basRetenuMm = Math.max(e.basImageMm, basPlancherMm);
  const bandeauMm = Math.max(e.bandeauMm ?? 0, 0);
  const basImageMm = basRetenuMm + bandeauMm;
  const imageHauteurMm = e.largeurToileMm / e.ratio;
  return {
    boudinMm,
    rayonMm,
    imageHauteurMm,
    horsToutLargeurMm: e.largeurToileMm + boudinMm,
    horsToutHauteurMm: basImageMm + imageHauteurMm + rayonMm,
    jupeMm: basImageMm - rayonMm,
    basPlancherMm,
    basRetenuMm,
    bandeauMm,
    basImageMm,
  };
}
