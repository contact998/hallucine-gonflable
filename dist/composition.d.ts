export declare const TAILLES: readonly ["3x3", "4x4", "5x5", "6x6", "7x7", "8x8"];
export type Taille = (typeof TAILLES)[number];
/** Ordre figé : il sert au code de configuration, qui voyage dans les devis. */
export declare const COTES: readonly ["avant", "droit", "arriere", "gauche"];
export type Cote = (typeof COTES)[number];
/**
 * Ce qu'un côté peut porter. Un côté porte UN seul type — ils sont exclusifs
 * par construction, ce qui rend inutile toute règle du genre « pas de porte sur
 * une jonction » : le côté est l'un ou l'autre.
 *
 * `slug` : suffixe de la clé catalogue, `tente-x-<taille>-<slug>`.
 * `impression` : l'option d'impression que ce type déclenche quand le client
 * choisit une couleur ou pose une image — chez ce produit, une couleur EST une
 * impression, la toile étant blanche.
 */
export declare const TYPES_COTE: readonly [{
    readonly valeur: "vide";
    readonly libelle: "choix_vide";
    readonly slug: null;
    readonly impression: null;
}, {
    readonly valeur: "paroi";
    readonly libelle: "choix_paroi";
    readonly slug: "paroi";
    readonly impression: "imp_paroi";
}, {
    readonly valeur: "porte";
    readonly libelle: "choix_porte";
    readonly slug: "paroi-porte";
    readonly impression: "imp_paroi";
}, {
    readonly valeur: "fenetre";
    readonly libelle: "choix_fenetre";
    readonly slug: "paroi-fenetre";
    readonly impression: "imp_paroi";
}, {
    readonly valeur: "courbe";
    readonly libelle: "choix_courbe";
    readonly slug: "paroi-courbe";
    readonly impression: "imp_courbe";
}, {
    readonly valeur: "courbe_fenetre";
    readonly libelle: "choix_courbe_fenetre";
    readonly slug: "paroi-courbe-fenetre";
    readonly impression: "imp_courbe";
}, {
    readonly valeur: "jonction";
    readonly libelle: "choix_jonction";
    readonly slug: "jonction";
    readonly impression: null;
}];
export type TypeCote = (typeof TYPES_COTE)[number]["valeur"];
export declare const typeCote: (valeur: string) => {
    readonly valeur: "vide";
    readonly libelle: "choix_vide";
    readonly slug: null;
    readonly impression: null;
} | {
    readonly valeur: "paroi";
    readonly libelle: "choix_paroi";
    readonly slug: "paroi";
    readonly impression: "imp_paroi";
} | {
    readonly valeur: "porte";
    readonly libelle: "choix_porte";
    readonly slug: "paroi-porte";
    readonly impression: "imp_paroi";
} | {
    readonly valeur: "fenetre";
    readonly libelle: "choix_fenetre";
    readonly slug: "paroi-fenetre";
    readonly impression: "imp_paroi";
} | {
    readonly valeur: "courbe";
    readonly libelle: "choix_courbe";
    readonly slug: "paroi-courbe";
    readonly impression: "imp_courbe";
} | {
    readonly valeur: "courbe_fenetre";
    readonly libelle: "choix_courbe_fenetre";
    readonly slug: "paroi-courbe-fenetre";
    readonly impression: "imp_courbe";
} | {
    readonly valeur: "jonction";
    readonly libelle: "choix_jonction";
    readonly slug: "jonction";
    readonly impression: null;
};
/**
 * L'auvent se monte-t-il sur ce côté ?
 *
 * Non sur une paroi COURBE : le bandeau déborde vers l'extérieur, l'auvent n'a
 * pas où se fixer. Non sur une JONCTION : ce côté est collé à une autre tente,
 * il n'y a pas d'air libre au-dessus. Rien d'autre ne l'empêche.
 */
export declare function auventPossible(type: string): boolean;
/** Option d'impression → suffixe de clé catalogue. */
export declare const IMPRESSIONS: {
    readonly imp_toit: "impression-toit";
    readonly imp_zip: "impression-cache-zip";
    readonly imp_structure: "impression-structure";
    readonly imp_pvc: "impression-pvc-pieds";
    readonly imp_paroi: "impression-paroi";
    readonly imp_courbe: "impression-paroi-courbe";
    readonly imp_auv_bandeau: "impression-auvent-bandeau";
    readonly imp_auv_toile: "impression-auvent-toile";
    readonly imp_auv_pied: "impression-auvent-pied";
    readonly imp_auv_pvc: "impression-auvent-pvc";
    readonly imp_jonction: "impression-jonction";
};
export type Impression = keyof typeof IMPRESSIONS;
/** Toujours proposées. */
export declare const IMP_SOCLE: Impression[];
/** Proposées seulement si la composition porte un auvent. */
export declare const IMP_AUVENT: Impression[];
/** Proposée seulement si la composition porte une jonction. */
export declare const IMP_JONCTION: Impression[];
/** Accessoires. `slug` nul = la clé dépend de la taille (le lest en eau). */
export declare const ACCESSOIRES: readonly [{
    readonly valeur: "acc_sac";
    readonly slug: "tente-accessoire-sac";
}, {
    readonly valeur: "acc_led";
    readonly slug: "tente-accessoire-led";
}, {
    readonly valeur: "acc_pompe_main";
    readonly slug: "tente-accessoire-pompe-main";
}, {
    readonly valeur: "acc_valves";
    readonly slug: "tente-accessoire-valves";
}, {
    readonly valeur: "acc_lest_eau";
    readonly slug: null;
}];
export type Accessoire = (typeof ACCESSOIRES)[number]["valeur"];
/** La tente nue : toit + structure, sans aucun côté. */
export declare const cleTente: (taille: string) => string;
/** Un type de côté. `null` si ce type ne se facture pas (côté ouvert). */
export declare function cleTypeCote(taille: string, type: string): string | null;
export declare const cleAuvent: (taille: string) => string;
export declare const cleImpression: (taille: string, imp: Impression) => string;
/** Les accessoires ne dépendent pas tous de la taille — le lest, si. */
export declare function cleAccessoire(taille: string, acc: string): string;
