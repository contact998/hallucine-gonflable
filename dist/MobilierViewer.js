import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/*
 * Visualiseur 3D du lounge — plusieurs meubles gonflables dans un même sol.
 *
 * Le placement (OÙ poser chaque meuble) est déjà décidé ailleurs, par
 * `implanter()` (`@/lib/implantation`) : ce composant ne fait QUE le rendu
 * three.js d'une `Implantation` déjà calculée — il ne recalcule, ne tronque
 * ni ne filtre `implantation.meubles`. La prop reste le type `Implantation`
 * complet (jamais éclatée en `meubles`/`sol` séparés) : `nonPoses` reste donc
 * atteignable par l'appelant, qui l'a de toute façon déjà en main puisque
 * c'est lui qui a appelé `implanter()`.
 *
 * Conventions reprises TELLES QUELLES de `MobilierViewer3D.tsx` (chacune a
 * coûté une session de mise au point, voir son en-tête) :
 *  · éclairage ciel + soleil, SANS environnement simulé ni tone mapping ni
 *    ombre au sol (essais rejetés le 06/08 — teinte jaune-gris, tache
 *    d'ombre) — le sol rectangulaire ci-dessous est un MESH de repère
 *    d'échelle, pas la tache d'ombre rejetée ;
 *  · Z vertical (CAO) : `cam.up.set(0,0,1)` AVANT de créer OrbitControls ;
 *  · modèles en millimètres, mis à l'échelle 0,001 ;
 *  · cadrage sur la demi-diagonale de la boîte, butée verticale recalculée
 *    chaque image (regarder à hauteur d'homme oui, sous le sol jamais) ;
 *  · rotation de vitrine après 6 s de repos, interrompue au premier geste ;
 *  · montage différé par la page (three.js ne pèse que sur elle), jamais
 *    monté au prerender (pas de WebGL côté serveur).
 *
 * Ce qui change par rapport au viewer un-seul-produit :
 *  · un sol rectangulaire à l'échelle de `implantation.sol` ;
 *  · le cadrage embrasse toute la scène (sol + meubles), pas un objet isolé —
 *    c'est le MÊME algorithme de demi-diagonale, appliqué à la boîte englobante
 *    de `racine`, qui contient maintenant plusieurs objets plutôt qu'un seul ;
 *  · un GLB par modèle est chargé UNE fois (cache `cacheGLB`, ci-dessous — même
 *    principe que celui de `MobilierViewer3D.tsx`, dupliqué à dessein plutôt
 *    qu'importé : les deux viewers sont chargés en différé indépendamment, pas
 *    de bénéfice à partager l'instance du Map), puis CLONÉ pour chaque
 *    exemplaire posé. C'est ce qui garantit que trente exemplaires répartis
 *    sur six modèles ne déclenchent que six téléchargements : `chargerGLB`
 *    pose la promesse dans le cache de façon SYNCHRONE, avant tout `await` —
 *    deux appels concurrents pour le même slug (deux exemplaires du même
 *    canapé, chargés en parallèle) retombent donc sur la même promesse en
 *    cours, jamais sur un second `loadAsync`.
 *  · le clonage est un simple `Object3D.clone(true)` (transforms clonés,
 *    géométries/matériaux PARTAGÉS avec le gabarit en cache) — suffisant pour
 *    du mobilier gonflable statique, sans squelette. Les ressources GPU
 *    partagées ne sont donc JAMAIS libérées au démontage du composant (seuls
 *    le renderer et les contrôles le sont) : les disposer casserait le
 *    gabarit encore référencé par le cache module, pour le prochain montage.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OutilsVue } from "./OutilsVue.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { LACET_MEUBLE } from "./implantationMobilier.js";
import { habillageMobilier as habillage, HABILLAGE_MOBILIER_DEFAUT as HABILLAGE_DEFAUT } from "./mobilier.js";
import { composerPan } from "./visuel.js";
import { chargerImage } from "./visuel.js";
import { urlPiece, echelle, piecesAbri, rangeeAbri, axeRangee, decalageVoisin, porteVitre, pieceImprimable, BASE_R2 } from "./vue3d.js";
import { modele as modeleTente } from "./composition.js";
import { TEINTE_NUE, hexDeTeinte } from "./couleurs.js";
import { marquerVitre, estVitre } from "./vitre.js";
import { enroulerAutourDeLaTente } from "./enrouler.js";
/** Le gris-bleu du fond de studio. Propriété de la SCÈNE, pas des applications :
 *  il ne bascule pas en mode sombre — un canapé se regarde sur le même fond des
 *  deux côtés, sinon les couleurs ne se comparent plus. */
