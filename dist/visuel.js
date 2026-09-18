/*
 * Import d'un visuel client pour le configurateur de tente.
 *
 * Le client pose une image par zone — toit, cache-zip, auvent, et chaque côté.
 * Sept images au lieu d'une seule : sans garde-fou, la page porterait des
 * dizaines de mégaoctets en mémoire et la capture 3D jointe au devis deviendrait
 * intransportable.
 *
 * Les règles :
 *   1. 720p au grand côté (1 280 px, 07/08/2026). C'est un APERÇU — le fichier
 *      d'impression arrive plus tard par email, à la résolution de l'atelier.
 *   2. LA TRANSPARENCE EST GARDÉE (18/09/2026). L'image était aplatie sur blanc,
 *      au motif qu'elle recouvrait tout le panneau. Faux depuis les modes « une
 *      fois » et « mosaïque » : le logo se pose SUR la teinte de la zone, et un
 *      PNG aplati dessinait un rectangle blanc au milieu d'une toile rouge.
 *      Une image transparente sort donc en PNG (1 024 px au plus, pour le
 *      poids), les autres en JPEG sur blanc, comme avant.
 *   3. LE FOND UNI D'UN LOGO EST RETIRÉ tout seul (`detourage.ts`) — c'est ce
 *      que fait l'outil de devis de l'atelier. Le client peut revenir au
 *      fichier d'origine : `importerVisuelDetaille(f, { detourer: false })`.
 *   4. Un logo transparent peut passer d'une seule couleur (`VisuelPose.recolor`)
 *      — la forme se recolore, pas un rectangle.
 */
import { plageTaille } from "./pose.js";
import { hexDeTeinte } from "./couleurs.js";
import { detourerFondUni, aDeLaTransparence } from "./detourage.js";
/** Le logo peint d'une seule couleur : sa forme (le canal alpha) remplie de la
 *  teinte. Sur une image opaque, cela donnerait un aplat — l'appelant ne le
 *  propose que sur un visuel transparent. */
function recolorer(image, hex) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, image.width);
    c.height = Math.max(1, image.height);
    const ctx = c.getContext("2d");
    ctx.drawImage(image, 0, 0, c.width, c.height);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, c.width, c.height);
    return c;
}
/** Côté le plus long du canevas de composition. Au-delà, on paie de la mémoire
 *  pour un détail que la toile 3D ne montre pas. */
const CANEVAS_MAX = 1024;
/**
 * Compose le pan tel qu'il sera imprimé : un canevas AUX PROPORTIONS DU PAN,
 * rempli du fond, sur lequel le visuel est posé selon le mode.
 *
 * C'est ici que tout se joue, et non dans les coordonnées de texture : dessiner
 * revient à décrire ce qu'on veut, alors que bricoler les coordonnées revient à
 * décrire comment tromper le moteur. La mosaïque et le logo centré n'auraient
 * pas de traduction honnête en répétitions d'UV.
 */
export function composerPan(source, pose, ratioPan, fond, 
/** Où poser un visuel unique, en part du gabarit — le barycentre du TISSU,
 *  pas le centre du carré : celui d'un quart de toit est un trou. */
centre = { x: 0.5, y: 0.5 }) {
    const largeur = ratioPan >= 1 ? CANEVAS_MAX : Math.round(CANEVAS_MAX * ratioPan);
    const hauteur = ratioPan >= 1 ? Math.round(CANEVAS_MAX / ratioPan) : CANEVAS_MAX;
    const toile = document.createElement("canvas");
    toile.width = Math.max(1, largeur);
    toile.height = Math.max(1, hauteur);
    const ctx = toile.getContext("2d");
    ctx.fillStyle = fond;
    ctx.fillRect(0, 0, toile.width, toile.height);
    const image = pose.recolor ? recolorer(source, hexDeTeinte(pose.recolor)) : source;
    const ratioImage = image.width / image.height;
    const plage = plageTaille(pose.mode);
    if (!plage) {
        /* « Remplir » : aucun réglage à lire. L'image est agrandie jusqu'à couvrir
           le pan et ce qui dépasse est coupé, au centre. C'est le mode d'un clic. */
        const echelle = Math.max(toile.width / image.width, toile.height / image.height);
        const wc = image.width * echelle, hc = image.height * echelle;
        ctx.drawImage(image, (toile.width - wc) / 2, (toile.height - hc) / 2, wc, hc);
        return toile;
    }
    const reglage = Math.min(plage.max, Math.max(plage.min, pose.taille));
    const w = (reglage / 100) * toile.width;
    const h = w / ratioImage;
    if (pose.mode === "une_fois") {
        ctx.drawImage(image, centre.x * toile.width - w / 2, centre.y * toile.height - h / 2, w, h);
        return toile;
    }
    /* Mosaïque : le motif part du CENTRE et se répète vers les bords, pour qu'un
       pan ne commence pas par un demi-logo dans un coin. */
    const nx = Math.ceil(toile.width / w / 2) + 1;
    const ny = Math.ceil(toile.height / h / 2) + 1;
    const cx = toile.width / 2, cy = toile.height / 2;
    for (let i = -nx; i <= nx; i++) {
        for (let j = -ny; j <= ny; j++) {
            ctx.drawImage(image, cx + i * w - w / 2, cy + j * h - h / 2, w, h);
        }
    }
    return toile;
}
/** Le fichier de départ, avant réduction. Une photo de téléphone moderne fait
 *  couramment 5 à 12 Mo : à 4 Mo, « déposer votre image » passait pour un
 *  bouton muet — la scène ne bougeait pas, seule une petite ligne rouge le
 *  disait (vécu par Daniel, 23/08/2026). 20 Mo se décode sans attente suspecte
 *  sur le matériel courant, et l'image est de toute façon RÉDUITE à 1 280 px
 *  puis ré-encodée en JPEG — le poids d'entrée ne survit jamais.
 *  ⚠️ Ce chiffre est AUSSI écrit dans le message d'erreur des applications
 *  (`logo_trop_lourd`, six langues côté site) : les changer ENSEMBLE. */
