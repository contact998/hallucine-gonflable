/** Dérivées de la table des modèles — une seule source pour la gamme. */
export declare const TAILLES_TENTE: readonly ["3x3", "4x4", "5x5", "6x6", "7x7", "8x8"] | readonly ["4x4", "6x6", "8x8", "10x10"] | readonly ["3x3", "4x4", "5x5"] | readonly ["4x4", "5x5", "6x6"];
export type TailleTente = string;
export declare const COTES_TENTE: readonly ["avant", "droit", "arriere", "gauche"];
export type CoteTente = (typeof COTES_TENTE)[number];
/** Ordre figé : la POSITION sert de code (en base 36, un seul caractère même
 *  au-delà de la dixième), ne jamais réordonner ni insérer au milieu. */
export declare const IMPRESSIONS_TENTE: readonly ["imp_toit", "imp_zip", "imp_structure", "imp_pvc", "imp_paroi", "imp_courbe", "imp_auv_bandeau", "imp_auv_toile", "imp_auv_pied", "imp_auv_pvc", "imp_jonction"];
export interface ConfigTente {
    /** Slug du modèle (`x`, `spider`, `n`, `v`). */
    modele: string;
    taille: string;
    cotes: Record<string, string>;
    auvents: Record<string, boolean>;
    /** Côtés qui portent un bandeau courbe EN PLUS de leur paroi. Voir
     *  `BandeauModele` : c'est un second étage, pas un choix de côté. */
    bandeaux: Record<string, boolean>;
    options: string[];
}
/** Composition → code d'URL. */
export declare function encoderConfig(c: ConfigTente): string;
/** Code d'URL → composition. Rend `null` si le code est inexploitable :
 *  la page repart alors sur ses valeurs par défaut plutôt que sur du bancal. */
export declare function decoderConfig(code: string | null | undefined): ConfigTente | null;