export const FOND_SCENE = "#eef2f5";
const MM_EN_M = 0.001;
const RAD = Math.PI / 180;
/* Cache module : survit aux montages/démontages du composant. La clé est
   l'URL, jamais un nom de pièce — le « roof » du Spider n'est pas celui de la X,
   et une clé par nom servirait le premier chargé aux deux. C'est le raisonnement
   du module tente, repris tel quel. Une entrée par fichier, jamais par
   exemplaire posé : voir l'en-tête pour la preuve qu'un seul `loadAsync` part
   par fichier, quel que soit le nombre de poses. */
const cacheGLB = new Map();
/**
 * Un matériau par teinte, gardé pour la session — même doctrine que les
 * gabarits. Cloner à chaque recomposition fuirait sur le GPU : le visiteur
 * change de couleur des dizaines de fois en composant, et rien ne dispose ces
 * clones. Neuf teintes bornent le cache une fois pour toutes.
 */
const cacheMateriau = new Map();
/**
 * Un matériau par visuel déposé. Contrairement aux teintes — neuf, bornées —
 * un visuel est unique et lourd : on garde le DERNIER par meuble et on dispose
 * le précédent, sinon chaque essai du client laisse une texture sur le GPU.
 */
const cacheVisuel = new Map();
/**
 * La housse imprimée, composée comme un pan de tente.
 *
 * `composerPan` dessine le visuel sur un canevas AUX PROPORTIONS de la surface,
 * selon le mode choisi — remplir, une seule fois, mosaïque. C'est la même
 * fonction que les toiles de tente : une housse et une toile posent le même
 * problème, et le décrire par un dessin plutôt que par des coordonnées de
 * texture est ce qui rend la mosaïque et le logo centré honnêtes.
 *
 * Ratio 1 : l'atlas UV d'un meuble est carré, contrairement à un pan de toit.
 */
function materiauVisuel(slug, pose) {
    const cle = `${pose.url.length}|${pose.mode}|${pose.taille}`;
    const deja = cacheVisuel.get(slug);
    if (deja?.cle === cle)
        return deja.mat;
    if (deja) {
        deja.mat.map?.dispose();
        deja.mat.dispose();
    }
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
    /* Le dessin demande l'image chargée : on pose le matériau tout de suite et la
       texture arrive derrière. Une image illisible laisse une housse blanche —
       jamais une scène cassée. */
    chargerImage(pose.url)
        .then((img) => {
        const tex = new THREE.CanvasTexture(composerPan(img, pose, 1, "#ffffff"));
        tex.colorSpace = THREE.SRGBColorSpace;
        mat.map = tex;
        mat.needsUpdate = true;
    })
        .catch(() => { });
    cacheVisuel.set(slug, { cle, mat });
    return mat;
}
function materiauTeinte(gabarit, cle) {
    const h = habillage(cle);
    if (h.cle === HABILLAGE_DEFAUT)
        return null; // la teinte nue EST celle du fichier
    const deja = cacheMateriau.get(h.cle);
    if (deja)
        return deja;
    /* On part du matériau du meuble pour hériter de son rendu (rugosité, absence
       de métal) : seule la couleur change, jamais l'aspect de la housse. */
    let source;
    gabarit.traverse((o) => {
        if (!source && o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial)
            source = o.material;
    });
    const m = (source ? source.clone() : new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 }));
    /* `hex` est null pour « mon visuel » : on ne connaît pas la maquette, la
       toile nue fait le fond en attendant qu'elle arrive. */
    m.color = new THREE.Color(h.hex ?? hexDeTeinte(TEINTE_NUE));
    cacheMateriau.set(h.cle, m);
    return m;
}
/* Les meubles et les silhouettes vivent sur R2, comme les pièces de tente :
   une adresse, deux lecteurs. Les servir depuis le site obligeait le CRM à s'en
   passer — donc à ne pas avoir de 3D du tout. */
