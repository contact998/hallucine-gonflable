/**
 * Le plan de visée : le dessin doit dire la vérité sur le modèle.
 *
 * Ce qui est couvert, c'est ce qui s'est déjà cassé une fois : une liste de
 * quatre pastilles écrite en dur montrait un « avant » et un « arrière » à la
 * V, qui n'en a pas, et un côté à la N qui ne se choisit plus.
 */
import { describe, it, expect } from "vitest";
import { planDeVisee } from "./PlanCotes.js";
import { MODELES } from "./composition.js";

const modele = (slug: string) => {
  const m = MODELES.find((x) => x.slug === slug);
  if (!m) throw new Error(`modèle ${slug} absent — la fixture suit le catalogue`);
  return m;
};

describe("planDeVisee", () => {
  it("ne dessine JAMAIS une pastille pour un côté que le modèle n'a pas", () => {
    for (const m of MODELES) {
      const plan = planDeVisee(m);
      for (const p of plan.pastilles) {
        expect(m.cotes as readonly string[], `${m.slug} : pastille « ${p.c} » hors modèle`).toContain(p.c);
      }
    }
  });

  it("dessine une pastille par côté, ni plus ni moins", () => {
    for (const m of MODELES) {
      expect(planDeVisee(m).pastilles.length, m.slug).toBe(m.cotes.length);
    }
  });

  it("garde les quatre points cardinaux aux mêmes pixels sur les modèles à avant", () => {
    /* Le dessin d'origine, au pixel près : le déplacer change la tente que le
       client croit voir. */
    const plan = planDeVisee(modele("x"));
    expect(plan.contour).toBe("M32 36 Q85 52 138 36 Q122 78 138 120 Q85 104 32 120 Q48 78 32 36 Z");
    expect(plan.pastilles.map((p) => `${p.sigle}@${p.x},${p.y}`)).toEqual([
      "AR@85,26", "D@152,78", "AV@85,130", "G@18,78",
    ]);
  });

  it("place les côtés de la V d'après leurs ANGLES, pas d'après un carré", () => {
    const plan = planDeVisee(modele("v"));
    expect(plan.pastilles.map((p) => p.c).sort()).toEqual(["a", "b", "c"]);
    /* Trois pastilles distinctes, aucune superposée : un carré à quatre coins
       en aurait empilé deux. */
    const pos = plan.pastilles.map((p) => `${p.x.toFixed(0)},${p.y.toFixed(0)}`);
    expect(new Set(pos).size).toBe(3);
  });

  it("toutes les pastilles tiennent dans le viewBox 170×158", () => {
    for (const m of MODELES) {
      for (const p of planDeVisee(m).pastilles) {
        expect(p.x, `${m.slug}/${p.c}`).toBeGreaterThanOrEqual(0);
        expect(p.x, `${m.slug}/${p.c}`).toBeLessThanOrEqual(170);
        expect(p.y, `${m.slug}/${p.c}`).toBeGreaterThanOrEqual(0);
        expect(p.y, `${m.slug}/${p.c}`).toBeLessThanOrEqual(158);
      }
    }
  });
});
