// @vitest-environment happy-dom
/*
 * Le plan rendu dans un vrai DOM : ce que le client LIT. Les cotes passent par
 * `formatCm` — c'est par là que le site écrit des pieds au .com — et une fiche
 * incomplète ne dessine rien plutôt qu'une arche plate.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { PlanArche } from "./PlanArche.js";
import type { CotesArche } from "./archePlan.js";

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

async function rendre(props: Parameters<typeof PlanArche>[0]): Promise<HTMLElement> {
  const conteneur = document.createElement("div");
  document.body.append(conteneur);
  const racine = createRoot(conteneur);
  await act(async () => { racine.render(createElement(PlanArche, props)); });
  return conteneur;
}

const PIEDS: CotesArche = { forme: "pieds", largeurCm: 400, hauteurCm: 260, profondeurCm: 45, hauteurPiedsCm: 140 };

describe("PlanArche", () => {
  it("écrit chaque cote par formatCm, avec ses mots", async () => {
    const el = await rendre({
      cotes: PIEDS,
      formatCm: (cm) => `${cm / 100} m`,
      libelles: { pieds: "tubes de pied" },
    });
    const textes = Array.from(el.querySelectorAll("text")).map((t) => t.textContent);
    expect(textes.sort()).toEqual(["2.6 m", "4 m", "tubes de pied 1.4 m", "Ø 0.45 m"].sort());
  });

  it("pose la teinte sur le corps de l'arche", async () => {
    const el = await rendre({ cotes: PIEDS, fond: "#C8322B" });
    expect(el.querySelector('path[fill="#C8322B"]')).not.toBeNull();
  });

  it("ne dessine rien d'une fiche sans cotes", async () => {
    const el = await rendre({ cotes: { ...PIEDS, largeurCm: 0 } });
    expect(el.querySelector("svg")).toBeNull();
  });
});
