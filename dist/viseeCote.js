/**
 * Présenter un côté de face — LA mécanique, pour toutes les scènes.
 *
 * Elle vivait dans `Viewer.tsx` : cliquer un côté du plan de visée y fait
 * pivoter la tente jusqu'à le présenter. Le lounge montre la même tente et
 * n'en avait rien — on cliquait « Droite », la scène ne bougeait pas.
 *
 * La recopier aurait donné deux amortis, deux seuils, deux façons de compter
 * un tour : elle sort donc ici, et les deux visualiseurs l'appellent. Aucune
 * scène ne redéfinit ce que « présenter un côté » veut dire.
 *
 * Trois fonctions pures, un état minuscule : ce fichier ne connaît ni caméra,
 * ni three.js. C'est ce qui le rend testable — un amorti qui n'arrive jamais
 * au but est un bug qu'aucune capture d'écran ne montre.
 */
import { angleCote } from "./vue3d.js";
const RAD = Math.PI / 180;
/** Part de l'écart rattrapée à chaque image. Assez lent pour qu'on voie la
 *  tente tourner, assez vif pour ne pas attendre. */
const APPROCHE = 0.12;
/** En deçà, on est arrivé : continuer ferait vibrer la caméra sans fin. */
const ARRIVE_RAD = 0.004;
export const viseeNeuve = (cible = -1.0) => ({ cible, anime: false });
/**
 * L'azimut de caméra qui présente ce côté de face.
 *
 * La caméra part du MÊME azimut que la pièce, à un quart de tour près —
 * l'écart entre le plan vu de dessus et la sphère de la caméra, rien d'autre.
 * Deux tables séparées auraient divergé au premier modèle dont la façade n'est
 * pas celle de la tente X : la N, justement.
 */
export function azimutPourCote(m, cote) {
    return (90 - angleCote(m, cote)) * RAD;
}
/** Viser ce côté, à partir de maintenant. */
export function viser(v, m, cote) {
    v.cible = azimutPourCote(m, cote);
    v.anime = true;
}
/**
 * Le prochain azimut, ou `null` quand il n'y a plus rien à faire (arrivé, ou
 * pas d'animation en cours). L'appelant pose la caméra, ce fichier ne sait pas
 * comment.
 *
 * L'écart est ramené dans [-π, π] : sans ça, viser « gauche » depuis « droite »
 * fait faire à la caméra le tour long, parfois deux fois.
 */
export function prochainAzimut(v, courant) {
    if (!v.anime)
        return null;
    let d = v.cible - courant;
    while (d > Math.PI)
        d -= 2 * Math.PI;
    while (d < -Math.PI)
        d += 2 * Math.PI;
    if (Math.abs(d) < ARRIVE_RAD) {
        v.anime = false;
        return null;
    }
    return courant + d * APPROCHE;
}
