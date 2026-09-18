/*
 * Le cadrage des vues toutes prêtes, vérifié comme on le vérifierait à l'œil :
 * on pose une vraie caméra three.js là où la vue la met, et on regarde où
 * tombent les coins de la scène. Aucune formule recopiée — la caméra projette,
 * le test constate.
 */
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { VUES, directionVue, poseVue, interpolerPose, TransitionVue, type Vue } from "./vuesCamera.js";

const FOV = 38;

function camera(vue: Vue, boite: THREE.Box3, aspect: number, azimutFace: number) {
  const pose = poseVue(vue, boite, { azimutFace, fov: FOV, aspect });
  const cam = new THREE.PerspectiveCamera(FOV, aspect, 0.01, 1000);
  cam.up.set(0, 0, 1);
  cam.position.copy(pose.position);
  cam.lookAt(pose.cible);
  cam.updateMatrixWorld();
  return { cam, pose };
}

function coins(b: THREE.Box3): THREE.Vector3[] {
  const c: THREE.Vector3[] = [];
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) c.push(new THREE.Vector3(x, y, z));
  return c;
}

/* Des scènes qui n'ont rien en commun : une tente seule, une rangée de dix
   tentes, un écran de 22 m (large, plat, haut), un lounge bas et profond. */
const SCENES: [string, THREE.Box3][] = [
  ["tente 4 × 4", new THREE.Box3(new THREE.Vector3(-2.2, -2.2, 0), new THREE.Vector3(2.2, 2.2, 3.1))],
  ["rangée de dix", new THREE.Box3(new THREE.Vector3(-22, -2.2, 0), new THREE.Vector3(22, 2.2, 3.1))],
  ["écran 22 m", new THREE.Box3(new THREE.Vector3(-13, -1.2, 0), new THREE.Vector3(13, 1.2, 16))],
  ["lounge", new THREE.Box3(new THREE.Vector3(-6, -9, 0), new THREE.Vector3(6, 9, 0.9))],
];

describe("poseVue — toute la scène tient dans le cadre, quelle que soit sa forme", () => {
  for (const [nom, boite] of SCENES) {
    for (const vue of VUES) {
      for (const aspect of [16 / 9, 4 / 3, 375 / 420]) {
        it(`${nom}, vue ${vue}, format ${aspect.toFixed(2)}`, () => {
          const { cam } = camera(vue, boite, aspect, -Math.PI / 2);
          let marge = 0;
          for (const p of coins(boite)) {
            const q = p.clone().project(cam);
            expect(Math.abs(q.x)).toBeLessThanOrEqual(1);
            expect(Math.abs(q.y)).toBeLessThanOrEqual(1);
            marge = Math.max(marge, Math.abs(q.x), Math.abs(q.y));
          }
          /* Et elle le REMPLIT : une vue qui recule deux fois trop montre un
             timbre-poste au milieu d'un décor vide. */
          expect(marge).toBeGreaterThan(0.6);
        });
      }
    }
  }
});

describe("poseVue — chaque vue regarde d'où elle le dit", () => {
  const boite = SCENES[0][1];
  const face = -Math.PI / 2;

  it("face : à l'horizontale, dans l'azimut de la face", () => {
    const d = directionVue("face", face);
    expect(d.z).toBeCloseTo(0, 6);
    expect(d.x).toBeCloseTo(0, 6);
    expect(d.y).toBeCloseTo(-1, 6);
  });

  it("côté : à l'horizontale, un quart de tour plus loin", () => {
    const d = directionVue("cote", face);
    expect(d.z).toBeCloseTo(0, 6);
    expect(d.dot(directionVue("face", face))).toBeCloseTo(0, 6);
  });

  it("¾ : entre la face et le côté, au-dessus de l'horizon", () => {
    const d = directionVue("troisQuarts", face);
    expect(d.z).toBeGreaterThan(0.2);
    const plat = new THREE.Vector3(d.x, d.y, 0).normalize();
    expect(plat.dot(directionVue("face", face))).toBeCloseTo(Math.SQRT1_2, 6);
    expect(plat.dot(directionVue("cote", face))).toBeCloseTo(Math.SQRT1_2, 6);
  });

  it("dessus : presque à la verticale, et la face tombe en BAS de l'image, comme sur un plan", () => {
    const { cam } = camera("dessus", boite, 1, face);
    const d = directionVue("dessus", face);
    expect(d.z).toBeGreaterThan(0.999);
    /* Le milieu du bord « avant » (côté de la face, y négatif ici) doit sortir
       sous le centre de l'image ; celui de l'arrière, au-dessus. */
    const avant = new THREE.Vector3(0, boite.min.y, boite.max.z).project(cam);
    const arriere = new THREE.Vector3(0, boite.max.y, boite.max.z).project(cam);
    expect(avant.y).toBeLessThan(0);
    expect(arriere.y).toBeGreaterThan(0);
  });

  it("vise le centre de la boîte", () => {
    const { pose } = camera("troisQuarts", SCENES[1][1], 16 / 9, face);
    expect(pose.cible.toArray()).toEqual(SCENES[1][1].getCenter(new THREE.Vector3()).toArray());
  });

  it("une scène deux fois plus grande recule deux fois plus loin — aucun nombre par modèle", () => {
    const petite = poseVue("face", boite, { azimutFace: face, fov: FOV, aspect: 1 }).distance;
    const grande = new THREE.Box3(boite.min.clone().multiplyScalar(2), boite.max.clone().multiplyScalar(2));
    expect(poseVue("face", grande, { azimutFace: face, fov: FOV, aspect: 1 }).distance).toBeCloseTo(petite * 2, 6);
  });
});

