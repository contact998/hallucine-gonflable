/** Le client fournit sa maquette : la housse est imprimée à son visuel. */
export declare const HABILLAGE_MOBILIER_PERSO = "perso";
/** L'habillage par défaut : la toile nue, comme les tentes. */
export declare const HABILLAGE_MOBILIER_DEFAUT = "blanc";
export interface HabillageMobilier {
    /** Clé stable — elle voyage dans les codes de configuration des devis. */
    cle: string;
    /** Couleur rendue en 3D. `null` pour le visuel client : on ne la connaît pas. */
    hex: string | null;
    /** Clé i18n, pour le site public et ses six langues. */
    label: string;
    /** Libellé français, pour le CRM — outil interne, pas de i18n. `null` quand
     *  il n'y a rien à dire : la toile nue ne s'écrit pas sur un devis. */
    libelleFr: string | null;
    /** true = « je fournis mon visuel », pas une couleur de notre palette. */
    perso: boolean;
}
export declare const HABILLAGES_MOBILIER: HabillageMobilier[];
/**
 * Toujours un habillage. Une clé inconnue — un lien de devis écrit par une
 * version plus récente — retombe sur la toile nue : la couleur est un détail,
 * le panier et le prix ne le sont pas.
 */
export declare function habillageMobilier(cle: string | undefined | null): HabillageMobilier;
/**
 * La FAMILLE d'un meuble — ce sur quoi on s'assoit, ce autour de quoi on se
 * tient debout, ce derrière quoi on sert.
 *
 * Elle vit ici parce que les DEUX applications en ont besoin et pour la même
 * raison : présenter la liste des meubles en trois groupes repliables plutôt
 * qu'en quinze lignes à plat. Le site l'utilise en plus pour ranger la scène —
 * les assises en îlots, les mange-debout en périphérie.
 *
 * Déduite du `slugSite`, pas d'une table à tenir à jour : un quinzième meuble
 * ouvert au CRM tombe dans la bonne famille sans qu'on touche à ce fichier.
 * C'est la convention de nommage qui porte l'information, et elle est stable —
 * `bar-cocktail-1`, `table-bistro-longue`, `canape-u`.
 */
export declare const FAMILLES_MOBILIER: readonly ["assises", "mangeDebout", "bars"];
export type FamilleMobilier = (typeof FAMILLES_MOBILIER)[number];
export declare function familleMobilier(slugSite: string): FamilleMobilier;
/** Libellé français de la famille — le CRM n'a pas d'i18n ; le site traduit
 *  par ses propres clés (`piece_groupe_*`). */
export declare const LIBELLES_FAMILLE_FR: Record<FamilleMobilier, string>;
