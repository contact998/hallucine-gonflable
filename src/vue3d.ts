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
import { MODELES, demiMurPossible, rangeeTentes, type Modele } from "./composition.js";

/** Un modèle 3D par tente, servi depuis R2 : le site et le CRM lisent la même
 *  adresse, personne ne transporte les fichiers en double. */
export const BASE_R2 = "https://pub-dc19082f8e054e8b8a192d8d29df2aa0.r2.dev/models";

/** Le gris-bleu du fond de studio. Propriété de la SCÈNE, pas des applications :
 *  il ne bascule pas en mode sombre — un canapé se regarde sur le même fond des
 *  deux côtés, sinon les couleurs ne se comparent plus. */
export const FOND_SCENE = "#eef2f5";

/* Les meubles et les silhouettes vivent sur R2, comme les pièces de tente :
   une adresse, deux lecteurs. Les servir depuis le site obligeait le CRM à s'en
   passer — donc à ne pas avoir de 3D du tout.

   Ces trois adresses se construisent ICI, dans le module pur, et non dans le
   visualiseur du mobilier où elles ont commencé : la scène de l'écran a besoin
   des silhouettes sans avoir rien à faire des canapés, et une page qui montre
   un écran n'a pas à embarquer le lounge pour connaître une URL. */
export const urlMeuble = (slug: string) => `${BASE_R2}/mobilier/${slug}.glb`;
export const urlPersonne = (fichier: string) => `${BASE_R2}/personnes/${fichier}.glb`;
export const urlEcran = () => `${BASE_R2}/ecran/ecran.glb`;

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
  socleParCote?: { piece: string; cotes: readonly string[]; avecChoix: string };
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
    /* `wall_curved1` et `wall_curved2` sont livrées par Bayes et dormaient :
       aucune ligne à son tarif, donc le configurateur ne les montrait pas. Le
       DESSIN fait foi (décision de Daniel, 11/08/2026) — elles sont proposées,
       au prix provisoire de la paroi pleine, jusqu'à ce qu'il donne le vrai. */
    piece: {
      vide: null, paroi: "side_wall", porte: "door", fenetre: "window_wall",
      courbe: "wall_curved1", courbe_fenetre: "wall_curved2",
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
    /* Le DEMI-MUR vient sous le bandeau, et seulement là. Il s'arrête à
       1 944 mm ; le bandeau va de 1 540 à 2 547, et les 404 mm de recouvrement
       sont la bande de zip qui les tient — celle qui arrive AVEC le bandeau. */
    pieceDemiMur: {
      paroi: "d_half_wall", porte: "d_half_door", fenetre: "d_half_window_wall",
    },
    /* Les deux PIGNONS portent la même toile entière — la B, de 0 à 2 547 mm,
       jusqu'à la voûte. Dit par Bayes le 11/08/2026 : « quand l'avant est une
       paroi entière, c'est une paroi de type B ». Le fichier ne la pose qu'une
       fois, sur l'arrière ; elle arrive devant par un demi-tour.

       Le long côté A sert la gauche et la droite, il reste dans `piece`. Sans
       cette table, les deux pignons recevaient sa toile : 1 723 mm de haut dans
       une ouverture de 2 547, et 146 mm trop large. */
    pieceParCote: {
      avant: { paroi: "b_side_wall", porte: "b_door", fenetre: "b_window_wall" },
      arriere: { paroi: "b_side_wall", porte: "b_door", fenetre: "b_window_wall" },
    },
    /* Bayes a posé SA façade à l'azimut 0, là où la tente X a son arrière :
       `D_Front_…` et le bandeau `C` sont mesurés sur la face Y = +1 389, celle
       que la convention de la X appelle « arrière ».

       Plutôt que de retourner des azimuts mesurés ou les lettres du tarif (qui
       viennent des noms de fichiers du fournisseur), on tourne les quatre NOMS
       de côté d'un demi-tour pour ce modèle : « avant » désigne alors la face au
       bandeau courbe, celle que Bayes appelle Front et que le tarif appelle D.
       Un demi-tour complet, pas un miroir — gauche et droite suivent, sinon la
       tente serait inversée.

       Sans ça, le prix et le dessin partaient chacun sur un pignon différent :
       le client voyait le pignon plein et payait le demi-mur, 40 € plus bas. */
    angleCote: { avant: 0, droit: -90, arriere: 180, gauche: 90 },
    /* La sangle du pignon AVANT — 60 points, de 0 à 1 994 mm — arrive AVEC LE
       BANDEAU, dit par Bayes : c'est elle qui porte le demi-mur. Elle suit donc
       le bandeau, pas la paroi. Les deux longs côtés gardent la leur en
       permanence : eux seuls ont leur bande fixée au toit. */
    socleParCote: { piece: "zipper_cover", cotes: ["avant"], avecChoix: "courbe" },
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
       sur les quatre azimuts du configurateur de la X.

       ⚠️ `angleCote` n'est pas un supplément d'âme, c'est ce qui fait tenir le
       dessin : ses côtés s'appellent a, b, c, donc AUCUN n'est dans la table
       commune (avant/droit/arrière/gauche). Sans cette ligne, `angleCote` rend
       son défaut — zéro — pour les trois : les trois parois se posaient au même
       endroit, tournées de 30° de travers, en travers de la tente, et la caméra
       ne pivotait jamais vers le côté choisi. Livré comme ça le 10/08/2026,
       corrigé le 11 sur les mesures ci-dessous.

       Les trois azimuts sont MESURÉS sur les centres de gravité des GLB, avec
       la formule de ce fichier — azimut = 90° − atan2(y, x) — revérifiée au
       degré près sur les quatre pièces de la tente X :
         · côté « porte » de Bayes, centre (1 632, 0)     → +90°
         · paroi native, centre (−666, 1 195)             → −30°
         · le troisième par symétrie, centre (−666, −1 195) → −150°
       Les trois côtés étant identiques (même prix, même toile), quelle lettre
       va sur quel azimut n'engage rien — mais ne les permute pas : les codes de
       configuration des devis déjà partis portent ces lettres. */
    dossier: "v-tent",
    tailleModele: 4,
    socle: SOCLE_COMMUN,
    /* Sa PORTE est livrée elle aussi — 3 morceaux, 1 487 triangles, 5 → 2 255 mm,
       soit exactement la hauteur de sa paroi pleine — et elle dormait faute de
       ligne au tarif. Le dessin fait foi : on la propose, au prix provisoire de
       la paroi pleine. */
    piece: { vide: null, paroi: "side_wall", porte: "door" },
    angleCote: { a: -30, b: 90, c: -150 },
    angleNatif: { side_wall: -30, door: 90 },
  },
};

