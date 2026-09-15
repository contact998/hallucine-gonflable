// @vitest-environment happy-dom
/*
 * La liste rendue dans un vrai DOM : on déplie les familles comme le ferait un
 * client, puis on lit ce qu'il voit. Pas de logique recopiée — le composant
 * décide, le test constate.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { ListeMobilier, type ClassesListe, type ListeMobilierProps, type MeubleListe } from "./ListeMobilier.js";

const CLASSES: ClassesListe = {
  entete: "", chevron: "", titreFamille: "", pastilleCompte: "", famille: "", ligne: "",
  designation: "", detail: "", bouton: "", boutonDesactive: "", compte: "",
  puceHabillage: "puce", puceHabillageActive: "puce-active",
  habillage: {},
};

const CANAPE: MeubleListe = { slugSite: "canape-double", designation: "Canapé", placesAssises: 2 };
const TABLE_DECOR: MeubleListe = { slugSite: "table-basse-decor", designation: "Table basse", placesAssises: 0 };

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

async function rendreDepliee(props: Partial<ListeMobilierProps>): Promise<HTMLElement> {
  const conteneur = document.createElement("div");
  document.body.append(conteneur);
  const racine = createRoot(conteneur);
  await act(async () => {
    racine.render(
      createElement(ListeMobilier, {
        meubles: [CANAPE, TABLE_DECOR],
        quantites: { "canape-double": 1, "table-basse-decor": 1 },
        onQuantite: () => {},
        habillages: {},
        onHabillage: () => {},
        visuels: {},
        onVisuel: () => {},
        libelle: (c) => c,
        classes: CLASSES,
        ...props,
      }),
    );
  });
  for (const bouton of Array.from(conteneur.querySelectorAll<HTMLButtonElement>('button[aria-expanded="false"]'))) {
    await act(async () => { bouton.click(); });
  }
  return conteneur;
}

const ligneDe = (conteneur: HTMLElement, designation: string) =>
  Array.from(conteneur.querySelectorAll("li")).find((li) => li.textContent?.includes(designation)) ?? null;
const puceHabillage = (li: Element | null) => li?.querySelector('button[aria-label="habillage_titre"]') ?? null;

describe("ListeMobilier — qui s'habille", () => {
  it("sans `habillable`, tout meuble pris a sa pastille d'habillage", async () => {
    const c = await rendreDepliee({});
    expect(puceHabillage(ligneDe(c, "Canapé"))).not.toBeNull();
    expect(puceHabillage(ligneDe(c, "Table basse"))).not.toBeNull();
  });

  it("`habillable` à false retire pastille ET palette, sans toucher aux compteurs", async () => {
    const c = await rendreDepliee({ habillable: (m) => m.slugSite !== "table-basse-decor" });
    expect(puceHabillage(ligneDe(c, "Canapé"))).not.toBeNull();
    const table = ligneDe(c, "Table basse");
    expect(table).not.toBeNull();
    expect(puceHabillage(table)).toBeNull();
    expect(table?.querySelector('button[aria-label="+"]')).not.toBeNull();
    expect(table?.querySelector('button[aria-label="-"]')).not.toBeNull();
    expect(table?.textContent).not.toContain("habillage_aide");
  });

  it("un meuble à zéro ne montre jamais de pastille, habillable ou non", async () => {
    const c = await rendreDepliee({ quantites: { "canape-double": 0, "table-basse-decor": 0 } });
    expect(puceHabillage(ligneDe(c, "Canapé"))).toBeNull();
  });
});
