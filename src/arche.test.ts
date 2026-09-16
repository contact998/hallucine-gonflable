import { describe, it, expect } from "vitest";
import { calerArche, archeModelisee, ARCHE_FORMES_MODELISEES, type MesuresArche } from "./arche.js";

/* Les mesures RÉELLES du modèle livré par Bayes le 16/09/2026 (arche droite,
   4 m — `4X2.6X0.45.stp`, converti en GLB puis mesuré sur le maillage). Si une
   nouvelle livraison les change, ce fichier n'a pas à bouger : ces nombres ne
   servent qu'à éprouver la règle, pas à la porter — c'est le visualiseur qui
   les mesure sur le fichier. */
const BAYES_DROITE_4M: MesuresArche = {
  largeurMM: 4055.925,
  profondeurMM: 450.158,
  hauteurMM: 2620.024,
};

describe("calerArche", () => {
  it("prend un facteur PAR AXE, pas une seule mise à l'échelle uniforme", () => {
    /* Le 8 m du catalogue (4,6 m de haut, 80 cm d'épaisseur) n'est pas le 4 m
       agrandi d'un bloc — son tube est plus épais. Trois facteurs différents
       le disent ; un seul les confondrait. */
    const c = calerArche(BAYES_DROITE_4M, { largeurM: 8, hauteurM: 4.6, profondeurM: 0.8 });
    expect(c.facteurX).toBeCloseTo(8000 / 4055.925, 6);
    expect(c.facteurZ).toBeCloseTo(4600 / 2620.024, 6);
    expect(c.facteurY).toBeCloseTo(800 / 450.158, 6);
    expect(c.facteurX).not.toBeCloseTo(c.facteurZ, 2);
  });

  it("la taille du modèle lui-même se cale à facteur 1 sur les trois axes", () => {
    const c = calerArche(BAYES_DROITE_4M, { largeurM: 4.055925, hauteurM: 2.620024, profondeurM: 0.450158 });
    expect(c.facteurX).toBeCloseTo(1, 9);
    expect(c.facteurY).toBeCloseTo(1, 9);
    expect(c.facteurZ).toBeCloseTo(1, 9);
  });

  it("pose TOUTE la gamme droite du catalogue (15/09/2026), sans mesure inutilisable", () => {
    /* Largeur, hauteur, profondeur — les tailles réelles de la gamme droite au
       catalogue. Aucune n'a de raison de faire échouer `calerArche`. */
    for (const [largeurM, hauteurM, profondeurM] of [
      [4, 2.6, 0.45], [5, 3.2, 0.6], [6, 3.8, 0.6], [7, 4.2, 0.7],
      [8, 4.6, 0.8], [9, 4.8, 0.8], [10, 5.0, 0.9], [11, 5.2, 0.9], [12, 5.4, 1.0],
    ] as const) {
      const c = calerArche(BAYES_DROITE_4M, { largeurM, hauteurM, profondeurM });
      expect(c.facteurX, `${largeurM} m`).toBeGreaterThan(0);
      expect(c.facteurY, `${largeurM} m`).toBeGreaterThan(0);
      expect(c.facteurZ, `${largeurM} m`).toBeGreaterThan(0);
    }
  });

  it("refuse des mesures ou des cibles inutilisables plutôt que de dessiner une arche fausse", () => {
    expect(() => calerArche({ ...BAYES_DROITE_4M, largeurMM: 0 }, { largeurM: 6, hauteurM: 3.8, profondeurM: 0.6 })).toThrow();
    expect(() => calerArche({ ...BAYES_DROITE_4M, hauteurMM: -1 }, { largeurM: 6, hauteurM: 3.8, profondeurM: 0.6 })).toThrow();
    expect(() => calerArche(BAYES_DROITE_4M, { largeurM: 0, hauteurM: 3.8, profondeurM: 0.6 })).toThrow();
    expect(() => calerArche(BAYES_DROITE_4M, { largeurM: 6, hauteurM: -3.8, profondeurM: 0.6 })).toThrow();
  });
});

describe("archeModelisee", () => {
  it("ne reconnaît QUE la droite — seule forme livrée par Bayes au 16/09/2026", () => {
    expect(archeModelisee("droite")).toBe(true);
    for (const forme of ["pieds", "ronde", "demi", "soufflerie"] as const) {
      expect(archeModelisee(forme), forme).toBe(false);
    }
  });

  it("la liste ne contient que des formes réellement livrées — pas les cinq du catalogue", () => {
    expect(ARCHE_FORMES_MODELISEES.length).toBeLessThan(5);
  });
});
