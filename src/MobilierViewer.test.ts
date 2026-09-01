/*
 * Le comptage des pièces d'abri manquées.
 *
 * La scène 3D elle-même n'est pas montable ici (WebGL, pas de DOM) : ce test ne
 * couvre que la décision PURE qui a manqué au constat — combien de pièces
 * d'abri sont tombées au chargement. C'est ce nombre qui, ajouté au compteur
 * des meubles, fait dire à la bannière qu'une tente est PARTIELLE au lieu de la
 * laisser béante et muette.
 */
import { describe, it, expect } from "vitest";
import { echecsAbri } from "./MobilierViewer.js";

describe("echecsAbri", () => {
  it("compte les pièces tombées, à travers toutes les tentes de la rangée", () => {
    /* Deux tentes : la première a perdu une paroi, la seconde deux. */
    const charges = [
      [{ nom: "roof" }, null, { nom: "feet" }],
      [null, { nom: "roof" }, null],
    ];
    expect(echecsAbri(charges)).toBe(3);
  });

  it("aucune manquée = zéro : pas de bannière quand la tente est entière", () => {
    expect(echecsAbri([[{ nom: "roof" }], [{ nom: "roof" }]])).toBe(0);
  });

  it("une rangée vide ne compte rien", () => {
    expect(echecsAbri([])).toBe(0);
  });
});