export const urlMeuble = (slug) => `${BASE_R2}/mobilier/${slug}.glb`;
function chargerGLB(loader, url) {
    let p = cacheGLB.get(url);
    if (!p) {
        p = loader.loadAsync(url).then((g) => g.scene);
        /* Un échec RETIRE l'entrée : sans ça une coupure passagère — une 4G qui
           tombe pendant le chargement — empoisonnerait ce modèle pour toute la
           session, et seul un rechargement de page en sortirait. La pose se fait
           AVANT le catch pour que deux appels du même tick partagent la promesse :
           c'est la garantie « un téléchargement par modèle » et elle ne bouge pas. */
        cacheGLB.set(url, p);
        p.catch(() => cacheGLB.delete(url));
    }
    return p;
}
/**
 * L'abri, tel que `piecesAbri` le décrit : le socle toujours (toit, pieds,
 * cache-zip), et — quand la composition voyage avec l'abri — les parois,
 * demi-murs et auvents que le client a construits, tournés par la MÊME formule
 * que le viewer tente (décision du 23/08/2026 : le réalisme du lounge, c'est la
 * fidélité au produit construit, pas un décor).
 *
 * Une tente fermée cacherait le lounge : chaque pièce de côté est donc montée
 * dans son propre sous-groupe, marqué de son azimut (`azimutAbri`) et de ses
 * matières (`matsAbri`) — la boucle de rendu efface en douceur la paroi qui se
 * trouve entre la caméra et les meubles, et la repose dès qu'on tourne.
 *
 * Même convention d'unités que le mobilier : les pièces sont en millimètres, et
 * l'échelle vaut 0,001 × `echelle(modèle, taille)` — c'est exactement ce que
 * fait le viewer tente, et s'en écarter ferait diverger deux vues de la même
 * tente, ce que le module partagé existe pour empêcher.
 */
async function construireAbri(loader, a) {
    try {
        const m = modeleTente(a.modele);
        /* La RANGÉE : n tentes identiques, dérivées par `rangeeAbri` — la même
           dérivation que le viewer tente et le chiffrage du CRM. Une seule tente
           passe par le même chemin, avec une liste d'un élément. */
        const n = Math.max(1, Math.floor(a.nb ?? 1));
        const tentes = rangeeAbri(m, a.config, n);
        const charges = await Promise.all(tentes.map((t) => Promise.all(piecesAbri(m, t).map((piece) => chargerGLB(loader, urlPiece(m, piece.nom))
            .then((g) => ({ piece, corps: g.clone(true) }))
            .catch(() => null)))));
        /* Le pas entre deux tentes : la largeur du toit dans la direction de
           l'axe, mesurée sur la pièce chargée AVANT toute échelle — millimètres du
           modèle de base, l'unité de `decalageVoisin`, exactement la recette du
           viewer tente. Sans toit chargé, pas de décalage : les socles se
           superposent, mais la scène reste debout. */
        let pas = { x: 0, y: 0 };
        if (tentes.length > 1) {
            const toit = charges.flat().find((c) => c?.piece.nom === "roof");
            const axe = axeRangee(m, a.config);
            if (toit && axe) {
                const t = new THREE.Box3().setFromObject(toit.corps).getSize(new THREE.Vector3());
                pas = decalageVoisin(m, axe, { x: t.x, y: t.y });
            }
        }
        const groupe = new THREE.Group();
        /* Le traitement que le viewer tente applique à CHAQUE pièce :
            · `DoubleSide` — le fichier CAO livre des normales tournées vers
              l'intérieur sur certaines parois, et tout l'intérêt de cette vue est
              de regarder SOUS l'abri ;
            · la teinte NUE (blanc) — le code de configuration ne porte pas les
              couleurs, on dessine donc la toile telle qu'elle sort d'usine ;
            · les VITRES gardent leur matière : peintes en blanc, une fenêtre
              devient un mur — `marquerVitre` est la même heuristique que là-bas. */
        const blanc = new THREE.Color(hexDeTeinte(TEINTE_NUE));
        charges.forEach((pieces, i) => {
            /* La rangée reste CENTRÉE sur le sol du lounge, comme la tente seule :
               le sol fait n·L × P, la tente i se pose à (i − (n−1)/2) pas du centre. */
            const ci = i - (charges.length - 1) / 2;
            for (const charge of pieces) {
                if (!charge)
                    continue;
                const { piece, corps } = charge;
                if (porteVitre(piece.nom))
                    marquerVitre(corps);
                const mats = [];
                corps.traverse((o) => {
                    const mail = o;
                    const mat = mail.material;
                    if (!mat)
                        return;
                    /* Avec un visuel, chaque pièce reçoit SES coordonnées d'enroulement —
                       or `clone(true)` partage les géométries avec le cache : deux parois
                       identiques n'en ont qu'une, et la seconde écraserait les UV de la
                       première. On sépare donc la géométrie, seulement quand il le faut. */
                    if (a.visuel && mail.isMesh)
                        mail.geometry = mail.geometry.clone();
                    mail.material = mat.clone();
                    const m2 = mail.material;
                    m2.side = THREE.DoubleSide;
                    if (!estVitre(mail))
                        m2.color = blanc;
                    if (piece.azimut != null) {
                        /* Prête pour l'effacement : transparente d'office (le basculer en
                           cours de route recompilerait la matière), et son opacité PROPRE
                           mémorisée — une vitre PVC n'est pas opaque au départ, l'effacement
                           doit la moduler, pas l'écraser. */
                        m2.transparent = true;
                        m2.userData.opBase = m2.opacity;
                        mats.push(m2);
                    }
                });
                const sous = new THREE.Group();
                sous.rotation.z = piece.angle * RAD;
                /* L'offset vit sur le SOUS-GROUPE, un par pièce : la structure reste
                   PLATE, et la boucle de rendu qui efface la paroi devant la caméra
                   continue de lire `groupe.children` sans rien savoir de la rangée. */
                sous.position.set(pas.x * ci, pas.y * ci, 0);
                sous.userData.azimutAbri = piece.azimut;
                sous.userData.matsAbri = mats;
                /* La structure (pieds…) n'a pas de coordonnées d'impression : le visuel
                   du client ne se pose que sur les pièces que l'atelier sait imprimer. */
                sous.userData.imprimableAbri = pieceImprimable(m, piece.nom);
                sous.add(corps);
                groupe.add(sous);
            }
        });
        if (!groupe.children.length)
            return null;
        groupe.scale.setScalar(MM_EN_M * echelle(m, a.taille));
        if (a.visuel)
            await habillerAbri(groupe, a.visuel);
        return groupe;
    }
    catch {
        /* Modèle ou taille inconnus du module partagé : pas d'abri dessiné, et le
           lounge reste visible. Le devis, lui, ne dépend pas de cette fonction. */
        return null;
    }
}
/**
 * L'image du client sur TOUTE la tente : l'enroulement du viewer tente
 * (portée « tente »), appliqué à l'abri du lounge — l'image fait le tour de
 * l'ensemble (rangée comprise) et chaque pièce n'en montre que sa part, ce qui
 * raccorde une paroi au toit. Les vitres restent des vitres.
 *
 * Le repère est celui du groupe, centré par construction : les UV posés ici
 * survivent aux déplacements que la scène fera ensuite.
 */
