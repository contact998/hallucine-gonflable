/**
 * Les faces de l'arche : le visuel doit tomber sur la face qu'on regarde, à
 * l'endroit, et nulle part ailleurs.
 *
 * Une boîte tient lieu d'arche — six faces dont on sait d'avance laquelle est
 * devant. Le vrai GLB n'est pas chargé ici (il vit sur R2) ; ce qui se vérifie,
 * c'est la règle : la position décide, dans le repère du GROUPE, quelle que soit
 * la hiérarchie de nœuds que le fichier apporte.
 */
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  GROUPE_ARRIERE, GROUPE_AVANT, GROUPE_FLANC, estMembrane, matiereArche, preparerFacesArche,
} from "./archeFaces.js";

const L = 4, P = 0.45, H = 2.6;
const MESURES = { largeurMM: L, profondeurMM: P, hauteurMM: H };

/** Les triangles d'une géométrie, avec leur groupe et leurs sommets. */
function triangles(geo: THREE.BufferGeometry) {
  const idx = geo.index!;
  const pos = geo.getAttribute("position");
  const out: { groupe: number; sommets: number[] }[] = [];
  for (const g of geo.groups) {
    for (let t = g.start; t < g.start + g.count; t += 3) {
      out.push({ groupe: g.materialIndex!, sommets: [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)] });
    }
  }
  expect(out.length * 3).toBe(idx.count);
  return { out, pos };
}

/** Le y moyen d'un triangle, dans le repère du groupe. */
const yMoyen = (maille: THREE.Mesh, groupe: THREE.Object3D, sommets: number[]) => {
  groupe.updateMatrixWorld(true);
  const rel = groupe.matrixWorld.clone().invert().multiply(maille.matrixWorld);
  const pos = maille.geometry.getAttribute("position");
  return sommets.reduce((s, i) => s + new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(rel).y, 0) / 3;
};

describe("preparerFacesArche", () => {
  it("range chaque triangle : devant → avant, derrière → arrière, le reste → flanc", () => {
    const groupe = new THREE.Group();
    const maille = new THREE.Mesh(new THREE.BoxGeometry(L, P, H));
    maille.position.z = H / 2; // pieds au sol, comme le rend le chargeur
    groupe.add(maille);
    preparerFacesArche(groupe, MESURES);

    const { out } = triangles(maille.geometry);
    const compte = (g: number) => out.filter((t) => t.groupe === g).length;
    expect(compte(GROUPE_AVANT)).toBe(2);
    expect(compte(GROUPE_ARRIERE)).toBe(2);
    expect(compte(GROUPE_FLANC)).toBe(8);
    for (const t of out) {
      const y = yMoyen(maille, groupe, t.sommets);
      if (t.groupe === GROUPE_AVANT) expect(y).toBeCloseTo(-P / 2, 6);
      if (t.groupe === GROUPE_ARRIERE) expect(y).toBeCloseTo(P / 2, 6);
    }
  });

  it("projette à plat : le coin gauche du sol en (0, 0), le coin droit du sommet en (1, 1) — et l'arrière en miroir", () => {
    const groupe = new THREE.Group();
    const maille = new THREE.Mesh(new THREE.BoxGeometry(L, P, H));
    maille.position.z = H / 2;
    groupe.add(maille);
    preparerFacesArche(groupe, MESURES);

    const geo = maille.geometry;
    const pos = geo.getAttribute("position");
    const uv = geo.getAttribute("uv");
    const uv1 = geo.getAttribute("uv1");
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i) + H / 2;
      expect(uv.getX(i)).toBeCloseTo(x / L + 0.5, 6);
      expect(uv.getY(i)).toBeCloseTo(z / H, 6);
      /* Vue de derrière, la gauche est à droite : sans miroir, un texte
         imprimé au dos se lirait à l'envers. */
      expect(uv1.getX(i)).toBeCloseTo(1 - uv.getX(i), 6);
      expect(uv1.getY(i)).toBeCloseTo(uv.getY(i), 6);
    }
  });

  it("lit la position dans le repère du GROUPE : un fichier livré tête en bas n'échange pas l'avant et l'arrière", () => {
    /* Le GLB Bayes arrive retourné, redressé par un demi-tour autour de X sur
       un nœud intermédiaire (archeGlb.ts) : dans le repère de la GÉOMÉTRIE,
       l'avant est alors à +y. Seul le repère du groupe dit la vérité. */
    const groupe = new THREE.Group();
    const scene = new THREE.Group();
    scene.rotation.x = Math.PI;
    const maille = new THREE.Mesh(new THREE.BoxGeometry(L, P, H));
    maille.position.z = -H / 2;
    scene.add(maille);
    groupe.add(scene);
    preparerFacesArche(groupe, MESURES);

    const { out } = triangles(maille.geometry);
    for (const t of out.filter((x) => x.groupe === GROUPE_AVANT)) {
      expect(yMoyen(maille, groupe, t.sommets)).toBeLessThan(0);
      /* … alors que dans sa géométrie, ce triangle est à +y. */
      const pos = maille.geometry.getAttribute("position");
      expect(pos.getY(t.sommets[0])).toBeGreaterThan(0);
    }
  });

  it("deux mailles qui partagent une géométrie reçoivent chacune la leur", () => {
    const groupe = new THREE.Group();
    const geo = new THREE.BoxGeometry(L / 2, P, H);
    const gauche = new THREE.Mesh(geo);
    const droite = new THREE.Mesh(geo);
    gauche.position.set(-L / 4, 0, H / 2);
    droite.position.set(L / 4, 0, H / 2);
    groupe.add(gauche, droite);
    preparerFacesArche(groupe, MESURES);
    expect(gauche.geometry).not.toBe(droite.geometry);
    /* La moitié gauche couvre u de 0 à 0,5, la droite de 0,5 à 1. */
    const umax = (m: THREE.Mesh) => Math.max(...Array.from(m.geometry.getAttribute("uv").array).filter((_, i) => i % 2 === 0));
    expect(umax(gauche)).toBeCloseTo(0.5, 6);
    expect(umax(droite)).toBeCloseTo(1, 6);
  });
});

