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
    /** Pièces du DEMI-MUR, par type — le second étage qui se pose SOUS le choix
     *  du côté. Voir `DemiMurModele` dans `composition.ts`. */
    pieceDemiMur?: Record<string, string>;
    /**
     * Portions d'une pièce du SOCLE qui appartiennent à un côté, et qui
     * apparaissent et disparaissent avec sa paroi.
     *
     * Le cache-zip est la sangle sur laquelle la paroi vient se zipper : elle
     * n'existe que POUR elle. Côté fermé, c'est ce qu'on voit du zip et elle doit
     * être là. Côté ouvert, elle restait tendue en travers de l'ouverture — une
     * toile fantôme là où le client a justement demandé du vide.
     *
     * Déclaré par modèle et par côté, jamais en général : c'est une observation
     * sur un fichier précis, et les autres tentes n'ont pas à en hériter.
     */
    socleParCote?: {
        piece: string;
        cotes: readonly string[];
        avecChoix: string;
    };
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
/**
 * Où poser la tente VOISINE quand ce côté porte une jonction : accolée, de
 * l'autre côté de la gouttière.
 *
 * La direction est l'azimut du côté — la même formule que `marquerFace` du
 * viewer, (sin az, cos az) vu de dessus. La distance est la largeur du toit
 * MESURÉE dans cette direction : deux tentes identiques dont les centres sont
 * séparés d'une largeur se touchent exactement. `dims` vient de la boîte du
 * toit chargé, en millimètres du modèle de base — le décalage se pose donc
 * AVANT l'échelle de taille, et les deux tentes restent jointives en 4 × 4
 * comme en 10 × 10 sans rien recalculer.
 */
export declare function decalageVoisin(m: Modele, cote: string, dims: {
    x: number;
    y: number;
}): {
    x: number;
    y: number;
};
/** Ce choix se dessine-t-il chez ce modèle ? C'est le DESSIN qui décide de ce
 *  qui existe : une pièce que Bayes livre est un produit, même si le tarif n'a
 *  pas encore sa ligne — elle se vend alors au prix provisoire de la paroi
 *  pleine, en rouge, jusqu'à ce qu'il donne le sien. Cacher un produit qui
 *  existe coûte plus cher qu'afficher un prix à confirmer. */
export declare const dessinable: (m: Modele, cote: string, choix: string) => boolean;
/** Le fichier du demi-mur pour ce type. `null` si le modèle n'en a pas. */
export declare const pieceDemiMur: (m: Modele, type: string) => string | null;
/** Le fichier à afficher pour un choix, sur un côté donné. `pieceParCote`
 *  d'abord — les pignons de la N n'ont pas la toile de ses longs côtés — puis
 *  `piece`, qui vaut pour les modèles dont un côté vaut l'autre. */
export declare const pieceDeCote: (m: Modele, cote: string, choix: string) => string | null;
/** Une pièce de l'abri du lounge : quel fichier, tourné comment, sur quel
 *  azimut. `azimut` sert à l'effacement — la paroi entre la caméra et les
 *  meubles devient translucide ; `null` = socle, jamais effacé. */
export interface PieceAbri {
    nom: string;
    /** Rotation à appliquer (degrés) : `angleNatif − angleCote`, la formule du
     *  visualiseur tente — la MÊME, sinon les deux scènes divergent. */
    angle: number;
    azimut: number | null;
}
/** La composition qu'un abri sait dessiner — le sous-ensemble GÉOMÉTRIQUE du
 *  code de configuration : ni options ni couleurs, le code ne les porte pas. */
export interface CompositionAbri {
    cotes?: Record<string, string>;
    auvents?: Record<string, boolean>;
    demiMurs?: Record<string, string>;
}
/**
 * Les pièces à monter pour l'abri d'un lounge : le socle toujours, et — si une
 * composition est fournie — les parois, demi-murs et auvents tels que le client
 * les a construits. Sans composition, la tente reste nue : c'est l'abri choisi
 * à la main, modèle + taille, comme depuis toujours.
 *
 * Pure et testée à part : le montage three.js (`construireAbri`) ne fait que
 * charger et tourner ce que cette liste décide.
 */
export declare function piecesAbri(m: Modele, c?: CompositionAbri | null): PieceAbri[];
/**
 * Le côté le long duquel une RANGÉE d'abris s'étend.
 *
 * Le côté en jonction quand il est unique — c'est lui que `rangeeTentes` suit.
 * Sinon « droit » chez les modèles à quatre côtés : son azimut vaut ±90°, la
 * rangée suit donc la LARGEUR du sol du lounge (n·L × P), jamais sa profondeur.
 * `null` chez les autres (la V et ses trois côtés) : pas de rangée.
 */
export declare function axeRangee(m: Modele, c?: CompositionAbri | null): string | null;
/**
 * Les n abris d'une rangée de lounge, chacun prêt pour `piecesAbri`.
 *
 * Une composition à UNE jonction suit `rangeeTentes` — la MÊME dérivation que
 * le viewer tente et le chiffrage du CRM, sinon la scène du lounge montrerait
 * une autre rangée que celle qu'on vend. Une tente nue (ou sans jonction) se
 * répète telle quelle : n socles accolés, c'est déjà la rangée.
 */
export declare function rangeeAbri(m: Modele, c: CompositionAbri | null | undefined, n: number): (CompositionAbri | null)[];
/** Cette pièce peut-elle recevoir un visuel ? Une case à cocher ou un bouton
 *  qui ne changerait rien au dessin est une promesse que l'image ne tient pas. */
export declare const pieceImprimable: (m: Modele, piece: string) => boolean;
/** Facteur d'échelle d'une taille par rapport à celle que Bayes a modélisée. */
export declare function echelle(m: Modele, taille: string): number;
/** Tout modèle vendu doit avoir sa vue 3D : sans elle, sa page ne montre rien. */
export declare const MODELES_SANS_VUE: ("x" | "spider" | "n" | "v")[];
export declare const estPiece: (piece: string, nature: string) => boolean;
/** Natures qui portent un liseré de fermeture éclair — les panneaux amovibles.
 *  La quincaillerie (pieds, caches-zip) n'en a pas : elle ne se dézippe pas. */
export declare const NATURES_ZIPPEES: readonly ["side_wall", "half_wall", "door", "half_door", "window_wall", "half_window_wall", "wall_curved1", "wall_curved2", "banner", "awning", "junction"];
/** Natures dont la VITRE est un morceau distinct dans le fichier fournisseur.
 *  Elle partage la matière de la toile — sans repérage, teindre la paroi
 *  peindrait la fenêtre avec, et la fenêtre se lirait comme un mur plein. */
export declare const NATURES_VITREES: readonly ["window_wall"];
export declare const porteLisere: (piece: string) => boolean;
export declare const porteVitre: (piece: string) => boolean;
