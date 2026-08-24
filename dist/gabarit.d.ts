import * as THREE from "three";
/**
 * Rapport largeur/hauteur du gabarit d'impression d'une pièce : combien de
 * millimètres de toile vaut un pas de U, rapporté à un pas de V.
 *
 * Il se MESURE sur la géométrie, il ne se devine pas : Bayes déplie chaque
 * pièce à sa façon, et rien ne dit que U suit la largeur. Pour chaque triangle
 * on connaît ses trois points dans l'espace et leurs trois coordonnées
 * d'impression ; on en tire les deux vecteurs « un pas de U » et « un pas de
 * V » en millimètres, et on moyenne leurs longueurs sur la pièce.
 *
 * Sert à poser le visuel du client SANS le déformer : on découpe dedans le
 * rectangle qui a ces proportions-là.
 */
export declare function ratioGabarit(geo: THREE.BufferGeometry): number;
/** Quart de tour à appliquer au visuel du client, par pièce, pour qu'il se lise
 *  à l'endroit une fois debout devant.
 *
 *  Ça se règle À L'ŒIL — il n'y a pas d'autre méthode, et c'est déjà comme ça
 *  que les parois ont été redressées le 07/08. Rhino ne déplie pas un quart de
 *  toit comme une paroi : le gabarit du toit arrive tourné d'un demi-tour.
 *  Constaté sur une capture de face, visuel lisible : la paroi à l'endroit, le
 *  toit à l'envers.
 *
 *  Une pièce absente de cette table ne tourne pas. Si une livraison Bayes
 *  change un dépliage, c'est le seul endroit à retoucher — un chiffre. */
export declare const QUART_DE_TOUR: Record<string, number>;
/**
 * Où poser un visuel unique dans le gabarit : le BARYCENTRE DU TISSU, pondéré
 * par les aires — pas le centre du carré.
 *
 * Le gabarit d'un quart de toit est une ARCHE : le tissu occupe le haut, tout
 * le bas du carré est vide, et son centre est un trou. Un logo centré y tombait
 * donc dans le vide et ne s'affichait NULLE PART. « Remplir » ne le montrait pas
 * (il couvre tout), la mosaïque non plus (elle répète partout) : seul le visuel
 * posé une fois visait le néant.
 *
 * Mesuré : le tissu occupe 61 % du gabarit sur le toit, 50 % sur une paroi.
 */
export declare function centreDuTissu(geo: THREE.BufferGeometry): {
    x: number;
    y: number;
};
/**
 * Oriente une texture déjà composée aux proportions du pan : il ne reste qu'à
 * la retourner et, pour le toit, à la faire pivoter. Le cadrage, lui, s'est
 * joué au dessin (voir `composerPan`) — dessiner dit ce qu'on veut, tordre des
 * coordonnées dit comment tromper le moteur.
 *
 * MIROIR sur toutes les pièces : le dépliage du fournisseur retourne la
 * lecture. « HALLUCINE » se lisait à l'envers aussi bien sur une paroi que sur
 * le toit, et personne ne l'avait vu — les essais s'étaient faits sur des
 * PHOTOS, et une photo en miroir reste crédible ; seul un mot le dénonce.
 *
 * Le centre est à 0,5 : c'est autour de lui que tourne la rotation, et il
 * suffit à centrer sans qu'on y ajoute de décalage.
 */
export declare function orienter(tex: THREE.Texture, quarts?: number): void;
