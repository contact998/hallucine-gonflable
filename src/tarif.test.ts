import { describe, expect, it } from "vitest";
import { lignesTarifTente, totalTenteComposee, totalLignesTarif } from "./tarif.js";
import type { ConfigTente } from "./config.js";
import {
  modele, cleTente, cleTypeCote, cleRepliCote, cleAuvent, cleDemiMur, cleImpression, cleAccessoire,
} from "./composition.js";

/*
 * Le calcul vivait dans la page du configurateur du site (70 lignes de useMemo
 * mêlées aux traductions) : le lounge ne pouvait pas chiffrer une tente
 * composée. Ces tests décrivent le comportement EXACT de la page — chaque cas
 * reprend une décision déjà prise là-bas, aucun n'en invente.
 */

/** Table de prix jouet — les clés sont fabriquées par les MÊMES fonctions que
 *  la vraie table du CRM, jamais recopiées à la main. */
const table = (t: Record<string, number>) => (slug: string): number | null => t[slug] ?? null;

const X = modele("x");
const N = modele("n");

/** Une X 4x4 nue, à compléter par cas. */
const cfg = (sur: Partial<ConfigTente> = {}): ConfigTente => ({
  modele: "x",
  taille: "4x4",
  cotes: { avant: "vide", droit: "vide", arriere: "vide", gauche: "vide" },
  auvents: { avant: false, droit: false, arriere: false, gauche: false },
  demiMurs: { avant: "vide", droit: "vide", arriere: "vide", gauche: "vide" },
  options: [],
  ...sur,
});

describe("la tente nue", () => {
  it("une seule ligne : le pack de base", () => {
    const prixDe = table({ [cleTente(X, "4x4")]: 3200 });
    const lignes = lignesTarifTente(cfg(), prixDe);
    expect(lignes).toEqual([{ genre: "base", prix: 3200, slug: cleTente(X, "4x4") }]);
    expect(totalTenteComposee(cfg(), prixDe)).toBe(3200);
  });

  it("pack absent du tarif : total INCONNU, jamais zéro", () => {
    const prixDe = table({ [cleTypeCote(X, "4x4", "paroi", "avant")!]: 260 });
    expect(totalTenteComposee(cfg({ cotes: { avant: "paroi", droit: "vide", arriere: "vide", gauche: "vide" } }), prixDe)).toBeNull();
  });
});

describe("les côtés", () => {
  it("un côté au tarif : sa ligne, non provisoire, avec son libellé", () => {
    const prixDe = table({
      [cleTente(X, "4x4")]: 3200,
      [cleTypeCote(X, "4x4", "paroi", "avant")!]: 260,
    });
    const lignes = lignesTarifTente(cfg({ cotes: { avant: "paroi", droit: "vide", arriere: "vide", gauche: "vide" } }), prixDe);
    expect(lignes).toEqual([
      { genre: "base", prix: 3200, slug: cleTente(X, "4x4") },
      { genre: "cote", cote: "avant", cle: "choix_paroi", provisoire: false, prix: 260, slug: cleTypeCote(X, "4x4", "paroi", "avant") },
    ]);
  });

  it("un choix dessinable SANS ligne au tarif prend le prix de la paroi pleine, marqué provisoire", () => {
    const prixDe = table({
      [cleTente(X, "4x4")]: 3200,
      [cleTypeCote(X, "4x4", "paroi", "avant")!]: 260,
      // pas de ligne pour la porte : le dessin fait foi, le repli chiffre
    });
    const lignes = lignesTarifTente(cfg({ cotes: { avant: "porte", droit: "vide", arriere: "vide", gauche: "vide" } }), prixDe);
    // Chiffré par le repli : c'est la référence de la PAROI qui partira au devis,
    // pas celle de la porte — le tarif ne la connaît pas.
    expect(lignes).toContainEqual({ genre: "cote", cote: "avant", cle: "choix_porte", provisoire: true, prix: 260, slug: cleRepliCote(X, "4x4", "avant") });
  });

  it("ni ligne directe ni repli : pas de ligne du tout, le prix manquant se voit ailleurs", () => {
    const prixDe = table({ [cleTente(X, "4x4")]: 3200 });
    const lignes = lignesTarifTente(cfg({ cotes: { avant: "porte", droit: "vide", arriere: "vide", gauche: "vide" } }), prixDe);
    expect(lignes).toEqual([{ genre: "base", prix: 3200, slug: cleTente(X, "4x4") }]);
  });

  it("l'auvent s'ajoute au-dessus du choix du côté", () => {
    const prixDe = table({
      [cleTente(X, "4x4")]: 3200,
      [cleAuvent(X, "4x4")]: 180,
    });
    const lignes = lignesTarifTente(cfg({ auvents: { avant: true, droit: false, arriere: false, gauche: false } }), prixDe);
    expect(lignes).toContainEqual({ genre: "auvent", cote: "avant", prix: 180, slug: cleAuvent(X, "4x4") });
  });
});

