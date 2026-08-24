import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/*
 * La scène 3D de l'écran gonflable étanche.
 *
 * Mêmes conventions que le lounge et la tente : Z vertical, modèle en
 * millimètres, fond de studio, ciel + soleil, ni tone mapping ni environnement
 * simulé. Deux écarts, tous deux dus à la nature de l'objet :
 *
 *  · UN APPOINT DE FACE. Le ciel du lounge éclaire par le haut, ce qui convient
 *    à des meubles arrondis. Un écran est un plan vertical ENTIER : il n'en
 *    reçoit que la moitié, et la toile blanche sortait grise.
 *  · UNE SILHOUETTE. Un canapé se juge à l'œil, un écran non — entre un 3 m et
 *    un 10 m, le dessin est le même à l'écran. La personne de 1,75 m est la
 *    seule chose qui donne l'échelle, et c'est la question que pose tout client.
 *
 * Le modèle est UNIQUE, quelle que soit la taille vendue : voir `ecran.ts` pour
 * le facteur et l'étirement de la jupe. Changer de taille ne recharge donc
 * rien — on réécrit des sommets déjà là.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FOND_SCENE, urlEcran, urlPersonne } from "./vue3d.js";
import { calerEcran } from "./ecran.js";
import { OutilsVue } from "./OutilsVue.js";
const MM_EN_M = 0.001;
const TAILLE_HOMME_M = 1.75;
/** Matières nommées par le convertisseur — le seul contrat avec le GLB. */
const TOILE = "toile";
const RENFORT = "renfort";
const QUINCAILLERIE = "quincaillerie";
export default function EcranViewer({ toileLargeurM, baseImageM = null, silhouette = true, captureRef, labelChargement, labelEchec, libellesOutils, }) {
    const hote = useRef(null);
    const captureInterne = useRef(null);
    const [pret, setPret] = useState(false);
    const [echec, setEchec] = useState(false);
    const outils = useRef(null);
    /* ── Mise en place : une seule fois ─────────────────────────────────── */
    useEffect(() => {
        const el = hote.current;
        if (!el)
            return;
        const sc = new THREE.Scene();
        sc.background = new THREE.Color(FOND_SCENE);
        sc.add(new THREE.HemisphereLight(0xdfe9f2, 0x20262e, 2.1));
        const soleil = new THREE.DirectionalLight(0xffffff, 1.7);
        soleil.position.set(4, -5, 8);
        const appoint = new THREE.DirectionalLight(0xffffff, 0.85);
        appoint.position.set(0, -8, 2);
        sc.add(soleil, appoint);
        const rendu = new THREE.WebGLRenderer({ antialias: true });
        rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        el.appendChild(rendu.domElement);
        const cam = new THREE.PerspectiveCamera(34, 1, 0.05, 400);
        /* Z vertical AVANT les contrôles : posé après, l'orbite reste sur Y et la
           scène bascule au premier glissement. */
        cam.up.set(0, 0, 1);
        const sol = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xe3e8ec, roughness: 0.95, metalness: 0 }));
        // Sous l'écran, posé à z=0 : évite le z-fighting sur les sangles au sol.
        sol.position.z = -0.002;
        sc.add(sol);
        const ecran = new THREE.Group();
        const homme = new THREE.Group();
        sc.add(ecran, homme);
        const orbite = new OrbitControls(cam, rendu.domElement);
        orbite.enableDamping = true;
        orbite.dampingFactor = 0.08;
        // Jamais sous le plancher : on regarde un écran, pas ses sangles par en dessous.
        orbite.maxPolarAngle = Math.PI * 0.495;
        const cadrer = (hauteurM, largeurM) => {
            /* Rayon sur la demi-diagonale, en vue de trois-quarts : le plus grand
               côté seul colle l'écran au bord dès qu'on tourne. La silhouette compte
               dans la largeur — sinon elle sort du cadre sur les petites tailles. */
            const rayon = Math.hypot(largeurM + 2.5, hauteurM) * 1.1;
            const cible = new THREE.Vector3(0, 0, hauteurM * 0.5);
            const a = THREE.MathUtils.degToRad(-26);
            const p = THREE.MathUtils.degToRad(76);
            cam.position.set(cible.x + rayon * Math.sin(p) * Math.sin(a), cible.y - rayon * Math.sin(p) * Math.cos(a), cible.z + rayon * Math.cos(p));
            cam.lookAt(cible);
            orbite.target.copy(cible);
            orbite.minDistance = rayon * 0.35;
            orbite.maxDistance = rayon * 3;
            orbite.update();
        };
        const redimensionner = () => {
            const l = el.clientWidth || 1;
            const h = el.clientHeight || 1;
            rendu.setSize(l, h, false);
            cam.aspect = l / h;
            cam.updateProjectionMatrix();
        };
        redimensionner();
        const ro = new ResizeObserver(redimensionner);
        ro.observe(el);
        let raf = 0;
        const boucle = () => {
            raf = requestAnimationFrame(boucle);
            orbite.update();
            rendu.render(sc, cam);
        };
        boucle();
        /* Capture pour la demande de devis : on redessine puis on recopie sur fond
           clair — le tampon WebGL n'est pas conservé entre deux images, et le JPEG
           ne connaît pas la transparence. Même recette que les autres scènes. */
        const prendre = () => {
            rendu.render(sc, cam);
            const c = document.createElement("canvas");
            c.width = rendu.domElement.width;
            c.height = rendu.domElement.height;
            const ctx = c.getContext("2d");
            if (!ctx)
                return null;
            ctx.fillStyle = FOND_SCENE;
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(rendu.domElement, 0, 0);
            return c.toDataURL("image/jpeg", 0.72);
        };
        captureInterne.current = prendre;
        if (captureRef)
            captureRef.current = prendre;
        let vivant = true;
        const loader = new GLTFLoader();
        const chargerEcran = loader.loadAsync(urlEcran()).then((gltf) => {
            const corps = [];
            const toiles = [];
            const renforts = [];
            gltf.scene.traverse((o) => {
                const maille = o;
                if (!maille.isMesh)
                    return;
                const mat = maille.material;
                /* De la toile, pas des volumes : le client regarde aussi l'arrière, et
                   la CAO tourne certaines normales vers l'intérieur — sans les deux
                   faces, des pans entiers disparaissent ou virent au noir. */
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
            ecran.add(gltf.scene);
            return { corps, mesures };
        });
        const chargerHomme = loader.loadAsync(urlPersonne("homme-debout")).then((gltf) => {
            /* Fichier Y-vertical : le quart de tour est sur le MODÈLE, jamais sur la
               scène — la leçon des silhouettes du lounge. */
            gltf.scene.rotation.x = Math.PI / 2;
            const b = new THREE.Box3().setFromObject(gltf.scene);
            const f = TAILLE_HOMME_M / (b.max.z - b.min.z);
            gltf.scene.scale.setScalar(f);
            gltf.scene.position.z = -b.min.z * f;
            gltf.scene.traverse((o) => {
                const maille = o;
                if (!maille.isMesh)
                    return;
                const mat = maille.material;
                mat.color = new THREE.Color(0x9fb0bd);
                mat.metalness = 0;
                mat.roughness = 1;
            });
            homme.add(gltf.scene);
        });
        void Promise.all([chargerEcran, chargerHomme.catch(() => null)])
            .then(([e]) => {
            if (!vivant)
                return;
            outils.current = { ecran, homme, corps: e.corps, mesures: e.mesures, cadrer };
            setPret(true);
        })
            .catch(() => { if (vivant)
            setEchec(true); });
        return () => {
            vivant = false;
            cancelAnimationFrame(raf);
            ro.disconnect();
            orbite.dispose();
            rendu.dispose();
            rendu.domElement.remove();
            outils.current = null;
            captureInterne.current = null;
            if (captureRef)
                captureRef.current = null;
        };
        // Monté une seule fois : la taille se rejoue plus bas, sans recharger.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    /* ── La taille : réécrite sur les mêmes sommets ─────────────────────── */
    useEffect(() => {
        const o = outils.current;
        if (!pret || !o)
            return;
        let calage;
        try {
            calage = calerEcran(o.mesures, toileLargeurM, baseImageM);
        }
        catch {
            setEchec(true);
            return;
        }
        for (const c of o.corps) {
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
        o.ecran.scale.setScalar(MM_EN_M * calage.facteur);
        const largeurM = new THREE.Box3().setFromObject(o.ecran).max.x * 2;
        o.homme.visible = silhouette;
        // Un pas de côté, et un pas en avant : de face, il masquerait la toile.
        o.homme.position.set(largeurM / 2 + 0.9, -0.4, 0);
        o.cadrer(calage.hauteurM, largeurM);
    }, [pret, toileLargeurM, baseImageM, silhouette]);
    return (
    /* Le fond du studio est peint ICI, par la scène : ce n'est pas une couleur
       de thème, et il ne suit ni le mode sombre du site ni celui du CRM. */
    _jsxs("div", { ref: hote, className: "relative w-full h-full", style: { backgroundColor: FOND_SCENE }, children: [_jsx(OutilsVue, { hote: hote, capture: () => captureInterne.current?.() ?? null, libelles: libellesOutils }), !pret && !echec && labelChargement && (_jsx("span", { className: "absolute inset-0 flex items-center justify-center text-sm text-[#2E4A5E]/70", children: labelChargement })), echec && labelEchec && (_jsx("span", { className: "absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-[#2E4A5E]/70", children: labelEchec }))] }));
}
