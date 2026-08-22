import { describe, it, expect } from "vitest";
import {
  HABILLAGES_MOBILIER, HABILLAGE_MOBILIER_PERSO, HABILLAGE_MOBILIER_DEFAUT, habillageMobilier,
} from "./mobilier.js";
import { TEINTES, TEINTE_NUE } from "./couleurs.js";

describe("habillage du mobilier", () => {
  it("reprend TOUTES les teintes de la gamme, sans en recopier une seule", () => {
    /* Le point de ce module : une liste, pas deux. Si quelqu'un ajoute une
       couleur dans couleurs.ts, elle apparaît ici sans qu'on y pense. */
    const teintes = HABILLAGES_MOBILIER.filter((h) => !h.perso).map((h) => h.cle);
    expect(teintes).toEqual(TEINTES.map((t) => t.cle));
  });

  it("ajoute le visuel client, et lui seul", () => {
    const perso = HABILLAGES_MOBILIER.filter((h) => h.perso);
    expect(perso).toHaveLength(1);
    expect(perso[0].cle).toBe(HABILLAGE_MOBILIER_PERSO);
    /* Pas de couleur : on ne connaît pas la maquette du client, et lui en
       inventer une montrerait un meuble qu'il ne recevra pas. */
    expect(perso[0].hex).toBeNull();
  });

  it("la toile nue ne s'écrit pas sur un devis, les autres si", () => {
    expect(habillageMobilier(TEINTE_NUE).libelleFr).toBeNull();
    expect(habillageMobilier("rouge").libelleFr).toBe("Rouge");
    expect(habillageMobilier(HABILLAGE_MOBILIER_PERSO).libelleFr).toBe("impression du visuel client");
  });

  it("porte les deux libellés : clé i18n pour le site, français pour le CRM", () => {
    const rouge = habillageMobilier("rouge");
    expect(rouge.label).toBe("teinte_rouge");
    expect(rouge.libelleFr).toBe("Rouge");
  });

  it("une clé inconnue, vide ou absente retombe sur la toile nue", () => {
    for (const cle of ["fuchsia", "", undefined, null]) {
      expect(habillageMobilier(cle).cle).toBe(HABILLAGE_MOBILIER_DEFAUT);
    }
  });
});