/** La vue 3D d'un modèle. Rend celle de la tente X si le modèle n'en a pas —
 *  mieux vaut une tente à l'écran qu'un cadre vide. */
export const vue3d = (m: Modele): Vue3D => VUE_3D[m.slug] ?? VUE_3D.x;

/** Adresse d'une pièce sur R2. */
export const urlPiece = (m: Modele, piece: string) =>
  `${BASE_R2}/${vue3d(m).dossier}/${piece}.glb`;

/** La convention commune, celle de la tente X : quatre côtés interchangeables,
 *  vus de dessus. Un modèle dont la façade tombe ailleurs la redéclare. */
export const ANGLE_COTE_DEFAUT: Record<string, number> = {
  arriere: 0, droit: 90, avant: 180, gauche: -90,
};

/** Où regarde ce côté, chez ce modèle. C'est la seule traduction entre le nom
 *  qu'on montre au client et une face de la tente ; le visualiseur s'en sert
 *  pour tourner la pièce ET pour tourner la caméra, sinon les deux se
 *  contrediraient au premier modèle qui n'a pas la façade de la X. */
export const angleCote = (m: Modele, cote: string): number =>
  (vue3d(m).angleCote ?? ANGLE_COTE_DEFAUT)[cote] ?? ANGLE_COTE_DEFAUT[cote] ?? 0;

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
export function decalageVoisin(
  m: Modele, cote: string, dims: { x: number; y: number },
): { x: number; y: number } {
  const az = angleCote(m, cote) * (Math.PI / 180);
  const dx = Math.sin(az);
  const dy = Math.cos(az);
  const dist = Math.abs(dx) * dims.x + Math.abs(dy) * dims.y;
  return { x: dx * dist, y: dy * dist };
}

/** Ce choix se dessine-t-il chez ce modèle ? C'est le DESSIN qui décide de ce
 *  qui existe : une pièce que Bayes livre est un produit, même si le tarif n'a
 *  pas encore sa ligne — elle se vend alors au prix provisoire de la paroi
 *  pleine, en rouge, jusqu'à ce qu'il donne le sien. Cacher un produit qui
 *  existe coûte plus cher qu'afficher un prix à confirmer. */
export const dessinable = (m: Modele, cote: string, choix: string): boolean =>
  pieceDeCote(m, cote, choix) !== null;

/** Le fichier du demi-mur pour ce type. `null` si le modèle n'en a pas. */
export const pieceDemiMur = (m: Modele, type: string): string | null =>
  vue3d(m).pieceDemiMur?.[type] ?? null;

/** Le fichier à afficher pour un choix, sur un côté donné. `pieceParCote`
 *  d'abord — les pignons de la N n'ont pas la toile de ses longs côtés — puis
 *  `piece`, qui vaut pour les modèles dont un côté vaut l'autre. */
