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
    /**
     * Fichier à afficher pour un choix SUR UN CÔTÉ donné, quand tous les côtés ne
     * portent pas la même toile. Prime sur `piece`, qui reste le repli.
     *
     * Chez la plupart des modèles la question ne se pose pas : un côté vaut
     * l'autre, une seule pièce sert les quatre par rotation. Chez la N si — ses
     * deux pignons sont deux produits différents.
     */
    pieceParCote?: Record<string, Record<string, string>>;
    /** Azimut où le fournisseur a posé chaque pièce, en degrés. */
    angleNatif: Record<string, number>;
    /**
     * Où regarde chaque côté du configurateur chez CE modèle, quand sa façade
     * n'est pas celle de la tente X. Absent = la convention commune.
     *
     * C'est le seul endroit où « avant » et « arrière » se raccrochent à une face
     * réelle. Le déclarer ici, plutôt que de retourner des azimuts mesurés ou des
     * lettres de tarif, garde les deux mesures intactes et met le désaccord à un
     * seul endroit.
     */
    angleCote?: Record<string, number>;
    /** Pièce d'auvent, si le modèle en propose un. */
    pieceAuvent?: string;
    /**
     * Pièces qui ne portent AUCUNE coordonnée d'impression, donc sur lesquelles
     * un visuel ne peut pas se poser.
     *
     * Ce n'est pas un choix : c'est d'où vient le fichier. Les toiles sortent du
     * Rhino de Bayes, qui les déplie sur ses gabarits — elles ont leurs UV. La
     * quincaillerie (pieds, caches-zip, vitres PVC) n'existe qu'en surfaces dans
     * ce Rhino ; elle vient du STEP, qui n'en porte pas.
     *
     * MESURÉ sur les fichiers, pas listé à la main :
     *   node --input-type=module < scripts/…  (voir `verifier-uv-modeles.mjs`)
     * À rejouer à chaque livraison — le jour où Bayes maille sa quincaillerie
     * dans le Rhino, ces listes se vident toutes seules.
     */
    sansImpression: readonly string[];
}
export declare const VUE_3D: Record<string, Vue3D>;
/** La vue 3D d'un modèle. Rend celle de la tente X si le modèle n'en a pas —
 *  mieux vaut une tente à l'écran qu'un cadre vide. */
export declare const vue3d: (m: Modele) => Vue3D;
/** Adresse d'une pièce sur R2. */
export declare const urlPiece: (m: Modele, piece: string) => string;
/** La convention commune, celle de la tente X : quatre côtés interchangeables,
 *  vus de dessus. Un modèle dont la façade tombe ailleurs la redéclare. */
export declare const ANGLE_COTE_DEFAUT: Record<string, number>;
/** Où regarde ce côté, chez ce modèle. C'est la seule traduction entre le nom
 *  qu'on montre au client et une face de la tente ; le visualiseur s'en sert
 *  pour tourner la pièce ET pour tourner la caméra, sinon les deux se
 *  contrediraient au premier modèle qui n'a pas la façade de la X. */
export declare const angleCote: (m: Modele, cote: string) => number;
/** Le fichier à afficher pour un choix, sur un côté donné. `pieceParCote`
 *  d'abord — les pignons de la N n'ont pas la toile de ses longs côtés — puis
 *  `piece`, qui vaut pour les modèles dont un côté vaut l'autre. */
export declare const pieceDeCote: (m: Modele, cote: string, choix: string) => string | null;
/** Cette pièce peut-elle recevoir un visuel ? Une case à cocher ou un bouton
 *  qui ne changerait rien au dessin est une promesse que l'image ne tient pas. */
export declare const pieceImprimable: (m: Modele, piece: string) => boolean;
/** Facteur d'échelle d'une taille par rapport à celle que Bayes a modélisée. */
export declare function echelle(m: Modele, taille: string): number;
/** Tout modèle vendu doit avoir sa vue 3D : sans elle, sa page ne montre rien. */
export declare const MODELES_SANS_VUE: ("x" | "spider" | "n" | "v")[];
