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
    /* Le fichier livré par Bayes porte son origine EN HAUT de l'arche (pieds à
       z ≈ −2,6 m, sommet à z ≈ 0) — mesuré sur le premier modèle (droite, 4 m,
       16/09/2026), pas une convention supposée. Sans ce recentrage, l'arche se
       pose la tête au sol et les pieds dessous : entièrement invisible, la
       scène ne montre rien et ne le dit pas (`Promise.allSettled` la compte
       comme réussie, elle EST chargée — juste hors champ). Centrée en X/Y,
       posée pieds au sol en Z : ce qui vaut pour l'arche droite doit valoir
       pour toute nouvelle forme livrée, quelle que soit SA convention à elle. */
    const centre = boite.getCenter(new THREE.Vector3());
    gltf.scene.position.x -= centre.x;
    gltf.scene.position.y -= centre.y;
    gltf.scene.position.z -= boite.min.z;
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
