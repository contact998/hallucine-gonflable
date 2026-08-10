/*
 * Ce que le visualiseur doit savoir de chaque modèle.
 *
 * Séparé de `composition.ts`, qui décrit ce qui se VEND. Ici, rien que du
 * dessin : où sont les fichiers, quelle pièce montre quel choix, et sur quel
 * côté le fournisseur l'a posée dans SON assemblage.
 *
 * ⚠️ TOUT CE FICHIER EST MESURÉ, RIEN N'Y EST ESTIMÉ. Les azimuts viennent du
 * centre de gravité de chaque GLB, avec une formule calibrée sur la tente X :
 * ses sept angles, réglés à la main en août et justes en production, retombent
 * au degré près. À revérifier à chaque livraison Bayes — c'est le seul endroit
 * qui dit où une pièce est posée.
 *
 * Convention d'azimut, celle du configurateur vu de dessus :
 *   arrière = 0°, droit = +90°, avant = 180°, gauche = −90°.
 */
import { MODELES, type Modele } from "./composition.js";

/** Un modèle 3D par tente, servi depuis R2 : le site et le CRM lisent la même
 *  adresse, personne ne transporte les fichiers en double. */
export const BASE_R2 = "https://pub-dc19082f8e054e8b8a192d8d29df2aa0.r2.dev/models";

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

const SOCLE_COMMUN = ["roof", "LEG", "zipper_cover"] as const;

export const VUE_3D: Record<string, Vue3D> = {
  x: {
    sansImpression: ["LEG"],
    dossier: "tente-x",
    tailleModele: 3,
    socle: SOCLE_COMMUN,
    piece: {
      vide: null, paroi: "side_wall", porte: "door", fenetre: "window_wall",
      courbe: "wall_curved1", courbe_fenetre: "wall_curved2", jonction: "junction",
    },
    angleNatif: {
      side_wall: 180, door: -90, window_wall: 90,
      wall_curved1: 0, wall_curved2: 0, awning: -90, junction: 180,
    },
    pieceAuvent: "awning",
  },

  spider: {
    sansImpression: ["LEG", "zipper_cover", "window_pvc"],
    dossier: "spider-tent",
    tailleModele: 4,
    socle: SOCLE_COMMUN,
    piece: {
      vide: null, paroi: "side_wall", porte: "door", fenetre: "window_wall",
      jonction: "junction",
    },
    angleNatif: {
      side_wall: 0, door: 180, window_wall: -90,
      wall_curved1: 90, wall_curved2: 90, awning: 90, junction: 0,
    },
    pieceAuvent: "awning",
  },

  n: {
    sansImpression: ["LEG", "zipper_cover"],
    /* Ses parois portent le côté dans leur NOM de fichier, parce qu'elles
       diffèrent d'un côté à l'autre. Le viewer choisit donc la pièce d'après le
       côté visé, pas seulement d'après le type — la correspondance côté →
       lettre vit dans `composition.ts`, avec ses mesures. */
    dossier: "n-tent",
    tailleModele: 3,
    socle: SOCLE_COMMUN,
    piece: {
      vide: null, paroi: "a_side_wall", porte: "a_door", fenetre: "a_window_wall",
      courbe: "c_banner",
    },
    angleNatif: {
      a_side_wall: -90, a_door: -90, a_window_wall: -90,
      b_side_wall: 180, b_door: 180, b_window_wall: 180,
      c_banner: 0,
      d_half_wall: 0, d_half_door: 0, d_half_window_wall: 0,
    },
  },

  v: {
    sansImpression: ["LEG", "zipper_cover"],
    /* Trois côtés à 120°, et non quatre : ses parois natives sont mesurées à
       −30° et 90°, la troisième à −150°. Le viewer ne peut donc pas se reposer
       sur les quatre azimuts du configurateur de la X. */
    dossier: "v-tent",
    tailleModele: 4,
    socle: SOCLE_COMMUN,
    piece: { vide: null, paroi: "side_wall" },
    angleNatif: { side_wall: -30, door: 90 },
  },
};

/** La vue 3D d'un modèle. Rend celle de la tente X si le modèle n'en a pas —
 *  mieux vaut une tente à l'écran qu'un cadre vide. */
export const vue3d = (m: Modele): Vue3D => VUE_3D[m.slug] ?? VUE_3D.x;

/** Adresse d'une pièce sur R2. */
export const urlPiece = (m: Modele, piece: string) =>
  `${BASE_R2}/${vue3d(m).dossier}/${piece}.glb`;

/** Cette pièce peut-elle recevoir un visuel ? Une case à cocher ou un bouton
 *  qui ne changerait rien au dessin est une promesse que l'image ne tient pas. */
export const pieceImprimable = (m: Modele, piece: string): boolean =>
  !vue3d(m).sansImpression.includes(piece);

/** Facteur d'échelle d'une taille par rapport à celle que Bayes a modélisée. */
export function echelle(m: Modele, taille: string): number {
  const base = vue3d(m).tailleModele;
  return (parseInt(taille, 10) || base) / base;
}

/** Tout modèle vendu doit avoir sa vue 3D : sans elle, sa page ne montre rien. */
export const MODELES_SANS_VUE = MODELES.filter((m) => !VUE_3D[m.slug]).map((m) => m.slug);
