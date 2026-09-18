/**
 * Le plan coté d'une arche : il doit dire les VRAIES cotes, et le dessin doit
 * tenir dans son cadre. Ce qui est couvert, c'est ce qu'un client lit : la
 * largeur hors-tout, la hauteur, le boudin, la longueur des tubes de pied — et
 * l'ouverture, qui est la question « est-ce que ça passe ».
 */
import { describe, it, expect } from "vitest";
import { centreVisuelArche, geometrieArche, poseInitialeArche, type CotesArche } from "./archePlan.js";

/* Des cotes du catalogue réel (snapshot du site, 18/09/2026). */
const DROITE: CotesArche = { forme: "droite", largeurCm: 400, hauteurCm: 260, profondeurCm: 45 };
const PIEDS: CotesArche = { forme: "pieds", largeurCm: 400, hauteurCm: 260, profondeurCm: 45, hauteurPiedsCm: 140 };
const RONDE: CotesArche = { forme: "ronde", largeurCm: 400, hauteurCm: 220, profondeurCm: 40 };
const DEMI: CotesArche = { forme: "demi", largeurCm: 210, hauteurCm: 360, profondeurCm: 60 };
const COLONNE: CotesArche = { forme: "demi", largeurCm: 80, hauteurCm: 354, profondeurCm: 80 };
const SOUFFLERIE: CotesArche = { forme: "soufflerie", largeurCm: 600, hauteurCm: 400, profondeurCm: 100 };
const TOUTES = [DROITE, PIEDS, RONDE, DEMI, COLONNE, SOUFFLERIE];

const geo = (a: CotesArche) => {
  const g = geometrieArche(a);
  if (!g) throw new Error(`${a.forme} : pas de géométrie`);
  return g;
};

const boite = (pts: [number, number][]) => ({
  xmin: Math.min(...pts.map(([x]) => x)), xmax: Math.max(...pts.map(([x]) => x)),
  ymin: Math.min(...pts.map(([, y]) => y)), ymax: Math.max(...pts.map(([, y]) => y)),
});

describe("geometrieArche — les cotes", () => {
  it("cote la largeur, la hauteur et le boudin aux valeurs du catalogue", () => {
    const g = geo(DROITE);
    const v = Object.fromEntries(g.cotes.map((c) => [c.cle, c.valeurCm]));
    expect(v).toEqual({ hauteur: 260, diametre: 45, largeur: 400 });
  });

  it("la ligne de cote a la LONGUEUR de ce qu'elle cote, à l'échelle du dessin", () => {
    for (const a of TOUTES) {
      for (const c of geo(a).cotes) {
        const longueur = Math.hypot(c.x2 - c.x1, c.y2 - c.y1);
        expect(longueur, `${a.forme}/${c.cle}`).toBeCloseTo(c.valeurCm, 6);
      }
    }
  });

  it("arche à pieds : la longueur des tubes de pied est cotée, dans une vue de côté", () => {
    const g = geo(PIEDS);
    expect(g.profil).not.toBeNull();
    expect(g.cotes.find((c) => c.cle === "pieds")?.valeurCm).toBe(140);
    /* Le profil se tient À DROITE de la vue de face, sans la chevaucher. */
    expect(g.profil!.x).toBeGreaterThan(PIEDS.largeurCm);
  });

  it("sans longueur de pied connue, ni profil ni cote inventés", () => {
    const g = geo({ ...PIEDS, hauteurPiedsCm: null });
    expect(g.profil).toBeNull();
    expect(g.cotes.some((c) => c.cle === "pieds")).toBe(false);
  });

  it("les formes sans pied n'ont pas de profil", () => {
    for (const a of [DROITE, RONDE, DEMI, SOUFFLERIE]) expect(geo(a).profil, a.forme).toBeNull();
  });

  it("la colonne seule ne cote que sa hauteur et son boudin (sa largeur EST le boudin)", () => {
    const g = geo(COLONNE);
    expect(g.cotes.map((c) => c.cle).sort()).toEqual(["diametre", "hauteur"]);
  });
});