describe("interpolerPose — tourner autour, jamais traverser", () => {
  const cible = new THREE.Vector3(0, 0, 1);
  const de = { position: new THREE.Vector3(10, 0, 1), cible };
  const vers = { position: new THREE.Vector3(-10, 0.001, 1), cible };

  it("les deux bouts sont exacts", () => {
    expect(interpolerPose(de, vers, 0).position.distanceTo(de.position)).toBeLessThan(1e-9);
    expect(interpolerPose(de, vers, 1).position.distanceTo(vers.position)).toBeLessThan(1e-9);
  });

  it("à mi-chemin d'un demi-tour, la caméra est à la même distance — elle a contourné l'objet", () => {
    const mi = interpolerPose(de, vers, 0.5);
    expect(mi.position.distanceTo(cible)).toBeCloseTo(10, 6);
  });

  it("prend le chemin court : de −170° à +170°, elle passe par 180°, pas par 0°", () => {
    const a = (deg: number) => ({ position: new THREE.Vector3(Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180), 0), cible: new THREE.Vector3() });
    const mi = interpolerPose(a(-170), a(170), 0.5);
    expect(mi.position.x).toBeCloseTo(-1, 6);
  });
});

describe("TransitionVue", () => {
  const de = { position: new THREE.Vector3(5, 0, 2), cible: new THREE.Vector3(0, 0, 1) };
  const vers = { position: new THREE.Vector3(0, -5, 1), cible: new THREE.Vector3(0, 0, 1) };

  it("part du départ, arrive exactement, puis s'éteint", () => {
    const t = new TransitionVue();
    t.lancer(de, vers, 1000, 400);
    expect(t.active).toBe(true);
    expect(t.avancer(1000)!.position.distanceTo(de.position)).toBeLessThan(1e-9);
    const milieu = t.avancer(1200)!;
    expect(milieu.position.distanceTo(de.position)).toBeGreaterThan(0.1);
    expect(milieu.position.distanceTo(vers.position)).toBeGreaterThan(0.1);
    expect(t.avancer(1400)!.position.distanceTo(vers.position)).toBeLessThan(1e-9);
    expect(t.active).toBe(false);
    expect(t.avancer(1500)).toBeNull();
  });

  it("une durée nulle saute droit à l'arrivée", () => {
    const t = new TransitionVue();
    t.lancer(de, vers, 0, 0);
    expect(t.avancer(0)!.position.distanceTo(vers.position)).toBeLessThan(1e-9);
    expect(t.active).toBe(false);
  });

  it("annuler rend la main — un geste du visiteur passe avant le trajet", () => {
    const t = new TransitionVue();
    t.lancer(de, vers, 0, 400);
    t.annuler();
    expect(t.avancer(100)).toBeNull();
  });

  it("ne partage pas les vecteurs de l'appelant", () => {
    const t = new TransitionVue();
    const depart = { position: de.position.clone(), cible: de.cible.clone() };
    t.lancer(depart, vers, 0, 400);
    depart.position.set(99, 99, 99);
    expect(t.avancer(0)!.position.distanceTo(de.position)).toBeLessThan(1e-9);
  });
});
