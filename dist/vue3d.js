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
export const vue3d = (m) => VUE_3D[m.slug] ?? VUE_3D.x;
/** Adresse d'une pièce sur R2. */
export const urlPiece = (m, piece) => `${BASE_R2}/${vue3d(m).dossier}/${piece}.glb`;
/** Facteur d'échelle d'une taille par rapport à celle que Bayes a modélisée. */
export function echelle(m, taille) {
    const base = vue3d(m).tailleModele;
    return (parseInt(taille, 10) || base) / base;
}
/** Tout modèle vendu doit avoir sa vue 3D : sans elle, sa page ne montre rien. */
export const MODELES_SANS_VUE = MODELES.filter((m) => !VUE_3D[m.slug]).map((m) => m.slug);