describe("geometrieArche — le dessin", () => {
  it("le contour polygonal remplit exactement la boîte largeur × hauteur", () => {
    for (const a of [DROITE, PIEDS, DEMI, COLONNE, SOUFFLERIE]) {
      const b = boite(geo(a).sommets!);
      expect(b, a.forme).toEqual({ xmin: 0, xmax: a.largeurCm, ymin: 0, ymax: a.hauteurCm });
    }
  });

  it("l'ouverture de la droite fait la largeur moins deux boudins, et monte jusque sous le bandeau", () => {
    const s = geo(DROITE).sommets!;
    /* Les deux montants intérieurs touchent le sol à d et à L − d. */
    const auSol = s.filter(([, y]) => y === 260).map(([x]) => x).sort((a, b) => a - b);
    expect(auSol).toEqual([0, 45, 355, 400]);
    /* Le dessous du bandeau est à un boudin du sommet. */
    expect(s.filter(([, y]) => y === 45).length).toBe(2);
  });

  it("les pans coupés sont à 45°, extérieur ET intérieur", () => {
    const s = geo(DROITE).sommets!;
    /* [0,c] → [c,0] dehors, [d,k] → [k,d] dedans : même pente −1. */
    const pente = (a: [number, number], b: [number, number]) => (b[1] - a[1]) / (b[0] - a[0]);
    expect(pente(s[1], s[2])).toBeCloseTo(-1, 9);
    expect(pente(s[10], s[9])).toBeCloseTo(-1, 9);
  });

  it("le pan coupé de la droite vaut 1,7 boudin — la mesure de la planche Bayes et du GLB", () => {
    const s = geo(DROITE).sommets!;
    expect(s[1]).toEqual([0, 45 * 1.7]);
  });

  it("la ronde est faite d'arcs, sans sommets", () => {
    const g = geo(RONDE);
    expect(g.sommets).toBeNull();
    expect(g.contour).toMatch(/^M0 220 A200 220 0 0 1 400 220 L360 220 A160 180 0 0 0 40 220 Z$/);
  });

  it("tout le dessin — cotes et textes compris — tient dans le viewBox", () => {
    for (const a of TOUTES) {
      const g = geo(a);
      const { x, y, largeur, hauteur } = g.viewBox;
      const dedans = (px: number, py: number, quoi: string) => {
        expect(px, quoi).toBeGreaterThanOrEqual(x);
        expect(px, quoi).toBeLessThanOrEqual(x + largeur);
        expect(py, quoi).toBeGreaterThanOrEqual(y);
        expect(py, quoi).toBeLessThanOrEqual(y + hauteur);
      };
      for (const c of g.cotes) {
        dedans(c.x1, c.y1, `${a.forme}/${c.cle}`);
        dedans(c.x2, c.y2, `${a.forme}/${c.cle}`);
        dedans(c.texte.x, c.texte.y, `${a.forme}/${c.cle} texte`);
        for (const [x1, y1, x2, y2] of c.attaches) { dedans(x1, y1, `${a.forme}/${c.cle} attache`); dedans(x2, y2, `${a.forme}/${c.cle} attache`); }
      }
    }
  });

  it("le texte du boudin et celui de la largeur ne sont pas sur la même ligne", () => {
    for (const a of [DROITE, PIEDS, RONDE, DEMI, SOUFFLERIE]) {
      const g = geo(a);
      const d = g.cotes.find((c) => c.cle === "diametre")!;
      const l = g.cotes.find((c) => c.cle === "largeur")!;
      expect(Math.abs(d.texte.y - l.texte.y), a.forme).toBeGreaterThan(g.police);
    }
  });

  it("le texte des tubes de pied tient dans le cadre, même sous une petite arche", () => {
    const g = geo(PIEDS);
    const pieds = g.cotes.find((c) => c.cle === "pieds")!;
    /* Vingt caractères à ~0,55 police, centrés : la moitié de chaque côté. */
    const demiTexte = (20 * 0.55 * g.police) / 2;
    expect(pieds.texte.x + demiTexte).toBeLessThanOrEqual(g.viewBox.x + g.viewBox.largeur);
  });

  it("la vue de côté ne fait pas fondre le texte : même part du cadre avec ou sans profil", () => {
    const sans = geo({ ...PIEDS, hauteurPiedsCm: null });
    const avec = geo(PIEDS);
    const part = (g: ReturnType<typeof geo>) => g.police / g.viewBox.largeur;
    expect(part(avec) / part(sans)).toBeGreaterThan(0.85);
  });

  it("la police suit la taille de l'arche : une 12 m et une 4 m s'écrivent pareil à l'écran", () => {
    const petite = geo(DROITE);
    const grande = geo({ forme: "droite", largeurCm: 1200, hauteurCm: 580, profondeurCm: 90 });
    expect(petite.police / petite.viewBox.largeur).toBeCloseTo(grande.police / grande.viewBox.largeur, 2);
  });
});

describe("geometrieArche — les refus", () => {
  it("une cote nulle, négative ou absente ne dessine rien", () => {
    expect(geometrieArche({ ...DROITE, largeurCm: 0 })).toBeNull();
    expect(geometrieArche({ ...DROITE, hauteurCm: -1 })).toBeNull();
    expect(geometrieArche({ ...DROITE, profondeurCm: Number.NaN })).toBeNull();
  });

  it("un boudin plus large que la moitié de l'arche n'a pas d'ouverture : refusé", () => {
    expect(geometrieArche({ forme: "droite", largeurCm: 100, hauteurCm: 200, profondeurCm: 60 })).toBeNull();
  });
});

describe("centreVisuelArche — le logo va sur le bandeau, jamais dans le vide", () => {
  it("au milieu du bandeau pour une arche", () => {
    expect(centreVisuelArche(DROITE)).toEqual({ x: 0.5, y: 45 / 2 / 260 });
  });

  it("au milieu de la colonne pour la colonne seule", () => {
    expect(centreVisuelArche(COLONNE)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("sur le demi-bandeau — à droite du montant — pour une demi-arche", () => {
    const c = centreVisuelArche(DEMI);
    expect(c.x).toBeGreaterThan(0.5);
    expect(c.y).toBeCloseTo(30 / 360, 9);
  });
});

describe("poseInitialeArche", () => {
  it("une maquette aux proportions de l'arche la recouvre", () => {
    expect(poseInitialeArche("data:x", 400 / 260, DROITE).mode).toBe("remplir");
  });

  it("un logo se pose une fois, à une taille qui tient dans le boudin", () => {
    const p = poseInitialeArche("data:x", 3, DROITE);
    expect(p.mode).toBe("une_fois");
    /* 3:1 sur un boudin de 45 cm : 0,8 × 45 × 3 = 108 cm, soit 27 % de 4 m,
       arrondi au pas du curseur (5). */
    expect(p.taille).toBe(25);
    const hauteurLogoCm = (p.taille / 100) * 400 / 3;
    expect(hauteurLogoCm).toBeLessThanOrEqual(45);
  });

  it("jamais sous le minimum du curseur", () => {
    expect(poseInitialeArche("data:x", 0.2, DROITE).taille).toBe(5);
  });
});
