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
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Implantation, MeublePose, Personne, ModeleSilhouette } from "./implantationMobilier.js";
import { LACET_MEUBLE } from "./implantationMobilier.js";
/** L'abri au-dessus du lounge, décrit par l'application : le paquet sait le
 *  dessiner, pas le tarifer. */
export interface Abri { modele: string; taille: string }
import { habillageMobilier as habillage, HABILLAGE_MOBILIER_DEFAUT as HABILLAGE_DEFAUT } from "./mobilier.js";
import { composerPan } from "./visuel.js";
import { chargerImage } from "./visuel.js";
import type { VisuelPose } from "./pose.js";
import { vue3d, urlPiece, echelle, BASE_R2 } from "./vue3d.js";
import { modele as modeleTente } from "./composition.js";
import { TEINTE_NUE, hexDeTeinte } from "./couleurs.js";

const MM_EN_M = 0.001;
const RAD = Math.PI / 180;

/* Cache module : survit aux montages/démontages du composant. La clé est
   l'URL, jamais un nom de pièce — le « roof » du Spider n'est pas celui de la X,
   et une clé par nom servirait le premier chargé aux deux. C'est le raisonnement
   du module tente, repris tel quel. Une entrée par fichier, jamais par
   exemplaire posé : voir l'en-tête pour la preuve qu'un seul `loadAsync` part
   par fichier, quel que soit le nombre de poses. */
const cacheGLB = new Map<string, Promise<THREE.Group>>();

/**
 * Un matériau par teinte, gardé pour la session — même doctrine que les
 * gabarits. Cloner à chaque recomposition fuirait sur le GPU : le visiteur
 * change de couleur des dizaines de fois en composant, et rien ne dispose ces
 * clones. Neuf teintes bornent le cache une fois pour toutes.
 */
const cacheMateriau = new Map<string, THREE.MeshStandardMaterial>();

/**
 * Un matériau par visuel déposé. Contrairement aux teintes — neuf, bornées —
 * un visuel est unique et lourd : on garde le DERNIER par meuble et on dispose
 * le précédent, sinon chaque essai du client laisse une texture sur le GPU.
 */
