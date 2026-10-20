import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { coinsImage, creerNuit, geometrieFaisceau, pointDansFaisceau, positionProjecteur, type CadreNuit } from "./nuitEcran.js";

const cadre: CadreNuit = { toileLargeurM: 6, baseM: 1.5, hautM: 4.9, toileYM: 0 };

describe("séance de nuit", () => {
  it("le projecteur se tient dans le public, à une largeur et demie de toile", () => {
    const p = positionProjecteur(cadre);
    expect(p.y).toBeCloseTo(-9);
    expect(p.z).toBeGreaterThan(1);
  });

  it("un petit écran garde le projecteur à six mètres au moins", () => {
    expect(positionProjecteur({ ...cadre, toileLargeurM: 2 }).y).toBeCloseTo(-6);
  });

  it("le faisceau a quatre faces, du projecteur aux coins de l'image", () => {
    const g = geometrieFaisceau(positionProjecteur(cadre), coinsImage(cadre));
    expect(g.attributes.position.count).toBe(12);
  });

  it("la poussière reste entre le projecteur et l'image", () => {
    const sommet = positionProjecteur(cadre);
    const coins = coinsImage(cadre);
    for (const [u, v, t] of [[0, 0, 0.5], [1, 1, 0.9], [0.5, 0.5, 0.2]]) {
      const p = pointDansFaisceau(sommet, coins, u, v, t);
      expect(p.y).toBeGreaterThanOrEqual(sommet.y - 1e-6);
      expect(p.y).toBeLessThanOrEqual(cadre.toileYM);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(cadre.toileLargeurM / 2 + 1e-6);
    }
  });

  it("la nuit s'anime et se libère sans erreur", () => {
    const scene = new THREE.Scene();
    const nuit = creerNuit(cadre);
    scene.add(nuit.groupe);
    nuit.animer(1234);
    nuit.liberer();
    expect(scene.children).toHaveLength(0);
  });
});
