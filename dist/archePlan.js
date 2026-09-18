import { composerPan } from "./visuel.js";
import { poseInitiale, plageTaille } from "./pose.js";
/** Le pan coupé, en diamètres de boudin. Voir l'en-tête pour les mesures. */
const PAN_COUPE = {
    droite: 1.7,
    pieds: 1.7,
    ronde: 0,
    demi: 1.7,
    soufflerie: 1.3,
};
/** Une demi-arche plus étroite que ça n'a pas de bandeau : c'est une colonne. */
const COLONNE_MAX = 1.5;
const fini = (n) => typeof n === "number" && Number.isFinite(n) && n > 0;
/** Le pan coupé réel : réduit s'il ne tient pas dans l'arche. */
function panCoupe(forme, l, h, d) {
    const voulu = PAN_COUPE[forme] * d;
    /* Le pan intérieur doit rester un vrai segment (au moins 0,6 d), et le
       bandeau garder de la longueur : jamais plus du tiers du petit côté. */
    return Math.max(0.6 * d, Math.min(voulu, Math.min(l, h) / 3));
}
const chemin = (pts) => `M${pts.map(([x, y]) => `${arrondi(x)} ${arrondi(y)}`).join(" L")} Z`;
const arrondi = (n) => Math.round(n * 100) / 100;
/** Le contour de face, en sommets, pour les formes polygonales. */
function sommetsDeFace(forme, l, h, d) {
    if (forme === "demi" && l < COLONNE_MAX * d) {
        return [[0, h], [0, 0], [l, 0], [l, h]];
    }
    const c = panCoupe(forme, l, h, d);
    /* Le pan intérieur est le pan extérieur décalé d'un diamètre vers l'intérieur :
       x + y = c devient x + y = c + d·√2, qui coupe le montant intérieur (x = d)
       et le dessous du bandeau (y = d) à `k` du coin. */
    const k = c + d * (Math.SQRT2 - 1);
    if (forme === "demi") {
        return [[0, h], [0, c], [c, 0], [l, 0], [l, d], [k, d], [d, k], [d, h]];
    }
    return [
        [0, h], [0, c], [c, 0], [l - c, 0], [l, c], [l, h],
        [l - d, h], [l - d, k], [l - k, d], [k, d], [d, k], [d, h],
    ];
}
/**
 * La géométrie cotée d'une arche, ou `null` si ses cotes ne se dessinent pas.
 * Mieux vaut pas de plan qu'un plan faux : une cote nulle ou négative vient
 * d'une fiche incomplète, pas d'une arche plate.
 */
