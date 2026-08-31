import { describe, expect, it } from "vitest";
import {
  LUMENS_M2_CINEMA, LUMENS_M2_MINIMUM, PROJECTEURS_DCP,
  besoinLumens, dcpPourCible, lireLumens,
} from "./projection.js";

describe("besoinLumens", () => {
  it("applique les deux seuils et arrondit à la centaine", () => {
    /* Image d'une soufflerie 12 m : 12 × 6,8 m ≈ 81,6 m². */
    const b = besoinLumens(81.6);
    expect(b.minimum).toBe(8200); // 8160 → 8200
    expect(b.cinema).toBe(12200); // 12240 → 12200
  });

  it("tient le seuil cinéma sur la norme DCI (48 cd/m² × π)", () => {
    expect(Math.abs(LUMENS_M2_CINEMA - 48 * Math.PI)).toBeLessThan(1);
    expect(LUMENS_M2_MINIMUM).toBeLessThan(LUMENS_M2_CINEMA);
  });

  it("ne rend jamais un besoin négatif", () => {
    expect(besoinLumens(-3)).toEqual({ minimum: 0, cinema: 0 });
  });
});

describe("lireLumens", () => {
  /* Libellés réels du catalogue CRM (catégorie Vidéoprojection). */
  it("lit « laser 14500 lm » comme « 9000 lumens »", () => {
    expect(lireLumens("Projecteur Optoma ZU1700 (laser 14500 lm)")).toBe(14500);
    expect(lireLumens("Vidéoprojecteur SONY VPL-FHZ91B — LCD laser, WUXGA, 9000 lumens, optique std")).toBe(9000);
    expect(lireLumens("Vidéoprojecteur 5000 lumens — OPTOMA EH470 DLP Full HD")).toBe(5000);
  });

  it("rend null quand aucune puissance n'est annoncée", () => {
    expect(lireLumens("Lecteur Blu-ray")).toBeNull();
    expect(lireLumens("Vidéoprojecteur")).toBeNull();
  });
});

describe("PROJECTEURS_DCP", () => {
  it("est triée par puissance croissante", () => {
    for (let i = 1; i < PROJECTEURS_DCP.length; i++) {
      expect(PROJECTEURS_DCP[i].lumens).toBeGreaterThanOrEqual(PROJECTEURS_DCP[i - 1].lumens);
    }
  });

  it("rend les modèles à la hauteur, du plus juste au plus puissant", () => {
    const conseils = dcpPourCible(12200);
    expect(conseils.length).toBeGreaterThan(0);
    expect(conseils.every((p) => p.lumens >= 12200)).toBe(true);
    expect(conseils[0].lumens).toBe(12500); // NEC NC1201L, le plus juste
    expect(conseils.length).toBeLessThanOrEqual(5);
  });

  it("rend vide au-delà du mono-projecteur courant", () => {
    expect(dcpPourCible(30000)).toEqual([]);
  });
});
