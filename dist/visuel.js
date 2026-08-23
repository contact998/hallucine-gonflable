/*
 * Import d'un visuel client pour le configurateur de tente.
 *
 * Le client pose une image par zone — toit, cache-zip, auvent, et chaque côté.
 * Sept images au lieu d'une seule : sans garde-fou, la page porterait des
 * dizaines de mégaoctets en mémoire et la capture 3D jointe au devis deviendrait
 * intransportable.
 *
 * Deux règles, décidées le 07/08/2026 :
 *   1. 720p au grand côté (1 280 px). C'est un APERÇU — le fichier d'impression
 *      arrive plus tard par email, à la résolution de l'atelier. Inutile de
 *      promener du 4000 px dans un navigateur pour dessiner une toile de 3 m.
 *   2. Aplati sur blanc, encodé en JPEG. Le visuel recouvre tout le panneau ;
 *      la transparence n'a nulle part où se poser, et le blanc est justement la
 *      couleur de la toile nue.
 */
import { plageTaille } from "./pose.js";
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
export function composerPan(image, pose, ratioPan, fond, 
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
/**
 * Lit le fichier choisi, le réduit à 720p et le rend en data URL prête à servir
 * de texture. Rejette avec une `ErreurVisuel` dont la cause nomme le problème,
 * pour que l'appelant affiche le bon message traduit.
 */
export async function importerVisuel(fichier) {
    if (!FORMATS.test(fichier.type))
        throw new ErreurVisuel("format");
    if (fichier.size > POIDS_MAX)
        throw new ErreurVisuel("poids");
    const source = await lireDataUrl(fichier);
    const image = await chargerImage(source);
    const facteur = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
    const largeur = Math.max(1, Math.round(image.width * facteur));
    const hauteur = Math.max(1, Math.round(image.height * facteur));
    const toile = document.createElement("canvas");
    toile.width = largeur;
    toile.height = hauteur;
    const ctx = toile.getContext("2d");
    if (!ctx)
        throw new ErreurVisuel("illisible");
    // Le blanc d'abord : un PNG transparent aplati sur du noir donnerait une
    // toile noire là où le client attend de la toile nue.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, largeur, hauteur);
    ctx.drawImage(image, 0, 0, largeur, hauteur);
    return toile.toDataURL("image/jpeg", 0.9);
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