describe("le demi-mur de la N", () => {
  const base = (): ConfigTente => cfg({
    modele: "n",
    taille: "3x3",
    cotes: { avant: "courbe", droit: "vide", arriere: "vide", gauche: "vide" },
    demiMurs: { avant: "porte", droit: "vide", arriere: "vide", gauche: "vide" },
  });

  it("le bandeau et son demi-mur font chacun leur ligne", () => {
    const prixDe = table({
      [cleTente(N, "3x3")]: 2800,
      [cleTypeCote(N, "3x3", "courbe", "avant")!]: 300,
      [cleDemiMur(N, "3x3", "porte")!]: 220,
    });
    const lignes = lignesTarifTente(base(), prixDe);
    expect(lignes).toEqual([
      { genre: "base", prix: 2800, slug: cleTente(N, "3x3") },
      { genre: "cote", cote: "avant", cle: "choix_courbe", provisoire: false, prix: 300, slug: cleTypeCote(N, "3x3", "courbe", "avant") },
      { genre: "demi_mur", cote: "avant", cle: "choix_porte", prix: 220, slug: cleDemiMur(N, "3x3", "porte") },
    ]);
  });

  it("imprimer ce côté imprime AUSSI le demi-mur — deux lignes d'impression", () => {
    const prixDe = table({
      [cleTente(N, "3x3")]: 2800,
      [cleTypeCote(N, "3x3", "courbe", "avant")!]: 300,
      [cleDemiMur(N, "3x3", "porte")!]: 220,
      [cleImpression(N, "3x3", "imp_courbe")]: 90,
      [cleImpression(N, "3x3", "imp_paroi")]: 80,
    });
    const lignes = lignesTarifTente(base(), prixDe, { avant: true });
    expect(lignes).toContainEqual({ genre: "impression_cote", cote: "avant", prix: 90, slug: cleImpression(N, "3x3", "imp_courbe") });
    expect(lignes).toContainEqual({ genre: "impression_demi_mur", cote: "avant", prix: 80, slug: cleImpression(N, "3x3", "imp_paroi") });
  });
});

