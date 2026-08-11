import { describe, it, expect } from "vitest";
import { MODELES, modele } from "./composition.js";
import {
  VUE_3D, vue3d, urlPiece, echelle, pieceImprimable, MODELES_SANS_VUE,
  angleCote, pieceDeCote, ANGLE_COTE_DEFAUT,
} from "./vue3d.js";

describe("la vue 3D de chaque modèle", () => {
  it("aucun modèle vendu n'est sans vue 3D — sa page ne montrerait rien", () => {
    expect(MODELES_SANS_VUE).toEqual([]);
  });

  it("chaque dossier R2 est déclaré : il ne suit pas le slug", () => {
    expect(vue3d(modele("x")).dossier).toBe("tente-x");
    expect(vue3d(modele("spider")).dossier).toBe("spider-tent");
    expect(urlPiece(modele("spider"), "roof")).toMatch(/\/models\/spider-tent\/roof\.glb$/);
  });

  it("toute pièce proposée au choix a son azimut mesuré", () => {
    for (const m of MODELES) {
      const v = vue3d(m);
      for (const [choix, piece] of Object.entries(v.piece)) {
        if (!piece) continue;
        expect(v.angleNatif[piece], `${m.slug} · ${choix} → ${piece}`).toBeTypeOf("number");
      }
      // Les pièces propres à un côté comptent autant : ce sont elles qu'on
      // oubliait de mesurer, donc de poser.
      for (const [cote, parType] of Object.entries(v.pieceParCote ?? {}))
        for (const [choix, piece] of Object.entries(parType))
          expect(v.angleNatif[piece], `${m.slug} · ${cote} · ${choix} → ${piece}`).toBeTypeOf("number");
      if (v.pieceAuvent) expect(v.angleNatif[v.pieceAuvent]).toBeTypeOf("number");
    }
  });

  it("un modèle ne propose que des types qu'il sait dessiner", () => {
    for (const m of MODELES) {
      const dessinables = Object.keys(vue3d(m).piece);
      for (const t of m.types) expect(dessinables, `${m.slug} · ${t}`).toContain(t);
    }
  });

  it("l'échelle part de la taille que Bayes a modélisée, propre à chaque gamme", () => {
    // Bayes livre toujours la plus petite taille de la gamme
    for (const m of MODELES) {
      expect(echelle(m, m.tailles[0])).toBeCloseTo(1, 5);
      expect(vue3d(m).tailleModele).toBe(parseInt(m.tailles[0], 10));
    }
    expect(echelle(modele("x"), "6x6")).toBe(2);      // 6 m sur un modèle de 3 m
    expect(echelle(modele("spider"), "8x8")).toBe(2); // 8 m sur un modèle de 4 m
  });

  it("les azimuts restent dans le tour du cercle", () => {
    for (const m of MODELES)
      for (const [p, a] of Object.entries(vue3d(m).angleNatif))
        expect(Math.abs(a), `${m.slug} · ${p}`).toBeLessThanOrEqual(180);
  });
});

