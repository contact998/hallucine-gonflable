import { describe, expect, it } from "vitest";
import {
  PLAGE_GAMME, RATIO_REF, bandeauMasque, boudinEtanche, boudinPourLargeur,
  boudinSoufflerie, coterEcran, planchierBasImage,
} from "./schemaEcran.js";

describe("coterEcran", () => {
  it("pose le hors-tout : toile + Ø en largeur, bas + image + demi-boudin en hauteur", () => {
    /* Étanche 6 m, la configuration que montre le CRM : Ø 450, bas 1 560. */
    const c = coterEcran({ gamme: "etanche", largeurToileMm: 6000, basImageMm: 1560, ratio: RATIO_REF });
    expect(c.boudinMm).toBe(450);
    expect(c.horsToutLargeurMm).toBe(6450);
    expect(Math.round(c.imageHauteurMm)).toBe(3375);
    expect(Math.round(c.horsToutHauteurMm)).toBe(5160);
    expect(c.jupeMm).toBe(1335);
  });

  it("remonte un bas d'image sous le demi-boudin, au lieu de dessiner l'impossible", () => {
    const c = coterEcran({ gamme: "soufflerie", largeurToileMm: 10000, basImageMm: 0, ratio: RATIO_REF });
    expect(c.boudinMm).toBe(1590);
    expect(c.basPlancherMm).toBe(800); // 795 arrondi au cran de 50
    expect(c.basRetenuMm).toBe(800);
    expect(c.jupeMm).toBeGreaterThanOrEqual(0);
  });

  it("garde la hauteur du 16/9 en 1.85 : c'est le bandeau qui absorbe l'écart", () => {
    const seize = coterEcran({ gamme: "etanche", largeurToileMm: 6000, basImageMm: 1560, ratio: RATIO_REF });
    const large = coterEcran({
      gamme: "etanche", largeurToileMm: 6000, basImageMm: 1560, ratio: 1.85,
      bandeauMm: bandeauMasque(6000, 1.85),
    });
    expect(Math.round(large.horsToutHauteurMm)).toBe(Math.round(seize.horsToutHauteurMm));
    expect(large.bandeauMm).toBeGreaterThan(0);
    expect(large.imageHauteurMm).toBeLessThan(seize.imageHauteurMm);
  });

  it("n'ajoute aucun bandeau en 16/9 ni sur un format plus haut", () => {
    expect(bandeauMasque(6000, RATIO_REF)).toBe(0);
    expect(bandeauMasque(6000, 4 / 3)).toBe(0);
  });

  it("accepte un Ø imposé — la fourniture réelle prime sur la table", () => {
    const c = coterEcran({ gamme: "etanche", largeurToileMm: 6000, basImageMm: 1560, ratio: RATIO_REF, boudinMm: 600 });
    expect(c.boudinMm).toBe(600);
    expect(c.horsToutLargeurMm).toBe(6600);
  });
});

describe("les tables de boudin", () => {
  it("montent par paliers, jamais en continu", () => {
    expect(boudinEtanche(3000)).toBe(220);
    expect(boudinEtanche(3001)).toBe(370);
    expect(boudinEtanche(20000)).toBe(600);
    expect(boudinSoufflerie(11000)).toBe(1590);
    expect(boudinSoufflerie(24000)).toBe(2860);
  });

  it("boudinPourLargeur choisit la table de la gamme", () => {
    expect(boudinPourLargeur("etanche", 6000)).toBe(boudinEtanche(6000));
    expect(boudinPourLargeur("soufflerie", 12000)).toBe(boudinSoufflerie(12000));
  });

  it("le plancher suit le pas de la gamme", () => {
    expect(planchierBasImage("etanche", 450)).toBe(230); // 225 → cran de 10
    expect(planchierBasImage("soufflerie", 1590)).toBe(800); // 795 → cran de 50
  });
});

describe("PLAGE_GAMME", () => {
  it("donne à chaque gamme une plage cohérente, défaut compris", () => {
    for (const g of ["etanche", "soufflerie"] as const) {
      const p = PLAGE_GAMME[g];
      expect(p.largeurMinMm).toBeLessThan(p.largeurMaxMm);
      expect(p.largeurDefautMm).toBeGreaterThanOrEqual(p.largeurMinMm);
      expect(p.largeurDefautMm).toBeLessThanOrEqual(p.largeurMaxMm);
    }
  });
});
