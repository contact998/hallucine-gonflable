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
import { MODELES } from "./composition.js";
/** Un modèle 3D par tente, servi depuis R2 : le site et le CRM lisent la même
 *  adresse, personne ne transporte les fichiers en double. */
export const BASE_R2 = "https://pub-dc19082f8e054e8b8a192d8d29df2aa0.r2.dev/models";
const SOCLE_COMMUN = ["roof", "LEG", "zipper_cover"];
export const VUE_3D = {
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
        },
        /* Le bandeau se pose PAR-DESSUS la paroi du côté, il ne la remplace pas :
           de 1 540 à 2 547 mm quand la toile du pignon avant s'arrête à 1 944. Les
           404 mm de recouvrement sont le zip qui les tient ensemble. */
        pieceBandeau: "c_banner",
        /* Les deux pignons ne portent PAS la même toile, et c'est tout le sujet :
           l'avant est un demi-mur (0 → 1 944 mm) que le bandeau courbe complète
           au-dessus, l'arrière un pignon plein qui monte jusqu'à la voûte (2 547).
           Le long côté A sert la gauche et la droite, il reste dans `piece`.
    
           Sans cette table, les deux pignons recevaient la toile du LONG CÔTÉ :
           1 723 mm de haut dans une ouverture de 2 547, et 146 mm trop large. Six
           fichiers livrés par Bayes n'étaient jamais affichés. */
        pieceParCote: {
            avant: { paroi: "d_half_wall", porte: "d_half_door", fenetre: "d_half_window_wall" },
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
        piece: { vide: null, paroi: "side_wall" },
        angleCote: { a: -30, b: 90, c: -150 },
        angleNatif: { side_wall: -30, door: 90 },
    },
};
/** La vue 3D d'un modèle. Rend celle de la tente X si le modèle n'en a pas —
 *  mieux vaut une tente à l'écran qu'un cadre vide. */
export const vue3d = (m) => VUE_3D[m.slug] ?? VUE_3D.x;
/** Adresse d'une pièce sur R2. */
export const urlPiece = (m, piece) => `${BASE_R2}/${vue3d(m).dossier}/${piece}.glb`;
/** La convention commune, celle de la tente X : quatre côtés interchangeables,
 *  vus de dessus. Un modèle dont la façade tombe ailleurs la redéclare. */
export const ANGLE_COTE_DEFAUT = {
    arriere: 0, droit: 90, avant: 180, gauche: -90,
};
/** Où regarde ce côté, chez ce modèle. C'est la seule traduction entre le nom
 *  qu'on montre au client et une face de la tente ; le visualiseur s'en sert
 *  pour tourner la pièce ET pour tourner la caméra, sinon les deux se
 *  contrediraient au premier modèle qui n'a pas la façade de la X. */
export const angleCote = (m, cote) => (vue3d(m).angleCote ?? ANGLE_COTE_DEFAUT)[cote] ?? ANGLE_COTE_DEFAUT[cote] ?? 0;
/** Le fichier à afficher pour un choix, sur un côté donné. `pieceParCote`
 *  d'abord — les pignons de la N n'ont pas la toile de ses longs côtés — puis
 *  `piece`, qui vaut pour les modèles dont un côté vaut l'autre. */
export const pieceDeCote = (m, cote, choix) => vue3d(m).pieceParCote?.[cote]?.[choix] ?? vue3d(m).piece[choix] ?? null;
/** Cette pièce peut-elle recevoir un visuel ? Une case à cocher ou un bouton
 *  qui ne changerait rien au dessin est une promesse que l'image ne tient pas. */
export const pieceImprimable = (m, piece) => !vue3d(m).sansImpression.includes(piece);
/** Facteur d'échelle d'une taille par rapport à celle que Bayes a modélisée. */
export function echelle(m, taille) {
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
export const estPiece = (piece, nature) => piece === nature || piece.endsWith(`_${nature}`);
/** Natures qui portent un liseré de fermeture éclair — les panneaux amovibles.
 *  La quincaillerie (pieds, caches-zip) n'en a pas : elle ne se dézippe pas. */
export const NATURES_ZIPPEES = [
    "side_wall", "half_wall", "door", "half_door",
    "window_wall", "half_window_wall",
    "wall_curved1", "wall_curved2", "banner", "awning", "junction",
];
/** Natures dont la VITRE est un morceau distinct dans le fichier fournisseur.
 *  Elle partage la matière de la toile — sans repérage, teindre la paroi
 *  peindrait la fenêtre avec, et la fenêtre se lirait comme un mur plein. */
export const NATURES_VITREES = ["window_wall"];
export const porteLisere = (piece) => NATURES_ZIPPEES.some((n) => estPiece(piece, n));
export const porteVitre = (piece) => NATURES_VITREES.some((n) => estPiece(piece, n));