export const POIDS_MAX = 20 * 1024 * 1024;
/** 720p : 1 280 px sur le grand côté, quelle que soit l'orientation. */
export const COTE_MAX = 1280;
export const FORMATS = /^image\/(png|jpeg|webp|svg\+xml)$/;
export class ErreurVisuel extends Error {
    cause_;
    constructor(cause_) {
        super(cause_);
        this.cause_ = cause_;
    }
}
/** Côté maximal d'un visuel TRANSPARENT : le PNG pèse bien plus lourd que le
 *  JPEG, et un logo n'a pas besoin de 1 280 px pour se lire sur une toile. */
export const COTE_MAX_TRANSPARENT = 1024;
/** Au-delà, un PNG est réduit encore : la demande de devis emporte tous les
 *  visuels, et le serveur refuse une image de plus de 500 ko. */
const POIDS_PNG_MAX = 450_000;
function toileDe(image, facteur) {
    const toile = document.createElement("canvas");
    toile.width = Math.max(1, Math.round(image.width * facteur));
    toile.height = Math.max(1, Math.round(image.height * facteur));
    return toile;
}
/** Le PNG le plus grand qui tienne sous `POIDS_PNG_MAX`, en réduisant par
 *  paliers. Un logo passe du premier coup ; une photo détourée peut demander
 *  deux réductions. */
function pngSousPoids(toile) {
    let source = toile;
    let url = source.toDataURL("image/png");
    while (url.length * 0.75 > POIDS_PNG_MAX && Math.max(source.width, source.height) > 256) {
        const plus = toileDe(source, 0.75);
        plus.getContext("2d").drawImage(source, 0, 0, plus.width, plus.height);
        source = plus;
        url = source.toDataURL("image/png");
    }
    return url;
}
/**
 * Lit le fichier choisi, le réduit, retire le fond uni d'un logo, et rend une
 * data-URL prête à servir de texture — avec ce qui a été fait, pour que
 * l'appelant puisse le dire (« fond retiré — garder le fond »). Rejette avec
 * une `ErreurVisuel` dont la cause nomme le problème.
 */
export async function importerVisuelDetaille(fichier, { detourer = true } = {}) {
    if (!FORMATS.test(fichier.type))
        throw new ErreurVisuel("format");
    if (fichier.size > POIDS_MAX)
        throw new ErreurVisuel("poids");
    const source = await lireDataUrl(fichier);
    const image = await chargerImage(source);
    const toile = toileDe(image, Math.min(1, COTE_MAX / Math.max(image.width, image.height)));
    const ctx = toile.getContext("2d");
    if (!ctx)
        throw new ErreurVisuel("illisible");
    ctx.drawImage(image, 0, 0, toile.width, toile.height);
    let transparent = false;
    let detoure = false;
    try {
        const donnees = ctx.getImageData(0, 0, toile.width, toile.height);
        transparent = aDeLaTransparence(donnees.data);
        if (!transparent && detourer && detourerFondUni(donnees.data, toile.width, toile.height).detoure) {
            ctx.putImageData(donnees, 0, 0);
            transparent = detoure = true;
        }
    }
    catch {
        /* Canevas illisible (image « contaminée » par une origine étrangère) : on
           ne sait pas lire ses pixels, on la traite en opaque comme avant. */
    }
    if (transparent) {
        const facteur = Math.min(1, COTE_MAX_TRANSPARENT / Math.max(toile.width, toile.height));
        let finale = toile;
        if (facteur < 1) {
            finale = toileDe(toile, facteur);
            finale.getContext("2d").drawImage(toile, 0, 0, finale.width, finale.height);
        }
        return { url: pngSousPoids(finale), transparent: true, detoure };
    }
    // Le blanc d'abord : un PNG transparent aplati sur du noir donnerait une
    // toile noire là où le client attend de la toile nue.
    const plat = toileDe(toile, 1);
    const pctx = plat.getContext("2d");
    pctx.fillStyle = "#ffffff";
    pctx.fillRect(0, 0, plat.width, plat.height);
    pctx.drawImage(toile, 0, 0);
    return { url: plat.toDataURL("image/jpeg", 0.9), transparent: false, detoure: false };
}
/** La même chose, sans le compte rendu — la signature historique, que le CRM
 *  et `ListeMobilier` appellent. */
export async function importerVisuel(fichier, options) {
    return (await importerVisuelDetaille(fichier, options)).url;
}
function lireDataUrl(fichier) {
    return new Promise((resoudre, rejeter) => {
        const lecteur = new FileReader();
        lecteur.onload = () => resoudre(String(lecteur.result));
        lecteur.onerror = () => rejeter(new ErreurVisuel("illisible"));
        lecteur.readAsDataURL(fichier);
    });
}
export function chargerImage(source) {
    return new Promise((resoudre, rejeter) => {
        const img = new Image();
        img.onload = () => resoudre(img);
        img.onerror = () => rejeter(new ErreurVisuel("illisible"));
        img.src = source;
    });
}