export function geometrieArche(a) {
    const { forme } = a;
    const l = a.largeurCm, h = a.hauteurCm, d = a.profondeurCm;
    if (!fini(l) || !fini(h) || !fini(d))
        return null;
    if (d * 2 >= l && forme !== "demi")
        return null; // pas d'ouverture : ce n'est pas une arche
    const colonne = forme === "demi" && l < COLONNE_MAX * d;
    const police = Math.max(l, h) * 0.042;
    const ecart = police * 0.6; // de l'objet au début d'une ligne d'attache
    let contour;
    let sommets = null;
    let coinHaut = 0; // x du premier point de la vue de face qui touche le sommet
    if (forme === "ronde") {
        const rx = l / 2, ry = h, rxi = l / 2 - d, ryi = h - d;
        if (!(rxi > 0) || !(ryi > 0))
            return null;
        contour = `M0 ${arrondi(h)} A${arrondi(rx)} ${arrondi(ry)} 0 0 1 ${arrondi(l)} ${arrondi(h)} ` +
            `L${arrondi(l - d)} ${arrondi(h)} A${arrondi(rxi)} ${arrondi(ryi)} 0 0 0 ${arrondi(d)} ${arrondi(h)} Z`;
        coinHaut = l / 2;
    }
    else {
        sommets = sommetsDeFace(forme, l, h, d);
        contour = chemin(sommets);
        coinHaut = Math.min(...sommets.filter(([, y]) => y === 0).map(([x]) => x));
    }
    const cotes = [];
    /* La hauteur, à gauche : du sol au sommet. */
    const xH = -2.2 * police;
    cotes.push({
        cle: "hauteur", valeurCm: h,
        x1: xH, y1: 0, x2: xH, y2: h,
        attaches: [[coinHaut - ecart, 0, xH - 0.5 * police, 0], [-ecart, h, xH - 0.5 * police, h]],
        texte: { x: xH - 0.55 * police, y: h / 2, ancre: "middle", vertical: true },
    });
    /* Deux rangs sous le sol : le diamètre du boudin au plus près, la largeur
       hors-tout en dessous. Deux rangs, jamais un seul : le texte du diamètre,
       écrit à côté de sa cote, tomberait sur celui de la largeur. */
    const yD = h + 1.2 * police;
    const yL = h + 2.7 * police;
    if (colonne) {
        cotes.push({
            cle: "diametre", valeurCm: d,
            x1: 0, y1: yD, x2: l, y2: yD,
            attaches: [[0, h + ecart, 0, yD + 0.5 * police], [l, h + ecart, l, yD + 0.5 * police]],
            texte: { x: l + 0.5 * police, y: yD, ancre: "start", vertical: false },
        });
    }
    else {
        cotes.push({
            cle: "diametre", valeurCm: d,
            x1: 0, y1: yD, x2: d, y2: yD,
            attaches: [[d, h + ecart, d, yD + 0.5 * police]],
            texte: { x: d + 0.5 * police, y: yD, ancre: "start", vertical: false },
        });
        cotes.push({
            cle: "largeur", valeurCm: l,
            x1: 0, y1: yL, x2: l, y2: yL,
            attaches: [[0, h + ecart, 0, yL + 0.5 * police], [l, h + ecart, l, yL + 0.5 * police]],
            texte: { x: l / 2, y: yL + 1.1 * police, ancre: "middle", vertical: false },
        });
    }
    /* La vue de côté des arches à pieds : le montant, debout sur son tube de
       pied. Posée à droite, sur le même sol, à la même échelle. */
    let profil = null;
    let droiteDessin = colonne ? l + 0.5 * police + 7 * police : l;
    if (forme === "pieds" && fini(a.hauteurPiedsCm)) {
        const lp = a.hauteurPiedsCm;
        const x0 = l + 3.5 * police;
        const r = d / 2;
        const xm = x0 + lp / 2 - d / 2; // le montant, centré sur son pied
        const tube = `M${arrondi(x0 + r)} ${arrondi(h - d)} L${arrondi(x0 + lp - r)} ${arrondi(h - d)} ` +
            `A${arrondi(r)} ${arrondi(r)} 0 0 1 ${arrondi(x0 + lp - r)} ${arrondi(h)} ` +
            `L${arrondi(x0 + r)} ${arrondi(h)} A${arrondi(r)} ${arrondi(r)} 0 0 1 ${arrondi(x0 + r)} ${arrondi(h - d)} Z`;
        const montant = `M${arrondi(xm)} ${arrondi(h - d)} L${arrondi(xm)} ${arrondi(r)} ` +
            `A${arrondi(r)} ${arrondi(r)} 0 0 1 ${arrondi(xm + d)} ${arrondi(r)} L${arrondi(xm + d)} ${arrondi(h - d)} Z`;
        profil = { contour: `${tube} ${montant}`, x: x0, largeur: lp };
        cotes.push({
            cle: "pieds", valeurCm: lp,
            x1: x0, y1: yL, x2: x0 + lp, y2: yL,
            attaches: [[x0, h + ecart, x0, yL + 0.5 * police], [x0 + lp, h + ecart, x0 + lp, yL + 0.5 * police]],
            texte: { x: x0 + lp / 2, y: yL + 1.1 * police, ancre: "middle", vertical: false },
        });
        droiteDessin = x0 + lp;
    }
    if (!colonne && profil == null) {
        /* Le texte du diamètre déborde à droite de son montant : il ne doit pas
           sortir du cadre sur une arche très étroite. */
        droiteDessin = Math.max(droiteDessin, d + 0.5 * police + 7 * police);
    }
    const marge = police * 0.8;
    const gauche = xH - 1.3 * police - marge;
    const bas = (colonne ? yD + 0.6 * police : yL + 1.5 * police) + marge;
    const haut = -marge;
    const droite = droiteDessin + marge;
    return {
        forme,
        largeur: l,
        hauteur: h,
        contour,
        sommets,
        profil,
        cotes,
        sol: { x1: gauche + marge, x2: droite - marge, y: h },
        viewBox: { x: gauche, y: haut, largeur: droite - gauche, hauteur: bas - haut },
        police,
        centreVisuel: centreVisuelArche(a),
    };
}
/**
 * Où poser un visuel unique : au milieu du BANDEAU, là où l'œil lit une arche.
 * Le centre de la boîte tomberait dans l'ouverture — du vide, que la 3D et le
 * plan ne montreraient pas. En part de la boîte (0 à 1, y vers le bas).
 */
export function centreVisuelArche(a) {
    const l = a.largeurCm, h = a.hauteurCm, d = a.profondeurCm;
    if (!fini(l) || !fini(h) || !fini(d))
        return { x: 0.5, y: 0.5 };
    if (a.forme === "demi") {
        if (l < COLONNE_MAX * d)
            return { x: 0.5, y: 0.5 };
        /* Le demi-bandeau part du pan coupé et file jusqu'au bout : son milieu. */
        const c = panCoupe("demi", l, h, d);
        return { x: (c + l) / 2 / l, y: Math.min(0.5, d / 2 / h) };
    }
    return { x: 0.5, y: Math.min(0.5, d / 2 / h) };
}
/**
 * La première pose d'un visuel déposé sur une arche — deux cas bien distincts :
 *
 *  · une MAQUETTE de toute la face (proportions voisines de l'arche) : elle la
 *    recouvre, comme le gabarit d'impression du fournisseur ;
 *  · un LOGO : posé une fois, au milieu du bandeau, assez petit pour y tenir en
 *    hauteur (80 % du boudin). « Remplir » l'aurait agrandi à toute la boîte,
 *    et l'essentiel serait tombé dans l'ouverture.
 */
export function poseInitialeArche(url, ratioImage, a) {
    const l = a.largeurCm, h = a.hauteurCm, d = a.profondeurCm;
    if (!fini(ratioImage) || !fini(l) || !fini(h) || !fini(d))
        return poseInitiale(url);
    const ratioArche = l / h;
    if (ratioImage > ratioArche * 0.75 && ratioImage < ratioArche * 1.33)
        return poseInitiale(url, "remplir");
    const plage = plageTaille("une_fois");
    const largeurLogo = 0.8 * Math.min(d, h) * ratioImage;
    const taille = Math.round((100 * largeurLogo) / l / 5) * 5;
    return { ...poseInitiale(url, "une_fois"), taille: Math.min(plage.max, Math.max(plage.min, taille)) };
}
/**
 * La face imprimée d'une arche, telle qu'elle se projette : un canevas aux
 * proportions de l'arche (largeur × hauteur hors-tout), rempli de la teinte,
 * le visuel posé par `composerPan` — la même fonction que les pans de tente.
 * La 3D et le plan coté lisent LE MÊME canevas, ils ne peuvent pas diverger.
 */
export function composerFaceArche(image, pose, a, fond) {
    return composerPan(image, pose, a.largeurCm / a.hauteurCm, fond, centreVisuelArche(a));
}
