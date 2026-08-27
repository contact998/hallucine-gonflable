/*
 * L'écran gonflable : comment le dessiner à n'importe quelle taille à partir
 * du seul modèle que le fournisseur ait livré pour sa gamme.
 *
 * Bayes ne modèle QU'UNE taille par gamme — l'étanche 3 m, la soufflerie 9 m —
 * comme pour la tente. Toutes les autres se déduisent d'un facteur pris sur la
 * LARGEUR DE LA TOILE : au catalogue, « 6 m » désigne six mètres de toile,
 * jamais le hors-tout (qui déborde des D-rings, des sangles, et chez la
 * soufflerie du manchon de gonflage).
 *
 * ⚠️ UNE cote ne suit pas ce facteur : la hauteur de la base de l'image. Le
 * catalogue la met à 0,50 m sur l'étanche 3 m et à 1,50 m sur le 6 m — trois
 * fois plus haute pour un écran deux fois plus grand, parce qu'un écran plus
 * large se regarde de plus loin, au-dessus de plus de têtes. Elle plafonne
 * ensuite : 1,60 m sur tous les étanches à partir du 7 m, 2,20 m sur toutes les
 * souffleries à partir du 10 m. Doubler bêtement donnerait 1,33 m sur le 6 m et
 * ferait mentir le dessin sur la seule cote qui décide si le public voit le
 * film.
 *
 * D'où l'étirement en trois zones, ci-dessous : le socle ne bouge pas, le
 * bandeau noir absorbe tout l'écart, et la toile garde sa hauteur exacte.
 *
 * Ce module ne connaît AUCUN prix ni aucune taille commerciale : les deux
 * nombres dont il a besoin — largeur de toile, hauteur de base — viennent du
 * catalogue du CRM (`CatalogueSpecs.toileLargeurM` / `hauteurBaseImageM`), qui
 * en est la seule source. Les écrire ici en ferait une deuxième vérité.
 */
/** Dossier du modèle sur R2, à côté de `tente-x` et `mobilier`. */
export const DOSSIER_ECRAN = "ecran";
/**
 * La gamme dont relève ce slug, ou `null` quand aucun modèle ne la représente.
 *
 * Le KEMI, l'économique, n'a rien — pas même des cotes au catalogue : pas de
 * 3D, comme la jonction de tente tant que Bayes ne l'a pas livrée. Mieux vaut
 * rien qu'un à-peu-près, et le visualiseur le DIT.
 *
 * Le drive-in, lui, EST dessiné : c'est une soufflerie 9 m dont le catalogue
 * relève la base d'image à 3 m. Même modèle, bandeau noir plus haut — très
 * exactement ce que `calerEcran` sait faire.
 */
export const gammeEcran3D = (slugSite) => slugSite.startsWith("ecran-etanche-")
    ? "etanche"
    : slugSite.startsWith("ecran-soufflerie-")
        ? "soufflerie"
        : null;
/** Vrai quand un modèle 3D sait dessiner cet écran du catalogue. */
export const ecranModelise = (slugSite) => gammeEcran3D(slugSite) !== null;
/**
 * Un bandeau ne se replie pas sur lui-même : on lui en garde toujours un
 * vingtième. Sans cette butée, une cote aberrante retournerait la géométrie et
 * l'écran sortirait à l'envers.
 *
 * C'était un cinquième tant que l'étanche était seul — aucune de ses dix
 * tailles n'en approchait. La soufflerie, elle, repose sur un boudin de base
 * bien plus haut : à 22 m ce boudin fait déjà 1,96 m à lui seul, et la cote de
 * 2,20 m du catalogue ne laisse au bandeau que 24 cm. Un cinquième mettait donc
 * DEUX tailles vendues hors d'atteinte — dessinées 52 cm trop haut, sans que
 * rien ne le dise. Un vingtième interdit toujours le retournement.
 */
const PART_MINIMALE_JUPE = 0.05;
/**
 * Le facteur d'échelle et l'étirement de jupe pour une taille donnée.
 *
 * `baseImageM` absente (le catalogue ne la connaît pas pour cette taille) : on
 * se contente de la mise à l'échelle, sans toucher à la géométrie du
 * fournisseur. Mieux vaut un dessin fidèle au modèle qu'un dessin corrigé
 * d'après un nombre qu'on n'a pas.
 */
export function calerEcran(m, toileLargeurM, baseImageM) {
    if (!(m.largeurToileMM > 0) || !(toileLargeurM > 0)) {
        throw new Error("calerEcran : largeur de toile inutilisable");
    }
    const jupeMM = m.zToileMM - m.zSocleMM;
    if (!(jupeMM > 0))
        throw new Error("calerEcran : jupe de hauteur nulle");
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
    const etirer = (z) => {
        if (z <= m.zSocleMM)
            return z;
        if (z >= m.zToileMM)
            return z + delta;
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
