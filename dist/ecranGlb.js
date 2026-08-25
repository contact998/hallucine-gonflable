/*
 * Le GLB de l'écran : le charger, le mesurer, lui donner sa taille.
 *
 * Extrait d'`EcranViewer` le 25/08/2026, quand le lounge s'est mis à montrer un
 * écran lui aussi. Deux scènes chargent désormais le même fichier et lui
 * appliquent la même règle de taille ; la dupliquer aurait fait dériver l'une
 * des deux, comme la troisième liste d'écrans du CRM avait dérivé de la
 * deuxième.
 *
 * Ce fichier ne connaît ni caméra, ni lumière, ni cadrage : il rend un groupe
 * three.js prêt à poser, et une fonction pour le redimensionner sans le
 * recharger. Le modèle est UNIQUE quelle que soit la taille vendue — voir
 * `ecran.ts` pour le facteur et l'étirement de la jupe.
 */
import * as THREE from "three";
import { urlEcran } from "./vue3d.js";
import { calerEcran } from "./ecran.js";
const MM_EN_M = 0.001;
/** Matières nommées par le convertisseur — le seul contrat avec le GLB. */
const TOILE = "toile";
const RENFORT = "renfort";
const QUINCAILLERIE = "quincaillerie";
/**
 * Charge le modèle, le mesure, et rend de quoi le redimensionner.
 *
 * Les mesures sont PRISES sur le maillage, jamais écrites : une nouvelle
 * livraison Bayes ne doit pas obliger à retoucher des nombres à la main —
 * c'est ce qui avait fait dériver la tente N.
 */
export async function chargerEcranGlb(loader) {
    const gltf = await loader.loadAsync(urlEcran());
    const corps = [];
    const toiles = [];
    const renforts = [];
    gltf.scene.traverse((o) => {
        const maille = o;
        if (!maille.isMesh)
            return;
        const mat = maille.material;
        /* De la toile, pas des volumes : on regarde aussi l'arrière, et la CAO
           tourne certaines normales vers l'intérieur — sans les deux faces, des
           pans entiers disparaissent ou virent au noir. */
        mat.side = THREE.DoubleSide;
        maille.geometry.computeBoundingBox();
        const b = maille.geometry.boundingBox;
        corps.push({
            objet: maille,
            origine: Float32Array.from(maille.geometry.attributes.position.array),
            rigide: mat.name === QUINCAILLERIE,
            centreZ: (b.min.z + b.max.z) / 2,
        });
        if (mat.name === TOILE)
            toiles.push(maille);
        if (mat.name === RENFORT)
            renforts.push(maille);
    });
    if (!toiles.length || !renforts.length)
        throw new Error("modèle d'écran sans toile ni renfort");
    const boiteDes = (l) => {
        const b = new THREE.Box3();
        for (const o of l)
            b.union(new THREE.Box3().setFromObject(o));
        return b;
    };
    const bt = boiteDes(toiles);
    const mesures = {
        largeurToileMM: bt.max.x - bt.min.x,
        zSocleMM: boiteDes(renforts).max.z,
        zToileMM: bt.min.z,
        hauteurBruteMM: new THREE.Box3().setFromObject(gltf.scene).max.z,
    };
    const groupe = new THREE.Group();
    groupe.add(gltf.scene);
    return { groupe, corps, mesures };
}
/**
 * Donne sa taille à un écran déjà chargé — on réécrit des sommets déjà là,
 * rien ne se recharge.
 *
 * Lance quand la taille demandée est hors de ce que la géométrie sait rendre :
 * l'appelant décide alors quoi dire, ce fichier ne dessine pas d'à-peu-près.
 */
export function poserTaille(e, toileLargeurM, baseImageM) {
    const calage = calerEcran(e.mesures, toileLargeurM, baseImageM);
    for (const c of e.corps) {
        const attr = c.objet.geometry.attributes.position;
        const dest = attr.array;
        const src = c.origine;
        if (c.rigide) {
            const decalage = calage.etirer(c.centreZ) - c.centreZ;
            for (let i = 0; i < src.length; i += 3) {
                dest[i] = src[i];
                dest[i + 1] = src[i + 1];
                dest[i + 2] = src[i + 2] + decalage;
            }
        }
        else {
            for (let i = 0; i < src.length; i += 3) {
                dest[i] = src[i];
                dest[i + 1] = src[i + 1];
                dest[i + 2] = calage.etirer(src[i + 2]);
            }
        }
        attr.needsUpdate = true;
        c.objet.geometry.computeBoundingSphere();
    }
    e.groupe.scale.setScalar(MM_EN_M * calage.facteur);
    const boite = new THREE.Box3().setFromObject(e.groupe);
    return { hauteurM: calage.hauteurM, largeurM: boite.max.x * 2, baseM: calage.baseM };
}