const cacheVisuel = new Map<string, { cle: string; mat: THREE.MeshStandardMaterial }>();

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
function materiauVisuel(slug: string, pose: VisuelPose): THREE.MeshStandardMaterial {
  const cle = `${pose.url.length}|${pose.mode}|${pose.taille}`;
  const deja = cacheVisuel.get(slug);
  if (deja?.cle === cle) return deja.mat;
  if (deja) { deja.mat.map?.dispose(); deja.mat.dispose(); }
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
    .catch(() => { /* housse blanche */ });
  cacheVisuel.set(slug, { cle, mat });
  return mat;
}
function materiauTeinte(gabarit: THREE.Group, cle: string): THREE.MeshStandardMaterial | null {
  const h = habillage(cle);
  if (h.cle === HABILLAGE_DEFAUT) return null; // la teinte nue EST celle du fichier
  const deja = cacheMateriau.get(h.cle);
  if (deja) return deja;
  /* On part du matériau du meuble pour hériter de son rendu (rugosité, absence
     de métal) : seule la couleur change, jamais l'aspect de la housse. */
  let source: THREE.MeshStandardMaterial | undefined;
  gabarit.traverse((o) => {
    if (!source && o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) source = o.material;
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
const urlMeuble = (slug: string) => `${BASE_R2}/mobilier/${slug}.glb`;
function chargerGLB(loader: GLTFLoader, url: string): Promise<THREE.Group> {
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
 * Les pièces de la tente NUE, telles que le module partagé les décrit — jamais
 * une liste que j'aurais recopiée. `socle` vaut ["roof", "LEG", "zipper_cover"]
 * pour la X : le toit, les pieds, le cache-zip. Les parois sont volontairement
 * absentes ; une tente fermée cacherait le lounge qu'on cherche à montrer.
 *
 * Même convention d'unités que le mobilier : les pièces sont en millimètres, et
 * l'échelle vaut 0,001 × `echelle(modèle, taille)` — c'est exactement ce que
 * fait le viewer tente, et s'en écarter ferait diverger deux vues de la même
 * tente, ce que le module partagé existe pour empêcher.
 */
async function construireAbri(loader: GLTFLoader, a: Abri): Promise<THREE.Group | null> {
  try {
    const m = modeleTente(a.modele);
    const v = vue3d(m);
    const groupe = new THREE.Group();
    const pieces = await Promise.all(
      (v.socle as string[]).map((nom) =>
        chargerGLB(loader, urlPiece(m, nom)).then((g) => g.clone(true)).catch(() => null),
      ),
    );
    /* Le traitement que le module partagé applique à CHAQUE pièce, repris ici
       parce que son chargeur n'est pas exporté. Deux points, chacun documenté
       dans son en-tête et chacun visible à l'écran si on l'oublie :
        · `DoubleSide` — « le fichier CAO livre des normales tournées vers
          l'intérieur sur certaines parois » : sans lui la face extérieure du
          toit est invisible ou noire, or tout l'intérêt de cette vue est de
          regarder SOUS l'abri ;
        · la teinte NUE (blanc) — sans elle la tente rend avec la matière brute
          du fichier, qui n'est pas ce que le client achète.
       S'en écarter, c'est dessiner deux tentes différentes pour le même
       produit : exactement ce que le module partagé existe pour empêcher. */
    const blanc = new THREE.Color(hexDeTeinte(TEINTE_NUE));
    for (const p of pieces) {
      if (!p) continue;
      p.traverse((o) => {
        const mail = o as THREE.Mesh;
        const mat = mail.material as THREE.MeshStandardMaterial | undefined;
        if (!mat) return;
        mail.material = mat.clone();
        const m2 = mail.material as THREE.MeshStandardMaterial;
        m2.side = THREE.DoubleSide;
        m2.color = blanc;
      });
      groupe.add(p);
    }
    if (!groupe.children.length) return null;
    groupe.scale.setScalar(MM_EN_M * echelle(m, a.taille));
    return groupe;
  } catch {
    /* Modèle ou taille inconnus du module partagé : pas d'abri dessiné, et le
       lounge reste visible. Le prix, lui, ne dépend pas de cette fonction. */
    return null;
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
 * dans `client/public/models/personnes/LICENCE.txt`.
 *
 * Les fichiers sont en Y-vertical, cette scène est en Z-vertical (convention
 * CAO reprise du viewer tente) : on les couche d'un quart de tour, comme les
 * capsules de la version précédente. L'échelle et le choix du modèle viennent
 * du module pur, où ils sont testés.
 */
const urlPersonne = (fichier: string) => `${BASE_R2}/personnes/${fichier}.glb`;

function poserSilhouette(gabarit: THREE.Group, p: Personne, m: ModeleSilhouette): THREE.Group {
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
function disposerSol(mesh: THREE.Object3D | null) {
  if (!(mesh instanceof THREE.Mesh)) return;
  mesh.geometry.dispose();
  (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose());
}

/* Le sol est le SEUL objet de la scène que personne ne partage : les meubles
   sont des clones dont la géométrie appartient au gabarit gardé en cache, lui
   volontairement immortel. Une recomposition qui remplacerait le sol sans le
   disposer laisserait donc une géométrie et un matériau orphelins sur le GPU —
   à chaque meuble ajouté ou retiré, pendant toute une session d'édition. */
function construireSol(sol: Implantation["sol"]): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(sol.largeurM, sol.profondeurM);
  const mat = new THREE.MeshStandardMaterial({ color: 0xe3e8ec, roughness: 0.95, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  // Sous le niveau des meubles (posés à z=0) : évite le z-fighting à leur base.
  mesh.position.z = -0.002;
  return mesh;
}

type Props = {
  implantation: Implantation;
  labelChargement?: string;
  /** Message quand des modèles n'ont pas pu être chargés — reçoit leur nombre. */
  labelEchec?: (n: number) => string;
  /** Reçoit la fonction de capture (JPEG data-URL) — jointe à la demande de devis. */
  captureRef?: React.MutableRefObject<(() => string | null) | null>;
  /** L'abri au-dessus du lounge. La tente NUE — toit, pieds, cache-zip —, jamais
      ses parois : on montre un abri, pas une tente fermée dans laquelle le
      mobilier serait invisible. */
  abri?: Abri | null;
  /** Teinte choisie par meuble (slug → clé d'habillage). Absent = teinte nue. */
  habillages?: Record<string, string>;
  /** Visuel déposé par le client (slug → pose). Posé sur la housse, avec son
      mode — la MÊME mécanique que les toiles de tente. */
  visuels?: Record<string, VisuelPose>;
};

export default function MobilierViewer({ implantation, labelChargement, labelEchec, captureRef, abri, habillages, visuels }: Props) {
  const hote = useRef<HTMLDivElement>(null);
  const [pret, setPret] = useState(false);
  /* Modèles qui n'ont pas pu être chargés — annoncés, jamais tus. */
  const [echecs, setEchecs] = useState(0);
  /* Posés par l'effet de mise en place, consommés par l'effet de composition. */
  const outils = useRef<{
    loader: GLTFLoader;
    racine: THREE.Group;
    cadrer: () => void;
    reveiller: () => void;
  } | null>(null);
  const generation = useRef(0);

  /* ── Mise en place : une seule fois ─────────────────────────────────── */
  useEffect(() => {
    const el = hote.current;
    if (!el) return;

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
      if (boite.isEmpty()) return;
      const taille = boite.getSize(new THREE.Vector3());
      const centre = boite.getCenter(new THREE.Vector3());
      const rayon = taille.length() / 2;
      const vFov = cam.fov * RAD;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * cam.aspect);
      const recul = (rayon / Math.sin(Math.min(vFov, hFov) / 2)) * 1.15;
      const off = cam.position.clone().sub(orbite.target);
      const az = off.x || off.y ? Math.atan2(off.y, off.x) : -0.9;
      orbite.target.copy(centre);
      cam.position.copy(centre).add(
        new THREE.Vector3(Math.cos(az) * 0.92, Math.sin(az) * 0.92, 0.4).multiplyScalar(recul),
      );
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
      if (performance.now() - derniereAction > REPOS_MS) {
        const off = cam.position.clone().sub(orbite.target);
        const az = Math.atan2(off.y, off.x) + 0.0012;
        const rH = Math.hypot(off.x, off.y);
        cam.position.set(
          orbite.target.x + rH * Math.cos(az),
          orbite.target.y + rH * Math.sin(az),
          cam.position.z,
        );
      }
      orbite.update();
      rendu.render(sc, cam);
    };
    boucle();

    /* Capture pour la demande de devis : on redessine puis on recopie sur fond
       clair — le tampon WebGL n'est pas conservé entre deux images, et le JPEG
       ne connaît pas la transparence. Même recette que le viewer tente. */
    if (captureRef) {
      captureRef.current = () => {
        rendu.render(sc, cam);
        const c = document.createElement("canvas");
        c.width = rendu.domElement.width;
        c.height = rendu.domElement.height;
        const ctx = c.getContext("2d");
        if (!ctx) return null;
        ctx.fillStyle = "#F5F8FA";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(rendu.domElement, 0, 0);
        return c.toDataURL("image/jpeg", 0.72);
      };
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
    if (!o) return;
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
    const silhouettesPromises = Promise.all(
      gens.map((pose, i) => {
        const modele = pose.modele;
        return chargerGLB(o.loader, urlPersonne(modele.fichier))
          .then((gabarit) => ({ pose, modele, gabarit }))
          .catch(() => null);
      }),
    ).then((r) => r.filter((x): x is NonNullable<typeof x> => x !== null));

    Promise.all([
      Promise.allSettled(
        meubles.map((pose) => chargerGLB(o.loader, urlMeuble(pose.slug)).then((gabarit) => ({ pose, gabarit }))),
      ),
      abriPromis,
      silhouettesPromises,
    ]).then(([resultats, groupeAbri, silhouettes]) => {
      const encore = outils.current;
      /* Une réponse en retard (implantation changée entre-temps) ne doit pas
         écraser la dernière composition demandée. */
      if (!encore || generation.current !== gen) return;

      const poses = resultats
        .filter((r): r is PromiseFulfilledResult<{ pose: MeublePose; gabarit: THREE.Group }> => r.status === "fulfilled")
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
        if (mat) corps.traverse((o) => { if (o instanceof THREE.Mesh) o.material = mat; });
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
         toit. */
      if (groupeAbri) encore.racine.add(groupeAbri);

      encore.cadrer();
      encore.reveiller();
      setPret(true);
    });
  }, [implantation, abri, habillages, visuels]);

  return (
    <div ref={hote} className="relative w-full h-full">
      {!pret && labelChargement && (
        <span className="absolute inset-0 flex items-center justify-center text-sm text-[#2E4A5E]/70">
          {labelChargement}
        </span>
      )}
      {/* Une scène incomplète le dit. Un meuble absent d'un décor sans un mot,
          c'est un client qui croit avoir tout vu. */}
      {pret && echecs > 0 && labelEchec && (
        <span className="absolute bottom-2 left-2 right-2 rounded bg-[#2E4A5E]/85 px-3 py-1.5 text-center text-xs text-white">
          {labelEchec(echecs)}
        </span>
      )}
    </div>
  );
}
