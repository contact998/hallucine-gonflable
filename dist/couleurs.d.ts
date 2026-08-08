export interface TeinteTente {
    /** Clé stable — sert au code de configuration partagé avec le CRM. */
    cle: string;
    /** Couleur affichée en 3D. */
    hex: string;
    /** Clé i18n du libellé. */
    label: string;
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
export declare const hexDeTeinte: (cle: string) => string;
