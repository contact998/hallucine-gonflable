import { type VisuelPose } from "./pose.js";
type SourceImage = HTMLImageElement | HTMLCanvasElement;
/**
 * Compose le pan tel qu'il sera imprimé : un canevas AUX PROPORTIONS DU PAN,
 * rempli du fond, sur lequel le visuel est posé selon le mode.
 *
 * C'est ici que tout se joue, et non dans les coordonnées de texture : dessiner
 * revient à décrire ce qu'on veut, alors que bricoler les coordonnées revient à
 * décrire comment tromper le moteur. La mosaïque et le logo centré n'auraient
 * pas de traduction honnête en répétitions d'UV.
 */
export declare function composerPan(source: SourceImage, pose: VisuelPose, ratioPan: number, fond: string, 
/** Où poser un visuel unique, en part du gabarit — le barycentre du TISSU,
 *  pas le centre du carré : celui d'un quart de toit est un trou. */
centre?: {
    x: number;
    y: number;
}): HTMLCanvasElement;
/** Le fichier de départ, avant réduction. Une photo de téléphone moderne fait
 *  couramment 5 à 12 Mo : à 4 Mo, « déposer votre image » passait pour un
 *  bouton muet — la scène ne bougeait pas, seule une petite ligne rouge le
 *  disait (vécu par Daniel, 23/08/2026). 20 Mo se décode sans attente suspecte
 *  sur le matériel courant, et l'image est de toute façon RÉDUITE à 1 280 px
 *  puis ré-encodée en JPEG — le poids d'entrée ne survit jamais.
 *  ⚠️ Ce chiffre est AUSSI écrit dans le message d'erreur des applications
 *  (`logo_trop_lourd`, six langues côté site) : les changer ENSEMBLE. */
export declare const POIDS_MAX: number;
/** 720p : 1 280 px sur le grand côté, quelle que soit l'orientation. */
export declare const COTE_MAX = 1280;
export declare const FORMATS: RegExp;
export type EchecVisuel = "format" | "poids" | "illisible";
export declare class ErreurVisuel extends Error {
    readonly cause_: EchecVisuel;
    constructor(cause_: EchecVisuel);
}
/** Côté maximal d'un visuel TRANSPARENT : le PNG pèse bien plus lourd que le
 *  JPEG, et un logo n'a pas besoin de 1 280 px pour se lire sur une toile. */
export declare const COTE_MAX_TRANSPARENT = 1024;
export interface VisuelImporte {
    /** Data-URL prête à servir de texture — PNG si transparente, JPEG sinon. */
    url: string;
    /** L'image porte de la transparence, d'origine ou après détourage. */
    transparent: boolean;
    /** Le fond uni a été retiré par le détourage automatique. */
    detoure: boolean;
}
export interface OptionsImport {
    /** Retirer le fond uni d'un logo (par défaut : oui). */
    detourer?: boolean;
}
/**
 * Lit le fichier choisi, le réduit, retire le fond uni d'un logo, et rend une
 * data-URL prête à servir de texture — avec ce qui a été fait, pour que
 * l'appelant puisse le dire (« fond retiré — garder le fond »). Rejette avec
 * une `ErreurVisuel` dont la cause nomme le problème.
 */
export declare function importerVisuelDetaille(fichier: File, { detourer }?: OptionsImport): Promise<VisuelImporte>;
/** La même chose, sans le compte rendu — la signature historique, que le CRM
 *  et `ListeMobilier` appellent. */
export declare function importerVisuel(fichier: File, options?: OptionsImport): Promise<string>;
export declare function chargerImage(source: string): Promise<HTMLImageElement>;
export {};
