import { describe, it, expect } from "vitest";
import {
  TYPES_COTE, COTES, TAILLES, auventPossible, typeCote,
  cleTente, cleTypeCote, cleAuvent, cleImpression, cleAccessoire,
  IMPRESSIONS, ACCESSOIRES,
} from "./composition";

describe("les règles de fabrication", () => {
  it("l'auvent se monte sur un côté ouvert ou sur une paroi droite", () => {
    // Il se CUMULE : ce n'est pas un type de côté, il se pose par-dessus.
    for (const type of ["vide", "paroi", "porte", "fenetre"]) {
      expect(auventPossible(type)).toBe(true);
    }
  });

  it("jamais sur une courbe — le bandeau déborde, l'auvent n'a pas où se fixer", () => {
    expect(auventPossible("courbe")).toBe(false);
    expect(auventPossible("courbe_fenetre")).toBe(false);
  });

  it("jamais sur une jonction — ce côté est collé à une autre tente", () => {
    expect(auventPossible("jonction")).toBe(false);
  });

  it("les trois interdits retirés le 08/08 ne reviennent pas", () => {
    /* Quatre parois + un auvent : la règle des « 4 éléments » l'interdisait.
       C'est une tente ordinaire. */
    const quatreParois = COTES.map(() => "paroi");
    expect(quatreParois.every((t) => auventPossible(t))).toBe(true);

    /* Deux portes sur une 3×3 : la taille ne change pas ce qu'un côté reçoit. */
    expect(auventPossible("porte")).toBe(true);
    expect(TAILLES).toContain("3x3");

    /* Un auvent ailleurs quand un côté est en jonction : les deux côtés n'ont
       aucun rapport. La règle ne regarde QUE le côté qu'on lui donne. */
    expect(auventPossible("paroi")).toBe(true);
  });

  it("un côté porte un seul type — d'où l'inutilité d'interdire porte + jonction", () => {
    const valeurs = TYPES_COTE.map((t) => t.valeur);
    expect(new Set(valeurs).size).toBe(valeurs.length);
    // « jonction » et « porte » sont deux valeurs du même champ : exclusives.
    expect(valeurs).toContain("jonction");
    expect(valeurs).toContain("porte");
  });
});

describe("les clés du catalogue — le contrat avec le CRM", () => {
  it("la tente nue", () => {
    expect(cleTente("4x4")).toBe("tente-x-4x4");
  });

  it("chaque type facturable a sa clé, le côté ouvert n'en a pas", () => {
    expect(cleTypeCote("4x4", "vide")).toBeNull();
    expect(cleTypeCote("4x4", "paroi")).toBe("tente-x-4x4-paroi");
    expect(cleTypeCote("4x4", "porte")).toBe("tente-x-4x4-paroi-porte");
    expect(cleTypeCote("4x4", "courbe_fenetre")).toBe("tente-x-4x4-paroi-courbe-fenetre");
    expect(cleTypeCote("4x4", "jonction")).toBe("tente-x-4x4-jonction");
  });

  it("un type inconnu retombe sur « ouvert » plutôt que de fabriquer une fausse clé", () => {
    expect(typeCote("nimportequoi").valeur).toBe("vide");
    expect(cleTypeCote("4x4", "nimportequoi")).toBeNull();
  });

  it("l'auvent et les impressions", () => {
    expect(cleAuvent("5x5")).toBe("tente-x-5x5-auvent");
    expect(cleImpression("5x5", "imp_toit")).toBe("tente-x-5x5-impression-toit");
    expect(cleImpression("5x5", "imp_auv_toile")).toBe("tente-x-5x5-impression-auvent-toile");
  });

  it("les accessoires : clé fixe, sauf le lest qui dépend de la taille", () => {
    expect(cleAccessoire("6x6", "acc_sac")).toBe("tente-accessoire-sac");
    expect(cleAccessoire("6x6", "acc_lest_eau")).toBe("tente-x-6x6-lest-eau");
  });

  it("toute impression déclenchée par un type de côté existe dans la table", () => {
    for (const t of TYPES_COTE) {
      if (t.impression) expect(Object.keys(IMPRESSIONS)).toContain(t.impression);
    }
  });

  it("chaque accessoire sait fabriquer une clé pour toutes les tailles", () => {
    for (const taille of TAILLES) {
      for (const a of ACCESSOIRES) {
        expect(cleAccessoire(taille, a.valeur)).toBeTruthy();
      }
    }
  });
});
