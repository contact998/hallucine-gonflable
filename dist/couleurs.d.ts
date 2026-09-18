export interface TeinteTente {
    /** Clé stable — sert au code de configuration partagé avec le CRM. */
    cle: string;
    /** Couleur affichée en 3D : une approximation d'écran de la référence. */
    hex: string;
    /** Clé i18n du libellé. */
    label: string;
    /** Référence Pantone Coated transmise à l'atelier — vide pour la toile nue. */
    pantone: string;
}
/** `blanc` = toile nue : aucune impression, donc aucun supplément. */
export declare const TEINTES: TeinteTente[];
export declare const TEINTE_NUE = "blanc";
/** Zones colorables du socle — les pièces toujours présentes — et l'option
 *  d'impression que chacune déclenche. */
export declare const ZONES_COULEUR: readonly [{
    readonly cle: "toit";
    readonly piece: "roof";
    readonly impression: "imp_toit";
    readonly label: "zone_toit";
}, {
    readonly cle: "structure";
    readonly piece: "LEG";
    readonly impression: "imp_structure";
    readonly label: "zone_structure";
}, {
    readonly cle: "zip";
    readonly piece: "zipper_cover";
    readonly impression: "imp_zip";
    readonly label: "zone_zip";
}];
/** L'auvent n'est pas du socle : il se monte côté par côté, et n'existe que si
 *  le client en a coché au moins un. Sa teinte suit donc un autre chemin dans
 *  le visualiseur, d'où cette entrée à part.
 *  Elle ne coche que l'impression de la TOILE d'auvent : le bandeau, le pied et
 *  le bas PVC se vendent séparément et gardent leurs cases. */
export declare const ZONE_AUVENT: {
    readonly cle: "auvent";
    readonly piece: "awning";
    readonly impression: "imp_auv_toile";
    readonly label: "choix_auvent";
};
export type ZoneCouleur = (typeof ZONES_COULEUR)[number]["cle"] | typeof ZONE_AUVENT["cle"];
/** Longueur maximale d'une référence Pantone saisie. « Cool Gray 11 C » tient
 *  en 14 ; au-delà, c'est une phrase, pas une référence. */
export declare const PANTONE_MAX = 24;
/**
 * Ce que le client a tapé, ramené à une référence présentable : espaces
 * resserrés, préfixe « Pantone » retiré (on l'écrit nous-mêmes), rien que des
 * lettres, des chiffres, des espaces et des tirets. Vide quand il ne reste rien.
 */
export declare function normaliserPantone(saisie: string | null | undefined): string;
/** La clé d'une teinte sur mesure : `#RRGGBB`, suivie de `|réf` quand le
 *  client a donné sa référence Pantone. */
export declare function teinteSurMesure(hex: string, pantone?: string): string;
export declare const estTeinteSurMesure: (cle: string | null | undefined) => boolean;
export interface TeinteLue {
    /** La clé telle qu'elle a été reçue — ou celle de la toile nue si elle
     *  n'était pas lisible. */
    cle: string;
    hex: string;
    /** Référence Pantone : celle du nuancier, celle donnée par le client, ou
     *  vide (toile nue, ou teinte sur mesure sans référence). */
    pantone: string;
    surMesure: boolean;
    /** Clé i18n du nom, pour les teintes du nuancier. */
    label: string | null;
}
/**
 * Toujours une teinte. Une clé inconnue — un lien écrit par une version plus
 * récente, une URL retouchée — retombe sur la toile nue : la couleur est un
 * détail, le prix et la composition ne le sont pas.
 */
export declare function lireTeinte(cle: string | null | undefined): TeinteLue;
export declare const hexDeTeinte: (cle: string) => string;
/** La référence à écrire sur un devis, « Pantone 199 C » — vide quand il n'y en
 *  a pas (toile nue, ou teinte sur mesure dont le client n'a pas donné la
 *  référence : le commercial la lui demandera). */
export declare function pantoneDeTeinte(cle: string): string;