describe("la N : le prix et le dessin sur la même face", () => {
  const N = modele("n");
  const V = vue3d(N);

  it("chaque côté reçoit la toile que Bayes a faite pour LUI", () => {
    // Le pignon avant est un demi-mur (0 → 1 944 mm) que le bandeau complète ;
    // le long côté A, droit, sert la gauche et la droite.
    expect(pieceDeCote(N, "avant", "paroi")).toBe("d_half_wall");
    expect(pieceDeCote(N, "gauche", "paroi")).toBe("a_side_wall");
    expect(pieceDeCote(N, "droit", "fenetre")).toBe("a_window_wall");
  });

  it("le pignon arrière est toujours dessiné, il ne se choisit pas", () => {
    // Zéro point de fermeture éclair sur cette face : c'est la tente, pas une
    // option. Il rejoint donc le socle, avec le toit et les pieds.
    expect(V.socle).toContain("b_side_wall");
    expect([...N.cotes]).not.toContain("arriere");
  });

  it("la toile posée porte la lettre que le devis facture", () => {
    /* LE défaut qui coûtait de l'argent : le client voyait un pignon et payait
       l'autre — 40 € d'écart entre la paroi B et la paroi D en 3 × 3. */
    for (const cote of N.cotes) {
      for (const type of ["paroi", "porte", "fenetre"]) {
        const piece = pieceDeCote(N, cote, type)!;
        const lettre = N.lettreCote![cote];
        expect(piece.startsWith(`${lettre}_`), `${cote} · ${type} → ${piece} facturé « ${lettre} »`).toBe(true);
      }
    }
  });

  it("et elle tombe sur la face où le fournisseur l'a modélisée, sans détour", () => {
    // Rotation nulle = la pièce est déjà au bon endroit.
    expect(V.angleNatif.d_half_wall - angleCote(N, "avant")).toBe(0);
    expect(V.angleNatif.c_banner - angleCote(N, "avant")).toBe(0);
    expect(V.angleNatif.a_side_wall - angleCote(N, "droit")).toBe(0);
    // Sauf le long côté gauche : un seul fichier retourné sert les deux.
    expect(Math.abs(V.angleNatif.a_side_wall - angleCote(N, "gauche"))).toBe(180);
  });

  it("son avant est celui de Bayes, pas celui de la tente X", () => {
    /* Le fournisseur pose sa façade à l'azimut 0, la X y a son arrière. On
       tourne les NOMS d'un demi-tour plutôt que de toucher à une mesure. */
    expect(angleCote(N, "avant")).toBe(0);
    expect(angleCote(modele("x"), "avant")).toBe(180);
    // Un demi-tour complet, pas un miroir : la gauche et la droite suivent.
    for (const cote of N.cotes)
      expect(Math.abs(angleCote(N, cote) - ANGLE_COTE_DEFAUT[cote]), cote).toBe(180);
  });

  it("les modèles sans façade déclarée gardent la convention commune", () => {
    for (const s of ["x", "spider"])
      for (const cote of ["avant", "droit", "arriere", "gauche"])
        expect(angleCote(modele(s), cote), `${s} · ${cote}`).toBe(ANGLE_COTE_DEFAUT[cote]);
  });
});

describe("la V : trois côtés à 120°, hors de la table commune", () => {
  const V = modele("v");
  const vue = vue3d(V);

  it("aucun de ses côtés n'est dans la table commune — le piège du 10/08", () => {
    /* a, b, c ne sont ni avant, ni droit, ni arrière, ni gauche : sans azimut
       déclaré, `angleCote` rendait son défaut, zéro, pour les trois. Les trois
       parois se posaient au même endroit et de travers. */
    for (const cote of V.cotes)
      expect(ANGLE_COTE_DEFAUT[cote], cote).toBeUndefined();
  });

  it("chacun a donc son azimut mesuré, sinon il retomberait à zéro", () => {
    for (const cote of V.cotes)
      expect(vue.angleCote?.[cote], cote).toBeTypeOf("number");
  });

  it("les trois parois se posent chacune sur SON côté, à 120° l'une de l'autre", () => {
    // Ce que le viewer applique : angle du fichier − angle du côté visé.
    const rotation = (cote: string) => vue.angleNatif.side_wall - angleCote(V, cote);
    expect(rotation("a")).toBe(0); // la paroi est déjà là dans le fichier
    expect(rotation("b")).toBe(-120);
    expect(rotation("c")).toBe(120);
    expect(new Set(V.cotes.map(rotation)).size).toBe(3);
  });
});

describe("les pièces qui ne peuvent pas recevoir d'image", () => {
  it("la structure n'est imprimable chez AUCUN modèle : elle vient du STEP", () => {
    for (const m of MODELES) expect(pieceImprimable(m, "LEG"), m.slug).toBe(false);
  });

  it("le toit l'est chez tous : il vient du Rhino, avec ses gabarits", () => {
    for (const m of MODELES) expect(pieceImprimable(m, "roof"), m.slug).toBe(true);
  });

  it("le cache-zip n'est imprimable que sur la tente X", () => {
    // Bayes le maille dans le Rhino de la X, pas dans celui des trois autres.
    expect(pieceImprimable(modele("x"), "zipper_cover")).toBe(true);
    for (const s of ["spider", "n", "v"])
      expect(pieceImprimable(modele(s), "zipper_cover"), s).toBe(false);
  });

  it("une pièce non listée est imprimable — on n'interdit que ce qui est mesuré", () => {
    expect(pieceImprimable(modele("x"), "side_wall")).toBe(true);
  });
});
