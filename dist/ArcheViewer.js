import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { eclairerStudio, reculPourBoite } from "./renduStudio.js";
/*
 * La scène 3D d'UNE arche gonflable, seule, habillée — le visuel du
 * configurateur d'arche.
 *
 * Mêmes conventions que l'écran et le lounge : Z vertical, fond de studio, ciel
 * et soleil, la personne de 1,75 m pour l'échelle. Elle se tient SOUS l'arche,
 * au milieu du passage : c'est la question que pose un organisateur de course —
 * « est-ce que ça passe ? » — et la réponse que donnent les planches du
 * fournisseur.
 *
 * L'arche arrive À SA TAILLE catalogue (`calerArche`, un facteur par axe) et
 * HABILLÉE : une teinte de fond, un visuel sur la face avant, un autre — ou le
 * même — sur la face arrière. Les faces sont trouvées et projetées par
 * `archeFaces.ts` ; le dessin de chaque face est `composerFaceArche`, le même
 * canevas que le plan coté (`PlanArche`) montre. Les flancs gardent la teinte.
 *
 * Changer de taille ou d'habillage ne recharge RIEN : trois facteurs d'échelle
 * et deux textures. Changer de forme remonte la scène — mais seule la droite a
 * un modèle (`ARCHE_FORMES_MODELISEES`) : une autre forme dit « pas de 3D » par
 * `labelEchec`, et l'application montre le plan à la place.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { chargeurGLB } from "./chargeurGlb.js";
import { FOND_SCENE, urlPersonne } from "./vue3d.js";
import { archeModelisee } from "./arche.js";
import { chargerArcheGlb, poserTailleArche } from "./archeGlb.js";
import { GROUPE_ARRIERE, GROUPE_AVANT, GROUPE_FLANC, matiereArche, preparerFacesArche } from "./archeFaces.js";
import { composerFaceArche } from "./archePlan.js";
import { hexDeTeinte } from "./couleurs.js";
import { cleVisuelPose } from "./pose.js";
import { chargerImage } from "./visuel.js";
import { OutilsVue } from "./OutilsVue.js";
const TAILLE_HOMME_M = 1.75;
/* L'angle de présentation : de trois quarts, un peu au-dessus — celui de
   l'écran, qui montre la face ET l'épaisseur du boudin. La face arrière se
   présente du côté opposé, symétriquement. */
