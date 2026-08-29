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
    /**
     * Le `slugSite` du catalogue qui a donné ce prix — celui-là même que
     * `prixDe` a reçu, et le repli quand c'est lui qui a chiffré.
     *
     * Il ne sert pas à l'affichage : il sert à ce qu'une composition puisse
     * devenir un DEVIS. Sans lui, l'appelant devait refabriquer les clés une
     * seconde fois pour retrouver ses références — c'est-à-dire recopier
     * l'arithmétique que ce module existe précisément pour porter.
     */
    slug: string;
    /** Combien de fois cette ligne se répète dans une RANGÉE — absent = une fois.
     *  `prix` reste le prix UNITAIRE : le total d'une ligne vaut prix × quantité,
     *  et `totalLignesTarif` est là pour qu'on ne l'oublie pas. */
    quantite?: number;
    prix: number;
}
/** Le total de lignes chiffrées, quantités comprises. */
export declare const totalLignesTarif: (lignes: readonly LigneTarifTente[]) => number;
/** Prix par slug — `null` = prix INCONNU, jamais zéro. */
export type PrixDe = (slug: string) => number | null;
/**
 * Les lignes chiffrées d'une tente composée, dans l'ordre d'affichage de la
 * page : le pack, puis chaque côté (choix, impression, demi-mur, auvent), puis
 * les options. Seules les lignes dont le tarif connaît le prix apparaissent.
 *
 * `c.nb` au-delà de 1 chiffre la RANGÉE entière — voir `lignesTarifRangee`.
 */
export declare function lignesTarifTente(c: ConfigTente, prixDe: PrixDe, impCotes?: Record<string, boolean>): LigneTarifTente[];
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
export declare function lignesTarifRangee(c: ConfigTente, prixDe: PrixDe, n: number, impCotes?: Record<string, boolean>): LigneTarifTente[];
/**
 * Le total d'une tente composée — celui que la page du configurateur affiche.
 * `null` si le pack de base n'a pas de prix : sans lui le total serait un
 * morceau de tente, et un abri sous-facturé en silence est pire qu'un « prix à
 * confirmer » qui se voit.
 */
export declare function totalTenteComposee(c: ConfigTente, prixDe: PrixDe): number | null;