describe("la membrane médiane du fichier", () => {
  it("un panneau plat dans le plan y = 0 est retiré ; les flancs du boudin, qui y passent aussi, restent", () => {
    const groupe = new THREE.Group();
    const boudin = new THREE.Mesh(new THREE.BoxGeometry(L, P, H));
    boudin.position.z = H / 2;
    /* La membrane : un plan dans XZ (normale selon y), en plein milieu. */
    const membrane = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.5));
    membrane.rotation.x = Math.PI / 2;
    membrane.position.z = 1.9;
    groupe.add(boudin, membrane);
    preparerFacesArche(groupe, MESURES);
    expect(membrane.geometry.index!.count).toBe(0);
    /* Les douze triangles de la boîte sont toujours là, flancs compris. */
    expect(boudin.geometry.index!.count).toBe(36);
  });

  it("estMembrane exige les DEUX conditions", () => {
    expect(estMembrane([0.01, -0.02, 0], 1)).toBe(true);
    expect(estMembrane([0.01, -0.02, 0], 0.1)).toBe(false); // flanc, perpendiculaire au plan
    expect(estMembrane([0.9, 0.95, 1], 1)).toBe(false); // face arrière
  });
});

describe("matiereArche", () => {
  it("retourne vers l'œil la normale qui s'en détourne — dans le bloc de three.js de CETTE version", () => {
    /* Si three.js réécrit son bloc, la retouche ne s'applique plus en silence :
       ce test tombe, et c'est le seul endroit où on le saurait. */
    const m = matiereArche();
    const shader = { fragmentShader: "void main() {\n#include <normal_fragment_begin>\n}", vertexShader: "", uniforms: {} };
    m.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
    expect(shader.fragmentShader).toContain("if ( dot( normal, vViewPosition ) * faceDirection < 0.0 ) normal = - normal;");
    expect(shader.fragmentShader).not.toContain("#include <normal_fragment_begin>");
    expect(m.side).toBe(THREE.DoubleSide);
  });
});
