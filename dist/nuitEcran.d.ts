import * as THREE from "three";
export interface CadreNuit {
    /** Largeur de la toile, en mètres. */
    toileLargeurM: number;
    /** Bas et haut de l'image, en mètres au-dessus du sol. */
    baseM: number;
    hautM: number;
    /** Plan de la toile (y), en mètres. */
    toileYM: number;
}
/** Où se tient le projecteur : dans le public, assez loin pour couvrir la toile. */
export declare function positionProjecteur(c: CadreNuit): THREE.Vector3;
/** Les quatre coins de l'image, dans l'ordre bas-gauche, bas-droit, haut-droit, haut-gauche. */
export declare function coinsImage(c: CadreNuit): THREE.Vector3[];
/** La pyramide de lumière : sommet au projecteur, base sur l'image. Quatre faces. */
export declare function geometrieFaisceau(sommet: THREE.Vector3, coins: THREE.Vector3[]): THREE.BufferGeometry;
/** Un point tiré au hasard DANS la pyramide (interpolation sommet → base). */
export declare function pointDansFaisceau(sommet: THREE.Vector3, coins: THREE.Vector3[], u: number, v: number, t: number): THREE.Vector3;
export interface Nuit {
    groupe: THREE.Group;
    animer: (ms: number) => void;
    liberer: () => void;
}
export declare function creerNuit(c: CadreNuit): Nuit;
