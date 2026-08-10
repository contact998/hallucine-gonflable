import { describe, it, expect } from "vitest";
import {
  TYPES_COTE, COTES, TAILLES, auventPossible, typeCote,
  cleTente, cleTypeCote, cleAuvent, cleImpression, cleAccessoire,
  MODELES, modele, typePossible,
  IMPRESSIONS, ACCESSOIRES,
} from "./composition.js";

const X = modele("x");

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
    expect(cleTente(X, "4x4")).toBe("tente-x-4x4");
  });

  it("chaque type facturable a sa clé, le côté ouvert n'en a pas", () => {
    expect(cleTypeCote(X, "4x4", "vide")).toBeNull();
    expect(cleTypeCote(X, "4x4", "paroi")).toBe("tente-x-4x4-paroi");
    expect(cleTypeCote(X, "4x4", "porte")).toBe("tente-x-4x4-paroi-porte");
    expect(cleTypeCote(X, "4x4", "courbe_fenetre")).toBe("tente-x-4x4-paroi-courbe-fenetre");
    expect(cleTypeCote(X, "4x4", "jonction")).toBe("tente-x-4x4-jonction");
  });

  it("un type inconnu retombe sur « ouvert » plutôt que de fabriquer une fausse clé", () => {
    expect(typeCote("nimportequoi").valeur).toBe("vide");
    expect(cleTypeCote(X, "4x4", "nimportequoi")).toBeNull();
  });

  it("l'auvent et les impressions", () => {
    expect(cleAuvent(X, "5x5")).toBe("tente-x-5x5-auvent");
    expect(cleImpression(X, "5x5", "imp_toit")).toBe("tente-x-5x5-impression-toit");
    expect(cleImpression(X, "5x5", "imp_auv_toile")).toBe("tente-x-5x5-impression-auvent-toile");
  });

  it("les accessoires : clé fixe, sauf le lest qui dépend de la taille", () => {
    expect(cleAccessoire(X, "6x6", "acc_sac")).toBe("tente-accessoire-sac");
    expect(cleAccessoire(X, "6x6", "acc_lest_eau")).toBe("tente-x-6x6-lest-eau");
  });

  it("toute impression déclenchée par un type de côté existe dans la table", () => {
    for (const t of TYPES_COTE) {
      if (t.impression) expect(Object.keys(IMPRESSIONS)).toContain(t.impression);
    }
  });

  it("chaque accessoire sait fabriquer une clé pour toutes les tailles", () => {
    for (const taille of TAILLES) {
      for (const a of ACCESSOIRES) {
        expect(cleAccessoire(X, taille, a.valeur)).toBeTruthy();
      }
    }
  });
});

describe("la N : quelle lettre du tarif pour quel côté", () => {
  const N = modele("n");

  it("les deux côtés établis par les calques de Bayes donnent leur clé", () => {
    expect(cleTypeCote(N, "3x3", "paroi", "arriere")).toBe("tente-n-3x3-paroi-b");
    expect(cleTypeCote(N, "3x3", "porte", "avant")).toBe("tente-n-3x3-paroi-porte-d");
  });

  it("les deux longs côtés partagent la lettre A : ils sont identiques", () => {
    expect(cleTypeCote(N, "3x3", "paroi", "gauche")).toBe("tente-n-3x3-paroi-a");
    expect(cleTypeCote(N, "3x3", "paroi", "droit")).toBe("tente-n-3x3-paroi-a");
  });

  it("un côté sans lettre connue ne rend RIEN plutôt qu'une clé approchée", () => {
    expect(cleTypeCote(N, "3x3", "paroi", "nulle-part")).toBeNull();
  });

  it("la paroi courbe n'a pas de lettre : elle n'existe que sur un côté", () => {
    expect(cleTypeCote(N, "3x3", "courbe", "avant")).toBe("tente-n-3x3-paroi-courbe");
  });

  it("un type absent du tarif d'un modèle ne rend pas de clé", () => {
    expect(cleTypeCote(modele("spider"), "6x6", "courbe")).toBeNull();
    expect(cleTypeCote(modele("v"), "5x5", "porte", "a")).toBeNull();
  });
});
