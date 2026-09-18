/*
 * Le nuancier : les références Pantone qui partent à l'atelier, et la teinte
 * sur mesure du client — une clé qui voyage dans les liens et chez le CRM.
 */
import { describe, it, expect } from "vitest";
import {
  TEINTES, TEINTE_NUE, lireTeinte, hexDeTeinte, pantoneDeTeinte,
  teinteSurMesure, estTeinteSurMesure, normaliserPantone,
} from "./couleurs.js";

describe("nuancier", () => {
  it("chaque teinte imprimée porte sa référence Pantone, la toile nue aucune", () => {
    for (const t of TEINTES) {
      if (t.cle === TEINTE_NUE) expect(t.pantone).toBe("");
      else expect(t.pantone).toMatch(/ C$/);
    }
  });

  it("rouge, gris et noir sont les teintes de stock de l'atelier", () => {
    expect(pantoneDeTeinte("rouge")).toBe("Pantone 199 C");
    expect(pantoneDeTeinte("gris")).toBe("Pantone 429 C");
    expect(pantoneDeTeinte("noir")).toBe("Pantone Black C");
    expect(pantoneDeTeinte(TEINTE_NUE)).toBe("");
  });

  it("les clés sont uniques : elles voyagent dans les liens de devis", () => {
    expect(new Set(TEINTES.map((t) => t.cle)).size).toBe(TEINTES.length);
  });
});

describe("teinte sur mesure", () => {
  it("s'écrit #RRGGBB, suivie de la référence quand le client la donne", () => {
    expect(teinteSurMesure("#c8102e")).toBe("#C8102E");
    expect(teinteSurMesure("c8102e", "Pantone 186 C")).toBe("#C8102E|186 C");
    expect(teinteSurMesure("#c8102e", "   ")).toBe("#C8102E");
  });

  it("se relit : couleur d'écran et référence", () => {
    const t = lireTeinte("#C8102E|186 C");
    expect(t).toMatchObject({ hex: "#C8102E", pantone: "186 C", surMesure: true, label: null });
    expect(hexDeTeinte("#00aa55")).toBe("#00AA55");
    expect(pantoneDeTeinte("#C8102E|186 C")).toBe("Pantone 186 C");
    expect(pantoneDeTeinte("#C8102E")).toBe("");
    expect(estTeinteSurMesure("#C8102E")).toBe(true);
    expect(estTeinteSurMesure("rouge")).toBe(false);
  });

  it("une clé illisible retombe sur la toile nue, jamais sur du noir", () => {
    for (const cle of ["#12", "#GGGGGG", "fuchsia", "", null, undefined]) {
      expect(lireTeinte(cle).cle).toBe(TEINTE_NUE);
    }
  });

  it("la référence saisie est nettoyée, jamais recopiée telle quelle", () => {
    expect(normaliserPantone("PMS 286c")).toBe("286c");
    expect(normaliserPantone("Pantone   Cool  Gray 11 C")).toBe("Cool Gray 11 C");
    expect(normaliserPantone("<script>186 C")).toBe("script186 C");
    expect(normaliserPantone("x".repeat(60))).toHaveLength(24);
    expect(normaliserPantone(undefined)).toBe("");
  });
});
