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
  prix: number;
}

/** Prix par slug — `null` = prix INCONNU, jamais zéro. */
export type PrixDe = (slug: string) => number | null;

/**
 * Les lignes chiffrées d'une tente composée, dans l'ordre d'affichage de la
 * page : le pack, puis chaque côté (choix, impression, demi-mur, auvent), puis
 * les options. Seules les lignes dont le tarif connaît le prix apparaissent.
 */
export function lignesTarifTente(
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
 * Le total d'une tente composée — celui que la page du configurateur affiche.
 * `null` si le pack de base n'a pas de prix : sans lui le total serait un
 * morceau de tente, et un abri sous-facturé en silence est pire qu'un « prix à
 * confirmer » qui se voit.
 */
export function totalTenteComposee(c: ConfigTente, prixDe: PrixDe): number | null {
  const m = trouverModele(c.modele);
  if (prixDe(cleTente(m, c.taille)) == null) return null;
  return lignesTarifTente(c, prixDe).reduce((s, l) => s + l.prix, 0);
}
