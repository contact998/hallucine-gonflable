import { describe, it, expect } from "vitest";
import { encoderConfig, decoderConfig, type ConfigTente } from "./config";

const vide = (): ConfigTente => ({
  taille: "4x4",
  cotes: { avant: "vide", droit: "vide", arriere: "vide", gauche: "vide" },
  auvents: { avant: false, droit: false, arriere: false, gauche: false },
  options: [],
});

describe("Code de configuration tente — aller-retour", () => {
  it("retrouve une tente nue", () => {
    const c = vide();
    expect(decoderConfig(encoderConfig(c))).toEqual(c);
  });

  it("retrouve une composition complète", () => {
    const c: ConfigTente = {
      taille: "8x8",
      cotes: { avant: "porte", droit: "fenetre", arriere: "paroi", gauche: "courbe" },
      auvents: { avant: true, droit: false, arriere: true, gauche: false },
      options: ["imp_toit", "imp_structure", "acc_sac", "acc_led"],
    };
    const rendu = decoderConfig(encoderConfig(c))!;
    expect(rendu.taille).toBe("8x8");
    expect(rendu.cotes).toEqual(c.cotes);
    expect(rendu.auvents).toEqual(c.auvents);
    expect(rendu.options.sort()).toEqual(c.options.sort());
  });

  it("code un côté ouvert surmonté d'un auvent — le cas qui n'a pas de majuscule", () => {
    const c = vide();
    c.auvents.droit = true;
    const code = encoderConfig(c);
    expect(code).toContain("A");
    const rendu = decoderConfig(code)!;
    expect(rendu.cotes.droit).toBe("vide");
    expect(rendu.auvents.droit).toBe(true);
  });

  it("refuse un auvent là où le produit l'interdit, même si le code le demande", () => {
    // « C » = paroi courbe + auvent : impossible à monter, l'auvent est ignoré.
    const rendu = decoderConfig("4x4.C---")!;
    expect(rendu.cotes.avant).toBe("courbe");
    expect(rendu.auvents.avant).toBe(false);
  });

  it("rend null sur un code inexploitable plutôt qu'une tente bancale", () => {
    expect(decoderConfig(null)).toBeNull();
    expect(decoderConfig("")).toBeNull();
    expect(decoderConfig("9x9.----")).toBeNull();
    expect(decoderConfig("n'importe quoi")).toBeNull();
  });

  it("tolère un code tronqué par un logiciel de messagerie", () => {
    const rendu = decoderConfig("4x4.of")!;
    expect(rendu.cotes.avant).toBe("porte");
    expect(rendu.cotes.droit).toBe("fenetre");
    expect(rendu.cotes.arriere).toBe("vide");
    expect(rendu.cotes.gauche).toBe("vide");
  });

  it("ignore une lettre inconnue sans casser le reste", () => {
    const rendu = decoderConfig("4x4.oZf-.zz.q")!;
    expect(rendu.cotes.avant).toBe("porte");
    expect(rendu.cotes.droit).toBe("vide");
    expect(rendu.cotes.arriere).toBe("fenetre");
    expect(rendu.options).toEqual([]);
  });

  it("code la onzième impression sur un seul caractère", () => {
    // Avec des indices décimaux, « 10 » se relisait en deux impressions.
    const c = vide();
    c.options = ["imp_jonction"];
    const rendu = decoderConfig(encoderConfig(c))!;
    expect(rendu.options).toEqual(["imp_jonction"]);
  });
});
