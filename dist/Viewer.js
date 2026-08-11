import { jsx as _jsx } from "react/jsx-runtime";
/*
 * Visualiseur 3D de la tente X — montre la composition réelle des 4 côtés.
 *
 * Le fichier fournisseur livre chaque pièce montée sur UN côté précis (paroi
 * pleine à l'arrière, porte à droite, fenêtre à gauche, courbe à l'avant), toutes
 * au même rayon du centre. On amène donc n'importe quelle variante sur n'importe
 * quel côté par une simple rotation autour de l'axe vertical — aucune géométrie
 * n'est recalculée, on repose la pièce d'origine ailleurs.
 *
 * Chargé en différé (three.js ne pèse que sur cette page) et une seule fois : les
 * GLB sont mis en cache, changer de côté ne redéclenche aucun téléchargement.
 *
 * Une seule taille est modélisée (la 3 × 3) : les autres sont le même dessin mis
 * à l'échelle. C'est un visuel de vente, pas un plan — le client y lit sa
 * composition, la cote exacte est écrite à côté. Changer de taille est donc
 * instantané et ne télécharge rien.
 *
 * La jonction entre tentes n'est pas encore dans le fichier fournisseur ; le côté
 * qui la porte reste vide et la page l'annonce plutôt que de montrer autre chose.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { ZONES_COULEUR, ZONE_AUVENT, TEINTE_NUE, hexDeTeinte } from "./couleurs.js";
import { modele as trouverModele } from "./composition.js";
import { vue3d, urlPiece, echelle, angleCote, pieceDeCote, pieceDemiMur, porteLisere, porteVitre, ANGLE_COTE_DEFAUT } from "./vue3d.js";
import { composerPan, chargerImage } from "./visuel.js";
const RAD = Math.PI / 180;
const MM_EN_M = 0.001;
/* Pièces amovibles : un liseré sombre court sur leur pourtour — c'est la
   fermeture éclair qui fixe le panneau aux arches, tracée depuis les arêtes
   vives du bord. Quelles pièces en portent, et lesquelles ont une vitre à part,
   se décide sur la NATURE de la pièce et non sur son nom complet : la règle vit
   dans `vue3d.ts`, où elle se teste sans navigateur. */
/* Lignes « grasses » : WebGL plafonne les lignes natives à 1 px — trop fin pour
   lire une couture. Largeur en pixels d'écran ; la résolution est renseignée
   par le viewer à chaque redimensionnement. */
const LISERE_MAT = new LineMaterial({ color: 0x2f353d, linewidth: 2.5, worldUnits: false });
/** Toile blanche translucide — l'opacité 0,42 est celle que portait la matière
 *  « vitre » du STEP, reprise telle quelle plutôt que redevinée. */
const VITRE_MAT = new THREE.MeshStandardMaterial({
    color: 0xdfe7ec,
    transparent: true,
    opacity: 0.42,
    roughness: 0.15,
    metalness: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
});
/** Repère la vitre par la géométrie plutôt que par un indice de morceau : Bayes
 *  réordonne ses exports. La vitre est le morceau dont la boîte est la plus
 *  petite ET tient entièrement dans celle du plus grand. Si rien ne correspond
 *  — nouvel export, découpe différente — on ne marque rien : la paroi reste
 *  unie, elle ne casse pas.
 *
 *  On compare des AIRES, pas des volumes. Les panneaux de la N sont des plans
 *  d'épaisseur nulle : leur volume vaut zéro, celui de la toile comme celui de
 *  la vitre, et la comparaison ne départageait rien. L'aire de la plus grande
 *  face vaut pour les deux découpes — 697 000 contre 5 762 000 mm² sur la X,
 *  880 000 contre 4 617 000 sur la N. */
function marquerVitre(scene) {
    const mailles = [];
    scene.traverse((o) => {
        const m = o;
        if (m.isMesh)
            mailles.push(m);
    });
    if (mailles.length < 2)
        return;
    // Les boîtes se comparent dans le même repère : la scène sort du chargeur
    // sans que ses matrices aient été calculées une seule fois.
    scene.updateMatrixWorld(true);
    const boites = mailles.map((m) => {
        m.geometry.computeBoundingBox();
        return m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);
    });
    const aire = (b) => {
        const d = b.getSize(new THREE.Vector3());
        const [a, deux] = [d.x, d.y, d.z].sort((x, y) => y - x);
        return a * deux;
    };
    let iPetit = 0, iGrand = 0;
    boites.forEach((b, i) => {
        if (aire(b) < aire(boites[iPetit]))
            iPetit = i;
        if (aire(b) > aire(boites[iGrand]))
            iGrand = i;
    });
    if (iPetit === iGrand)
        return;
    // Tolérance de 20 mm : la vitre affleure la toile, ses bords coïncident.
    const grand = boites[iGrand].clone().expandByScalar(20);
    if (!grand.containsBox(boites[iPetit]))
        return;
    mailles[iPetit].userData.vitre = true;
    mailles[iPetit].material = VITRE_MAT;
}
/** La vitre ne se teint pas, ne s'imprime pas, ne s'éclaircit pas : c'est du
 *  transparent, pas de la toile. Un seul test, appelé partout où on peint. */