describe("l'impression par côté de la N — le tarif réel n'a que des clés lettrées", () => {
  /* Le vrai tarif de la N (relevé du 02/09/2026) ne porte AUCUNE clé générique
     `impression-paroi` : imprimer un long côté vaut `impression-paroi-a`, un
     pignon `-b`, le demi-mur `-d`. Sans la lettre, ces lignes tombaient du
     devis — l'impression d'une paroi de N partait gratuite, sans un signal. */
  it("chaque côté imprimé chiffre par SA clé lettrée, le demi-mur par la sienne", () => {
    const prixDe = table({
      [cleTente(N, "3x3")]: 2800,
      [cleTypeCote(N, "3x3", "courbe", "avant")!]: 300,
      [cleTypeCote(N, "3x3", "paroi", "gauche")!]: 460,
      [cleDemiMur(N, "3x3", "porte")!]: 220,
      "tente-n-3x3-impression-paroi-a": 130,
      "tente-n-3x3-impression-paroi-courbe": 80,
      "tente-n-3x3-impression-paroi-d": 130,
    });
    const lignes = lignesTarifTente(cfg({
      modele: "n",
      taille: "3x3",
      cotes: { avant: "courbe", droit: "vide", arriere: "vide", gauche: "paroi" },
      demiMurs: { avant: "porte", droit: "vide", arriere: "vide", gauche: "vide" },
    }), prixDe, { avant: true, gauche: true });
    expect(lignes).toContainEqual({ genre: "impression_cote", cote: "avant", prix: 80, slug: "tente-n-3x3-impression-paroi-courbe" });
    expect(lignes).toContainEqual({ genre: "impression_cote", cote: "gauche", prix: 130, slug: "tente-n-3x3-impression-paroi-a" });
    expect(lignes).toContainEqual({ genre: "impression_demi_mur", cote: "avant", prix: 130, slug: "tente-n-3x3-impression-paroi-d" });
  });

  it("la clé lettrée PRIME sur la générique quand les deux existent", () => {
    const prixDe = table({
      [cleTente(N, "3x3")]: 2800,
      [cleTypeCote(N, "3x3", "paroi", "avant")!]: 470,
      "tente-n-3x3-impression-paroi-b": 150,
      [cleImpression(N, "3x3", "imp_paroi")]: 999,
    });
    const lignes = lignesTarifTente(cfg({
      modele: "n",
      taille: "3x3",
      cotes: { avant: "paroi", droit: "vide", arriere: "vide", gauche: "vide" },
    }), prixDe, { avant: true });
    expect(lignes).toContainEqual({ genre: "impression_cote", cote: "avant", prix: 150, slug: "tente-n-3x3-impression-paroi-b" });
  });
});

describe("l'impression d'un côté ordinaire", () => {
  it("cochée, elle chiffre avec l'impression la plus précise que le tarif connaisse", () => {
    const prixDe = table({
      [cleTente(X, "4x4")]: 3200,
      [cleTypeCote(X, "4x4", "paroi", "avant")!]: 260,
      [cleImpression(X, "4x4", "imp_paroi")]: 80,
    });
    const lignes = lignesTarifTente(cfg({ cotes: { avant: "paroi", droit: "vide", arriere: "vide", gauche: "vide" } }), prixDe, { avant: true });
    expect(lignes).toContainEqual({ genre: "impression_cote", cote: "avant", prix: 80, slug: cleImpression(X, "4x4", "imp_paroi") });
  });

  it("non cochée, rien — l'impression par côté ne voyage pas dans le code", () => {
    const prixDe = table({
      [cleTente(X, "4x4")]: 3200,
      [cleTypeCote(X, "4x4", "paroi", "avant")!]: 260,
      [cleImpression(X, "4x4", "imp_paroi")]: 80,
    });
    const lignes = lignesTarifTente(cfg({ cotes: { avant: "paroi", droit: "vide", arriere: "vide", gauche: "vide" } }), prixDe);
    expect(lignes.some((l) => l.genre === "impression_cote")).toBe(false);
  });
});

