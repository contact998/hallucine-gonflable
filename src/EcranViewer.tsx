import { eclairerStudio, reculPourBoite } from "./renduStudio.js";
/*
 * La scène 3D de l'écran gonflable — étanche ou soufflerie.
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
 * Le modèle est UNIQUE par gamme, quelle que soit la taille vendue : voir
 * `ecran.ts` pour le facteur et l'étirement du bandeau noir. Changer de TAILLE
 * ne recharge donc rien — on réécrit des sommets déjà là. Changer de GAMME, si :
 * c'est un autre produit, donc un autre fichier, donc la scène se remonte.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { chargeurGLB } from "./chargeurGlb.js";
import { FOND_SCENE, urlPersonne } from "./vue3d.js";
import { chargerEcranGlb, poserTaille, type EcranCharge } from "./ecranGlb.js";
import type { GammeEcran3D } from "./ecran.js";
import { OutilsVue, type LibellesOutils } from "./OutilsVue.js";
import { VUES, poseVue, dureeTransition, TransitionVue, type Vue } from "./vuesCamera.js";

const TAILLE_HOMME_M = 1.75;
/* La toile regarde −Y (le spectateur est au sud) : c'est d'ici que la caméra
   voit l'écran de face. */
const AZIMUT_FACE = -Math.PI / 2;

type Props = {
  /** Quel modèle montrer. Se lit sur le slug du catalogue (`gammeEcran3D`),
   *  jamais écrit à la main dans une page : un écran dessiné dans la mauvaise
   *  gamme est un écran que le client ne recevra pas. */
  gamme: GammeEcran3D;
  /** Largeur de la toile de projection, en mètres — la cote que le catalogue
   *  appelle « 6 m ». Vient de `CatalogueSpecs.toileLargeurM` (CRM), jamais
   *  d'un nombre écrit dans une page. */
  toileLargeurM: number;
  /** Hauteur de la base de l'image, en mètres (`CatalogueSpecs.hauteurBaseImageM`).
   *  Absente : la géométrie du fournisseur est laissée telle quelle. */
  baseImageM?: number | null;
  /** Poser quelqu'un à côté. Vrai par défaut — c'est l'échelle. */
  silhouette?: boolean;
  /** Reçoit la fonction de capture (JPEG data-URL) — jointe à la demande de devis. */
  captureRef?: React.MutableRefObject<(() => string | null) | null>;
  labelChargement?: string;
  /** Dit qu'un modèle manque plutôt que de montrer une scène amputée. */
  labelEchec?: string;
  libellesOutils?: LibellesOutils;
  /** Le nom du fichier que télécharge le bouton image. */
  nomFichierImage?: string;
};

