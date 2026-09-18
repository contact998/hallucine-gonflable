/*
 * Le détourage d'un logo posé sur un fond uni.
 *
 * Neuf logos sur dix arrivent en JPEG sur fond blanc. Posé sur une toile rouge,
 * un tel fichier dessine un RECTANGLE blanc avec le logo dedans — ce que le
 * client ne veut jamais, et ce que l'atelier n'imprimera pas. L'outil de devis
 * de Bayes retire ce fond tout seul ; celui-ci fait pareil.
 *
 * La règle, volontairement prudente — un détourage raté coûte plus cher qu'un
 * détourage manqué, parce qu'il troue le visuel du client :
 *   1. le POURTOUR de l'image doit être d'une seule couleur (92 % au moins de
 *      ses pixels à portée de la couleur médiane). Une photo n'a jamais un
 *      pourtour uni : elle passe telle quelle ;
 *   2. on ne retire que le fond ATTEINT depuis le bord, de proche en proche.
 *      Le blanc À L'INTÉRIEUR d'une lettre ou d'un pictogramme reste ;
 *   3. si ce qui reste est presque vide, ou si presque rien n'est retiré, on
 *      renonce : ce n'était pas un logo sur fond uni.
 * Les pixels de lisière reçoivent une transparence partielle, couleur du fond
 * soustraite : sans ça, un liseré blanc cernerait le logo sur la toile.
 *
 * Fonction PURE sur les octets RGBA : elle se teste sans navigateur. Le canevas
 * vit dans `visuel.ts`.
 */
/** Écart de couleur (distance RGB) sous lequel un pixel « est » le fond. Assez
 *  large pour avaler le bruit d'un JPEG, assez serré pour garder un gris clair. */
export const TOLERANCE_FOND = 42;
/** Part du pourtour qui doit être à portée du fond pour qu'on ose détourer. */
const POURTOUR_UNI = 0.92;
const RIEN = { detoure: false, fond: null, part: 0 };
function mediane(histo, total) {
    let cumul = 0;
    for (let v = 0; v < 256; v++) {
        cumul += histo[v];
        if (cumul * 2 >= total)
            return v;
    }
    return 255;
}
/**
 * Retire, EN PLACE, le fond uni atteint depuis le bord. Rend ce qui a été fait.
 * Ne touche à rien quand l'image n'est pas un logo sur fond uni, ni quand elle
 * porte déjà de la transparence sur son pourtour (elle est déjà détourée).
 */
export function detourerFondUni(px, largeur, hauteur, tolerance = TOLERANCE_FOND) {
    const n = largeur * hauteur;
    if (largeur < 3 || hauteur < 3 || px.length < n * 4)
        return RIEN;
    /* Le pourtour, sans doublon aux quatre coins. */
    const bord = [];
    for (let x = 0; x < largeur; x++)
        bord.push(x, (hauteur - 1) * largeur + x);
    for (let y = 1; y < hauteur - 1; y++)
        bord.push(y * largeur, y * largeur + largeur - 1);
    const hr = new Uint32Array(256), hg = new Uint32Array(256), hb = new Uint32Array(256);
    for (const i of bord) {
        if (px[i * 4 + 3] < 250)
            return RIEN; // déjà transparent : rien à retirer
        hr[px[i * 4]]++;
        hg[px[i * 4 + 1]]++;
        hb[px[i * 4 + 2]]++;
    }
    const fond = [
        mediane(hr, bord.length), mediane(hg, bord.length), mediane(hb, bord.length),
    ];
    const t2 = tolerance * tolerance;
    const ecart2 = (i) => {
        const dr = px[i * 4] - fond[0], dg = px[i * 4 + 1] - fond[1], db = px[i * 4 + 2] - fond[2];
        return dr * dr + dg * dg + db * db;
    };
    let proches = 0;
    for (const i of bord)
        if (ecart2(i) <= t2)
            proches++;
    if (proches < bord.length * POURTOUR_UNI)
        return { ...RIEN, fond };
    /* De proche en proche depuis le bord : seul le fond qui TOUCHE le bord
       s'en va. Une file plate plutôt qu'une récursion : 1,6 million de pixels
       feraient sauter la pile. */
    const fondVu = new Uint8Array(n);
    const file = new Int32Array(n);
    let tete = 0, queue = 0;
    for (const i of bord) {
        if (!fondVu[i] && ecart2(i) <= t2) {
            fondVu[i] = 1;
            file[queue++] = i;
        }
    }
    const visiter = (v) => {
        if (!fondVu[v] && ecart2(v) <= t2) {
            fondVu[v] = 1;
            file[queue++] = v;
        }
    };
    while (tete < queue) {
        const i = file[tete++];
        const x = i % largeur;
        if (x > 0)
            visiter(i - 1);
        if (x < largeur - 1)
            visiter(i + 1);
        if (i >= largeur)
            visiter(i - largeur);
        if (i + largeur < n)
            visiter(i + largeur);
    }
    const part = queue / n;
    /* Presque tout est parti : une image vide, ou un logo trop pâle pour se
       distinguer du fond. Presque rien : le pourtour était uni par hasard. Dans
       les deux cas, mieux vaut l'image telle quelle. */
    if (part > 0.985 || part < 0.02)
        return { ...RIEN, fond, part };
    for (let i = 0; i < n; i++)
        if (fondVu[i])
            px[i * 4 + 3] = 0;
    /* La lisière : un pixel du logo qui touche le fond est un mélange des deux.
       Sa part de logo se lit en le comparant à son voisin le plus « logo » —
       celui qui s'écarte le plus du fond : à mi-chemin des deux, il est à moitié
       transparent. On retire aussi la part de fond de sa couleur, sinon un liseré
       blanc cerne le logo posé sur une toile sombre. */
    for (let i = 0; i < n; i++) {
        if (fondVu[i])
            continue;
        const x = i % largeur;
        const g = x > 0 ? i - 1 : -1, dr = x < largeur - 1 ? i + 1 : -1;
        const h = i >= largeur ? i - largeur : -1, b = i + largeur < n ? i + largeur : -1;
        const touche = (g >= 0 && fondVu[g]) || (dr >= 0 && fondVu[dr]) || (h >= 0 && fondVu[h]) || (b >= 0 && fondVu[b]);
        if (!touche)
            continue;
        const d = Math.sqrt(ecart2(i));
        let dLogo = d;
        for (const v of [g, dr, h, b])
            if (v >= 0 && !fondVu[v])
                dLogo = Math.max(dLogo, Math.sqrt(ecart2(v)));
        if (dLogo <= d)
            continue; // il est lui-même le plus « logo » : rien à adoucir
        const a = Math.max(0.15, Math.min(1, d / dLogo));
        for (let c = 0; c < 3; c++) {
            const v = (px[i * 4 + c] - (1 - a) * fond[c]) / a;
            px[i * 4 + c] = Math.max(0, Math.min(255, Math.round(v)));
        }
        px[i * 4 + 3] = Math.round(a * 255);
    }
    return { detoure: true, fond, part };
}
/** L'image porte-t-elle déjà de la transparence quelque part ? */
export function aDeLaTransparence(px) {
    for (let i = 3; i < px.length; i += 4)
        if (px[i] < 250)
            return true;
    return false;
}