async function habillerAbri(groupe, pose) {
    try {
        const image = await chargerImage(pose.url);
        groupe.updateMatrixWorld(true);
        const boite = new THREE.Box3().setFromObject(groupe);
        const dim = boite.getSize(new THREE.Vector3());
        const hauteur = boite.max.z;
        if (hauteur <= 0)
            return;
        enroulerAutourDeLaTente(groupe, hauteur);
        /* Proportions du développé : le tour sur la hauteur — mesuré, pas deviné. */
        const ratio = (Math.PI * Math.max(dim.x, dim.y)) / hauteur;
        const tex = new THREE.CanvasTexture(composerPan(image, pose, ratio, hexDeTeinte(TEINTE_NUE)));
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = false;
        tex.channel = 1;
        tex.needsUpdate = true;
        for (const sous of groupe.children) {
            if (!sous.userData.imprimableAbri)
                continue;
            sous.traverse((o) => {
                const maille = o;
                if (!maille.isMesh || estVitre(maille))
                    return;
                if (!maille.geometry.getAttribute("uv1"))
                    return;
                const mat = maille.material;
                if (!mat?.color)
                    return;
                mat.map = tex;
                /* La teinte vit dans le canevas, comme fond — la laisser sur la matière
                   voilerait l'image de blanc cassé. */
                mat.color.setRGB(1, 1, 1);
                mat.needsUpdate = true;
            });
        }
    }
    catch (err) {
        /* La tente reste unie plutôt que d'arrêter la scène — mais on le DIT. */
        console.warn("[lounge] visuel non posé sur la tente", err);
    }
}
/**
 * Une silhouette d'échelle — un corps, une tête, rien de plus.
 *
 * C'est la convention du rendu d'architecte, et elle est ici pour la même
 * raison : sans personne dans la scène, le client ne sait pas si un canapé fait
 * un mètre ou trois. On donne la MESURE, on ne raconte pas une fête — d'où
 * l'absence de visage, de bras et de couleur. Une silhouette trop détaillée
 * détournerait le regard du produit qu'on vend.
 *
 * Les cotes sont celles d'un adulte moyen : 1,70 m debout, assis l'assise à
 * 0,42 m et le sommet du crâne vers 1,25 m.
 */
