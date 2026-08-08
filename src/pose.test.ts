import { describe, it, expect } from "vitest";
import { plageTaille, poseInitiale, changerMode, MODES_POSE } from "./pose.js";

describe("plageTaille", () => {
  it("« remplir » n'a AUCUNE plage : c'est ce qui lui retire son curseur", () => {
    expect(plageTaille("remplir")).toBeNull();
  });

  it("les deux autres se règlent en part de la largeur du pan", () => {
    for (const mode of ["une_fois", "mosaique"] as const) {
      const p = plageTaille(mode)!;
      expect(p.min).toBeGreaterThan(0);
      expect(p.max).toBe(100);
      expect(p.defaut).toBeGreaterThan(p.min);
      expect(p.defaut).toBeLessThan(p.max);
    }
  });

  it("le défaut tient dans sa plage, sinon le curseur naît hors de lui-même", () => {
    for (const mode of MODES_POSE) {
      const p = plageTaille(mode);
      if (!p) continue; // mode sans réglage
      expect(p.defaut).toBeGreaterThanOrEqual(p.min);
      expect(p.defaut).toBeLessThanOrEqual(p.max);
    }
  });
});

describe("changerMode", () => {
  it("déplace le réglage dans la plage du nouveau mode", () => {
    // Le réglage ne se transporte pas : les plages ne sont pas les mêmes.
    const pose = poseInitiale("data:,", "une_fois");
    expect(pose.taille).toBe(60);
    const mosaique = changerMode(pose, "mosaique");
    expect(mosaique.taille).toBe(40);
  });

  it("ne touche à rien quand le mode ne change pas — un réglage à la main survit", () => {
    const pose = { ...poseInitiale("data:,", "mosaique"), taille: 17 };
    expect(changerMode(pose, "mosaique")).toBe(pose);
    expect(changerMode(pose, "mosaique").taille).toBe(17);
  });

  it("garde l'image en changeant de mode", () => {
    const pose = poseInitiale("data:image/jpeg;base64,xxx", "une_fois");
    expect(changerMode(pose, "mosaique").url).toBe(pose.url);
  });

  it("tout mode reste atteignable depuis tout mode", () => {
    for (const depart of MODES_POSE) for (const cible of MODES_POSE) {
      const p = changerMode(poseInitiale("data:,", depart), cible);
      expect(p.mode).toBe(cible);
      const plage = plageTaille(cible);
      if (!plage) continue;
      expect(p.taille).toBeGreaterThanOrEqual(plage.min);
      expect(p.taille).toBeLessThanOrEqual(plage.max);
    }
  });

  it("revenir à « remplir » puis repartir ne perd pas l'image", () => {
    const p = poseInitiale("data:image/jpeg;base64,zz", "mosaique");
    expect(changerMode(changerMode(p, "remplir"), "mosaique").url).toBe(p.url);
  });
});
