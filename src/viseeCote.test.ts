import { describe, expect, it } from "vitest";
import { modele } from "./composition.js";
import { azimutPourCote, prochainAzimut, viser, viseeNeuve } from "./viseeCote.js";
import { angleCote } from "./vue3d.js";

const X = modele("x");
const N = modele("n");

describe("azimutPourCote", () => {
  it("place la caméra en face du côté, quel que soit le modèle", () => {
    for (const m of [X, N]) {
      for (const c of m.cotes as readonly string[]) {
        const az = azimutPourCote(m, c);
        /* Le côté regarde (sin a, cos a) vu de dessus ; la caméra doit se
           trouver DANS cette direction — c'est le même critère que celui qui
           efface la paroi devant l'objectif. */
        const a = angleCote(m, c) * (Math.PI / 180);
        const dot = Math.sin(a) * Math.cos(az) + Math.cos(a) * Math.sin(az);
        expect(dot).toBeGreaterThan(0.999);
      }
    }
  });

  it("ne suppose pas la façade de la X : la N a ses propres angles", () => {
    const memes = (X.cotes as readonly string[]).every(
      (c) => azimutPourCote(X, c) === azimutPourCote(N, c),
    );
    expect(memes).toBe(false);
  });
});

describe("prochainAzimut", () => {
  it("ne fait rien tant qu'on n'a rien visé", () => {
    expect(prochainAzimut(viseeNeuve(), 0)).toBeNull();
  });

  it("arrive, et s'arrête", () => {
    const v = viseeNeuve();
    viser(v, X, "droit");
    let az = azimutPourCote(X, "avant");
    let pas = 0;
    for (; pas < 500; pas++) {
      const suite = prochainAzimut(v, az);
      if (suite === null) break;
      az = suite;
    }
    expect(v.anime).toBe(false);
    expect(pas).toBeLessThan(200);
    const reste = Math.abs(az - azimutPourCote(X, "droit"));
    expect(Math.min(reste, Math.abs(reste - 2 * Math.PI))).toBeLessThan(0.01);
  });

  it("prend le chemin COURT — jamais le tour du monde", () => {
    /* Viser « gauche » depuis « droite » : un demi-tour, pas trois quarts dans
       l'autre sens, et surtout pas deux tours. */
    const v = viseeNeuve();
    viser(v, X, "gauche");
    const depart = azimutPourCote(X, "droit") + 4 * Math.PI; // même angle, deux tours plus loin
    const premier = prochainAzimut(v, depart)!;
    expect(Math.abs(premier - depart)).toBeLessThan(Math.PI * 0.13);
  });
});
