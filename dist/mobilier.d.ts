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
