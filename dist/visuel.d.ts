import { type VisuelPose } from "./pose.js";
/**
 * Compose le pan tel qu'il sera imprimé : un canevas AUX PROPORTIONS DU PAN,
 * rempli du fond, sur lequel le visuel est posé selon le mode.
 *
 * C'est ici que tout se joue, et non dans les coordonnées de texture : dessiner
 * revient à décrire ce qu'on veut, alors que bricoler les coordonnées revient à
 * décrire comment tromper le moteur. La mosaïque et le logo centré n'auraient
 * pas de traduction honnête en répétitions d'UV.
 */
export declare function composerPan(image: HTMLImageElement, pose: VisuelPose, ratioPan: number, fond: string, 
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
/**
 * Lit le fichier choisi, le réduit à 720p et le rend en data URL prête à servir
 * de texture. Rejette avec une `ErreurVisuel` dont la cause nomme le problème,
 * pour que l'appelant affiche le bon message traduit.
 */
export declare function importerVisuel(fichier: File): Promise<string>;
export declare function chargerImage(source: string): Promise<HTMLImageElement>;