export const pieceDeCote = (m: Modele, cote: string, choix: string): string | null =>
  vue3d(m).pieceParCote?.[cote]?.[choix] ?? vue3d(m).piece[choix] ?? null;

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
export function piecesAbri(m: Modele, c?: CompositionAbri | null): PieceAbri[] {
  const v = vue3d(m);
  const out: PieceAbri[] = (v.socle as readonly string[]).map((nom) => ({ nom, angle: 0, azimut: null }));
  if (!c) return out;

  const poser = (nom: string, cote: string) => {
    out.push({ nom, angle: (v.angleNatif[nom] ?? 0) - angleCote(m, cote), azimut: angleCote(m, cote) });
  };
  for (const cote of m.cotes as readonly string[]) {
    const type = c.cotes?.[cote] ?? "vide";
    if (type !== "vide") {
      const piece = pieceDeCote(m, cote, type);
      if (piece) poser(piece, cote);
    }
    const dm = c.demiMurs?.[cote] ?? "vide";
    /* Le demi-mur ne vit que sous le bandeau : un code trafiqué ou une version
       future ne doit pas accrocher une toile dans le vide. */
    if (dm !== "vide" && demiMurPossible(m, cote, type)) {
      const piece = pieceDemiMur(m, dm);
      if (piece) poser(piece, cote);
    }
    if (c.auvents?.[cote] && v.pieceAuvent) poser(v.pieceAuvent, cote);
  }
  return out;
}

/**
 * Le côté le long duquel une RANGÉE d'abris s'étend.
 *
 * Le côté en jonction quand il est unique — c'est lui que `rangeeTentes` suit.
 * Sinon « droit » chez les modèles à quatre côtés : son azimut vaut ±90°, la
 * rangée suit donc la LARGEUR du sol du lounge (n·L × P), jamais sa profondeur.
 * `null` chez les autres (la V et ses trois côtés) : pas de rangée.
 */
export function axeRangee(m: Modele, c?: CompositionAbri | null): string | null {
  const cotes = m.cotes as readonly string[];
  if (cotes.length !== 4) return null;
  const jonctions = cotes.filter((x) => c?.cotes?.[x] === "jonction");
  return jonctions.length === 1 ? jonctions[0] : "droit";
}

/**
 * Les n abris d'une rangée de lounge, chacun prêt pour `piecesAbri`.
 *
 * Une composition à UNE jonction suit `rangeeTentes` — la MÊME dérivation que
 * le viewer tente et le chiffrage du CRM, sinon la scène du lounge montrerait
 * une autre rangée que celle qu'on vend. Une tente nue (ou sans jonction) se
 * répète telle quelle : n socles accolés, c'est déjà la rangée.
 */
export function rangeeAbri(
  m: Modele, c: CompositionAbri | null | undefined, n: number,
): (CompositionAbri | null)[] {
  const seule = [c ?? null];
  if (n <= 1 || (m.cotes as readonly string[]).length !== 4) return seule;
  const jonctions = (m.cotes as readonly string[]).filter((x) => c?.cotes?.[x] === "jonction");
  if (c && jonctions.length === 1) {
    return rangeeTentes(m, { cotes: c.cotes ?? {}, auvents: c.auvents ?? {}, demiMurs: c.demiMurs ?? {} }, n);
  }
  return Array.from({ length: n }, () => c ?? null);
}

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

/* ── La NATURE d'une pièce ──────────────────────────────────────────────────
 *
 * Bayes colle le côté devant le nom chez la N : `a_side_wall`, `b_door`,
 * `d_half_window_wall`. Tout ce qui décrit une pièce — son zip, sa vitre —
 * porte donc sur sa NATURE, jamais sur son nom complet.
 *
 * Écrites en égalité stricte, ces règles ne reconnaissaient que les noms de la
 * tente X. La N y perdait ses fermetures éclair et ses vitres, sans que rien ne
 * le signale : une paroi à fenêtre s'affichait comme une paroi pleine, une
 * porte comme un mur. C'est ce qui se voit sur une capture, et seulement là.
 */
export const estPiece = (piece: string, nature: string): boolean =>
  piece === nature || piece.endsWith(`_${nature}`);

/** Natures qui portent un liseré de fermeture éclair — les panneaux amovibles.
 *  La quincaillerie (pieds, caches-zip) n'en a pas : elle ne se dézippe pas. */
export const NATURES_ZIPPEES = [
  "side_wall", "half_wall", "door", "half_door",
  "window_wall", "half_window_wall",
  "wall_curved1", "wall_curved2", "banner", "awning", "junction",
] as const;

/** Natures dont la VITRE est un morceau distinct dans le fichier fournisseur.
 *  Elle partage la matière de la toile — sans repérage, teindre la paroi
 *  peindrait la fenêtre avec, et la fenêtre se lirait comme un mur plein. */
export const NATURES_VITREES = ["window_wall"] as const;

export const porteLisere = (piece: string): boolean =>
  NATURES_ZIPPEES.some((n) => estPiece(piece, n));

export const porteVitre = (piece: string): boolean =>
  NATURES_VITREES.some((n) => estPiece(piece, n));