const AZIMUT_AVANT = THREE.MathUtils.degToRad(-24);
const POLAIRE = THREE.MathUtils.degToRad(78);
export default function ArcheViewer({ forme, largeurM, hauteurM, profondeurM, teinte = "blanc", visuelAvant = null, visuelArriere = null, face = "avant", silhouette = true, captureRef, labelChargement, labelEchec, labelReessayer, libellesOutils, }) {
    const hote = useRef(null);
    const captureInterne = useRef(null);
    const [pret, setPret] = useState(false);
    const [echec, setEchec] = useState(false);
    /* Relancer après un échec : un compteur qui remonte la scène. */
    const [essai, setEssai] = useState(0);
    const outils = useRef(null);
    const modelisee = archeModelisee(forme);
    /* ── Mise en place : à chaque forme, et à chaque nouvel essai ────────── */
    useEffect(() => {
        const el = hote.current;
        if (!el)
            return;
        setPret(false);
        setEchec(false);
        if (!modelisee) {
            setEchec(true);
            return;
        }
        const sc = new THREE.Scene();
        sc.background = new THREE.Color(FOND_SCENE);
        eclairerStudio(sc);
        /* L'appoint de face de l'écran, pour la même raison : une face d'arche est
           un plan vertical, le ciel ne l'éclaire qu'à moitié. Deux, un par face —
           l'arrière se regarde aussi. */
        const appoint = new THREE.DirectionalLight(0xffffff, 0.7);
        appoint.position.set(-2, -8, 3);
        const appointArriere = new THREE.DirectionalLight(0xffffff, 0.45);
        appointArriere.position.set(2, 8, 3);
        sc.add(appoint, appointArriere);
        const rendu = new THREE.WebGLRenderer({ antialias: true });
        rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        rendu.outputColorSpace = THREE.SRGBColorSpace;
        /* Taille prise du CSS, jamais des pixels — voir EcranViewer : sans ça le
           canevas s'agrandit à chaque redimensionnement. */
        rendu.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:none";
        el.appendChild(rendu.domElement);
        const cam = new THREE.PerspectiveCamera(34, 1, 0.05, 400);
        cam.up.set(0, 0, 1); // Z vertical AVANT l'orbite, sinon la scène bascule
        const sol = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xe3e8ec, roughness: 0.95, metalness: 0 }));
        sol.position.z = -0.002;
        sc.add(sol);
        const homme = new THREE.Group();
        sc.add(homme);
        const orbite = new OrbitControls(cam, rendu.domElement);
        orbite.enableDamping = true;
        orbite.dampingFactor = 0.08;
        orbite.enablePan = false;
        orbite.maxPolarAngle = Math.PI * 0.495; // jamais sous le sol
        let dernier = null;
        /* Cadrer DEPUIS l'azimut voulu, jamais tourner après coup : le recul dépend
           de la direction (leçon de l'arche du lounge, v0.58.12). */
        const cadrer = (dim, f) => {
            dernier = { dim, face: f };
            const a = f === "avant" ? AZIMUT_AVANT : Math.PI + AZIMUT_AVANT;
            const direction = new THREE.Vector3(Math.sin(POLAIRE) * Math.sin(a), -Math.sin(POLAIRE) * Math.cos(a), Math.cos(POLAIRE));
            const cible = new THREE.Vector3(0, 0, dim.hauteurM * 0.47);
            const demi = dim.largeurM / 2 + 0.3;
            const boite = new THREE.Box3(new THREE.Vector3(-demi, -dim.profondeurM, 0), new THREE.Vector3(demi, dim.profondeurM, dim.hauteurM));
            const rayon = reculPourBoite(boite, direction, cam.fov, cam.aspect);
            cam.position.copy(cible).addScaledVector(direction, rayon);
            cam.lookAt(cible);
            orbite.target.copy(cible);
            orbite.minDistance = rayon * 0.3;
            orbite.maxDistance = rayon * 3;
            orbite.update();
        };
        const redimensionner = () => {
            const l = el.clientWidth || 1;
            const h = el.clientHeight || 1;
            rendu.setSize(l, h, false);
            cam.aspect = l / h;
            cam.updateProjectionMatrix();
            if (dernier)
                cadrer(dernier.dim, dernier.face);
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
        /* La capture pour le devis : redessiner puis recopier sur fond clair — le
           tampon WebGL n'est pas conservé, et le JPEG ignore la transparence. */
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
        const flanc = matiereArche();
        const avant = matiereArche();
        const arriere = matiereArche();
        const materiaux = [];
        materiaux[GROUPE_FLANC] = flanc;
        materiaux[GROUPE_AVANT] = avant;
        materiaux[GROUPE_ARRIERE] = arriere;
        let vivant = true;
        const loader = chargeurGLB();
        const chargerArche = chargerArcheGlb(loader, forme).then((a) => {
            preparerFacesArche(a.groupe, a.mesures);
            a.groupe.traverse((o) => {
                const maille = o;
                if (maille.isMesh)
                    maille.material = materiaux;
            });
            sc.add(a.groupe);
            return a;
        });
        const chargerHomme = loader.loadAsync(urlPersonne("homme-debout")).then((gltf) => {
            /* Fichier Y-vertical : le quart de tour est sur le MODÈLE, jamais sur la scène. */
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
        void Promise.all([chargerArche, chargerHomme.catch(() => null)])
            .then(([a]) => {
            if (!vivant)
                return;
            outils.current = {
                arche: a, flanc, avant, arriere, homme, cadrer,
                anisotropie: rendu.capabilities.getMaxAnisotropy(),
            };
            setPret(true);
        })
            .catch(() => { if (vivant)
            setEchec(true); });
        return () => {
            vivant = false;
            cancelAnimationFrame(raf);
            ro.disconnect();
            orbite.dispose();
            for (const m of [flanc, avant, arriere]) {
                m.map?.dispose();
                m.dispose();
            }
            rendu.dispose();
            rendu.domElement.remove();
            outils.current = null;
            captureInterne.current = null;
            if (captureRef)
                captureRef.current = null;
        };
        // Remonté à chaque FORME (un autre fichier) et à chaque nouvel essai, jamais
        // à chaque taille ni à chaque teinte : celles-là se rejouent plus bas.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [forme, essai]);
    /* ── La taille : trois facteurs d'échelle, puis le cadrage ──────────── */
    useEffect(() => {
        const o = outils.current;
        if (!pret || !o)
            return;
        try {
            poserTailleArche(o.arche, { largeurM, hauteurM, profondeurM });
        }
        catch {
            setEchec(true);
            return;
        }
        o.homme.visible = silhouette;
        /* Au milieu du passage, un pas en retrait de la face avant : dans le plan
           de l'arche, la perspective ne fausse pas la seule comparaison qui compte. */
        o.homme.position.set(-Math.min(0.6, largeurM / 8), 0, 0);
        o.cadrer({ largeurM, hauteurM, profondeurM }, face);
    }, [pret, largeurM, hauteurM, profondeurM, silhouette, face]);
    /* ── L'habillage : la teinte et les deux faces ──────────────────────── */
    const cleAvant = visuelAvant ? cleVisuelPose(visuelAvant) : "";
    const cleArriere = visuelArriere ? cleVisuelPose(visuelArriere) : "";
    useEffect(() => {
        const o = outils.current;
        if (!pret || !o)
            return;
        const hex = hexDeTeinte(teinte);
        const cotes = { forme, largeurCm: largeurM * 100, hauteurCm: hauteurM * 100, profondeurCm: profondeurM * 100 };
        o.flanc.color.set(hex);
        let vivant = true;
        const habiller = (mat, pose, miroir) => {
            if (!pose) {
                mat.map?.dispose();
                mat.map = null;
                mat.color.set(hex);
                mat.needsUpdate = true;
                return;
            }
            /* La teinte ENTOURE le visuel dans le canevas : la matière reste
               blanche, sinon three.js multiplie les deux et voile l'image. Jusqu'à
               ce que l'image soit prête, la face garde la teinte seule. */
            chargerImage(pose.url)
                .then((img) => {
                if (!vivant)
                    return;
                const tex = new THREE.CanvasTexture(composerFaceArche(img, pose, cotes, hex));
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.anisotropy = o.anisotropie;
                /* La face arrière lit la grille en miroir (`uv1`) : vue de derrière,
                   la gauche est à droite, et le texte se lirait à l'envers. */
                if (miroir)
                    tex.channel = 1;
                mat.map?.dispose();
                mat.map = tex;
                mat.color.set(0xffffff);
                mat.needsUpdate = true;
            })
                .catch(() => {
                /* Image illisible : la face reste unie plutôt que d'arrêter la scène. */
                if (!vivant)
                    return;
                mat.map?.dispose();
                mat.map = null;
                mat.color.set(hex);
                mat.needsUpdate = true;
            });
        };
        habiller(o.avant, visuelAvant, false);
        habiller(o.arriere, visuelArriere, true);
        return () => { vivant = false; };
        // Les poses se résument à leur clé d'identité (`cleVisuelPose`).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pret, teinte, cleAvant, cleArriere, forme, largeurM, hauteurM, profondeurM]);
    return (
    /* Le fond du studio est peint ICI, par la scène : il ne suit pas le thème. */
    _jsxs("div", { ref: hote, className: "relative w-full h-full", style: { backgroundColor: FOND_SCENE }, children: [modelisee && (_jsx(OutilsVue, { hote: hote, capture: () => captureInterne.current?.() ?? null, libelles: libellesOutils })), !pret && !echec && labelChargement && (_jsx("span", { className: "absolute inset-0 flex items-center justify-center text-sm text-[#2E4A5E]/70", children: labelChargement })), echec && (labelEchec || labelReessayer) && (_jsxs("span", { className: "absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center text-sm text-[#2E4A5E]/70", children: [labelEchec, modelisee && labelReessayer && (_jsx("button", { type: "button", onClick: () => setEssai((n) => n + 1), className: "rounded-lg border border-[#2E4A5E]/30 bg-white/70 px-3 py-1.5 text-[#2E4A5E] transition-colors hover:bg-[#2E4A5E]/10", children: labelReessayer }))] }))] }));
}
