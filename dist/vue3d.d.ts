import { type Modele } from "./composition.js";
/** Un modèle 3D par tente, servi depuis R2 : le site et le CRM lisent la même
 *  adresse, personne ne transporte les fichiers en double. */
export declare const BASE_R2 = "https://pub-dc19082f8e054e8b8a192d8d29df2aa0.r2.dev/models";
export interface Vue3D {
    /** Dossier R2. Il ne suit pas le slug du modèle : la tente X a été déposée
     *  sous « tente-x » avant que la gamme existe, les trois autres sous le nom
     *  du fichier fournisseur. Renommer casserait le viewer en production pour
     *  rien — la correspondance vit ici, une ligne. */
    dossier: string;
    /** Taille modélisée par le fournisseur, en mètres. Les autres tailles en
     *  découlent par mise à l'échelle : Bayes livre toujours la plus petite de
     *  la gamme. */
    tailleModele: number;
    /** Pièces toujours affichées. */
    socle: readonly string[];
    /** Choix du configurateur → fichier. `null` = rien à montrer. */
    piece: Record<string, string | null>;
    /** Azimut où le fournisseur a posé chaque pièce, en degrés. */
    angleNatif: Record<string, number>;
    /** Pièce d'auvent, si le modèle en propose un. */
    pieceAuvent?: string;
}
export declare const VUE_3D: Record<string, Vue3D>;
/** La vue 3D d'un modèle. Rend celle de la tente X si le modèle n'en a pas —
 *  mieux vaut une tente à l'écran qu'un cadre vide. */
export declare const vue3d: (m: Modele) => Vue3D;
/** Adresse d'une pièce sur R2. */
export declare const urlPiece: (m: Modele, piece: string) => string;
/** Facteur d'échelle d'une taille par rapport à celle que Bayes a modélisée. */
export declare function echelle(m: Modele, taille: string): number;
/** Tout modèle vendu doit avoir sa vue 3D : sans elle, sa page ne montre rien. */
export declare const MODELES_SANS_VUE: ("x" | "spider" | "n" | "v")[];
