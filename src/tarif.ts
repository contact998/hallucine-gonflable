/*
 * Le détail tarifaire d'une tente composée — la MÊME arithmétique que la page
 * du configurateur du site, sortie d'elle pour que le lounge puisse chiffrer
 * une tente reçue par lien.
 *
 * AUCUN prix ici : tout vient de `prixDe`, la table `catalogue.tentesTarif`
 * du CRM, fournie par l'appelant. Ce module ne fait que composer les clés
 * (par les fonctions de `composition.ts`, jamais recomposées à la main) et
 * appliquer les décisions déjà prises côté page :
 *
 *   · le dessin fait foi — un choix modélisé sans ligne au tarif prend le prix
 *     de la paroi pleine et se dit PROVISOIRE, plutôt que de disparaître ;
 *   · une ligne sans prix ne s'écrit pas — le manque se voit ailleurs
 *     (provisoire en rouge, pack de base absent = total inconnu) ;
 *   · une impression d'auvent ne chiffre que si un auvent est posé, une
 *     impression de jonction que si un côté est en jonction — un code recollé
 *     d'une autre composition ne doit pas facturer un supplément sans support.
 *
 * L'impression PAR CÔTÉ (`impCotes`) ne voyage pas dans le code de
 * configuration : la page la passe depuis son état, le lounge ne l'a pas.
 */
import type { ConfigTente } from "./config.js";
import {
  modele as trouverModele, typeCote, demiMurPossible,
  cleTente, cleTypeCote, cleRepliCote, cleAuvent, cleDemiMur, cleImpression, cleAccessoire,
  IMPRESSIONS, IMP_SOCLE, IMP_AUVENT, IMP_JONCTION, impressionsCote,
  rangeeTentes, nbTentesRangee,
  type Impression, type Accessoire,
} from "./composition.js";
import { dessinable } from "./vue3d.js";

export interface LigneTarifTente {
  genre:
    | "base"
    | "cote"
    | "impression_cote"
    | "demi_mur"
    | "impression_demi_mur"
    | "auvent"
    | "impression"
    | "accessoire";
  /** Le côté concerné, pour les lignes qui en ont un. */
  cote?: string;
  /** Clé de libellé : le `libelle` du type de côté, ou la clé d'option. La
   *  traduction reste chez l'appelant — ce module ne parle aucune langue. */
  cle?: string;
  /** Prix de repli (paroi pleine) faute de ligne au tarif : à dire en rouge. */
  provisoire?: boolean;
  /** Combien de fois cette ligne se répète dans une RANGÉE — absent = une fois.
   *  `prix` reste le prix UNITAIRE : le total d'une ligne vaut prix × quantité,
   *  et `totalLignesTarif` est là pour qu'on ne l'oublie pas. */
  quantite?: number;
  prix: number;
}

/** Le total de lignes chiffrées, quantités comprises. */
export const totalLignesTarif = (lignes: readonly LigneTarifTente[]): number =>
  lignes.reduce((s, l) => s + l.prix * (l.quantite ?? 1), 0);

/** Prix par slug — `null` = prix INCONNU, jamais zéro. */
export type PrixDe = (slug: string) => number | null;

/**
 * Les lignes chiffrées d'une tente composée, dans l'ordre d'affichage de la
 * page : le pack, puis chaque côté (choix, impression, demi-mur, auvent), puis
 * les options. Seules les lignes dont le tarif connaît le prix apparaissent.
 *
 * `c.nb` au-delà de 1 chiffre la RANGÉE entière — voir `lignesTarifRangee`.
 */
export function lignesTarifTente(
  c: ConfigTente,
  prixDe: PrixDe,
  impCotes?: Record<string, boolean>,
): LigneTarifTente[] {
  const n = nbTentesRangee(c.nb);
  return n > 1 ? lignesTarifRangee(c, prixDe, n, impCotes) : lignesUneTente(c, prixDe, impCotes);
}

