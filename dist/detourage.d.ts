/** Écart de couleur (distance RGB) sous lequel un pixel « est » le fond. Assez
 *  large pour avaler le bruit d'un JPEG, assez serré pour garder un gris clair. */
export declare const TOLERANCE_FOND = 42;
export interface Detourage {
    /** Vrai quand le fond a été retiré — les octets ont alors été modifiés. */
    detoure: boolean;
    /** La couleur de fond reconnue, quand il y en avait une. */
    fond: [number, number, number] | null;
    /** Part de l'image devenue transparente (0 à 1). */
    part: number;
}
/**
 * Retire, EN PLACE, le fond uni atteint depuis le bord. Rend ce qui a été fait.
 * Ne touche à rien quand l'image n'est pas un logo sur fond uni, ni quand elle
 * porte déjà de la transparence sur son pourtour (elle est déjà détourée).
 */
export declare function detourerFondUni(px: Uint8ClampedArray, largeur: number, hauteur: number, tolerance?: number): Detourage;
/** L'image porte-t-elle déjà de la transparence quelque part ? */
export declare function aDeLaTransparence(px: Uint8ClampedArray): boolean;
