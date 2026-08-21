import { describe, it, expect } from "vitest";
import { encoderConfig, decoderConfig, type ConfigTente } from "./config.js";
import { MODELES } from "./composition.js";

const vide = (): ConfigTente => ({
  modele: "x",
  taille: "4x4",
  cotes: { avant: "vide", droit: "vide", arriere: "vide", gauche: "vide" },
  auvents: { avant: false, droit: false, arriere: false, gauche: false },
  demiMurs: { avant: "vide", droit: "vide", arriere: "vide", gauche: "vide" },
  options: [],
});

describe("Code de configuration tente — aller-retour", () => {
  it("retrouve une tente nue", () => {
    const c = vide();
    expect(decoderConfig(encoderConfig(c))).toEqual(c);
  });

  it("retrouve une composition complète", () => {
    const c: ConfigTente = {
      modele: "x",
      taille: "8x8",
      cotes: { avant: "porte", droit: "fenetre", arriere: "paroi", gauche: "courbe" },
      auvents: { avant: true, droit: false, arriere: true, gauche: false },
      demiMurs: {},
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

/* ── La gamme, et la compatibilité des codes déjà envoyés ─────────────────── */

describe("codes de configuration multi-modèles", () => {
  it("un code SANS modèle reste une tente X — des devis partis pointent dessus", () => {
    const c = decoderConfig("4x4.pFA-.02.sl");
    expect(c).not.toBeNull();
    expect(c!.modele).toBe("x");
    expect(c!.taille).toBe("4x4");
  });

  it("un code de tente X ne change pas de forme : pas de segment ajouté", () => {
    const c = decoderConfig("4x4.pFA-.02.sl")!;
    expect(encoderConfig(c)).toBe("4x4.pFA-.02.sl");
  });

  it("les autres modèles portent leur slug en tête", () => {
    const c = decoderConfig("spider.6x6.pp--")!;
    expect(c.modele).toBe("spider");
    expect(c.taille).toBe("6x6");
    expect(encoderConfig(c)).toBe("spider.6x6.pp--");
  });

  it("aller-retour sans perte sur les quatre modèles", () => {
    for (const m of MODELES) {
      for (const taille of m.tailles) {
        const code = encoderConfig({
          modele: m.slug, taille, cotes: {}, auvents: {}, demiMurs: {}, options: [],
        });
        const relu = decoderConfig(code);
        expect(relu, `${m.slug} ${taille}`).not.toBeNull();
        expect(relu!.modele).toBe(m.slug);
        expect(relu!.taille).toBe(taille);
      }
    }
  });

  it("une taille qui n'existe pas chez CE modèle est refusée", () => {
    // 10x10 existe chez le Spider, jamais chez la X
    expect(decoderConfig("spider.10x10")).not.toBeNull();
    expect(decoderConfig("10x10")).toBeNull();
    // 3x3 existe chez la X et la N, pas chez le Spider
    expect(decoderConfig("3x3")).not.toBeNull();
    expect(decoderConfig("spider.3x3")).toBeNull();
  });

  it("un modèle inconnu n'est pas lu comme un modèle, donc le code est refusé", () => {
    expect(decoderConfig("licorne.4x4")).toBeNull();
  });

  it("le demi-mur de la N voyage avec son bandeau, dans la même lettre", () => {
    // « r » = bandeau + demi-mur à porte : les deux étages en un signe.
    const c = decoderConfig("n.3x3.r-p-")!;
    expect(c.cotes.avant).toBe("courbe");
    expect(c.demiMurs.avant).toBe("porte");
    expect(encoderConfig(c)).toBe("n.3x3.r-p-");
  });

  it("« c » reste le bandeau SEUL, comme depuis le premier jour", () => {
    const c = decoderConfig("n.3x3.c---")!;
    expect(c.cotes.avant).toBe("courbe");
    expect(c.demiMurs.avant).toBe("vide");
    expect(encoderConfig(c)).toBe("n.3x3.c---");
  });

  it("un demi-mur là où le dessin n'en veut pas est ignoré, pas inventé", () => {
    /* Le demi-mur n'existe que sous le bandeau, et que sur le pignon avant.
       Ailleurs la lettre retombe sur le bandeau seul — et le bandeau lui-même
       tombe sur un long côté, qui n'a pas d'arc à fermer. */
    const c = decoderConfig("n.3x3.-qq-")!;
    expect(c.cotes.droit).toBe("vide");
    expect(c.demiMurs.droit).toBe("vide");
    expect(c.cotes.arriere).toBe("courbe");
    expect(c.demiMurs.arriere).toBe("vide");
  });

  it("la N a quatre côtés nommés comme ceux de la X, mais facturés séparément", () => {
    const n = MODELES.find((m) => m.slug === "n")!;
    expect([...n.cotes]).toEqual(["avant", "droit", "arriere", "gauche"]);
    expect(n.cleParCote).toBe(true);
  });

  it("la V a trois côtés identiques : a, b, c, et aucun prix par côté", () => {
    const v = MODELES.find((m) => m.slug === "v")!;
    expect([...v.cotes]).toEqual(["a", "b", "c"]);
    expect(v.cleParCote).toBe(false);
    const c = decoderConfig("v.5x5.ppp")!;
    expect(Object.keys(c.cotes)).toEqual(["a", "b", "c"]);
  });
});