export default function EcranViewer({
  gamme, toileLargeurM, baseImageM = null, silhouette = true,
  captureRef, labelChargement, labelEchec, libellesOutils, nomFichierImage,
}: Props) {
  const hote = useRef<HTMLDivElement>(null);
  const captureInterne = useRef<((format?: "image/jpeg" | "image/png") => string | null) | null>(null);
  /* Les vues toutes prêtes — même mécanique que la tente et le lounge. */
  const transition = useRef(new TransitionVue());
  const vueFixee = useRef<Vue | null>(null);
  const allerVue = useRef<(vue: Vue, anime: boolean) => void>(() => {});
  const [pret, setPret] = useState(false);
  const [echec, setEchec] = useState(false);

  const outils = useRef<{
    ecran: EcranCharge;
    homme: THREE.Group;
    cadrer: (hauteurM: number, largeurM: number) => void;
  } | null>(null);

  /* ── Mise en place : une seule fois ─────────────────────────────────── */
  useEffect(() => {
    const el = hote.current;
    if (!el) return;
    /* La gamme a pu changer : on repart d'une scène qui ne sait rien. */
    setPret(false);
    setEchec(false);

    const sc = new THREE.Scene();
    sc.background = new THREE.Color(FOND_SCENE);
    eclairerStudio(sc);
    const appoint = new THREE.DirectionalLight(0xffffff, 0.85);
    appoint.position.set(0, -8, 2);
    sc.add(appoint);

    const rendu = new THREE.WebGLRenderer({ antialias: true });
    rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    /* Le canevas prend sa taille du CSS, pas de ses pixels : `setSize` plus bas
       ne touche QUE la résolution (`updateStyle` à false). Sans ces deux lignes,
       chaque redimensionnement agrandit la mise en page, qui redimensionne, qui
       agrandit — le canevas part à dix mille pixels de haut. `touch-action` en
       plus : sinon le doigt fait défiler la page au lieu de tourner la scène. */
    rendu.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:none";
    el.appendChild(rendu.domElement);

    const cam = new THREE.PerspectiveCamera(34, 1, 0.05, 400);
    /* Z vertical AVANT les contrôles : posé après, l'orbite reste sur Y et la
       scène bascule au premier glissement. */
    cam.up.set(0, 0, 1);

    const sol = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0xe3e8ec, roughness: 0.95, metalness: 0 }),
    );
    // Sous l'écran, posé à z=0 : évite le z-fighting sur les sangles au sol.
    sol.position.z = -0.002;
    sc.add(sol);

    const homme = new THREE.Group();
    sc.add(homme);

    const orbite = new OrbitControls(cam, rendu.domElement);
    orbite.enableDamping = true;
    orbite.dampingFactor = 0.08;
    // Jamais sous le plancher : on regarde un écran, pas ses sangles par en dessous.
    orbite.maxPolarAngle = Math.PI * 0.495;

    let dimensions: { hauteurM: number; largeurM: number } | null = null;
    const cadrer = (hauteurM: number, largeurM: number) => {
      dimensions = { hauteurM, largeurM };
      const cible = new THREE.Vector3(0, 0, hauteurM * 0.5);
      const a = THREE.MathUtils.degToRad(-26);
      const p = THREE.MathUtils.degToRad(76);
      const direction = new THREE.Vector3(Math.sin(p) * Math.sin(a), -Math.sin(p) * Math.cos(a), Math.cos(p));
      const demiLargeur = (largeurM + 2.5) / 2;
      const boite = new THREE.Box3(new THREE.Vector3(-demiLargeur, -1, 0), new THREE.Vector3(demiLargeur, 1, hauteurM));
      const rayon = reculPourBoite(boite, direction, cam.fov, cam.aspect);
      cam.position.set(
        cible.x + rayon * Math.sin(p) * Math.sin(a),
        cible.y - rayon * Math.sin(p) * Math.cos(a),
        cible.z + rayon * Math.cos(p),
      );
      cam.lookAt(cible);
      orbite.target.copy(cible);
      orbite.minDistance = rayon * 0.35;
      orbite.maxDistance = rayon * 3;
      orbite.update();
      /* Une vue choisie survit au changement de taille et au plein écran. */
      if (vueFixee.current) appliquerVue(vueFixee.current, false);
    };

    /* Cadrée sur ce qui se VOIT — l'écran et la silhouette —, jamais sur le sol
       de 200 m, qui mettrait l'écran à l'horizon. */
    const appliquerVue = (vue: Vue, anime: boolean) => {
      const o = outils.current;
      if (!o) return;
      const boite = new THREE.Box3().setFromObject(o.ecran.groupe);
      if (o.homme.visible) boite.union(new THREE.Box3().setFromObject(o.homme));
      if (boite.isEmpty()) return;
      const pose = poseVue(vue, boite, { azimutFace: AZIMUT_FACE, fov: cam.fov, aspect: cam.aspect });
      orbite.minDistance = Math.min(orbite.minDistance, pose.distance * 0.9);
      orbite.maxDistance = Math.max(orbite.maxDistance, pose.distance * 1.1);
      vueFixee.current = vue;
      const duree = anime ? dureeTransition() : 0;
      if (duree > 0) {
        transition.current.lancer({ position: cam.position.clone(), cible: orbite.target.clone() }, pose, performance.now(), duree);
      } else {
        transition.current.annuler();
        cam.position.copy(pose.position);
        orbite.target.copy(pose.cible);
        orbite.update();
      }
    };
    allerVue.current = appliquerVue;
    /* Le visiteur reprend la main : la vue choisie s'efface. */
    orbite.addEventListener("start", () => {
      transition.current.annuler();
      vueFixee.current = null;
    });

    const redimensionner = () => {
      const l = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      rendu.setSize(l, h, false);
      cam.aspect = l / h;
      cam.updateProjectionMatrix();
      if (dimensions) cadrer(dimensions.hauteurM, dimensions.largeurM);
    };
    redimensionner();
    const ro = new ResizeObserver(redimensionner);
    ro.observe(el);

    let raf = 0;
    const boucle = () => {
      raf = requestAnimationFrame(boucle);
      const vue = transition.current.avancer(performance.now());
      if (vue) {
        cam.position.copy(vue.position);
        orbite.target.copy(vue.cible);
      }
      orbite.update();
      rendu.render(sc, cam);
    };
    boucle();

    /* Capture pour la demande de devis : on redessine puis on recopie sur fond
       clair — le tampon WebGL n'est pas conservé entre deux images, et le JPEG
       ne connaît pas la transparence. Même recette que les autres scènes. */
    const prendre = (format: "image/jpeg" | "image/png" = "image/jpeg") => {
      rendu.render(sc, cam);
      const c = document.createElement("canvas");
      c.width = rendu.domElement.width;
      c.height = rendu.domElement.height;
      const ctx = c.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = FOND_SCENE;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(rendu.domElement, 0, 0);
      return format === "image/png" ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.72);
    };
    captureInterne.current = prendre;
    if (captureRef) captureRef.current = prendre;

    let vivant = true;
    const loader = chargeurGLB();

    const chargerEcran = chargerEcranGlb(loader, gamme).then((e) => {
      sc.add(e.groupe);
      return e;
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
        const maille = o as THREE.Mesh;
        if (!maille.isMesh) return;
        const mat = maille.material as THREE.MeshStandardMaterial;
        mat.color = new THREE.Color(0x9fb0bd);
        mat.metalness = 0;
        mat.roughness = 1;
      });
      homme.add(gltf.scene);
    });

    void Promise.all([chargerEcran, chargerHomme.catch(() => null)])
      .then(([e]) => {
        if (!vivant) return;
        outils.current = { ecran: e, homme, cadrer };
        setPret(true);
      })
      .catch(() => { if (vivant) setEchec(true); });

    return () => {
      vivant = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      orbite.dispose();
      rendu.dispose();
      rendu.domElement.remove();
      outils.current = null;
      captureInterne.current = null;
      if (captureRef) captureRef.current = null;
    };
    // Remonté à chaque GAMME, jamais à chaque taille : celle-ci se rejoue plus
    // bas en réécrivant des sommets déjà chargés.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamme]);

  /* ── La taille : réécrite sur les mêmes sommets ─────────────────────── */
  useEffect(() => {
    const o = outils.current;
    if (!pret || !o) return;

    let taille;
    try {
      taille = poserTaille(o.ecran, toileLargeurM, baseImageM);
    } catch {
      setEchec(true);
      return;
    }

    o.homme.visible = silhouette;
    /* DEVANT le bandeau noir dès qu'elle passe entière sous le bas de l'image :
       la tête sous la ligne blanche, c'est l'argument que la scène existe pour
       montrer — l'image passe au-dessus des têtes. Décalée du centre pour ne
       pas jouer les présentateurs, un petit pas devant la toile pour ne pas
       être dedans — assez peu pour que la perspective ne fausse rien.

       Quand le bas de l'image est plus bas qu'elle (toutes les étanches), elle
       masquerait la toile : elle se tient alors à CÔTÉ, sur le bord — le BORD
       mesuré, pas la demi-largeur, sinon elle a les pieds dans le manchon —
       et DANS le plan de la toile : hors de ce plan, la perspective fausse la
       seule comparaison qui reste. */
    if (taille.baseM >= TAILLE_HOMME_M) {
      o.homme.position.set(toileLargeurM / 4, taille.toileYM - 0.25, 0);
    } else {
      o.homme.position.set(taille.bordDroitM + 0.9, taille.toileYM, 0);
    }
    o.cadrer(taille.hauteurM, taille.largeurM);
  }, [pret, toileLargeurM, baseImageM, silhouette]);

  return (
    /* Le fond du studio est peint ICI, par la scène : ce n'est pas une couleur
       de thème, et il ne suit ni le mode sombre du site ni celui du CRM. */
    <div ref={hote} className="relative w-full h-full" style={{ backgroundColor: FOND_SCENE }}>
      <OutilsVue hote={hote} capture={(format) => captureInterne.current?.(format) ?? null} libelles={libellesOutils}
        vues={VUES.map((cle) => ({ cle, aller: () => allerVue.current(cle, true) }))} nomFichier={nomFichierImage} />
      {!pret && !echec && labelChargement && (
        <span className="absolute inset-0 flex items-center justify-center text-sm text-[#2E4A5E]/70">
          {labelChargement}
        </span>
      )}
      {echec && labelEchec && (
        <span className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-[#2E4A5E]/70">
          {labelEchec}
        </span>
      )}
    </div>
  );
}
