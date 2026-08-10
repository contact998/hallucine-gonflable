import { describe, it, expect } from "vitest";
import { MODELES, modele } from "./composition.js";
import { VUE_3D, vue3d, urlPiece, echelle, MODELES_SANS_VUE } from "./vue3d.js";

describe("la vue 3D de chaque modèle", () => {
  it("aucun modèle vendu n'est sans vue 3D — sa page ne montrerait rien", () => {
    expect(MODELES_SANS_VUE).toEqual([]);
  });

  it("chaque dossier R2 est déclaré : il ne suit pas le slug", () => {
    expect(vue3d(modele("x")).dossier).toBe("tente-x");
    expect(vue3d(modele("spider")).dossier).toBe("spider-tent");
    expect(urlPiece(modele("spider"), "roof")).toMatch(/\/models\/spider-tent\/roof\.glb$/);
  });

  it("toute pièce proposée au choix a son azimut mesuré", () => {
    for (const m of MODELES) {
      const v = vue3d(m);
      for (const [choix, piece] of Object.entries(v.piece)) {
        if (!piece) continue;
        expect(v.angleNatif[piece], `${m.slug} · ${choix} → ${piece}`).toBeTypeOf("number");
      }
      if (v.pieceAuvent) expect(v.angleNatif[v.pieceAuvent]).toBeTypeOf("number");
    }
  });

  it("un modèle ne propose que des types qu'il sait dessiner", () => {
    for (const m of MODELES) {
      const dessinables = Object.keys(vue3d(m).piece);
      for (const t of m.types) expect(dessinables, `${m.slug} · ${t}`).toContain(t);
    }
  });

  it("l'échelle part de la taille que Bayes a modélisée, propre à chaque gamme", () => {
    // Bayes livre toujours la plus petite taille de la gamme
    for (const m of MODELES) {
      expect(echelle(m, m.tailles[0])).toBeCloseTo(1, 5);
      expect(vue3d(m).tailleModele).toBe(parseInt(m.tailles[0], 10));
    }
    expect(echelle(modele("x"), "6x6")).toBe(2);      // 6 m sur un modèle de 3 m
    expect(echelle(modele("spider"), "8x8")).toBe(2); // 8 m sur un modèle de 4 m
  });

  it("les azimuts restent dans le tour du cercle", () => {
    for (const m of MODELES)
      for (const [p, a] of Object.entries(vue3d(m).angleNatif))
        expect(Math.abs(a), `${m.slug} · ${p}`).toBeLessThanOrEqual(180);
  });
});
