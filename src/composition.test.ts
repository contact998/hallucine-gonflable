import { describe, it, expect } from "vitest";
import {
  TYPES_COTE, COTES, TAILLES, auventPossible, typeCote,
  cleTente, cleTypeCote, cleAuvent, cleImpression, cleAccessoire,
  MODELES, modele, typePossible, demiMurPossible, typesDemiMur, cleDemiMur, cleRepliCote,
  IMPRESSIONS, ACCESSOIRES, impressionsCote,
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

  it("imprimer une porte cherche son propre tarif, puis retombe sur la paroi", () => {
    expect(impressionsCote("porte")).toEqual(["imp_paroi_porte", "imp_paroi"]);
    /* Le repli est la moitié qui compte : sans lui, une tente dont le tarif ne
       distingue pas les deux n'aurait plus AUCUN prix pour sa porte imprimée. */
    expect(impressionsCote("paroi")).toEqual(["imp_paroi"]);
    expect(impressionsCote("courbe")).toEqual(["imp_courbe"]);
    expect(impressionsCote("jonction")).toEqual([]);
    expect(impressionsCote("vide")).toEqual([]);
  });

  it("toute impression proposée par un côté existe dans la table", () => {
    for (const t of TYPES_COTE) {
      for (const i of impressionsCote(t.valeur)) {
        expect(Object.keys(IMPRESSIONS)).toContain(i);
      }
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

  it("les DEUX pignons portent la paroi entière B — dit par Bayes le 11/08", () => {
    /* Le D n'est pas la paroi du pignon avant : c'est le demi-mur en option
       sous le bandeau. La confusion facturait l'avant 430 € au lieu de 470. */
    expect(cleTypeCote(N, "3x3", "paroi", "arriere")).toBe("tente-n-3x3-paroi-b");
    expect(cleTypeCote(N, "3x3", "paroi", "avant")).toBe("tente-n-3x3-paroi-b");
    expect(cleTypeCote(N, "3x3", "porte", "avant")).toBe("tente-n-3x3-paroi-porte-b");
  });

  it("les deux longs côtés partagent la lettre A : ils sont identiques", () => {
    expect(cleTypeCote(N, "3x3", "paroi", "gauche")).toBe("tente-n-3x3-paroi-a");
    expect(cleTypeCote(N, "3x3", "paroi", "droit")).toBe("tente-n-3x3-paroi-a");
  });

  it("un côté sans lettre connue ne rend RIEN plutôt qu'une clé approchée", () => {
    expect(cleTypeCote(N, "3x3", "paroi", "nulle-part")).toBeNull();
  });

  it("le bandeau courbe est un CHOIX de pignon, sans lettre au tarif", () => {
    expect(typePossible(N, "courbe", "avant")).toBe(true);
    expect(cleTypeCote(N, "3x3", "courbe", "avant")).toBe("tente-n-3x3-paroi-courbe");
  });

  it("mais pas sur un long côté : il n'y a pas d'arc à fermer", () => {
    for (const cote of ["gauche", "droit"])
      expect(typePossible(N, "courbe", cote), cote).toBe(false);
  });

  it("le DEMI-MUR ne se pose que sous le bandeau, et que sur le pignon avant", () => {
    /* C'est le bandeau qui porte la bande de zip sur laquelle il s'accroche —
       dit par Bayes : « quand l'avant porte le bandeau C, il y a une bande de
       zip et le demi-mur D devient une option ». */
    expect(demiMurPossible(N, "avant", "courbe")).toBe(true);
    for (const type of ["vide", "paroi", "porte", "fenetre"])
      expect(demiMurPossible(N, "avant", type), type).toBe(false);
    expect(demiMurPossible(N, "arriere", "courbe")).toBe(false);
    expect(demiMurPossible(N, "gauche", "courbe")).toBe(false);
  });

  it("il a ses trois variantes au tarif, comme une paroi", () => {
    expect(cleDemiMur(N, "3x3", "paroi")).toBe("tente-n-3x3-paroi-d");
    expect(cleDemiMur(N, "3x3", "porte")).toBe("tente-n-3x3-paroi-porte-d");
    expect(cleDemiMur(N, "3x3", "fenetre")).toBe("tente-n-3x3-paroi-fenetre-d");
    expect(cleDemiMur(N, "3x3", "vide")).toBeNull();
    expect(typesDemiMur(N)).toContain("porte");
  });

  it("les modèles sans demi-mur n'en portent nulle part", () => {
    for (const cote of X.cotes) expect(demiMurPossible(X, cote, "courbe"), cote).toBe(false);
    expect(cleDemiMur(X, "4x4", "paroi")).toBeNull();
    // La X garde SA paroi courbe, qui est une paroi entière — 35 → 1 919 mm —
    // et non un bandeau : deux produits différents sous un nom voisin.
    expect(typePossible(X, "courbe")).toBe(true);
    expect(cleTypeCote(X, "4x4", "courbe")).toBe("tente-x-4x4-paroi-courbe");
  });

  it("un type absent du tarif d'un modèle ne rend pas de clé", () => {
    expect(cleTypeCote(modele("spider"), "6x6", "courbe")).toBeNull();
    expect(cleTypeCote(modele("v"), "5x5", "porte", "a")).toBeNull();
  });
});

describe("la taille d'ouverture", () => {
  it("chaque modèle ouvre sur une taille qu'il vend vraiment", () => {
    for (const m of MODELES) expect(m.tailles, m.slug).toContain(m.tailleDefaut);
  });

  it("la tente X ouvre sur la 4 × 4, pas sur la plus petite — choix commercial", () => {
    expect(modele("x").tailleDefaut).toBe("4x4");
  });
});

describe("le dessin fait foi : un choix livré mais pas encore tarifé", () => {
  /* Décision de Daniel, 11/08/2026. Une pièce que Bayes modélise est un
     produit. La cacher parce qu'une ligne manque au tarif coûte plus cher
     qu'afficher un prix à confirmer — vécu sur la porte de la V et les deux
     parois courbes du Spider, dormantes depuis l'ouverture de la gamme. */
  it("la V n'a pas de porte au tarif, donc pas de clé directe", () => {
    expect(cleTypeCote(modele("v"), "4x4", "porte", "a")).toBeNull();
  });

  it("mais elle a un repli : la paroi pleine de la même taille", () => {
    expect(cleRepliCote(modele("v"), "4x4")).toBe("tente-v-4x4-paroi");
    expect(cleRepliCote(modele("v"), "6x6")).toBe("tente-v-6x6-paroi");
  });

  it("le repli suit le côté chez un modèle facturé par côté", () => {
    // Chez la N, un repli sans lettre trouverait le prix d'un AUTRE pignon.
    expect(cleRepliCote(modele("n"), "3x3", "avant")).toBe("tente-n-3x3-paroi-b");
    expect(cleRepliCote(modele("n"), "3x3", "arriere")).toBe("tente-n-3x3-paroi-b");
    expect(cleRepliCote(modele("n"), "3x3")).toBeNull();
  });

  it("un modèle qui vend déjà le choix n'a pas besoin du repli", () => {
    expect(cleTypeCote(X, "4x4", "porte")).toBe("tente-x-4x4-paroi-porte");
  });
});