/** Le détail d'UNE tente — l'arithmétique historique, inchangée. */
function lignesUneTente(
  c: ConfigTente,
  prixDe: PrixDe,
  impCotes?: Record<string, boolean>,
): LigneTarifTente[] {
  const m = trouverModele(c.modele);
  const out: LigneTarifTente[] = [];

  const prixImp = (k: Impression): number | null => prixDe(cleImpression(m, c.taille, k));
  /** Le prix d'un choix de côté, et s'il est PROVISOIRE (repli paroi pleine). */
  const prixType = (type: string, cote: string): { prix: number | null; provisoire: boolean } => {
    const cle = cleTypeCote(m, c.taille, type, cote);
    const direct = cle ? prixDe(cle) : null;
    if (direct != null) return { prix: direct, provisoire: false };
    if (!dessinable(m, cote, type)) return { prix: null, provisoire: false };
    const repli = cleRepliCote(m, c.taille, cote);
    const p = repli ? prixDe(repli) : null;
    return { prix: p, provisoire: p != null };
  };
  /** L'impression qui chiffre un côté : la plus précise que le tarif connaisse. */
  const impDuType = (type: string): Impression | undefined =>
    impressionsCote(type).find((i) => prixImp(i) != null);

  const pack = prixDe(cleTente(m, c.taille));
  if (pack != null) out.push({ genre: "base", prix: pack });

  for (const cote of m.cotes as readonly string[]) {
    const type = c.cotes[cote] ?? "vide";
    if (type !== "vide") {
      const { prix, provisoire } = prixType(type, cote);
      if (prix != null) out.push({ genre: "cote", cote, cle: typeCote(type).libelle, provisoire, prix });
      const impLiee = impDuType(type);
      if (impCotes?.[cote] && impLiee) {
        const pi = prixImp(impLiee);
        if (pi != null) out.push({ genre: "impression_cote", cote, prix: pi });
      }
    }
    const dm = c.demiMurs?.[cote] ?? "vide";
    if (dm !== "vide" && demiMurPossible(m, cote, type)) {
      const cleDm = cleDemiMur(m, c.taille, dm);
      const pdm = cleDm ? prixDe(cleDm) : null;
      if (pdm != null) out.push({ genre: "demi_mur", cote, cle: typeCote(dm).libelle, prix: pdm });
      /* Le demi-mur est une toile de plus : habiller ce côté l'imprime aussi. */
      if (impCotes?.[cote] && m.demiMur) {
        const pi = prixImp(m.demiMur.impression as Impression);
        if (pi != null) out.push({ genre: "impression_demi_mur", cote, prix: pi });
      }
    }
    if (c.auvents[cote]) {
      const pa = prixDe(cleAuvent(m, c.taille));
      if (pa != null) out.push({ genre: "auvent", cote, prix: pa });
    }
  }

  const aAuvent = (m.cotes as readonly string[]).some((cote) => c.auvents[cote]);
  const aJonction = (m.cotes as readonly string[]).some((cote) => c.cotes[cote] === "jonction");
  const impsVisibles: Impression[] = [
    ...IMP_SOCLE,
    ...(aAuvent ? IMP_AUVENT : []),
    ...(aJonction ? IMP_JONCTION : []),
  ].filter((k) => prixImp(k) != null);

  for (const k of c.options) {
    if ((IMPRESSIONS as Record<string, string>)[k]) {
      if (!impsVisibles.includes(k as Impression)) continue;
      const p = prixImp(k as Impression);
      if (p != null) out.push({ genre: "impression", cle: k, prix: p });
    } else {
      const p = prixDe(cleAccessoire(m, c.taille, k as Accessoire));
      if (p != null) out.push({ genre: "accessoire", cle: k, prix: p });
    }
  }

  return out;
}

/**
 * Les lignes chiffrées d'une RANGÉE de n tentes identiques reliées.
 *
 * La dérivation des tentes vient de `rangeeTentes` — jamais recalculée ici :
 * c'est elle qui décide que la dernière tente ferme le bout au lieu de porter
 * une jonction, donc qu'une rangée de n porte n − 1 jonctions. Deux copies
 * auraient fini par dessiner une rangée et en facturer une autre.
 *
 * Deux écarts volontaires entre les tentes, les MÊMES que le chiffrage du CRM :
 *   · les ACCESSOIRES ne se comptent qu'une fois — le sac, la pompe, les lests
 *     se règlent pour l'ensemble, pas par tente ;
 *   · l'impression de jonction ne suit que les tentes qui en portent une — la
 *     dernière n'a rien à imprimer de ce côté-là (`lignesUneTente` le sait
 *     déjà : une option sans support ne se chiffre pas).
 *
 * Les lignes identiques fusionnent et portent leur `quantite` : trois fois le
 * même pack s'écrit « × 3 », pas trois lignes à la file.
 */
export function lignesTarifRangee(
  c: ConfigTente,
  prixDe: PrixDe,
  n: number,
  impCotes?: Record<string, boolean>,
): LigneTarifTente[] {
  const m = trouverModele(c.modele);
  const tentes = rangeeTentes(
    m,
    { cotes: c.cotes, auvents: c.auvents, demiMurs: c.demiMurs ?? {}, impCote: impCotes ?? {} },
    nbTentesRangee(n),
  );
  if (tentes.length === 1) return lignesUneTente(c, prixDe, impCotes);

  const estImpression = (k: string) => !!(IMPRESSIONS as Record<string, string>)[k];
  const fusion = new Map<string, LigneTarifTente>();
  const ordre: LigneTarifTente[] = [];

  tentes.forEach((t, i) => {
    const lignes = lignesUneTente(
      {
        ...c,
        cotes: t.cotes,
        auvents: t.auvents,
        demiMurs: t.demiMurs ?? {},
        options: i === 0 ? c.options : c.options.filter(estImpression),
      },
      prixDe,
      t.impCote,
    );
    for (const l of lignes) {
      const cle = [l.genre, l.cote ?? "", l.cle ?? "", l.provisoire ? 1 : 0, l.prix].join("|");
      const deja = fusion.get(cle);
      if (deja) {
        deja.quantite = (deja.quantite ?? 1) + 1;
      } else {
        fusion.set(cle, l);
        ordre.push(l);
      }
    }
  });

  return ordre;
}

/**
 * Le total d'une tente composée — celui que la page du configurateur affiche.
 * `null` si le pack de base n'a pas de prix : sans lui le total serait un
 * morceau de tente, et un abri sous-facturé en silence est pire qu'un « prix à
 * confirmer » qui se voit.
 */
export function totalTenteComposee(c: ConfigTente, prixDe: PrixDe): number | null {
  const m = trouverModele(c.modele);
  if (prixDe(cleTente(m, c.taille)) == null) return null;
  return totalLignesTarif(lignesTarifTente(c, prixDe));
}
