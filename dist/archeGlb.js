/*
 * Le GLB de l'arche : le charger, le mesurer, lui donner sa taille.
 *
 * Plus simple que l'écran : aucune jupe à étirer par zone, aucune matière
 * nommée à trier — le modèle livré par Bayes est un tube nu, sans toile
 * imprimée dessus (contrairement à l'écran, la couleur ne se pose pas ici :
 * une arche gonflable se personnalise par IMPRESSION sur sa housse, hors
 * scope de cette scène tant qu'aucun habillage d'arche n'existe). Juste une
 * mise à l'échelle PAR AXE (`calerArche`), appliquée au groupe entier — jamais
 * aux sommets, puisque rien ici ne doit s'étirer différemment selon la
 * hauteur d'un point comme la jupe de l'écran.
 */
import * as THREE from "three";
import { urlArche } from "./vue3d.js";
import { calerArche } from "./arche.js";
const MM_EN_M = 0.001;
/**
 * Charge le modèle et le mesure sur sa boîte englobante — pas de matière à
 * trier, le fichier livré par Bayes est un tube nu.
 */
export async function chargerArcheGlb(loader, forme) {
    const gltf = await loader.loadAsync(urlArche(forme));
    const groupe = new THREE.Group();
    groupe.add(gltf.scene);
    groupe.traverse((o) => {
        const maille = o;
        if (!maille.isMesh)
            return;
        const mat = maille.material;
        // Les deux faces : la CAO tourne certaines normales vers l'intérieur du
        // tube, sans quoi des pans entiers disparaissent selon l'angle de vue.
        mat.side = THREE.DoubleSide;
    });
    const boite = new THREE.Box3().setFromObject(groupe);
    const taille = boite.getSize(new THREE.Vector3());
    if (!(taille.x > 0) || !(taille.y > 0) || !(taille.z > 0)) {
        throw new Error("modèle d'arche sans géométrie mesurable");
    }
    return {
        groupe,
        mesures: { largeurMM: taille.x, profondeurMM: taille.y, hauteurMM: taille.z },
    };
}
/**
 * Donne sa taille à une arche déjà chargée : trois facteurs d'échelle, un par
 * axe — pas de sommets à réécrire, contrairement à la jupe de l'écran.
 */
export function poserTailleArche(e, cible) {
    const calage = calerArche(e.mesures, cible);
    e.groupe.scale.set(MM_EN_M * calage.facteurX, MM_EN_M * calage.facteurY, MM_EN_M * calage.facteurZ);
    return { largeurM: cible.largeurM, hauteurM: cible.hauteurM, profondeurM: cible.profondeurM };
}
