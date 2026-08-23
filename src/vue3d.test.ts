import { describe, it, expect } from "vitest";
import { MODELES, modele } from "./composition.js";
import {
  VUE_3D, vue3d, urlPiece, echelle, pieceImprimable, MODELES_SANS_VUE,
  angleCote, pieceDeCote, ANGLE_COTE_DEFAUT, estPiece, porteLisere, porteVitre, dessinable,
  pieceDemiMur as pieceDemiMurDe, decalageVoisin, piecesAbri, axeRangee, rangeeAbri,
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
    /* Les deux pignons portent la MÊME paroi entière — la B, 0 → 2 547 mm,
       jusqu'à la voûte. Le long côté A, droit et plus bas, sert les deux
       autres. Le demi-mur D n'est pas une paroi de pignon : il se pose sous le
       bandeau, et il a sa propre table. */
    expect(pieceDeCote(N, "avant", "paroi")).toBe("b_side_wall");
    expect(pieceDeCote(N, "arriere", "paroi")).toBe("b_side_wall");
    expect(pieceDeCote(N, "gauche", "paroi")).toBe("a_side_wall");
    expect(pieceDeCote(N, "droit", "fenetre")).toBe("a_window_wall");
  });

  it("le demi-mur a ses trois toiles, et elles ne servent qu'à lui", () => {
    expect(pieceDemiMurDe(N, "paroi")).toBe("d_half_wall");
    expect(pieceDemiMurDe(N, "porte")).toBe("d_half_door");
    expect(pieceDemiMurDe(N, "fenetre")).toBe("d_half_window_wall");
    expect(pieceDemiMurDe(N, "vide")).toBeNull();
    expect(pieceDemiMurDe(modele("x"), "paroi")).toBeNull();
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
    expect(V.angleNatif.b_side_wall - angleCote(N, "arriere")).toBe(0);
    expect(V.angleNatif.a_side_wall - angleCote(N, "droit")).toBe(0);
    // Sauf le long côté gauche : un seul fichier retourné sert les deux.
    expect(Math.abs(V.angleNatif.a_side_wall - angleCote(N, "gauche"))).toBe(180);
  });

  it("le bandeau courbe se pose sur l'un ou l'autre pignon", () => {
    expect(V.angleNatif.c_banner - angleCote(N, "avant")).toBe(0);
    expect(Math.abs(V.angleNatif.c_banner - angleCote(N, "arriere"))).toBe(180);
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

describe("zip et vitre : la NATURE de la pièce, pas son nom", () => {
  it("les panneaux de la tente X gardent leur liseré", () => {
    for (const p of ["side_wall", "door", "window_wall", "wall_curved1", "awning", "junction"])
      expect(porteLisere(p), p).toBe(true);
  });

  it("ceux de la N aussi, alors qu'ils portent leur côté en préfixe", () => {
    /* LE défaut : la règle était en égalité stricte sur les noms de la X. Une
       porte de la N s'affichait donc sans la moindre couture — un mur plein. */
    for (const p of ["a_side_wall", "a_door", "b_door", "b_window_wall", "d_half_wall", "d_half_door", "c_banner"])
      expect(porteLisere(p), p).toBe(true);
  });

  it("la quincaillerie n'en porte pas : elle ne se dézippe pas", () => {
    for (const p of ["roof", "LEG", "zipper_cover", "window_pvc"])
      expect(porteLisere(p), p).toBe(false);
  });

  it("la vitre se cherche sur toute paroi à fenêtre, quel que soit son côté", () => {
    expect(porteVitre("window_wall")).toBe(true);
    expect(porteVitre("a_window_wall")).toBe(true);
    expect(porteVitre("b_window_wall")).toBe(true);
    // Fondue dans un morceau unique chez Bayes : rien à repérer, mais la règle
    // le laisse passer — `marquerVitre` s'arrête tout seul faute de morceaux.
    expect(porteVitre("d_half_window_wall")).toBe(true);
  });

  it("mais pas sur une paroi pleine ni sur une porte", () => {
    for (const p of ["side_wall", "a_side_wall", "door", "a_door", "c_banner"])
      expect(porteVitre(p), p).toBe(false);
  });

  it("un préfixe n'est pas un suffixe : « window_wall_bis » n'est pas une fenêtre", () => {
    expect(porteVitre("window_wall_bis")).toBe(false);
    expect(estPiece("a_side_wall", "side_wall")).toBe(true);
    expect(estPiece("aside_wall", "side_wall")).toBe(false);
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

describe("la tente voisine d'une jonction", () => {
  /* Dimensions volontairement inégales : si l'axe se trompait, le décalage
     prendrait la mauvaise cote et le test le verrait. */
  const dims = { x: 3000, y: 2900 };

  it("se pose dans la direction du côté, à une largeur de toit du centre", () => {
    const X = modele("x");
    expect(decalageVoisin(X, "droit", dims).x).toBeCloseTo(3000, 6);
    expect(decalageVoisin(X, "droit", dims).y).toBeCloseTo(0, 6);
    expect(decalageVoisin(X, "gauche", dims).x).toBeCloseTo(-3000, 6);
    expect(decalageVoisin(X, "arriere", dims).y).toBeCloseTo(2900, 6);
    expect(decalageVoisin(X, "avant", dims).y).toBeCloseTo(-2900, 6);
  });

  it("suit la convention du modèle, pas celle de la tente X", () => {
    // Le Spider partage la table commune : mêmes décalages que la X.
    const S = modele("spider");
    expect(decalageVoisin(S, "droit", dims).x).toBeCloseTo(3000, 6);
    // La N a sa façade retournée d'un demi-tour : « avant » part vers +y.
    const N = modele("n");
    expect(decalageVoisin(N, "avant", dims).y).toBeCloseTo(2900, 6);
  });
});

describe("les pièces qui dormaient dans les dossiers", () => {
  it("la V sait dessiner sa porte — le fichier est là depuis le début", () => {
    // 3 morceaux, 1 487 triangles, 5 → 2 255 mm : la hauteur de sa paroi pleine.
    expect(pieceDeCote(modele("v"), "a", "porte")).toBe("door");
    expect(dessinable(modele("v"), "a", "porte")).toBe(true);
  });

  it("le Spider sait dessiner ses deux parois courbes", () => {
    for (const choix of ["courbe", "courbe_fenetre"])
      expect(dessinable(modele("spider"), "avant", choix), choix).toBe(true);
  });

  it("un choix sans pièce reste indessinable — on n'invente pas de produit", () => {
    expect(dessinable(modele("v"), "a", "fenetre")).toBe(false);
    expect(dessinable(modele("v"), "a", "jonction")).toBe(false);
    // Le bandeau de la N est un choix de PIGNON, jamais de long côté.
    expect(dessinable(modele("n"), "avant", "courbe")).toBe(true);
    expect(dessinable(modele("n"), "avant", "jonction")).toBe(false);
  });

  it("« ouvert » ne se dessine jamais : c'est l'absence de pièce", () => {
    for (const m of MODELES) expect(dessinable(m, m.cotes[0], "vide"), m.slug).toBe(false);
  });
});

describe("piecesAbri — la tente COMPOSÉE dans la scène du lounge", () => {
  it("sans composition : le socle seul, la tente nue d'avant", () => {
    const p = piecesAbri(modele("x"));
    expect(p).toEqual([
      { nom: "roof", angle: 0, azimut: null },
      { nom: "LEG", angle: 0, azimut: null },
      { nom: "zipper_cover", angle: 0, azimut: null },
    ]);
  });

  it("chaque côté composé monte SA pièce, tournée sur SON azimut", () => {
    const p = piecesAbri(modele("x"), {
      cotes: { avant: "paroi", droit: "porte", arriere: "fenetre", gauche: "vide" },
      auvents: { arriere: true },
    });
    expect(p).toContainEqual({ nom: "side_wall", angle: 0, azimut: 180 });
    expect(p).toContainEqual({ nom: "door", angle: -180, azimut: 90 });
    expect(p).toContainEqual({ nom: "window_wall", angle: 90, azimut: 0 });
    // L'auvent au-dessus du côté, même azimut — il s'efface avec sa paroi.
    expect(p).toContainEqual({ nom: "awning", angle: -90, azimut: 0 });
    // Le côté ouvert ne monte rien : trois pièces de socle + quatre de côtés.
    expect(p).toHaveLength(7);
  });

  it("la N choisit sa toile PAR CÔTÉ, et le demi-mur suit le bandeau", () => {
    const p = piecesAbri(modele("n"), {
      cotes: { avant: "courbe", droit: "vide", arriere: "vide", gauche: "paroi" },
      demiMurs: { avant: "porte" },
    });
    expect(p).toContainEqual({ nom: "c_banner", angle: 0, azimut: 0 });
    expect(p).toContainEqual({ nom: "d_half_door", angle: 0, azimut: 0 });
    // Long côté = toile A ; pignon composé = toile B, jamais l'inverse.
    expect(p).toContainEqual({ nom: "a_side_wall", angle: -180, azimut: 90 });
    const q = piecesAbri(modele("n"), { cotes: { avant: "paroi", droit: "vide", arriere: "vide", gauche: "vide" } });
    expect(q).toContainEqual({ nom: "b_side_wall", angle: 180, azimut: 0 });
  });

  it("un demi-mur posé là où il est impossible ne se dessine pas", () => {
    const p = piecesAbri(modele("n"), {
      cotes: { avant: "paroi", droit: "vide", arriere: "vide", gauche: "vide" },
      demiMurs: { avant: "porte" },
    });
    expect(p.some((x) => x.nom.startsWith("d_half"))).toBe(false);
  });
});

describe("rangeeAbri — n tentes reliées dans la scène du lounge", () => {
  const X = modele("x");

  it("l'axe est le côté en jonction quand il est unique, « droit » sinon chez les quatre-côtés", () => {
    expect(axeRangee(X, { cotes: { avant: "jonction" } })).toBe("avant");
    expect(axeRangee(X, { cotes: { avant: "paroi" } })).toBe("droit");
    expect(axeRangee(X, null)).toBe("droit");
    // Deux jonctions : l'axe serait ambigu — ces compositions restent le geste
    // manuel d'aujourd'hui, comme chez rangeeTentes.
    expect(axeRangee(X, { cotes: { avant: "jonction", arriere: "jonction" } })).toBe("droit");
  });

  it("la V n'a pas de rangée : trois côtés, pas d'axe", () => {
    expect(axeRangee(modele("v"), null)).toBeNull();
    expect(rangeeAbri(modele("v"), { cotes: { a: "paroi" } }, 3)).toEqual([{ cotes: { a: "paroi" } }]);
  });

  it("n ≤ 1 rend la composition telle quelle — même une nue", () => {
    const c = { cotes: { avant: "paroi" } };
    expect(rangeeAbri(X, c, 1)).toEqual([c]);
    expect(rangeeAbri(X, null, 1)).toEqual([null]);
    expect(rangeeAbri(X, null, 0)).toEqual([null]);
  });

  it("une tente NUE en rangée : n socles, rien d'autre", () => {
    expect(rangeeAbri(X, null, 3)).toEqual([null, null, null]);
  });

  it("une composition à UNE jonction suit rangeeTentes : bouts symétriques, faces intermédiaires ouvertes", () => {
    const module_ = {
      cotes: { avant: "paroi", droit: "jonction", arriere: "porte", gauche: "fenetre" },
      auvents: { gauche: true },
    };
    const [t1, t2, t3] = rangeeAbri(X, module_, 3) as NonNullable<ReturnType<typeof rangeeAbri>[number]>[];
    // Départ : le module tel quel.
    expect(t1.cotes).toMatchObject({ avant: "paroi", droit: "jonction", gauche: "fenetre" });
    // Milieu : ouvert vers la précédente, jonction vers la suivante.
    expect(t2.cotes?.gauche).toBe("vide");
    expect(t2.cotes?.droit).toBe("jonction");
    // Bout d'arrivée : le miroir du départ — le mur du bout remplace la jonction,
    // annexes comprises.
    expect(t3.cotes?.droit).toBe("fenetre");
    expect(t3.auvents?.droit).toBe(true);
    expect(t3.cotes?.gauche).toBe("vide");
  });

  it("une composition SANS jonction se répète telle quelle : n tentes identiques accolées", () => {
    const c = { cotes: { avant: "paroi" } };
    expect(rangeeAbri(X, c, 2)).toEqual([c, c]);
  });
});