describe("les options", () => {
  it("impression du socle cochée et au tarif : sa ligne", () => {
    const prixDe = table({
      [cleTente(X, "4x4")]: 3200,
      [cleImpression(X, "4x4", "imp_toit")]: 350,
    });
    const lignes = lignesTarifTente(cfg({ options: ["imp_toit"] }), prixDe);
    expect(lignes).toContainEqual({ genre: "impression", cle: "imp_toit", prix: 350, slug: cleImpression(X, "4x4", "imp_toit") });
  });

  it("une impression d'auvent SANS auvent posé ne chiffre pas — même restée dans le code", () => {
    const prixDe = table({
      [cleTente(X, "4x4")]: 3200,
      [cleImpression(X, "4x4", "imp_auv_bandeau")]: 120,
    });
    const lignes = lignesTarifTente(cfg({ options: ["imp_auv_bandeau"] }), prixDe);
    expect(lignes.some((l) => l.genre === "impression")).toBe(false);
  });

  it("la même, avec l'auvent posé : elle chiffre", () => {
    const prixDe = table({
      [cleTente(X, "4x4")]: 3200,
      [cleImpression(X, "4x4", "imp_auv_bandeau")]: 120,
      [cleAuvent(X, "4x4")]: 180,
    });
    const lignes = lignesTarifTente(
      cfg({ options: ["imp_auv_bandeau"], auvents: { avant: true, droit: false, arriere: false, gauche: false } }),
      prixDe,
    );
    expect(lignes).toContainEqual({ genre: "impression", cle: "imp_auv_bandeau", prix: 120, slug: cleImpression(X, "4x4", "imp_auv_bandeau") });
  });

  it("un accessoire coché et au tarif : sa ligne", () => {
    const prixDe = table({
      [cleTente(X, "4x4")]: 3200,
      [cleAccessoire(X, "4x4", "acc_sac")!]: 45,
    });
    const lignes = lignesTarifTente(cfg({ options: ["acc_sac"] }), prixDe);
    expect(lignes).toContainEqual({ genre: "accessoire", cle: "acc_sac", prix: 45, slug: cleAccessoire(X, "4x4", "acc_sac")! });
  });
});

describe("le total d'une tente composée", () => {
  it("somme des lignes connues — c'est le total que la page du configurateur affiche", () => {
    const prixDe = table({
      [cleTente(X, "4x4")]: 3200,
      [cleTypeCote(X, "4x4", "paroi", "avant")!]: 260,
      [cleTypeCote(X, "4x4", "paroi", "gauche")!]: 260,
      [cleAuvent(X, "4x4")]: 180,
      [cleAccessoire(X, "4x4", "acc_sac")!]: 45,
    });
    const c = cfg({
      cotes: { avant: "paroi", droit: "vide", arriere: "vide", gauche: "paroi" },
      auvents: { avant: false, droit: true, arriere: false, gauche: false },
      options: ["acc_sac"],
    });
    expect(totalTenteComposee(c, prixDe)).toBe(3200 + 260 + 260 + 180 + 45);
  });
});

/*
 * La RANGÉE. Le site montrait une jonction, dessinait la voisine en fantôme, et
 * chiffrait UNE tente : le client repartait avec le prix de la moitié de ce
 * qu'il regardait. Le CRM, lui, comptait juste depuis le premier jour — ces
 * tests décrivent les mêmes règles, ici, pour que les deux comptent pareil.
 */
