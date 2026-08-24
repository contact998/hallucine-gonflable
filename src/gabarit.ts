/*
 * Poser un visuel sur le GABARIT D'IMPRESSION d'une pièce — les coordonnées que
 * Bayes déplie pour son atelier, celles que portent les fichiers.
 *
 * Vit dans son propre fichier pour la même raison qu'`enrouler.ts` : le viewer
 * tente et le viewer lounge s'en servent tous les deux, et les charger l'un
 * depuis l'autre fondrait leurs paquets différés. Ces mesures étaient dans
 * `Viewer.tsx` tant qu'un seul viewer posait des visuels ; le lounge en pose
 * aussi depuis qu'il honore la portée « par pan ».
 *
 * Rien n'a changé de ces quatre-là au déménagement : mêmes calculs, mêmes
 * constantes, mêmes commentaires — ils portent des mesures faites sur les
 * fichiers du fournisseur, pas des choix qu'on refait.
 */
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
export function ratioGabarit(geo: THREE.BufferGeometry): number {
  const pos = geo.getAttribute("position");
  const uv = geo.getAttribute("uv");
  if (!pos || !uv) return 1;
  const index = geo.getIndex();
  const nb = index ? index.count : pos.count;
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  const du = new THREE.Vector3(), dv = new THREE.Vector3();
  let sommeU = 0, sommeV = 0, retenus = 0;
  // Deux cents triangles suffisent à une moyenne stable, et une paroi en
  // compte jusqu'à 12 000 : inutile de tout parcourir à chaque chargement.
  const pas = Math.max(3, Math.floor(nb / 3 / 200) * 3);
  for (let i = 0; i + 2 < nb; i += pas) {
    const a = index ? index.getX(i) : i;
    const b = index ? index.getX(i + 1) : i + 1;
    const c = index ? index.getX(i + 2) : i + 2;
    const u1 = uv.getX(b) - uv.getX(a), v1 = uv.getY(b) - uv.getY(a);
    const u2 = uv.getX(c) - uv.getX(a), v2 = uv.getY(c) - uv.getY(a);
    const det = u1 * v2 - u2 * v1;
    // Triangle dégénéré dans le dépliage : il ne dit rien sur l'échelle.
    if (Math.abs(det) < 1e-12) continue;
    p0.fromBufferAttribute(pos, a);
    p1.fromBufferAttribute(pos, b);
    p2.fromBufferAttribute(pos, c);
    e1.subVectors(p1, p0);
    e2.subVectors(p2, p0);
    du.copy(e1).multiplyScalar(v2).addScaledVector(e2, -v1).divideScalar(det);
    dv.copy(e2).multiplyScalar(u1).addScaledVector(e1, -u2).divideScalar(det);
    sommeU += du.length();
    sommeV += dv.length();
    retenus++;
  }
  if (!retenus || sommeV === 0) return 1;
  return sommeU / sommeV;
}

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
export const QUART_DE_TOUR: Record<string, number> = {
  roof: 2, // demi-tour
};

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
export function centreDuTissu(geo: THREE.BufferGeometry): { x: number; y: number } {
  const uv = geo.getAttribute("uv");
  const index = geo.getIndex();
  if (!uv) return { x: 0.5, y: 0.5 };
  const nb = index ? index.count : uv.count;
  let sx = 0, sy = 0, aire = 0;
  for (let i = 0; i + 2 < nb; i += 3) {
    const a = index ? index.getX(i) : i;
    const b = index ? index.getX(i + 1) : i + 1;
    const c = index ? index.getX(i + 2) : i + 2;
    const ax = uv.getX(a), ay = uv.getY(a);
    const bx = uv.getX(b), by = uv.getY(b);
    const cx = uv.getX(c), cy = uv.getY(c);
    // Aire du triangle dans le dépliage : un grand pan pèse plus qu'un ourlet.
    const s = Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay)) / 2;
    if (!s) continue;
    sx += ((ax + bx + cx) / 3) * s;
    sy += ((ay + by + cy) / 3) * s;
    aire += s;
  }
  return aire ? { x: sx / aire, y: sy / aire } : { x: 0.5, y: 0.5 };
}

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
export function orienter(tex: THREE.Texture, quarts = 0): void {
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.center.set(0.5, 0.5);
  tex.rotation = (quarts * Math.PI) / 2;
  tex.offset.set(0, 0);
  /* Un pas négatif parcourt le pan en sens inverse : l'image se retourne sans
     que le cadrage bouge. Vaut tant que les rotations sont des demi-tours
     (0 ou 2) ; sur un quart de tour il faudrait retourner l'autre axe, aucune
     pièce n'en demande aujourd'hui. */
  tex.repeat.set(-1, 1);
  tex.needsUpdate = true;
}
