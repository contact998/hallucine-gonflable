import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
 * Un côté en JONCTION fait apparaître la tente voisine. Deux régimes :
 * `tentesReliees` ≥ 2 dessine la rangée dérivée par `rangeeTentes` — n tentes
 * IDENTIQUES, habillées, jonctions intermédiaires, bouts symétriques ; sans ce
 * nombre, la voisine est un FANTÔME au socle nu — la tente d'à côté qu'on
 * compose et qu'on vend à part, sur sa propre ligne de devis.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OutilsVue } from "./OutilsVue.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { chargeurGLB } from "./chargeurGlb.js";
import { ZONES_COULEUR, ZONE_AUVENT, TEINTE_NUE, hexDeTeinte } from "./couleurs.js";
import { marquerVitre, estVitre } from "./vitre.js";
import { modele as trouverModele, rangeeTentes } from "./composition.js";
import { prochainAzimut, viser, viseeNeuve } from "./viseeCote.js";
import { vue3d, urlPiece, echelle, angleCote, pieceDeCote, pieceDemiMur, porteLisere, porteVitre, decalageVoisin } from "./vue3d.js";
import { composerPan, chargerImage } from "./visuel.js";
import { enroulerAutourDeLaTente } from "./enrouler.js";
import { ratioGabarit, centreDuTissu, QUART_DE_TOUR, orienter } from "./gabarit.js";
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
/* Vitre : détection et matière dans `vitre.ts`, partagées avec l'abri du
   lounge — une seule heuristique pour les deux scènes. */
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
/* L'enroulement « toute la tente » vit dans `enrouler.ts` : le viewer lounge
   s'en sert aussi, et importer un viewer depuis l'autre fondrait leurs
   paquets chargés en différé. */
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
export default function TenteViewer({ cotes, auvents, demiMurs, couleurs, couleursCote, visuels, visuelsCote, modele, taille, actif, labelChargement, captureRef, tentesReliees, libellesOutils }) {
    const M = trouverModele(modele);
    const VUE = vue3d(M);
    const hote = useRef(null);
    /* La capture, gardée par le composant : les outils de vue impriment la
       MÊME image que celle jointe au devis. */
    const captureInterne = useRef(null);
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
    /* La largeur du TOIT, en millimètres du modèle de base — mesurée sur la pièce
       chargée, avant toute échelle : c'est elle qui dit où poser la tente
       voisine d'une jonction. */
    const dimsToit = useRef(null);
    /* Images décodées, par data-URL : la même image posée sur plusieurs zones ne
       se relit pas, et changer de côté ne repart pas de zéro. */
    const images = useRef(new Map());
    /* Pans composés, par (image · mode · taille · fond · proportions du pan) :
       un quart de toit et une paroi n'ont pas la même forme, donc pas le même
       dessin. Recomposer à chaque image de la boucle de rendu serait ruineux. */
    const pans = useRef(new Map());
    /* Azimut caméra visé (rad) — la boucle de rendu s'en rapproche en douceur. */
    const azimut = useRef(viseeNeuve(-1.0));
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
        const loader = chargeurGLB();
        let vivant = true;
        Promise.all(VUE.socle.map((n) => charger(loader, M, n))).then((gs) => {
            if (!vivant)
                return;
            /* Le toit se mesure AVANT d'être posé dans la racine : sans parent, sa
               boîte est encore en millimètres du fichier, l'unité du décalage de la
               tente voisine. */
            const iToit = VUE.socle.indexOf("roof");
            if (iToit >= 0) {
                const t = new THREE.Box3().setFromObject(gs[iToit]).getSize(new THREE.Vector3());
                dimsToit.current = { x: t.x, y: t.y };
            }
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
            const suite = prochainAzimut(a, cur);
            if (suite !== null) {
                tournerCamera(suite);
            }
            else if (a.anime) {
                /* `prochainAzimut` vient d'éteindre l'animation : on est arrivé, et la
                   vitrine ne doit pas repartir dans la seconde. */
                derniereAction = performance.now();
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
        {
            const prendre = () => {
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
            /* La MÊME capture sert au devis et à l'impression : deux fonctions de
               rendu auraient fini par diverger sur le fond ou la qualité. */
            captureInterne.current = prendre;
            if (captureRef)
                captureRef.current = prendre;
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
        /* La mécanique vit dans `viseeCote` : le lounge présente ses côtés avec
           exactement la même, amorti et chemin court compris. */
        if (!M.cotes.includes(actif))
            return;
        viser(azimut.current, M, actif);
    }, [actif, pret]);
    /* ── La taille : le même dessin, agrandi ────────────────────────────── */
    useEffect(() => {
        const racine = racineRef.current;
        if (!racine || !pret)
            return;
        racine.scale.setScalar(MM_EN_M * echelle(M, taille));
        cadrerRef.current();
    }, [taille, pret]);
    /* ── Les parois suivent les choix — et la rangée quand il y en a une ── */
    /* Lue à part : sans ça, changer la couleur du TOIT remonterait toutes les
       parois, alors que seule la teinte d'auvent les concerne ici. */
    const teinteAuvent = couleurs[ZONE_AUVENT.cle] ?? TEINTE_NUE;
    useEffect(() => {
        const murs = parois.current;
        if (!murs || !pret)
            return;
        const loader = chargeurGLB();
        let vivant = true;
        /* `coteGeo` place la pièce, `cotePeinture` la peint et reçoit son visuel :
           les deux divergent sur UNE pièce, le mur du bout d'arrivée d'une rangée,
           posé sur le côté de la jonction mais miroir du côté opposé — teinte et
           image comprises. */
        const poser = (dans, nom, coteGeo, cotePeinture, teinte, voisin) => {
            charger(loader, M, nom).then((g) => {
                if (!vivant)
                    return;
                g.rotation.z = (VUE.angleNatif[nom] - angleCote(M, coteGeo)) * RAD;
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
                if (!voisin && coteGeo === actif) {
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
                dans.add(g);
                piecesAffichees.current.push({ nom, groupe: g, cote: cotePeinture, voisin });
                appliquerVisuels.current();
            });
        };
        murs.clear();
        piecesAffichees.current = piecesAffichees.current.filter((p) => !p.voisin && VUE.socle.includes(p.nom));
        const n = Math.max(1, Math.floor(tentesReliees ?? 1));
        const tentes = rangeeTentes(M, { cotes, auvents, demiMurs: demiMurs ?? {} }, n);
        const cotesModele = M.cotes;
        const axe = cotesModele.find((c) => cotes[c] === "jonction");
        const oppose = axe ? cotesModele[(cotesModele.indexOf(axe) + 2) % 4] : undefined;
        const dims = dimsToit.current;
        const pas = axe && dims ? decalageVoisin(M, axe, dims) : null;
        tentes.forEach((t, i) => {
            const voisin = i > 0;
            let dans = murs;
            if (voisin && pas) {
                dans = new THREE.Group();
                dans.position.set(pas.x * i, pas.y * i, 0);
                murs.add(dans);
                /* Le socle de la voisine : un clone du socle courant, teintes du
                   moment comprises — l'effet dépend des couleurs, il se refait avec
                   elles. Enregistré pour que le visuel du toit s'y pose aussi : les
                   tentes d'une rangée sont IDENTIQUES, c'est tout leur sens. */
                for (const nomSocle of VUE.socle) {
                    const s = piecesSocle.current[nomSocle];
                    if (!s)
                        continue;
                    const clone = s.clone(true);
                    dans.add(clone);
                    piecesAffichees.current.push({ nom: nomSocle, groupe: clone, voisin: true });
                }
            }
            /* Le mur du bout d'arrivée se peint comme celui du départ dont il est le
               miroir — sur la dernière tente, ce qui est posé sur l'axe se peint
               « côté opposé ». */
            const peinture = (cote) => i === tentes.length - 1 && tentes.length > 1 && cote === axe && oppose ? oppose : cote;
            for (const [cote, choix] of Object.entries(t.cotes)) {
                /* La pièce dépend du côté, pas seulement du choix : les deux pignons de
                   la N ne portent pas la même toile. */
                const nom = pieceDeCote(M, cote, choix);
                if (nom)
                    poser(dans, nom, cote, peinture(cote), couleursCote[peinture(cote)], voisin);
                /* Le demi-mur se pose SOUS le choix du côté, sur la même face et avec sa
                   teinte : c'est le bas de la même façade, pas une pièce indépendante. */
                const basNom = pieceDemiMur(M, t.demiMurs?.[cote] ?? "vide");
                if (basNom)
                    poser(dans, basNom, cote, peinture(cote), couleursCote[peinture(cote)], voisin);
                /* L'auvent porte UNE teinte pour toute la tente, pas une par côté : c'est
                   la même toile imprimée d'un seul tenant, et le prix est unique. */
                if (t.auvents[cote] && VUE.pieceAuvent)
                    poser(dans, VUE.pieceAuvent, cote, peinture(cote), teinteAuvent, voisin);
            }
        });
        /* Une seule tente et un côté en jonction : la voisine FANTÔME, socle nu,
           accolée à chaque jonction — celle qu'on compose et qu'on vend À PART.
           Elle reste blanche et hors de `piecesAffichees` : sa composition à elle
           se lit sur sa propre ligne de devis, pas sur ce dessin. */
        if (tentes.length === 1 && dims) {
            const fantomes = cotesModele.filter((c) => cotes[c] === "jonction");
            if (fantomes.length > 0) {
                Promise.all(VUE.socle.map((nm) => charger(loader, M, nm))).then((pieces) => {
                    if (!vivant)
                        return;
                    for (const c of fantomes) {
                        const d = decalageVoisin(M, c, dims);
                        const fantome = new THREE.Group();
                        fantome.position.set(d.x, d.y, 0);
                        for (const p of pieces)
                            fantome.add(p.clone(true));
                        murs.add(fantome);
                    }
                    cadrerRef.current();
                });
            }
        }
        cadrerRef.current();
        return () => { vivant = false; };
    }, [cotes, auvents, demiMurs, couleursCote, teinteAuvent, couleurs, actif, pret, tentesReliees]);
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
    return (_jsxs("div", { ref: hote, className: "relative w-full h-full min-h-[300px]", children: [_jsx(OutilsVue, { hote: hote, capture: () => captureInterne.current?.() ?? null, libelles: libellesOutils }), !pret && (_jsx("div", { className: "absolute inset-0 grid place-items-center pointer-events-none", children: _jsx("p", { className: "text-[#2E4A5E]/60 text-sm", children: labelChargement }) }))] }));
}
