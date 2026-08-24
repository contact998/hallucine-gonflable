import { describe, it, expect } from "vitest";
import { calerEcran, type MesuresEcran } from "./ecran.js";

/* Les mesures RÉELLES du GLB livré par Bayes le 21/08/2026 (étanche 3 m).
   Si une nouvelle livraison les change, ce fichier n'a pas à bouger : ces
   nombres ne servent qu'à éprouver la règle, pas à la porter. */
const BAYES: MesuresEcran = {
  largeurToileMM: 2950,
  zSocleMM: 340,
  zToileMM: 650,
  hauteurBruteMM: 2500,
};

describe("calerEcran", () => {
  it("prend son facteur sur la LARGEUR DE TOILE, pas sur le hors-tout", () => {
    /* « 6 m » au catalogue = six mètres de toile. Prendre le hors-tout (3,30 m
       sur ce modèle) donnerait un écran de 5,36 m de toile vendu pour un 6 m. */
    const c = calerEcran(BAYES, 6, null);
    expect(c.facteur).toBeCloseTo(6000 / 2950, 6);
  });

  it("pose la base de l'image exactement sur la cote du catalogue", () => {
    for (const [largeur, base] of [[3, 0.5], [6, 1.5], [10, 1.6]] as const) {
      const c = calerEcran(BAYES, largeur, base);
      expect(c.baseM, `${largeur} m`).toBeCloseTo(base, 6);
      expect(c.butee).toBe(false);
    }
  });

  it("sans cote de base, ne touche pas à la géométrie du fournisseur", () => {
    const c = calerEcran(BAYES, 6, null);
    for (const z of [0, 340, 500, 650, 2500]) expect(c.etirer(z)).toBe(z);
    expect(c.hauteurM).toBeCloseTo((2500 / 1000) * c.facteur, 6);
    /* Le doublement nu laisse la base à 1,33 m — l'écart que la jupe corrige. */
    expect(c.baseM).toBeCloseTo(1.32, 2);
  });

  it("le socle ne bouge pas : c'est le contact au sol", () => {
    const c = calerEcran(BAYES, 6, 1.5);
    expect(c.etirer(0)).toBe(0);
    expect(c.etirer(200)).toBe(200);
    expect(c.etirer(BAYES.zSocleMM)).toBe(BAYES.zSocleMM);
  });

  it("la toile garde sa hauteur exacte : elle se translate, elle ne s'étire pas", () => {
    const hautToileMM = 2330;
    for (const base of [0.5, 1.5, 1.6]) {
      const c = calerEcran(BAYES, 6, base);
      const hauteurToile = c.etirer(hautToileMM) - c.etirer(BAYES.zToileMM);
      expect(hauteurToile, `base ${base}`).toBeCloseTo(hautToileMM - BAYES.zToileMM, 6);
    }
  });

  it("la jupe s'étire vers le haut quand la base monte, se tasse quand elle descend", () => {
    const monte = calerEcran(BAYES, 6, 1.5);
    expect(monte.etirer(500)).toBeGreaterThan(500);
    const descend = calerEcran(BAYES, 3, 0.5);
    expect(descend.etirer(500)).toBeLessThan(500);
  });

  it("une cote aberrante bute au lieu de replier la jupe sur elle-même", () => {
    /* Sans butée, une base à 5 cm sur le 10 m demanderait une jupe négative :
       la géométrie se retournerait, et l'écran sortirait à l'envers. */
    const c = calerEcran(BAYES, 10, 0.05);
    expect(c.butee).toBe(true);
    expect(c.etirer(BAYES.zToileMM)).toBeGreaterThan(BAYES.zSocleMM);
    expect(c.baseM).toBeGreaterThan(0);
    /* La fonction reste croissante : aucun sommet n'en dépasse un autre. */
    let precedent = -Infinity;
    for (let z = 0; z <= 2500; z += 25) {
      const v = c.etirer(z);
      expect(v).toBeGreaterThanOrEqual(precedent);
      precedent = v;
    }
  });

  it("refuse des mesures inutilisables plutôt que de dessiner une taille fausse", () => {
    expect(() => calerEcran({ ...BAYES, largeurToileMM: 0 }, 6, 1.5)).toThrow();
    expect(() => calerEcran(BAYES, 0, 1.5)).toThrow();
    expect(() => calerEcran({ ...BAYES, zToileMM: 340 }, 6, 1.5)).toThrow();
  });
});
