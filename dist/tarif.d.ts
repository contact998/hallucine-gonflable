import type { ConfigTente } from "./config.js";
export interface LigneTarifTente {
    genre: "base" | "cote" | "impression_cote" | "demi_mur" | "impression_demi_mur" | "auvent" | "impression" | "accessoire";
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
export declare function lignesTarifTente(c: ConfigTente, prixDe: PrixDe, impCotes?: Record<string, boolean>): LigneTarifTente[];
/**
 * Le total d'une tente composée — celui que la page du configurateur affiche.
 * `null` si le pack de base n'a pas de prix : sans lui le total serait un
 * morceau de tente, et un abri sous-facturé en silence est pire qu'un « prix à
 * confirmer » qui se voit.
 */
export declare function totalTenteComposee(c: ConfigTente, prixDe: PrixDe): number | null;
