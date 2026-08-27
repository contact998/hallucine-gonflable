import { describe, it, expect } from "vitest";
import { calerEcran, ecranModelise, gammeEcran3D, type MesuresEcran } from "./ecran.js";

/* Les mesures RÉELLES des GLB livrés par Bayes (étanche 3 m le 21/08/2026,
   soufflerie 9 m le 27). Si une nouvelle livraison les change, ce fichier n'a
   pas à bouger : ces nombres ne servent qu'à éprouver la règle, pas à la
   porter — c'est le visualiseur qui les mesure sur le fichier. */
const BAYES: MesuresEcran = {
  largeurToileMM: 2950,
  zSocleMM: 340,
  zToileMM: 650,
  hauteurBruteMM: 2500,
};

const BAYES_SOUFFLERIE: MesuresEcran = {
  largeurToileMM: 8996,
  zSocleMM: 802,
  zToileMM: 2350,
  hauteurBruteMM: 7910,
};

/* Le catalogue du CRM au 27/08/2026 : largeur de toile → base de l'image.
   Copié ici comme DONNÉE D'ÉPREUVE, jamais comme source — le module n'a pas à
   connaître les tailles vendues, c'est tout son propos. */
const CATALOGUE_ETANCHE: readonly (readonly [number, number])[] = [
  [2, 0.5], [2.5, 0.5], [3, 0.5], [4, 1.0], [5, 1.2],
  [6, 1.5], [7, 1.6], [8, 1.6], [9, 1.6], [10, 1.6],
];
const CATALOGUE_SOUFFLERIE: readonly (readonly [number, number])[] = [
  [7, 1.6], [8, 1.6], [9, 2.0], [9, 3.0], [10, 2.2], [11, 2.2],
  [12, 2.2], [13, 2.2], [14, 2.2], [15, 2.2], [18, 2.2], [22, 2.2],
];

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

  it("pose TOUTE la gamme vendue sur sa cote de catalogue, sans jamais buter", () => {
    /* La raison d'être de l'étirement : si une seule taille vendue butait, elle
       serait dessinée trop haut — sur la cote qui décide si le public voit le
       film — et rien ne le dirait à l'écran. */
    for (const [modele, catalogue, nom] of [
      [BAYES, CATALOGUE_ETANCHE, "étanche"],
      [BAYES_SOUFFLERIE, CATALOGUE_SOUFFLERIE, "soufflerie"],
    ] as const) {
      for (const [largeur, base] of catalogue) {
        const c = calerEcran(modele, largeur, base);
        expect(c.baseM, `${nom} ${largeur} m`).toBeCloseTo(base, 6);
        expect(c.butee, `${nom} ${largeur} m`).toBe(false);
      }
    }
  });

  it("la soufflerie garde sa toile intacte, bandeau tassé ou étiré", () => {
    /* Le drive-in étire (base 3 m), le 22 m tasse à 24 cm de bandeau : dans les
       deux cas la toile ne doit ni grandir ni rétrécir d'un millimètre. */
    const hautToileMM = 7398;
    for (const [largeur, base] of [[9, 3.0], [22, 2.2]] as const) {
      const c = calerEcran(BAYES_SOUFFLERIE, largeur, base);
      const hauteurToile = c.etirer(hautToileMM) - c.etirer(BAYES_SOUFFLERIE.zToileMM);
      expect(hauteurToile, `${largeur} m`).toBeCloseTo(hautToileMM - BAYES_SOUFFLERIE.zToileMM, 6);
      /* Et le boudin de base, lui, ne bouge jamais : il touche terre. */
      expect(c.etirer(BAYES_SOUFFLERIE.zSocleMM)).toBe(BAYES_SOUFFLERIE.zSocleMM);
    }
  });
});

describe("gammeEcran3D", () => {
  it("reconnaît les deux gammes modélisées, drive-in compris", () => {
    for (const s of ["ecran-etanche-2m", "ecran-etanche-6m", "ecran-etanche-10m"])
      expect(gammeEcran3D(s), s).toBe("etanche");
    /* Le drive-in est une soufflerie 9 m à base relevée : même fichier. */
    for (const s of ["ecran-soufflerie-7m", "ecran-soufflerie-22m", "ecran-soufflerie-9m-drivein"])
      expect(gammeEcran3D(s), s).toBe("soufflerie");
  });

  it("ne prête aucun modèle au kemi, qui n'a même pas de cotes", () => {
    for (const s of ["ecran-kemi-6m", "ecran", "", "tente-x-4x4"]) {
      expect(gammeEcran3D(s), s).toBe(null);
      expect(ecranModelise(s), s).toBe(false);
    }
  });
});
