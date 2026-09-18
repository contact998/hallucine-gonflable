// @vitest-environment happy-dom
/*
 * Les outils rendus dans un vrai DOM : on clique comme le visiteur, on constate
 * ce qui part — la vue demandée, le fichier enregistré et son nom.
 */
import { describe, it, expect, beforeAll, vi } from "vitest";
import { act, createElement, createRef } from "react";
import { createRoot } from "react-dom/client";
import { OutilsVue, NOM_IMAGE_DEFAUT, type VueOutil } from "./OutilsVue.js";

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

/* Une image PNG d'un pixel : ce que rend une vraie capture, en plus court. */
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function monter(props: Partial<Parameters<typeof OutilsVue>[0]>) {
  const conteneur = document.createElement("div");
  document.body.append(conteneur);
  const hote = createRef<HTMLDivElement>();
  await act(async () => {
    createRoot(conteneur).render(createElement(OutilsVue, { hote, capture: () => PNG, ...props }));
  });
  return conteneur;
}

describe("OutilsVue — les vues toutes prêtes", () => {
  it("un bouton par vue fournie, nommé par les libellés, qui mène à SA vue", async () => {
    const vues: VueOutil[] = [
      { cle: "face", aller: vi.fn() },
      { cle: "dessus", aller: vi.fn() },
    ];
    const c = await monter({ vues, libelles: { face: "Vorne", dessus: "Oben" } });
    const boutons = Array.from(c.querySelectorAll('[role="group"] button')) as HTMLButtonElement[];
    expect(boutons.map((b) => b.textContent)).toEqual(["Vorne", "Oben"]);
    await act(async () => boutons[1].click());
    expect(vues[1].aller).toHaveBeenCalledTimes(1);
    expect(vues[0].aller).not.toHaveBeenCalled();
  });

  it("sans libellés, le français", async () => {
    const c = await monter({ vues: [{ cle: "cote", aller: () => {} }, { cle: "troisQuarts", aller: () => {} }] });
    expect(Array.from(c.querySelectorAll('[role="group"] button')).map((b) => b.textContent)).toEqual(["Côté", "¾"]);
  });

  it("aucune vue fournie : aucune barre", async () => {
    const c = await monter({});
    expect(c.querySelector('[role="group"]')).toBeNull();
  });
});

describe("OutilsVue — télécharger l'image", () => {
  async function telecharger(props: Partial<Parameters<typeof OutilsVue>[0]>) {
    const capture = vi.fn(() => PNG);
    const c = await monter({ capture, ...props });
    let nom = "";
    const clic = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      nom = this.download;
    });
    const bouton = c.querySelector('button[aria-label="Télécharger l’image"]') as HTMLButtonElement;
    await act(async () => bouton.click());
    clic.mockRestore();
    return { capture, nom };
  }

  it("demande la capture en PNG et l'enregistre sous le nom par défaut", async () => {
    const { capture, nom } = await telecharger({});
    expect(capture).toHaveBeenCalledWith("image/png");
    expect(nom).toBe(NOM_IMAGE_DEFAUT);
  });

  it("sous le nom fourni par l'application", async () => {
    const { nom } = await telecharger({ nomFichier: "tente-x-4x4.png" });
    expect(nom).toBe("tente-x-4x4.png");
  });
});