const MAT_SILHOUETTE = new THREE.MeshStandardMaterial({ color: 0x9fb0bd, roughness: 0.85, metalness: 0 });
/**
 * Une silhouette — un modèle CC0 de Quaternius, chargé et cloné comme un meuble.
 *
 * Ce sont des personnages POSÉS, pas animés : ils donnent l'échelle et la vie
 * d'une scène sans coûter une animation. La licence (domaine public) est copiée
 * dans `licences/silhouettes-quaternius.txt`, ici — les modèles sont partagés,
 * leur licence doit l'être aussi. Crédit demandé par l'auteur :
 * « Background characters by Quaternius ».
 *
 * Les fichiers sont en Y-vertical, cette scène est en Z-vertical (convention
 * CAO reprise du viewer tente) : on les couche d'un quart de tour, comme les
 * capsules de la version précédente. L'échelle et le choix du modèle viennent
 * du module pur, où ils sont testés.
 */
export const urlPersonne = (fichier) => `${BASE_R2}/personnes/${fichier}.glb`;
function poserSilhouette(gabarit, p, m) {
    const g = new THREE.Group();
    const corps = gabarit.clone(true);
    /* UNE SEULE rotation sur le modèle : le basculement Y-vertical → Z-vertical.
       Le demi-tour, lui, se fait sur le GROUPE, autour de la verticale de la
       scène — et surtout pas sur le modèle. Posé ici en `rotation.y`, il pivotait
       autour d'un axe qui, une fois le modèle couché, n'est plus la verticale
       mais une horizontale : les gens se retrouvaient assis de travers, jambes
       par-dessus l'accoudoir. */
    corps.rotation.x = Math.PI / 2;
    corps.scale.setScalar(m.echelle);
    /* Fesses sur le coussin, semelles jamais sous le sol : tout est calculé
       dans le module pur, depuis les points de contact mesurés des GLB. */
    corps.position.z = p.elevationM;
    g.add(corps);
    g.position.set(p.x, p.z, 0);
    /* Après le basculement Y→Z, l'avant du fichier (+Z, les orteils) pointe déjà
       vers −y monde — la direction « rotation 0 » de la scène. Aucun demi-tour à
       ajouter : `p.rotation` EST la direction du regard. L'ancien +π retournait
       chaque assis autour de ses talons — corps entier devant le canapé, dos au
       vide — et les debout des tables ne tenaient que par un second flip inverse
       dans `personnes()`. Les deux sont morts ensemble. */
    g.rotation.z = p.rotation;
    return g;
}
/** Sol de repère : un rectangle plat, `implantation.sol` fait foi sur la taille. */
function disposerSol(mesh) {
    if (!(mesh instanceof THREE.Mesh))
        return;
    mesh.geometry.dispose();
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose());
}
/* Le sol est le SEUL objet de la scène que personne ne partage : les meubles
   sont des clones dont la géométrie appartient au gabarit gardé en cache, lui
   volontairement immortel. Une recomposition qui remplacerait le sol sans le
   disposer laisserait donc une géométrie et un matériau orphelins sur le GPU —
   à chaque meuble ajouté ou retiré, pendant toute une session d'édition. */