describe("la rangée de tentes", () => {
  /** Une X 4x4 dont le côté GAUCHE est en jonction — l'axe de la rangée. */
  const rangee = (nb: number, sur: Partial<ConfigTente> = {}) =>
    cfg({
      cotes: { avant: "vide", droit: "paroi", arriere: "vide", gauche: "jonction" },
      nb,
      ...sur,
    });

  const prixDe = table({
    [cleTente(X, "4x4")]: 3200,
    [cleTypeCote(X, "4x4", "jonction", "gauche")!]: 190,
    [cleTypeCote(X, "4x4", "paroi", "droit")!]: 260,
    [cleTypeCote(X, "4x4", "paroi", "gauche")!]: 260,
    [cleAccessoire(X, "4x4", "acc_sac")!]: 45,
    [cleImpression(X, "4x4", "imp_jonction")]: 50,
  });

  it("nb absent ou 1 : le détail d'UNE tente, mot pour mot", () => {
    const seule = lignesTarifTente(rangee(1), prixDe);
    expect(lignesTarifTente(rangee(1, { nb: undefined }), prixDe)).toEqual(seule);
    expect(seule.every((l) => l.quantite === undefined)).toBe(true);
  });

  it("trois tentes : le pack se compte trois fois, la jonction DEUX", () => {
    const lignes = lignesTarifTente(rangee(3), prixDe);
    expect(lignes).toContainEqual({ genre: "base", prix: 3200, quantite: 3, slug: cleTente(X, "4x4") });
    expect(lignes).toContainEqual(
      { genre: "cote", cote: "gauche", cle: "choix_jonction", provisoire: false, prix: 190, quantite: 2, slug: cleTypeCote(X, "4x4", "jonction", "gauche") },
    );
  });

  it("le côté opposé ferme les DEUX bouts — sa paroi se compte deux fois, jamais trois", () => {
    const lignes = lignesTarifTente(rangee(3), prixDe);
    const bouts = lignes.filter((l) => l.genre === "cote" && l.cle === "choix_paroi");
    expect(bouts.reduce((s, l) => s + (l.quantite ?? 1), 0)).toBe(2);
  });

  it("les accessoires ne se comptent qu'une fois : ils sont réglés pour l'ensemble", () => {
    const lignes = lignesTarifTente(rangee(4, { options: ["acc_sac"] }), prixDe);
    expect(lignes).toContainEqual({ genre: "accessoire", cle: "acc_sac", prix: 45, slug: cleAccessoire(X, "4x4", "acc_sac")! });
  });

  it("l'impression de jonction suit les jonctions, pas les tentes", () => {
    const lignes = lignesTarifTente(rangee(3, { options: ["imp_jonction"] }), prixDe);
    expect(lignes).toContainEqual({ genre: "impression", cle: "imp_jonction", prix: 50, quantite: 2, slug: cleImpression(X, "4x4", "imp_jonction") });
  });

  it("le total compte les quantités — et vaut n fois le pack, plus les bouts", () => {
    expect(totalTenteComposee(rangee(3), prixDe)).toBe(3 * 3200 + 2 * 190 + 2 * 260);
    expect(totalLignesTarif(lignesTarifTente(rangee(3), prixDe)))
      .toBe(totalTenteComposee(rangee(3), prixDe));
  });

  it("sans jonction, le nombre ne chiffre rien : une tente reste une tente", () => {
    const sansJonction = cfg({ cotes: { avant: "vide", droit: "paroi", arriere: "vide", gauche: "paroi" }, nb: 5 });
    expect(totalTenteComposee(sansJonction, prixDe)).toBe(3200 + 260 + 260);
  });

  it("un nombre trafiqué est borné : jamais zéro tente, jamais mille", () => {
    expect(totalTenteComposee(rangee(0), prixDe)).toBe(totalTenteComposee(rangee(1), prixDe));
    expect(totalTenteComposee(rangee(999), prixDe)).toBe(totalTenteComposee(rangee(10), prixDe));
  });
});

describe("l'ordre du détail d'une rangée", () => {
  it("le mur qui ferme le bout reste avec les CÔTÉS, jamais derrière les accessoires", () => {
    const prixDe = table({
      [cleTente(X, "4x4")]: 3200,
      [cleTypeCote(X, "4x4", "jonction", "gauche")!]: 190,
      [cleTypeCote(X, "4x4", "paroi", "droit")!]: 260,
      [cleTypeCote(X, "4x4", "paroi", "gauche")!]: 260,
      [cleAccessoire(X, "4x4", "acc_sac")!]: 45,
    });
    const lignes = lignesTarifTente(
      cfg({
        cotes: { avant: "vide", droit: "paroi", arriere: "vide", gauche: "jonction" },
        options: ["acc_sac"],
        nb: 3,
      }),
      prixDe,
    );
    const genres = lignes.map((l) => l.genre);
    expect(genres[0]).toBe("base");
    expect(genres[genres.length - 1]).toBe("accessoire");
    // Les deux bouts se suivent sur leur côté : jonction d'abord, mur ensuite.
    expect(lignes.filter((l) => l.cote === "gauche").map((l) => l.cle))
      .toEqual(["choix_jonction", "choix_paroi"]);
  });
});