const estVitre = (o) => o.userData.vitre === true;
/**
 * Marque, dans une pièce du socle, les morceaux posés sur UNE face de la tente.
 *
 * Sert au cache-zip de la N : la sangle du pignon avant doit suivre la paroi de
 * ce côté — présente sous elle, absente quand le côté est ouvert. On la MARQUE
 * plutôt que de la couper : la pièce est mise en cache et partagée, et surtout
 * une sangle supprimée ne reviendrait pas quand le client repose une paroi.
 *
 * Rien n'est écrit en dur : la direction de la face vient de l'azimut du côté,
 * et le plan de la face de la boîte de la pièce elle-même. Un morceau n'est
 * marqué que si TOUS ses points sont dans ce plan à 30 mm près — les sangles
 * des longs côtés s'approchent à 1 339 mm du pignon sans y toucher, et elles ne
 * doivent jamais bouger.
 */
function marquerFace(scene, azimut, cote) {
    const dir = new THREE.Vector3(Math.sin(azimut * RAD), Math.cos(azimut * RAD), 0);
    scene.traverse((o) => {
        const maille = o;
        if (!maille.isMesh)
            return;
        const geo = maille.geometry;
        const pos = geo.getAttribute("position");
        if (!pos)
            return;
        const index = geo.getIndex();
        const nb = index ? index.count : pos.count;
        const p = new THREE.Vector3();
        let plan = -Infinity;
        for (let i = 0; i < pos.count; i++)
            plan = Math.max(plan, p.fromBufferAttribute(pos, i).dot(dir));
        const surLaFace = (i) => {
            const s = index ? index.getX(i) : i;
            return plan - p.fromBufferAttribute(pos, s).dot(dir) < 30;
        };
        /* Bayes découpe sa sangle en UN MORCEAU PAR FACE : celui du pignon avant y
           est tout entier, les autres pas du tout. On marque donc le morceau, pas
           le triangle — si un export mélangeait les faces dans un même morceau, il
           ne serait pas marqué et resterait visible, ce qui est le comportement
           d'avant, jamais une pièce à moitié effacée. */
        for (let i = 0; i < nb; i++)
            if (!surLaFace(i))
                return;
        maille.userData.cote = cote;
    });
}
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
function ratioGabarit(geo) {
    const pos = geo.getAttribute("position");
    const uv = geo.getAttribute("uv");
    if (!pos || !uv)
        return 1;
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
        if (Math.abs(det) < 1e-12)
            continue;
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
    if (!retenus || sommeV === 0)
        return 1;
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
const QUART_DE_TOUR = {
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
function centreDuTissu(geo) {
    const uv = geo.getAttribute("uv");
    const index = geo.getIndex();
    if (!uv)
        return { x: 0.5, y: 0.5 };
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
        if (!s)
            continue;
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
function orienter(tex, quarts = 0) {
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
/** Nom de fichier de la pièce → clé de zone du nuancier. Bâti depuis la source
 *  unique des zones : ajouter une zone colorable la rend imprimable d'office. */
const ZONE_PAR_PIECE = Object.fromEntries([...ZONES_COULEUR, ZONE_AUVENT].map((z) => [z.piece, z.cle]));
/**
 * Pose sur un groupe une SECONDE grille de coordonnées, projetée d'en haut :
 * chaque point de toile prend la place qu'il occupe vu du ciel, rapportée à
 * l'emprise du groupe entier.
 *
 * C'est ce qui permet une image unique sur les quatre pans du toit. On ne
 * touche pas aux gabarits d'impression du fournisseur, qui restent sur le canal
 * 0 : ils déplient chaque pan à part et ne sauraient pas raccorder une photo
 * d'un quart à l'autre. Cette grille-ci vit sur le canal 1, et la matière
 * choisit lequel lire selon le mode.
 *
 * L'atelier sait fabriquer ça : on découpe le grand visuel en quatre au moment
 * d'imprimer. C'est bien un projet réalisable, pas un effet d'écran.
 */
function projeterDuDessus(groupe) {
    const mailles = [];
    groupe.traverse((o) => {
        const m = o;
        if (m.isMesh && m.geometry.getAttribute("position"))
            mailles.push(m);
    });
    if (!mailles.length)
        return;
    // L'emprise se mesure sur TOUT le groupe : c'est ce qui raccorde les pans.
    const boite = new THREE.Box3();
    for (const m of mailles) {
        m.geometry.computeBoundingBox();
        boite.union(m.geometry.boundingBox);
    }
    const dim = boite.getSize(new THREE.Vector3());
    if (dim.x === 0 || dim.y === 0)
        return;
    for (const m of mailles) {
        if (m.geometry.getAttribute("uv1"))
            continue; // déjà posée
        const pos = m.geometry.getAttribute("position");
        const uv = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++) {
            uv[i * 2] = (pos.getX(i) - boite.min.x) / dim.x;
            /* V descend quand Y monte : la texture a son origine en haut à gauche
               (flipY = false, convention glTF), le modèle a son Y vers le fond. */
            uv[i * 2 + 1] = 1 - (pos.getY(i) - boite.min.y) / dim.y;
        }
        m.geometry.setAttribute("uv1", new THREE.BufferAttribute(uv, 2));
    }
}
/**
 * Enroule une grille autour de la tente ENTIÈRE, comme une banderole : le tour
 * devient la largeur, la hauteur reste la hauteur.
 *
 * Pourquoi pas la projection du dessus : elle est juste pour un toit, mais les
 * parois sont verticales — vues d'en haut elles se réduiraient à des traînées.
 * L'enroulement les rend parfaitement, au prix d'un SOMMET DE TOIT ÉTIRÉ,
 * comme le pôle sur un planisphère. C'est inhérent, pas un défaut d'exécution.
 *
 * Le repère est celui de la tente, pas de la pièce : c'est ce qui raccorde une
 * paroi au toit. `u` part de l'arrière (angle 0) et fait le tour ; `v` monte du
 * sol au sommet, mesuré sur la hauteur totale passée en paramètre.
 */
function enroulerAutourDeLaTente(groupe, hauteur) {
    const mailles = [];
    groupe.traverse((o) => {
        const m = o;
        if (m.isMesh && m.geometry.getAttribute("position"))
            mailles.push(m);
    });
    if (!mailles.length || hauteur <= 0)
        return;
    groupe.updateMatrixWorld(true);
    const p = new THREE.Vector3();
    for (const m of mailles) {
        /* Recalculée à chaque pose : une paroi change de côté par rotation, donc
           son enroulement change aussi. La grille du dessus, elle, ne bougeait pas. */
        const pos = m.geometry.getAttribute("position");
        const uv = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++) {
            p.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
            /* Angle depuis l'arrière, ramené dans [0,1]. Le sens suit celui des
               côtés du configurateur pour qu'une image posée « devant » y reste. */
            const angle = Math.atan2(p.x, -p.y);
            uv[i * 2] = (angle / (2 * Math.PI) + 0.5) % 1;
            uv[i * 2 + 1] = 1 - Math.min(1, Math.max(0, p.z / hauteur));
        }
        m.geometry.setAttribute("uv1", new THREE.BufferAttribute(uv, 2));
    }
}
/** Emprise au sol d'un groupe, en largeur / hauteur — les proportions dans
 *  lesquelles composer une image étalée. */
function ratioEmprise(groupe) {
    const boite = new THREE.Box3().setFromObject(groupe);
    const dim = boite.getSize(new THREE.Vector3());
    return dim.y === 0 ? 1 : dim.x / dim.y;
}
const cache = new Map();
function charger(loader, m, nom) {
    /* Clé = l'URL, pas le nom de pièce : le « roof » du Spider n'est pas celui de
       la X, et un cache par nom servirait le premier chargé aux deux. */
    const url = urlPiece(m, nom);
    let p = cache.get(url);
    if (!p) {
        p = loader.loadAsync(url).then((g) => {
            /* De la toile, pas des volumes : chaque pièce doit se voir des deux faces
               (le client regarde aussi l'intérieur), et le fichier CAO livre des
               normales tournées vers l'intérieur sur certaines parois — sans ça, la
               face extérieure est soit invisible, soit rendue noire. */
            const lignes = [];
            g.scene.traverse((o) => {
                const maille = o;
                const mat = maille.material;
                if (mat)
                    mat.side = THREE.DoubleSide;
                if (!maille.isMesh)
                    return;
                if (porteLisere(nom)) {
                    /* Seulement les grands pans de toile — pas la quincaillerie des pieds
                       d'auvent, dont les arêtes feraient du bruit. */
                    maille.geometry.computeBoundingBox();
                    const dim = maille.geometry.boundingBox.getSize(new THREE.Vector3());
                    if (Math.max(dim.x, dim.y, dim.z) > 500) {
                        const aretes = new THREE.EdgesGeometry(maille.geometry, 38);
                        const geo = new LineSegmentsGeometry().setPositions(Array.from(aretes.attributes.position.array));
                        aretes.dispose();
                        lignes.push([maille, new LineSegments2(geo, LISERE_MAT)]);
                    }
                }
            });
            lignes.forEach(([m, l]) => m.add(l));
            if (porteVitre(nom))
                marquerVitre(g.scene);
            const parCote = vue3d(m).socleParCote;
            if (parCote?.piece === nom) {
                for (const cote of parCote.cotes)
                    marquerFace(g.scene, angleCote(m, cote), cote);
            }
            return g.scene;
        });
        cache.set(url, p);
    }
    return p.then((s) => s.clone(true));
}
export default function TenteViewer({ cotes, auvents, demiMurs, couleurs, couleursCote, visuels, visuelsCote, modele, taille, actif, labelChargement, captureRef }) {
    const M = trouverModele(modele);
    const VUE = vue3d(M);
    const hote = useRef(null);
    const racineRef = useRef(null);
    const parois = useRef(null);
    const cadrerRef = useRef(() => { });
    /* Pièces du socle indexées par nom : la teinte s'y applique après coup. */
    const piecesSocle = useRef({});
    /* Toutes les pièces affichées, avec leur nom et — pour celles montées sur un
       côté — le côté qui les porte : chaque zone a son propre visuel. */
    const piecesAffichees = useRef([]);
    /* Cotes de la tente entière, mesurées au montage : l'enroulement de la
       portée « tente » s'y rapporte, et elles changent avec la taille choisie. */
    const hauteurTente = useRef(1);
    const diametreTente = useRef(1);
    /* Images décodées, par data-URL : la même image posée sur plusieurs zones ne
       se relit pas, et changer de côté ne repart pas de zéro. */
    const images = useRef(new Map());
    /* Pans composés, par (image · mode · taille · fond · proportions du pan) :
       un quart de toit et une paroi n'ont pas la même forme, donc pas le même
       dessin. Recomposer à chaque image de la boucle de rendu serait ruineux. */
    const pans = useRef(new Map());
    /* Azimut caméra visé (rad) — la boucle de rendu s'en rapproche en douceur. */
    const azimut = useRef({ cible: -1.0, anime: false });
    const [pret, setPret] = useState(false);
    /* ── Mise en place : une seule fois ─────────────────────────────────── */
    useEffect(() => {
        const el = hote.current;
        if (!el)
            return;
        const sc = new THREE.Scene();
        const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        /* Le modèle vient de la CAO : c'est Z qui est vertical, pas Y comme par défaut
           dans three.js. On le dit à la caméra AVANT de brancher l'orbite, sinon on
           tourne autour du mauvais axe et la tente s'affiche couchée. */
        cam.up.set(0, 0, 1);
        cam.position.set(5.2, -6.4, 3.4);
        const rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        rendu.setPixelRatio(Math.min(devicePixelRatio, 2));
        rendu.outputColorSpace = THREE.SRGBColorSpace;
        el.appendChild(rendu.domElement);
        rendu.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:none";
        /* Éclairage simple et FIDÈLE : ciel + soleil, rien d'autre. Les essais du
           06/08 sont REJETÉS par Daniel, ne pas y revenir : environnement simulé +
           tone mapping cinéma (teintaient la toile de jaune-gris), ombre portée au
           sol (tache qui « s'arrête à la tente »). */
        sc.add(new THREE.HemisphereLight(0xdfe9f2, 0x20262e, 2.1));
        const soleil = new THREE.DirectionalLight(0xffffff, 1.7);
        soleil.position.set(4, -5, 8);
        sc.add(soleil);
        const orbite = new OrbitControls(cam, rendu.domElement);
        orbite.enableDamping = true;
        orbite.enablePan = false;
        orbite.minDistance = 4.5;
        orbite.maxDistance = 14;
        /* La butée verticale est posée chaque image (voir boucle) : on peut baisser
           la caméra sous l'horizontale pour regarder la tente à hauteur d'homme,
           mais jamais passer sous le plancher. */
        orbite.target.set(0, 0, 1.1);
        /* Le modèle est en millimètres, la scène en mètres ; l'échelle de taille se
           multiplie par-dessus (la 3 × 3 est le dessin d'origine). */
        const racine = new THREE.Group();
        racine.scale.setScalar(MM_EN_M);
        sc.add(racine);
        racineRef.current = racine;
        const murs = new THREE.Group();
        racine.add(murs);
        parois.current = murs;
        /* Cadrage recalculé sur la tente réellement chargée : toutes les tailles
           occupent le cadre pareil (essai « la 3 × 3 paraît petite » abandonné par
           Daniel le 06/08). On recule assez pour que la boîte tienne dans les DEUX
           axes de vue — la colonne est plus haute que large, c'est l'horizontale
           qui manque. */
        const cadrer = () => {
            const boite = new THREE.Box3().setFromObject(racine);
            if (boite.isEmpty())
                return;
            const taille = boite.getSize(new THREE.Vector3());
            const centre = boite.getCenter(new THREE.Vector3());
            /* Cotes retenues pour l'enroulement de la portée « tente » : elles se
               mesurent ici, où la tente entière est déjà assemblée et mise à
               l'échelle. Le sol est à z = 0, donc la hauteur est le sommet. */
            hauteurTente.current = boite.max.z || 1;
            diametreTente.current = Math.max(taille.x, taille.y) || 1;
            /* Rayon de la sphère englobante (demi-diagonale) : vue en plongée, c'est
               elle qui borne l'encombrement à l'écran, pas le plus grand côté seul. */
            const rayon = taille.length() / 2;
            const vFov = (cam.fov * Math.PI) / 180;
            const hFov = 2 * Math.atan(Math.tan(vFov / 2) * cam.aspect);
            const recul = (rayon / Math.sin(Math.min(vFov, hFov) / 2)) * 1.12;
            /* On garde l'angle de vue en cours (côté présenté, geste du visiteur) :
               seul le recul et la cible changent. */
            const off = cam.position.clone().sub(orbite.target);
            const az = off.x || off.y ? Math.atan2(off.y, off.x) : -1.0;
            orbite.target.copy(centre);
            cam.position.copy(centre).add(new THREE.Vector3(Math.cos(az) * 0.937, Math.sin(az) * 0.937, 0.35).multiplyScalar(recul));
            orbite.minDistance = recul * 0.55;
            orbite.maxDistance = recul * 2.2;
            orbite.update();
        };
        cadrerRef.current = cadrer;
        const loader = new GLTFLoader();
        let vivant = true;
        Promise.all(VUE.socle.map((n) => charger(loader, M, n))).then((gs) => {
            if (!vivant)
                return;
            gs.forEach((g, i) => {
                racine.add(g);
                piecesSocle.current[VUE.socle[i]] = g;
                piecesAffichees.current.push({ nom: VUE.socle[i], groupe: g });
            });
            cadrer();
            setPret(true);
        });
        let raf = 0;
        const Z_SOL = 0.2; // la caméra ne descend jamais sous 20 cm du sol
        const REPOS_MS = 6000; // délai avant la rotation de vitrine
        let derniereAction = performance.now();
        const tournerCamera = (nv) => {
            const off = cam.position.clone().sub(orbite.target);
            const rH = Math.hypot(off.x, off.y);
            cam.position.set(orbite.target.x + rH * Math.cos(nv), orbite.target.y + rH * Math.sin(nv), cam.position.z);
        };
        const boucle = () => {
            raf = requestAnimationFrame(boucle);
            /* Butée verticale recalculée selon la distance : plus on est loin, moins
               on peut plonger sous l'horizontale sans crever le plancher. */
            const dist = cam.position.distanceTo(orbite.target);
            orbite.maxPolarAngle = dist > 0
                ? Math.acos(Math.max(-1, Math.min(1, (Z_SOL - orbite.target.z) / dist)))
                : Math.PI / 2;
            /* Rotation douce vers le côté actif : on rapproche l'azimut de la caméra
               de la cible à chaque image, rayon et hauteur conservés. */
            const a = azimut.current;
            const off = cam.position.clone().sub(orbite.target);
            const cur = Math.atan2(off.y, off.x);
            if (a.anime) {
                let d = a.cible - cur;
                while (d > Math.PI)
                    d -= 2 * Math.PI;
                while (d < -Math.PI)
                    d += 2 * Math.PI;
                if (Math.abs(d) < 0.004) {
                    a.anime = false;
                    derniereAction = performance.now();
                }
                else {
                    tournerCamera(cur + d * 0.12);
                }
            }
            else if (performance.now() - derniereAction > REPOS_MS) {
                /* Vitrine : au repos, la tente tourne lentement toute seule. */
                tournerCamera(cur + 0.0012);
            }
            orbite.update();
            rendu.render(sc, cam);
        };
        boucle();
        /* Capture pour la demande de devis : on redessine puis on recopie sur fond
           clair (le tampon WebGL n'est pas conservé entre deux images, et le JPEG
           ne connaît pas la transparence). */
        if (captureRef) {
            captureRef.current = () => {
                rendu.render(sc, cam);
                const c = document.createElement("canvas");
                c.width = rendu.domElement.width;
                c.height = rendu.domElement.height;
                const ctx = c.getContext("2d");
                if (!ctx)
                    return null;
                ctx.fillStyle = "#F5F8FA";
                ctx.fillRect(0, 0, c.width, c.height);
                ctx.drawImage(rendu.domElement, 0, 0);
                return c.toDataURL("image/jpeg", 0.72);
            };
        }
        orbite.addEventListener("start", () => {
            azimut.current.anime = false;
            derniereAction = performance.now();
        });
        orbite.addEventListener("end", () => {
            derniereAction = performance.now();
        });
        const redim = () => {
            const { clientWidth: w, clientHeight: h } = el;
            if (!w || !h)
                return;
            cam.aspect = w / h;
            cam.updateProjectionMatrix();
            rendu.setSize(w, h, false);
            LISERE_MAT.resolution.set(w, h);
            /* Toujours recadrer : le passage en plein écran change radicalement le
               format, et cadrer() préserve l'angle de vue du visiteur — seuls la
               distance et la cible bougent. */
            cadrer();
        };
        redim();
        const ro = new ResizeObserver(redim);
        ro.observe(el);
        return () => {
            vivant = false;
            if (captureRef)
                captureRef.current = null;
            cancelAnimationFrame(raf);
            ro.disconnect();
            orbite.dispose();
            rendu.dispose();
            el.removeChild(rendu.domElement);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    /* ── Le visuel du client, une image par zone ────────────────────────── */
    /* Chaque zone porte SON image, qui remplace sa teinte et recouvre tout son
       gabarit — ce qui dépasse est coupé par le contour de la toile. Les pièces
       livrées en plusieurs panneaux (le toit en a quatre, le cache-zip aussi)
       reçoivent l'image sur chaque panneau : c'est ainsi qu'on imprime, un
       gabarit à la fois. La structure n'a pas de coordonnées d'impression, la
       page ne lui propose donc pas de bouton image. */
    /* Le choix peut changer avant qu'une image ait fini de se décoder : on ne
       pose que ce qui appartient au dernier état demandé. */
    const generation = useRef(0);
    /** Images décodées, par data-URL : la même sert à composer plusieurs pans. */
    const imagePour = (url) => {
        const dejaLa = images.current.get(url);
        if (dejaLa)
            return Promise.resolve(dejaLa);
        return chargerImage(url).then((img) => {
            images.current.set(url, img);
            return img;
        });
    };
    const appliquerVisuels = useRef(() => { });
    useEffect(() => {
        appliquerVisuels.current = () => {
            const marque = ++generation.current;
            for (const { nom, groupe, cote } of piecesAffichees.current) {
                const zone = ZONE_PAR_PIECE[nom];
                const pose = zone ? visuels[zone] ?? null : cote ? visuelsCote[cote] ?? null : null;
                /* Le fond du pan, sous le visuel : la teinte choisie. Elle ne se voit
                   qu'en « une fois » et en mosaïque — en « remplir » l'image la couvre
                   entièrement, mais la peindre quand même ne coûte rien et évite un cas
                   particulier de plus. */
                const teinte = zone
                    ? couleurs[zone] ?? TEINTE_NUE
                    : cote
                        ? couleursCote[cote] ?? TEINTE_NUE
                        : TEINTE_NUE;
                const fond = hexDeTeinte(teinte);
                const cibles = [];
                groupe.traverse((o) => {
                    const maille = o;
                    if (!maille.isMesh || estVitre(maille))
                        return;
                    if (!maille.geometry.getAttribute("uv"))
                        return;
                    const mat = maille.material;
                    if (!mat?.color)
                        return;
                    if (!mat.__propre) {
                        const copie = mat.clone();
                        copie.__propre = true;
                        maille.material = copie;
                    }
                    cibles.push(maille);
                });
                if (!cibles.length)
                    continue;
                if (!pose) {
                    for (const maille of cibles) {
                        const mat = maille.material;
                        if (mat.map) {
                            mat.map = null;
                            // Plus de canevas pour la porter : la teinte revient sur la matière.
                            mat.color.set(fond);
                            mat.needsUpdate = true;
                        }
                    }
                    continue;
                }
                void imagePour(pose.url)
                    .then((image) => {
                    if (marque !== generation.current)
                        return;
                    /* Portée « zone » : UN seul dessin pour tous les pans, lu par la
                       grille projetée d'en haut (canal 1) plutôt que par les gabarits,
                       qui déplient chaque pan à part et ne raccorderaient rien. Les
                       trois gestes y ont droit — une mosaïque étalée court alors sans
                       rupture d'un quart à l'autre. */
                    /* Portée « tente » : l'image est enroulée autour de l'ensemble, et
                       chaque pièce n'en montre que SA part. C'est ce qui raccorde une
                       paroi au toit. Le repère est celui de la tente, donc identique
                       d'une pièce à l'autre. */
                    if (pose.portee === "tente") {
                        const hauteur = hauteurTente.current;
                        enroulerAutourDeLaTente(groupe, hauteur);
                        /* Proportions du développé : le tour de la tente sur sa hauteur.
                           Mesuré, pas deviné — il change avec la taille choisie. */
                        const ratio = (Math.PI * diametreTente.current) / hauteur;
                        const cle = `${pose.url}|tente|${pose.mode}|${pose.taille}|${fond}|${ratio.toFixed(3)}`;
                        let tex = pans.current.get(cle);
                        if (!tex) {
                            tex = new THREE.CanvasTexture(composerPan(image, pose, ratio, fond));
                            tex.colorSpace = THREE.SRGBColorSpace;
                            tex.flipY = false;
                            tex.channel = 1;
                            tex.needsUpdate = true;
                            pans.current.set(cle, tex);
                        }
                        for (const maille of cibles) {
                            const mat = maille.material;
                            mat.map = tex;
                            mat.color.setRGB(1, 1, 1);
                            mat.needsUpdate = true;
                        }
                        return;
                    }
                    if (pose.portee === "zone") {
                        projeterDuDessus(groupe);
                        const ratio = ratioEmprise(groupe);
                        const cle = `${pose.url}|zone|${pose.mode}|${pose.taille}|${fond}|${ratio.toFixed(3)}`;
                        let tex = pans.current.get(cle);
                        if (!tex) {
                            tex = new THREE.CanvasTexture(composerPan(image, pose, ratio, fond));
                            tex.colorSpace = THREE.SRGBColorSpace;
                            tex.flipY = false;
                            /* Ni miroir ni demi-tour : cette grille est la NÔTRE, posée
                               dans le bon sens dès le départ. Le miroir corrigeait le
                               dépliage du fournisseur, qui n'intervient pas ici. */
                            tex.channel = 1;
                            tex.needsUpdate = true;
                            pans.current.set(cle, tex);
                        }
                        for (const maille of cibles) {
                            const mat = maille.material;
                            mat.map = tex;
                            mat.color.setRGB(1, 1, 1); // la teinte vit dans le canevas
                            mat.needsUpdate = true;
                        }
                        return;
                    }
                    for (const maille of cibles) {
                        const geo = maille.geometry;
                        /* Le rapport du gabarit ne dépend que de la géométrie : mesuré
                           une fois, gardé sur elle. */
                        const donnees = geo.userData;
                        donnees.ratioGabarit ??= ratioGabarit(geo);
                        donnees.centreTissu ??= centreDuTissu(geo);
                        /* Le visuel se pose au barycentre du tissu — mais le canevas est
                           lu à travers le miroir (et le demi-tour du toit). On vise donc
                           le point qui, une fois retourné, tombe là où il faut. */
                        const quarts = QUART_DE_TOUR[nom] ?? 0;
                        const cible = quarts % 4 === 2
                            ? { x: donnees.centreTissu.x, y: 1 - donnees.centreTissu.y }
                            : { x: 1 - donnees.centreTissu.x, y: donnees.centreTissu.y };
                        /* Un pan par panneau : le même logo ne se pose pas pareil sur un
                           quart de toit que sur une paroi, et une mosaïque n'a pas le
                           même compte de motifs. Le canevas est mis en cache par pan. */
                        const cle = `${pose.url}|${pose.mode}|${pose.taille}|${fond}|${donnees.ratioGabarit.toFixed(3)}|${cible.x.toFixed(3)},${cible.y.toFixed(3)}`;
                        let tex = pans.current.get(cle);
                        if (!tex) {
                            tex = new THREE.CanvasTexture(composerPan(image, pose, donnees.ratioGabarit, fond, cible));
                            tex.colorSpace = THREE.SRGBColorSpace;
                            tex.flipY = false; // glTF : origine UV en haut à gauche
                            orienter(tex, QUART_DE_TOUR[nom] ?? 0);
                            pans.current.set(cle, tex);
                        }
                        const mat = maille.material;
                        mat.map = tex;
                        /* La teinte est DANS le canevas, comme fond. La laisser aussi sur
                           la matière la multiplierait par elle-même — et surtout elle
                           teinterait l'image, qui prendrait un voile de la couleur du
                           fond. La couleur doit entourer le visuel, pas le traverser. */
                        mat.color.setRGB(1, 1, 1);
                        mat.needsUpdate = true;
                    }
                })
                    .catch((err) => {
                    /* La zone reste unie plutôt que d'arrêter la page — mais on le DIT.
                       Un catch muet a coûté une heure : « une seule fois » ne montrait
                       rien, sans une ligne en console, parce que l'erreur mourait ici. */
                    console.warn(`[tente] visuel non posé sur ${nom}`, err);
                });
            }
        };
        appliquerVisuels.current();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pret, visuels, visuelsCote, couleurs, couleursCote]);
    /* ── La couleur : une teinte par zone imprimable ────────────────────── */
    useEffect(() => {
        if (!pret)
            return;
        for (const zone of ZONES_COULEUR) {
            const groupe = piecesSocle.current[zone.piece];
            if (!groupe)
                continue;
            const hex = new THREE.Color(hexDeTeinte(couleurs[zone.cle] ?? "blanc"));
            groupe.traverse((o) => {
                const maille = o;
                if (!maille.isMesh)
                    return;
                /* Le clone d'une scène three.js PARTAGE ses matières : sans copie, teinter
                   le toit d'une tente teinterait toutes les autres pièces qui s'en servent.
                   On ne copie qu'une fois, repéré par un drapeau. */
                const mat = maille.material;
                if (!mat || !mat.color)
                    return;
                /* Une pièce qui porte un visuel garde une matière NEUTRE : son canevas
                   contient déjà le fond. Repeindre par-dessus multiplierait la teinte
                   et voilerait l'image. */
                if (mat.map)
                    return;
                if (!mat.__propre) {
                    const copie = mat.clone();
                    copie.__propre = true;
                    maille.material = copie;
                }
                maille.material.color.copy(hex);
            });
        }
    }, [couleurs, pret]);
    /* ── Choisir un côté = la tente le présente de face ─────────────────── */
    useEffect(() => {
        if (!pret || !actif)
            return;
        /* La caméra part du MÊME azimut que la pièce, à un quart de tour près —
           l'écart entre le plan vu de dessus et la sphère de la caméra, rien
           d'autre. Deux tables séparées auraient divergé au premier modèle dont la
           façade n'est pas celle de la tente X : la N, justement. */
        const azimuts = VUE.angleCote ?? ANGLE_COTE_DEFAUT;
        if (!(actif in azimuts))
            return;
        azimut.current.cible = (90 - azimuts[actif]) * RAD;
        azimut.current.anime = true;
    }, [actif, pret]);
    /* ── La taille : le même dessin, agrandi ────────────────────────────── */
    useEffect(() => {
        const racine = racineRef.current;
        if (!racine || !pret)
            return;
        racine.scale.setScalar(MM_EN_M * echelle(M, taille));
        cadrerRef.current();
    }, [taille, pret]);
    /* ── Les parois suivent les choix ───────────────────────────────────── */
    /* Lue à part : sans ça, changer la couleur du TOIT remonterait toutes les
       parois, alors que seule la teinte d'auvent les concerne ici. */
    const teinteAuvent = couleurs[ZONE_AUVENT.cle] ?? TEINTE_NUE;
    useEffect(() => {
        const murs = parois.current;
        if (!murs || !pret)
            return;
        const loader = new GLTFLoader();
        let vivant = true;
        const poser = (nom, cote, teinte) => {
            charger(loader, M, nom).then((g) => {
                if (!vivant)
                    return;
                g.rotation.z = (VUE.angleNatif[nom] - angleCote(M, cote)) * RAD;
                if (teinte) {
                    const hex = new THREE.Color(hexDeTeinte(teinte));
                    g.traverse((o) => {
                        const maille = o;
                        const mat = maille.material;
                        if (!maille.isMesh || estVitre(maille) || !mat?.color)
                            return;
                        const copie = mat.clone();
                        copie.__propre = true;
                        copie.color.copy(hex);
                        maille.material = copie;
                    });
                }
                if (cote === actif) {
                    g.traverse((o) => {
                        const maille = o;
                        const mat = maille.material;
                        if (estVitre(maille) || !mat?.color)
                            return;
                        const clair = mat.clone();
                        clair.color = clair.color.clone().offsetHSL(0, 0, 0.1);
                        clair.emissive = new THREE.Color(0x2a2118);
                        maille.material = clair;
                    });
                }
                murs.add(g);
                piecesAffichees.current.push({ nom, groupe: g, cote });
                appliquerVisuels.current();
            });
        };
        murs.clear();
        piecesAffichees.current = piecesAffichees.current.filter((p) => VUE.socle.includes(p.nom));
        for (const [cote, choix] of Object.entries(cotes)) {
            /* La pièce dépend du côté, pas seulement du choix : les deux pignons de
               la N ne portent pas la même toile. */
            const nom = pieceDeCote(M, cote, choix);
            if (nom)
                poser(nom, cote, couleursCote[cote]);
            /* Le demi-mur se pose SOUS le choix du côté, sur la même face et avec sa
               teinte : c'est le bas de la même façade, pas une pièce indépendante. */
            const basNom = pieceDemiMur(M, demiMurs?.[cote] ?? "vide");
            if (basNom)
                poser(basNom, cote, couleursCote[cote]);
            /* L'auvent porte UNE teinte pour toute la tente, pas une par côté : c'est
               la même toile imprimée d'un seul tenant, et le prix est unique. */
            if (auvents[cote] && VUE.pieceAuvent)
                poser(VUE.pieceAuvent, cote, teinteAuvent);
        }
        return () => { vivant = false; };
    }, [cotes, auvents, demiMurs, couleursCote, teinteAuvent, actif, pret]);
    /* ── La sangle de zip suit le BANDEAU de son côté ────────────────────── */
    /* Dit par Bayes : la bande du pignon avant arrive avec le bandeau courbe,
       c'est elle qui porte le demi-mur. Sans bandeau, il n'y a pas de bande —
       elle restait tendue en travers de l'ouverture. Elle appartient pourtant au
       socle, chargé une fois pour toutes : d'où ce réglage de visibilité à part
       plutôt qu'un découpage, qui ne saurait pas revenir. */
    useEffect(() => {
        const parCote = VUE.socleParCote;
        if (!parCote || !pret)
            return;
        const piece = piecesSocle.current[parCote.piece];
        if (!piece)
            return;
        piece.traverse((o) => {
            const cote = o.userData.cote;
            if (cote)
                o.visible = cotes[cote] === parCote.avecChoix;
        });
    }, [cotes, pret]);
    return (_jsx("div", { ref: hote, className: "relative w-full h-full min-h-[300px]", children: !pret && (_jsx("div", { className: "absolute inset-0 grid place-items-center pointer-events-none", children: _jsx("p", { className: "text-[#2E4A5E]/60 text-sm", children: labelChargement }) })) }));
}