function construireSol(sol) {
    const geo = new THREE.PlaneGeometry(sol.largeurM, sol.profondeurM);
    const mat = new THREE.MeshStandardMaterial({ color: 0xe3e8ec, roughness: 0.95, metalness: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    // Sous le niveau des meubles (posés à z=0) : évite le z-fighting à leur base.
    mesh.position.z = -0.002;
    return mesh;
}
export default function MobilierViewer({ implantation, labelChargement, labelEchec, captureRef, abri, habillages, visuels, libellesOutils, effacerParois }) {
    const hote = useRef(null);
    /* Lu par la boucle de rendu, montée une seule fois : un ref, pas une
       dépendance d'effet — changer d'avis ne remonte pas la scène. */
    const effacerParoisRef = useRef(true);
    effacerParoisRef.current = effacerParois ?? true;
    /* La capture, gardée par le composant : les outils de vue impriment la
       MÊME image que celle jointe au devis. */
    const captureInterne = useRef(null);
    const [pret, setPret] = useState(false);
    /* Modèles qui n'ont pas pu être chargés — annoncés, jamais tus. */
    const [echecs, setEchecs] = useState(0);
    /* Posés par l'effet de mise en place, consommés par l'effet de composition. */
    const outils = useRef(null);
    const generation = useRef(0);
    /* ── Mise en place : une seule fois ─────────────────────────────────── */
    useEffect(() => {
        const el = hote.current;
        if (!el)
            return;
        const sc = new THREE.Scene();
        // Champ un peu plus large et clipping plus lointain que le viewer un
        // seul produit : une scène de plusieurs mètres de sol, pas un objet de
        // quelques dizaines de centimètres.
        const cam = new THREE.PerspectiveCamera(38, 1, 0.02, 300);
        cam.up.set(0, 0, 1); // Z vertical AVANT l'orbite, sinon tout est couché
        cam.position.set(3, -4, 2.2);
        const rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        rendu.setPixelRatio(Math.min(devicePixelRatio, 2));
        rendu.outputColorSpace = THREE.SRGBColorSpace;
        el.appendChild(rendu.domElement);
        rendu.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:none";
        sc.add(new THREE.HemisphereLight(0xdfe9f2, 0x20262e, 2.1));
        const soleil = new THREE.DirectionalLight(0xffffff, 1.7);
        soleil.position.set(4, -5, 8);
        sc.add(soleil);
        const orbite = new OrbitControls(cam, rendu.domElement);
        orbite.enableDamping = true;
        orbite.enablePan = false;
        const racine = new THREE.Group();
        sc.add(racine);
        /* Cadrage sur toute la scène (sol + meubles) : recul à la demi-diagonale
           de sa boîte englobante, pour que tout tienne dans les deux axes de vue.
           Algorithme identique à `MobilierViewer3D.tsx`, appliqué ici à une boîte
           qui contient plusieurs objets plutôt qu'un seul. */
        const cadrer = () => {
            const boite = new THREE.Box3().setFromObject(racine);
            if (boite.isEmpty())
                return;
            const taille = boite.getSize(new THREE.Vector3());
            const centre = boite.getCenter(new THREE.Vector3());
            const rayon = taille.length() / 2;
            const vFov = cam.fov * RAD;
            const hFov = 2 * Math.atan(Math.tan(vFov / 2) * cam.aspect);
            const recul = (rayon / Math.sin(Math.min(vFov, hFov) / 2)) * 1.15;
            const off = cam.position.clone().sub(orbite.target);
            const az = off.x || off.y ? Math.atan2(off.y, off.x) : -0.9;
            orbite.target.copy(centre);
            cam.position.copy(centre).add(new THREE.Vector3(Math.cos(az) * 0.92, Math.sin(az) * 0.92, 0.4).multiplyScalar(recul));
            orbite.minDistance = recul * 0.5;
            orbite.maxDistance = recul * 2.4;
            orbite.update();
        };
        const dimensionner = () => {
            const larg = el.clientWidth || 1;
            const haut = el.clientHeight || 1;
            cam.aspect = larg / haut;
            cam.updateProjectionMatrix();
            rendu.setSize(larg, haut, false);
        };
        dimensionner();
        const ro = new ResizeObserver(() => { dimensionner(); cadrer(); });
        ro.observe(el);
        /* Rotation de vitrine après 6 s sans geste ; tout geste la suspend. */
        const REPOS_MS = 6000;
        let derniereAction = performance.now();
        const reveiller = () => { derniereAction = performance.now(); };
        orbite.addEventListener("start", reveiller);
        const Z_SOL = 0.05; // la caméra ne descend jamais sous 5 cm du sol
        let raf = 0;
        const boucle = () => {
            raf = requestAnimationFrame(boucle);
            const dist = cam.position.distanceTo(orbite.target);
            orbite.maxPolarAngle = dist > 0
                ? Math.acos(Math.max(-1, Math.min(1, (Z_SOL - orbite.target.z) / dist)))
                : Math.PI / 2;
            /* La vitrine ne tourne QUE si les parois s'effacent : avec des parois
               opaques (`effacerParois={false}`), la rotation finissait toujours par
               braquer un mur — le visiteur déposait son image sur les meubles et ne
               voyait qu'une tente fermée, « rien ne se passe » (vécu par Daniel,
               24/08/2026). Une scène qui ne se laisse pas traverser du regard reste
               là où on l'a laissée. */
            if (effacerParoisRef.current && performance.now() - derniereAction > REPOS_MS) {
                const off = cam.position.clone().sub(orbite.target);
                const az = Math.atan2(off.y, off.x) + 0.0012;
                const rH = Math.hypot(off.x, off.y);
                cam.position.set(orbite.target.x + rH * Math.cos(az), orbite.target.y + rH * Math.sin(az), cam.position.z);
            }
            orbite.update();
            /* La paroi entre la caméra et le lounge s'efface, les autres restent :
               on voit SA tente construite ET son mobilier dessous, quel que soit
               l'angle. Le critère est l'azimut du côté (posé par `construireAbri`)
               contre celui de la caméra ; le fondu est amorti pour qu'une paroi ne
               claque pas en tournant. Les vitres modulent leur opacité PROPRE
               (`opBase`), jamais un 1 fixe — une vitre PVC n'est pas opaque. */
            const groupeAbri = racine.userData.abri;
            if (groupeAbri) {
                const versCam = cam.position.clone().sub(orbite.target);
                const plat = Math.hypot(versCam.x, versCam.y) || 1;
                for (const sous of groupeAbri.children) {
                    const azimut = sous.userData.azimutAbri;
                    const mats = sous.userData.matsAbri;
                    if (azimut == null || !mats?.length)
                        continue;
                    const rad = azimut * RAD;
                    const dot = (Math.sin(rad) * versCam.x + Math.cos(rad) * versCam.y) / plat;
                    /* Effacement débrayé : aucune paroi n'est « devant », toutes glissent
                       vers leur opacité propre — la tente reste entière sous tous les
                       angles. */
                    const devant = effacerParoisRef.current && dot > 0.35;
                    for (const mt of mats) {
                        const opBase = mt.userData.opBase ?? 1;
                        const cible = devant ? opBase * 0.12 : opBase;
                        mt.opacity += (cible - mt.opacity) * 0.16;
                        /* Une paroi presque pleine réécrit la profondeur (sinon les meubles
                           se voient au travers par tri) ; effacée, elle ne la bloque plus. */
                        mt.depthWrite = mt.opacity > opBase * 0.7 && opBase > 0.9;
                    }
                }
            }
            rendu.render(sc, cam);
        };
        boucle();
        /* Capture pour la demande de devis : on redessine puis on recopie sur fond
           clair — le tampon WebGL n'est pas conservé entre deux images, et le JPEG
           ne connaît pas la transparence. Même recette que le viewer tente. */
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
            /* La MÊME capture sert au devis et à l'impression. */
            captureInterne.current = prendre;
            if (captureRef)
                captureRef.current = prendre;
        }
        outils.current = { loader: new GLTFLoader(), racine, cadrer, reveiller };
        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            orbite.removeEventListener("start", reveiller);
            orbite.dispose();
            rendu.dispose();
            rendu.domElement.remove();
            outils.current = null;
            // Pas de dispose() sur les géométries/matériaux des meubles : ils sont
            // PARTAGÉS avec le gabarit en cache module (voir `cacheGLB`), qui doit
            // rester utilisable pour un prochain montage sans retélécharger.
        };
    }, []);
    /* ── Composition : un sol + un exemplaire par pose, cadrage refait ──── */
    useEffect(() => {
        const o = outils.current;
        if (!o)
            return;
        const gen = ++generation.current;
        const meubles = implantation.meubles;
        /* `allSettled`, jamais `all` : un seul modèle en échec ne doit pas emporter
           la scène entière. Avec `all`, une coupure sur un pouf laissait le client
           devant un écran de chargement éternel — sol et cinquante-neuf autres
           meubles compris — sans le moindre message. On pose ce qui est arrivé, et
           on compte ce qui manque. */
        /* L'abri se charge EN MÊME TEMPS que les meubles, et son échec ne compte
           pas comme un meuble manquant : une tente qui ne se dessine pas n'enlève
           rien au lounge, et son prix est au panier de toute façon. */
        const abriPromis = abri ? construireAbri(o.loader, abri) : Promise.resolve(null);
        /* Les gens : un chargement par FICHIER, pas par personne — deux hommes
           assis partagent le même gabarit, comme deux canapés identiques. */
        const gens = implantation.personnes ?? [];
        const silhouettesPromises = Promise.all(gens.map((pose, i) => {
            const modele = pose.modele;
            return chargerGLB(o.loader, urlPersonne(modele.fichier))
                .then((gabarit) => ({ pose, modele, gabarit }))
                .catch(() => null);
        })).then((r) => r.filter((x) => x !== null));
        Promise.all([
            Promise.allSettled(meubles.map((pose) => chargerGLB(o.loader, urlMeuble(pose.slug)).then((gabarit) => ({ pose, gabarit })))),
            abriPromis,
            silhouettesPromises,
        ]).then(([resultats, groupeAbri, silhouettes]) => {
            const encore = outils.current;
            /* Une réponse en retard (implantation changée entre-temps) ne doit pas
               écraser la dernière composition demandée. */
            if (!encore || generation.current !== gen)
                return;
            const poses = resultats
                .filter((r) => r.status === "fulfilled")
                .map((r) => r.value);
            setEchecs(resultats.length - poses.length);
            disposerSol(encore.racine.children.find((c) => c instanceof THREE.Mesh) ?? null);
            encore.racine.clear();
            encore.racine.add(construireSol(implantation.sol));
            for (const { pose, gabarit } of poses) {
                // Support en mètres (position/rotation de la pose), le gabarit
                // cloné reste en millimètres : la mise à l'échelle 0,001 vit sur ce
                // support, pas sur `racine`, puisque chaque meuble a sa propre pose.
                const support = new THREE.Group();
                support.position.set(pose.x, pose.z, 0);
                support.rotation.z = pose.rotation;
                support.scale.setScalar(MM_EN_M);
                const corps = gabarit.clone(true);
                /* Le quart de tour correctif vit sur le CLONE : la pose du meuble reste
                   celle du moteur, la géométrie du fichier vient s'y aligner. */
                corps.rotation.z = LACET_MEUBLE[pose.slug] ?? 0;
                /* La teinte du client, posée sur le clone : le gabarit en cache garde la
                   sienne pour le meuble suivant. */
                const cle = habillages?.[pose.slug] ?? HABILLAGE_DEFAUT;
                const visuel = habillage(cle).perso ? visuels?.[pose.slug] : undefined;
                /* Le visuel prime sur la teinte : c'est ce que le client verra imprimé.
                   Les GLB du mobilier portent tous leurs UV, la housse se couvre donc
                   vraiment — ce n'est pas un aplat de couleur moyenne. */
                const mat = visuel ? materiauVisuel(pose.slug, visuel) : materiauTeinte(gabarit, cle);
                if (mat)
                    corps.traverse((o) => { if (o instanceof THREE.Mesh)
                        o.material = mat; });
                support.add(corps);
                encore.racine.add(support);
            }
            /* Les silhouettes se déduisent des meubles RÉELLEMENT posés — jamais du
               panier : on ne dessine pas quelqu'un assis sur un canapé qui n'a pas
               trouvé sa place. Elles arrivent avec les gabarits déjà chargés ; une
               qui manque ne prive la scène ni de son mobilier ni de son abri. */
            for (const { pose, modele, gabarit } of silhouettes) {
                encore.racine.add(poserSilhouette(gabarit, pose, modele));
            }
            /* L'abri APRÈS les meubles : il englobe la scène, et le cadrage doit le
               prendre en compte — sinon la caméra serre sur le mobilier et coupe le
               toit. Référencé sur la racine : c'est là que la boucle de rendu vient
               chercher les parois à effacer devant la caméra. */
            if (groupeAbri)
                encore.racine.add(groupeAbri);
            encore.racine.userData.abri = groupeAbri ?? null;
            encore.cadrer();
            encore.reveiller();
            setPret(true);
        });
    }, [implantation, abri, habillages, visuels]);
    return (
    /* Le fond du studio est peint ICI, par la scène. Il était écrit en dur dans
       chaque page qui la montait — trois fois, dans deux dépôts — et le cliquet
       hex-inline du CRM le refusait à juste titre. Ce n'est pas une couleur de
       thème : c'est le gris-bleu du fond de prise de vue, il ne suit ni le mode
       sombre du site ni celui du CRM. */
    _jsxs("div", { ref: hote, className: "relative w-full h-full", style: { backgroundColor: FOND_SCENE }, children: [_jsx(OutilsVue, { hote: hote, capture: () => captureInterne.current?.() ?? null, libelles: libellesOutils }), !pret && labelChargement && (_jsx("span", { className: "absolute inset-0 flex items-center justify-center text-sm text-[#2E4A5E]/70", children: labelChargement })), pret && echecs > 0 && labelEchec && (_jsx("span", { className: "absolute bottom-2 left-2 right-2 rounded bg-[#2E4A5E]/85 px-3 py-1.5 text-center text-xs text-white", children: labelEchec(echecs) }))] }));
}
