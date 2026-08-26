/**
 * Le moteur d'implantation du mobilier — sa géométrie.
 *
 * Ces tests ont VÉCU DANS LE SITE, avec le moteur. Ils l'ont suivi ici : le
 * paquet ne peut pas prouver son moteur si ses garde-fous vivent chez un de
 * ses consommateurs, et le CRM le monte maintenant aussi.
 *
 * Ce qui est resté dans le site (`client/src/lib/implantation.test.ts`) : les
 * cinq tests qui ont besoin de ses fixtures à lui — le composeur commercial
 * `composerLounge`, le snapshot du catalogue réel, et les GLB sur disque. Ce
 * ne sont pas les mêmes tests, c'est le même moteur vu à deux niveaux : ici sa
 * géométrie, là-bas son comportement sur le vrai catalogue et les vrais
 * fichiers.
 */
import { describe, it, expect } from "vitest";
import {
  implanter, personnes, peutAccueillir, modeleSilhouette, ANCRAGES, LACET_MEUBLE,
  zoneDe, type MeublePose, type MeubleCote, type LigneLounge,
} from "./implantationMobilier.js";

type MobilierItem = MeubleCote;

/**
 * Les 14 meubles réels du catalogue au 21/08, cotes en CENTIMÈTRES comme dans
 * le CRM. Le moteur doit les convertir en mètres — c'est justement le piège
 * que couvre le test de conversion plus bas.
 */
const CAT: Record<string, MobilierItem> = Object.fromEntries(
  (
    [
      ["canape-double", 990, 200, 80, 85, 2, 42],
      ["canape-simple", 700, 100, 80, 85, 1, 42],
      ["canape-n", 800, 180, 185, 40, 4, 40],
      ["canape-u", 900, 180, 185, 40, 5, 40],
      ["chaise", 390, 100, 70, 80, 1, 45],
      ["pouf", 240, 70, 70, 40, 1, 40],
      ["tabouret", 470, 40, 40, 70, 1, 70],
      ["table-bistro", 640, 60, 60, 105, 0, null],
      ["bar-cocktail-1", 990, 80, 60, 110, 0, null],
      ["tabouret-mini", 480, 40, 40, 55, 1, 55],
      ["table-bistro-longue", 1090, 118, 40, 105, 0, null],
      ["table-bistro-courbe", 1110, 118, 46, 105, 0, null],
      ["bar-mini-1", 950, 80, 60, 72, 0, null],
      ["bar-mini-2", 910, 80, 60, 72, 0, null],
    ] as const
  ).map(([slug, prixHT, largeurCm, profondeurCm, hauteurCm, placesAssises, hauteurAssiseCm]) => [
    slug,
    { slugSite: slug, designation: slug, designations: {}, prixHT, largeurCm, profondeurCm, hauteurCm, placesAssises, hauteurAssiseCm },
  ]),
);

/**
 * Rectangle d'encombrement d'un meuble posé, en mètres, au sol.
 *
 * ⚠️ Il TIENT COMPTE DE LA ROTATION. Cette fonction l'ignorait, du temps où
 * tout était posé face à l'écran : un quart de tour échange largeur et
 * profondeur, et le test signalait alors des chevauchements qui n'existaient
 * pas — tout en étant incapable d'en voir un vrai sur un meuble pivoté.
 */
function rectDe(pose: MeublePose, cat: Record<string, MobilierItem>) {
  const item = cat[pose.slug];
  const droit = Math.abs(Math.cos(pose.rotation)) > 0.5;
  const w = (droit ? item.largeurCm : item.profondeurCm) / 100;
  const d = (droit ? item.profondeurCm : item.largeurCm) / 100;
  return { xMin: pose.x - w / 2, xMax: pose.x + w / 2, zMin: pose.z - d / 2, zMax: pose.z + d / 2 };
}

/** Deux rectangles sont disjoints s'il existe un axe qui les sépare entièrement. */
function disjoints(a: ReturnType<typeof rectDe>, b: ReturnType<typeof rectDe>): boolean {
  return a.xMax <= b.xMin || b.xMax <= a.xMin || a.zMax <= b.zMin || b.zMax <= a.zMin;
}

const zoneDeTest = (slug: string): "assises" | "mangeDebout" | "bars" =>
  slug.startsWith("bar-") ? "bars" : slug.startsWith("table-") ? "mangeDebout" : "assises";

describe("implanter", () => {
  it("est déterministe : deux appels identiques rendent le même tableau", () => {
    const panier: LigneLounge[] = [
      { slug: "canape-double", qte: 6 },
      { slug: "pouf", qte: 10 },
      { slug: "table-bistro", qte: 4 },
      { slug: "bar-cocktail-1", qte: 2 },
    ];
    const a = implanter(panier, CAT);
    const b = implanter(panier, CAT);
    expect(b).toEqual(a);
  });

  it("ignore l'ordre d'arrivée du panier : seuls slug et index comptent", () => {
    const panierA: LigneLounge[] = [
      { slug: "pouf", qte: 3 },
      { slug: "chaise", qte: 2 },
      { slug: "table-bistro", qte: 1 },
    ];
    const panierB: LigneLounge[] = [
      { slug: "table-bistro", qte: 1 },
      { slug: "chaise", qte: 2 },
      { slug: "pouf", qte: 3 },
    ];
    expect(implanter(panierB, CAT)).toEqual(implanter(panierA, CAT));
  });

  it("ne fait jamais sortir un meuble du sol", () => {
    const panier: LigneLounge[] = [
      { slug: "canape-double", qte: 8 },
      { slug: "canape-u", qte: 3 },
      { slug: "pouf", qte: 12 },
      { slug: "chaise", qte: 6 },
      { slug: "table-bistro", qte: 5 },
      { slug: "bar-cocktail-1", qte: 3 },
    ];
    const res = implanter(panier, CAT);
    const xHalf = res.sol.largeurM / 2;
    const zHalf = res.sol.profondeurM / 2;
    for (const m of res.meubles) {
      const r = rectDe(m, CAT);
      expect(r.xMin).toBeGreaterThanOrEqual(-xHalf - 1e-9);
      expect(r.xMax).toBeLessThanOrEqual(xHalf + 1e-9);
      expect(r.zMin).toBeGreaterThanOrEqual(-zHalf - 1e-9);
      expect(r.zMax).toBeLessThanOrEqual(zHalf + 1e-9);
    }
  });

  it("ne laisse jamais deux meubles se chevaucher — le test qui compte le plus", () => {
    const panier: LigneLounge[] = [
      { slug: "canape-double", qte: 8 },
      { slug: "canape-u", qte: 3 },
      { slug: "canape-n", qte: 3 },
      { slug: "canape-simple", qte: 5 },
      { slug: "pouf", qte: 12 },
      { slug: "chaise", qte: 6 },
      { slug: "tabouret", qte: 4 },
      { slug: "table-bistro", qte: 5 },
      { slug: "bar-cocktail-1", qte: 3 },
    ];
    const res = implanter(panier, CAT);
    const rects = res.meubles.map((m) => rectDe(m, CAT));
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(disjoints(rects[i], rects[j])).toBe(true);
      }
    }
  });

  it("place toutes les assises au nord de tous les mange-debout", () => {
    const panier: LigneLounge[] = [
      { slug: "canape-double", qte: 6 },
      { slug: "pouf", qte: 6 },
      { slug: "table-bistro", qte: 6 },
    ];
    const res = implanter(panier, CAT);
    const assises = res.meubles.filter((m) => zoneDeTest(m.slug) === "assises");
    const mangeDebout = res.meubles.filter((m) => zoneDeTest(m.slug) === "mangeDebout");
    expect(assises.length).toBeGreaterThan(0);
    expect(mangeDebout.length).toBeGreaterThan(0);
    const sudDesAssises = Math.max(...assises.map((m) => rectDe(m, CAT).zMax));
    const nordDesDebout = Math.min(...mangeDebout.map((m) => rectDe(m, CAT).zMin));
    expect(sudDesAssises).toBeLessThanOrEqual(nordDesDebout);
  });

  it("respecte le plafond de 60 exemplaires posés et compte le reste dans nonPoses", () => {
    const panier: LigneLounge[] = [{ slug: "pouf", qte: 75 }];
    const res = implanter(panier, CAT);
    expect(res.meubles.length).toBe(60);
    expect(res.nonPoses).toBe(15);
    // et les 60 posés restent disjoints malgré la densité
    const rects = res.meubles.map((m) => rectDe(m, CAT));
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(disjoints(rects[i], rects[j])).toBe(true);
      }
    }
  });

  it("un panier vide rend un sol valide et zéro meuble", () => {
    const res = implanter([], CAT);
    expect(res.meubles).toEqual([]);
    expect(res.nonPoses).toBe(0);
    expect(res.sol.largeurM).toBeGreaterThan(0);
    expect(res.sol.profondeurM).toBeGreaterThan(0);
  });

  it("convertit les cotes du catalogue de CENTIMÈTRES en MÈTRES — pas de facteur 100 égaré, largeur ET profondeur vérifiées séparément", () => {
    /* Recalculer la taille attendue depuis LE MÊME catalogue que celui passé à
       `implanter()` (comme le faisait la version précédente de ce test) ne
       prouve RIEN sur la conversion interne : `rectDe` lit `item.largeurCm /
       100` depuis `CAT`, un objet indépendant de ce qu'`implanter()` a
       réellement calculé en interne pour poser le meuble. Un facteur d'échelle
       faux sur UNE seule dimension (ex. `profondeurCm / 10` au lieu de `/
       100`, sans déborder le sol donné) ne change ni la taille reconstruite
       (toujours juste par construction) ni rien d'autre à observer avec un
       seul meuble posé — le test passait alors à tort.
       Ce test vérifie la POSITION posée, qui elle DÉPEND du wM/dM interne : le
       premier (et seul) meuble d'une zone se pose à
       `x = rect.xMin + wM/2` et `z = rect.zMin + dM/2` (voir `shelfPack`).
       Avec un sol dimensionné indépendamment (surface FOURNIE, donc `xMin`/
       `zMin` ne dépendent pas des cotes du meuble), la position attendue se
       calcule à la main à partir des cotes CORRECTES (200 × 80 cm → 2 × 0,8
       m) — largeur ET profondeur, séparément, chacune via son propre axe. */
    /* ⚠️ Depuis que l'ensemble est RECENTRÉ sur son sol, la position absolue
       d'un meuble seul vaut (0, 0) quelles que soient ses cotes : elle ne
       prouve donc plus rien. On mesure désormais un ÉCART entre deux meubles,
       qui dépend toujours du wM/dM calculé en interne et survit à une
       translation.
        · en rangs, deux canapés côte à côte sont distants de wM + circulation ;
        · en îlots, deux canapés face à face de dA/2 + passage + dB/2.
       Chaque axe est ainsi vérifié par sa propre disposition. */
    const surfaceM2 = 50;
    const panier: LigneLounge[] = [{ slug: "canape-double", qte: 2 }];

    const rangs = implanter(panier, CAT, surfaceM2, undefined, "rangs");
    expect(rangs.meubles.length).toBe(2);
    expect(rangs.nonPoses).toBe(0);
    const [a, b] = rangs.meubles;
    // LARGEUR : 200 cm → 2 m, plus 0,6 m de circulation.
    expect(Math.abs(b.x - a.x)).toBeCloseTo(2 + 0.6, 6);
    expect(Math.abs(b.z - a.z)).toBeCloseTo(0, 6);

    const ilots = implanter(panier, CAT, surfaceM2, undefined, "ilots");
    const [c, d] = ilots.meubles;
    // PROFONDEUR : 80 cm → 0,8 m, deux demies plus le passage de 0,9 m.
    expect(Math.abs(d.z - c.z)).toBeCloseTo(0.4 + 0.9 + 0.4, 6);
    expect(Math.abs(d.x - c.x)).toBeCloseTo(0, 6);

    const res = implanter([{ slug: "canape-double", qte: 1 }], CAT, surfaceM2);
    expect(res.meubles.length).toBe(1);
    const largeurAttendueM = 2;
    const profondeurAttendueM = 0.8;

    // Recoupement : la taille reconstruite depuis le catalogue reste correcte elle aussi.
    const r = rectDe(res.meubles[0], CAT);
    expect(r.xMax - r.xMin).toBeCloseTo(largeurAttendueM, 6);
    expect(r.zMax - r.zMin).toBeCloseTo(profondeurAttendueM, 6);
  });

  it("EN ÎLOTS, les assises ne regardent pas toutes dans le même sens", () => {
    /* Le défaut vu à l'écran : quinze canapés alignés, tous orientés
       pareil — un entrepôt, pas un lounge. Un îlot, ce sont deux assises qui
       se font face, donc deux orientations distinctes dans la scène. */
    const res = implanter([{ slug: "canape-double", qte: 6 }], CAT, 60, undefined, "ilots");
    const sens = new Set(res.meubles.map((m) => m.rotation.toFixed(3)));
    /* Au moins trois orientations : les vis-à-vis d'un îlot en donnent deux, et
       l'alternance d'un quart de tour d'un îlot sur deux en ajoute d'autres.
       Sans elle, tous les îlots s'alignaient sur le même axe et la pièce gardait
       son air de dortoir malgré les canapés qui se regardent. */
    expect(sens.size).toBeGreaterThanOrEqual(3);
    /* Et personne ne tourne le dos à tout le monde : chaque orientation posée a
       son opposée dans la scène. */
    for (const m of res.meubles) {
      const oppose = res.meubles.some(
        (o) => Math.abs(Math.abs(o.rotation - m.rotation) - Math.PI) < 1e-6,
      );
      expect(oppose).toBe(true);
    }
  });

  it("EN RANGS, tout le monde regarde l'écran — c'est un cinéma", () => {
    const res = implanter([{ slug: "chaise", qte: 8 }], CAT, 60, undefined, "rangs");
    expect(res.meubles.every((m) => m.rotation === 0)).toBe(true);
  });

  it("EN RANGS, du plus bas au plus haut : poufs devant l'écran, canapés deux places au fond", () => {
    /* La salle de cinéma : personne ne regarde à travers un dossier. L'ordre
       alphabétique posait les canapés doubles au premier rang et les poufs au
       fond — l'inverse. L'écran est au nord (z NÉGATIF) : « devant » = z plus
       petit. À hauteur égale (fauteuil et canapé, 85 cm), le une place passe
       devant le deux places. */
    const res = implanter(
      [
        { slug: "canape-double", qte: 3 },
        { slug: "pouf", qte: 4 },
        { slug: "canape-simple", qte: 3 },
        { slug: "chaise", qte: 3 },
      ],
      CAT,
      undefined,
      undefined,
      "rangs",
    );
    expect(res.nonPoses).toBe(0);
    const zDe = (slug: string) => res.meubles.filter((m) => m.slug === slug).map((m) => m.z);
    /* Deux catégories voisines peuvent partager une rangée (≤), mais jamais
       s'inverser ; les extrêmes, eux, sont STRICTEMENT séparés. */
    expect(Math.max(...zDe("pouf"))).toBeLessThanOrEqual(Math.min(...zDe("chaise")));
    expect(Math.max(...zDe("chaise"))).toBeLessThanOrEqual(Math.min(...zDe("canape-simple")));
    expect(Math.max(...zDe("canape-simple"))).toBeLessThanOrEqual(Math.min(...zDe("canape-double")));
    expect(Math.max(...zDe("pouf"))).toBeLessThan(Math.min(...zDe("canape-double")));
  });

  it("EN RANGS, un rang sur deux est DÉCALÉ d'une demi-place — on voit entre les têtes", () => {
    /* 8 chaises sous une emprise de 6,2 m de large : 4 au premier rang, puis
       le rang suivant démarre décalé de (largeur + circulation) / 2 = 0,8 m.
       Le recentrage translate tout d'un bloc : on compare des ÉCARTS. */
    const res = implanter(
      [{ slug: "chaise", qte: 8 }],
      CAT,
      undefined,
      { largeurM: 6.2, profondeurM: 4 },
      "rangs",
    );
    expect(res.nonPoses).toBe(0);
    const parRang = new Map<string, number[]>();
    for (const m of res.meubles) {
      const cle = m.z.toFixed(3);
      parRang.set(cle, [...(parRang.get(cle) ?? []), m.x]);
    }
    const rangs = [...parRang.entries()]
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, xs]) => xs.sort((a, b) => a - b));
    expect(rangs.length).toBeGreaterThanOrEqual(2);
    expect(rangs[1][0] - rangs[0][0]).toBeCloseTo(0.8, 6);
    /* Et le rang 3, s'il existe, revient à l'aplomb du premier. */
    if (rangs.length >= 3) expect(rangs[2][0] - rangs[0][0]).toBeCloseTo(0, 6);
    /* Personne n'est exactement dans l'axe de la tête de devant. */
    for (const x1 of rangs[0]) for (const x2 of rangs[1]) {
      expect(Math.abs(x2 - x1)).toBeGreaterThanOrEqual(0.75);
    }
  });

  it("l'ensemble est CENTRÉ sur son sol, jamais plaqué dans un coin", () => {
    /* Un canapé seul se retrouvait contre l'angle nord-ouest d'un sol trois
       fois trop grand, et le vide à côté ressemblait à une panne. */
    for (const panier of [
      [{ slug: "canape-double", qte: 1 }],
      [{ slug: "pouf", qte: 3 }],
      [{ slug: "canape-simple", qte: 5 }, { slug: "table-bistro", qte: 2 }],
    ]) {
      const res = implanter(panier, CAT, 60);
      const xs = res.meubles.map((m) => m.x);
      const zs = res.meubles.map((m) => m.z);
      const centreX = (Math.min(...xs) + Math.max(...xs)) / 2;
      const centreZ = (Math.min(...zs) + Math.max(...zs)) / 2;
      /* Le centre des meubles doit coïncider avec celui du sol, à l'asymétrie
         d'encombrement près (un meuble large et un étroit ne se compensent pas
         exactement au centimètre). */
      expect(Math.abs(centreX)).toBeLessThan(1);
      expect(Math.abs(centreZ)).toBeLessThan(1);
    }
  });

  it("place des gens ASSIS sur les assises et DEBOUT autour des mange-debout", async () => {
    const { personnes } = await import("./implantationMobilier.js");
    // Table seule : de la place des deux côtés → deux convives.
    const seule = implanter([{ slug: "table-bistro", qte: 1 }], CAT, 60);
    expect(personnes(seule.meubles, CAT).filter((g) => !g.assis).length).toBe(2);

    // Scène mixte : 2 canapés × 2 places, et la table coincée contre une rangée
    // n'incruste PAS son convive dans un canapé — il est refusé, pas posé dedans.
    const res = implanter(
      [{ slug: "canape-double", qte: 2 }, { slug: "table-bistro", qte: 1 }], CAT, 60,
    );
    const gens = personnes(res.meubles, CAT);
    expect(gens.filter((g) => g.assis).length).toBe(4);
    const debout = gens.filter((g) => !g.assis).length;
    expect(debout).toBeGreaterThanOrEqual(1);
    expect(debout).toBeLessThanOrEqual(2);
  });
  it("les silhouettes ne déplacent aucun meuble et ne changent aucun prix", async () => {
    const { personnes } = await import("./implantationMobilier.js");
    const panier = [{ slug: "canape-simple", qte: 3 }, { slug: "pouf", qte: 2 }];
    const avant = implanter(panier, CAT, 40);
    personnes(avant.meubles, CAT);
    const apres = implanter(panier, CAT, 40);
    expect(apres).toEqual(avant);
  });
  it("plafonne la foule — au-delà, la scène devient illisible", async () => {
    const { personnes } = await import("./implantationMobilier.js");
    const res = implanter([{ slug: "canape-u", qte: 20 }], CAT, 400);
    expect(personnes(res.meubles, CAT).length).toBeLessThanOrEqual(28);
  });
  it("un assis a les talons au bord AVANT et le dos qui ne sort pas du dossier", async () => {
    /* Vu à l'écran deux fois, dans les deux sens : d'abord des cuisses à
       travers la face avant, puis — corrigé au jugé — des corps rejetés un
       demi-mètre en arrière, à travers dossier et voisins. La cause : l'origine
       des GLB est près des TALONS, pas au centre du corps. On vérifie donc les
       deux extrémités mesurées, jamais un « centre » supposé. */
    const { personnes, ANCRAGES } = await import("./implantationMobilier.js");
    const res = implanter([{ slug: "canape-double", qte: 1 }], CAT, 40);
    const m = res.meubles[0];
    const d = CAT["canape-double"].profondeurCm / 100;
    const gens = personnes(res.meubles, CAT);
    expect(gens.length).toBe(2);
    for (const g of gens) {
      const a = ANCRAGES[g.modele.fichier];
      const versAvant = (g.x - m.x) * Math.sin(m.rotation) - (g.z - m.z) * Math.cos(m.rotation);
      const talon = versAvant + (a.talonZ ?? 0) * g.modele.echelle;
      const dos = versAvant + (a.dosZ ?? 0) * g.modele.echelle;
      // Talons au ras de la face avant : les tibias pendent DEVANT le meuble…
      expect(talon).toBeGreaterThanOrEqual(d / 2 - 1e-9);
      expect(talon).toBeLessThanOrEqual(d / 2 + 0.1);
      // …et le dos reste SUR l'assise, jamais derrière le dossier.
      expect(dos).toBeGreaterThanOrEqual(-d / 2);
      expect(dos).toBeLessThanOrEqual(d / 2);
    }
  });

  it("une silhouette a la taille d'un adulte, et la même personne ne rapetisse pas en s'asseyant", async () => {
    /* Les modèles sont livrés à une échelle arbitraire — un homme debout mesure
       3,83 unités dans le fichier. Ce qui compte est double : qu'il fasse bien
       1,75 m une fois posé, et que sa pose ASSISE garde le même facteur, sinon
       la même personne changerait de taille en s'asseyant. */
    const { modeleSilhouette } = await import("./implantationMobilier.js");
    for (const i of [0, 1, 2, 3]) {
      const debout = modeleSilhouette(false, i);
      const assis = modeleSilhouette(true, i);
      expect(debout.echelle).toBeCloseTo(assis.echelle, 9);
      expect(debout.tailleM).toBeGreaterThan(1.5);
      expect(debout.tailleM).toBeLessThan(1.9);
    }
  });

  it("alterne les personnes SANS hasard — une scène rejouée montre les mêmes gens", async () => {
    const { modeleSilhouette } = await import("./implantationMobilier.js");
    const suite = [0, 1, 2, 3, 4].map((i) => modeleSilhouette(false, i).fichier);
    expect(suite).toEqual(["homme-debout", "femme-debout", "homme-debout", "femme-debout", "homme-debout"]);
    expect(modeleSilhouette(true, 1).fichier).toBe("femme-assise");
    /* Deux appels identiques rendent le même modèle : aucun Math.random. */
    expect(modeleSilhouette(true, 7)).toEqual(modeleSilhouette(true, 7));
  });

  it("fesses sur le coussin, semelles jamais sous le plancher — sur tous les meubles du catalogue", async () => {
    const { personnes, ANCRAGES } = await import("./implantationMobilier.js");
    for (const [slug, item] of Object.entries(CAT)) {
      if (!item.placesAssises) continue;
      const res = implanter([{ slug, qte: 1 }], CAT, 40);
      for (const g of personnes(res.meubles, CAT)) {
        const a = ANCRAGES[g.modele.fichier];
        const semelle = g.elevationM + a.semelleY * g.modele.echelle;
        const fesses = g.elevationM + (a.fessesY ?? 0) * g.modele.echelle;
        const coussin = (item.hauteurAssiseCm ?? 45) / 100;
        expect(semelle, `${slug} : semelles sous le plancher`).toBeGreaterThanOrEqual(-0.001);
        expect(fesses, `${slug} : fesses DANS le coussin`).toBeGreaterThanOrEqual(coussin - 0.001);
        expect(fesses, `${slug} : assis dans le vide`).toBeLessThanOrEqual(coussin + 0.05);
      }
    }
  });

  it("tabouret : les pieds pendent au-dessus du sol ; pouf : ils le touchent", async () => {
    const { personnes, ANCRAGES } = await import("./implantationMobilier.js");
    const semelleDe = (slug: string) => {
      const [g] = personnes(implanter([{ slug, qte: 1 }], CAT, 40).meubles, CAT);
      return g.elevationM + ANCRAGES[g.modele.fichier].semelleY * g.modele.echelle;
    };
    expect(semelleDe("tabouret")).toBeGreaterThan(0.2); // perché, jambes pendantes
    expect(semelleDe("pouf")).toBeLessThan(0.05); // au ras du sol
  });

  it("un fauteuil 1 place n'assoit qu'UNE personne, avancée vers son bord avant", async () => {
    const { personnes } = await import("./implantationMobilier.js");
    const res = implanter([{ slug: "canape-simple", qte: 1 }], CAT, 40);
    const gens = personnes(res.meubles, CAT);
    expect(gens.length).toBe(1);
    const m = res.meubles[0];
    /* L'origine du modèle est près des talons : elle doit être DEVANT le
       meuble (côté regard), sinon le corps traverse dossier et voisins. */
    const versAvant = (gens[0].x - m.x) * Math.sin(m.rotation) - (gens[0].z - m.z) * Math.cos(m.rotation);
    expect(versAvant).toBeGreaterThan(0.3);
  });

  it("peutAccueillir refuse AVANT la faute ce qu'une tente 3×3 ne peut pas prendre", async () => {
    /* Vu à l'écran : le « + » restait actif sous une 3×3 pleine, on ajoutait,
       puis un bandeau rouge grondait. Le bouton doit s'éteindre AVANT. */
    const { peutAccueillir } = await import("./implantationMobilier.js");
    const t3 = { largeurM: 3, profondeurM: 3 };
    // vide : un pouf passe
    expect(peutAccueillir([], CAT, "pouf", undefined, t3)).toBe(true);
    // déjà deux canapés 2 m : un troisième ne tient pas dans 3 m
    const charge = [{ slug: "canape-double", qte: 2 }];
    expect(peutAccueillir(charge, CAT, "canape-double", undefined, t3)).toBe(false);
    // sans surface ni abri, le sol est inventé : tout tient, toujours
    expect(peutAccueillir(charge, CAT, "canape-double")).toBe(true);
  });

  it("le nombre d'invités COMMANDE le nombre de silhouettes — assis d'abord, surplus debout", async () => {
    /* Vu sur l'écran de Daniel : « 5 invités » saisis, 2 bonshommes dessinés.
       La scène montrait la capacité des meubles, pas la fête du client. */
    const { personnes } = await import("./implantationMobilier.js");
    const sol = { largeurM: 7, profondeurM: 7 };
    const meubles = [
      { slug: "chaise", x: -1, z: 0, rotation: 0 },
      { slug: "pouf", x: 1, z: 0, rotation: 0 },
    ];
    const gens = personnes(meubles, CAT, 5, sol);
    expect(gens.length).toBe(5);
    expect(gens.filter((g) => g.assis).length).toBe(2);
    const debout = gens.filter((g) => !g.assis);
    expect(debout.length).toBe(3);
    for (const g of debout) {
      // dans le sol, et jamais dans un meuble
      expect(Math.abs(g.x)).toBeLessThanOrEqual(3.5);
      expect(Math.abs(g.z)).toBeLessThanOrEqual(3.5);
      for (const m of meubles) {
        const it = CAT[m.slug];
        const dedans = Math.abs(g.x - m.x) < it.largeurCm / 200 + 0.2 - 1e-9
          && Math.abs(g.z - m.z) < it.profondeurCm / 200 + 0.2 - 1e-9;
        expect(dedans).toBe(false);
      }
    }
    // et jamais deux debout libres l'un dans l'autre
    for (let i = 0; i < debout.length; i++)
      for (let j = i + 1; j < debout.length; j++)
        expect(Math.hypot(debout[i].x - debout[j].x, debout[i].z - debout[j].z)).toBeGreaterThanOrEqual(0.4 - 1e-9);
  });

  it("moins d'invités que de places : on n'assoit QUE les invités", async () => {
    const { personnes } = await import("./implantationMobilier.js");
    const gens = personnes(
      [{ slug: "canape-u", x: 0, z: 0, rotation: 0 }],
      CAT, 3, { largeurM: 6, profondeurM: 6 },
    );
    expect(gens.length).toBe(3);
    expect(gens.every((g) => g.assis)).toBe(true);
  });

  it("sans nombre d'invités, le comportement historique tient : une silhouette par place", async () => {
    const { personnes } = await import("./implantationMobilier.js");
    const gens = personnes([{ slug: "canape-double", x: 0, z: 0, rotation: 0 }], CAT);
    expect(gens.length).toBe(2);
  });

  it("chacun REGARDE ce qu'il faut : l'assis comme son meuble, le debout vers sa table", async () => {
    /* La convention est UNIQUE : `rotation` = direction du regard, 0 = vers
       l'écran. L'ancien duo « flip dans personnes() + π caché dans le rendu »
       s'annulait pour les debout et retournait les assis — corps entier devant
       le canapé. Un seul champ, un seul sens, testé ici. */
    const { personnes } = await import("./implantationMobilier.js");
    const assis = personnes([{ slug: "canape-double", x: 0, z: 0, rotation: 0 }], CAT);
    for (const g of assis) expect(g.rotation).toBe(0);

    const debout = personnes([{ slug: "table-bistro", x: 0, z: 0, rotation: 0 }], CAT);
    expect(debout.length).toBe(2);
    for (const g of debout) {
      /* regarder la table = le vecteur regard (sin, −cos) pointe du convive
         vers la table : produit scalaire positif avec (table − convive). */
      const scalaire = (0 - g.x) * Math.sin(g.rotation) + (0 - g.z) * -Math.cos(g.rotation);
      expect(scalaire, `convive en (${g.x.toFixed(2)},${g.z.toFixed(2)})`).toBeGreaterThan(0);
    }
  });

  it("la collision personne/meuble se juge dans le repère du meuble — un quart de tour ne la trompe pas", async () => {
    /* Les blocs face à face horizontaux tournent les meubles de ±π/2 : largeur
       et profondeur s'échangent. Un canapé 2,00 × 0,80 tourné d'un quart de
       tour occupe 0,80 × 2,00 — un test aligné aux axes le croit étroit et
       laisse un convive debout s'asseoir dedans. Meubles posés à la main :
       le cas est géométrique, pas un hasard d'agencement. */
    const { personnes } = await import("./implantationMobilier.js");
    const meubles = [
      { slug: "table-bistro", x: 0, z: 0, rotation: 0 },
      { slug: "canape-double", x: 0, z: 1.5, rotation: Math.PI / 2 },
    ];
    const gens = personnes(meubles, CAT);
    // Le convive côté canapé (0, +0.75) tombe DANS l'emprise tournée → refusé.
    expect(gens.filter((g) => !g.assis).length).toBe(1);
    // L'autre côté de la table reste servi, et le canapé garde ses 2 assis.
    expect(gens.filter((g) => g.assis).length).toBe(2);
  });


  it("la banquette U assoit ses CINQ convives sur la base arrière, jambes vers le centre", async () => {
    /* Vu à l'écran : 2 places sur 5 refusées (36 cm d'entraxe < le rayon
       anti-empilement) et les 3 restantes flottant au milieu du U — l'ancrage
       « talons au bord avant » n'a aucun sens sur 1,85 m de profondeur. */
    const { personnes, ANCRAGES } = await import("./implantationMobilier.js");
    const res = implanter([{ slug: "canape-u", qte: 1 }], CAT, 40);
    const m = res.meubles[0];
    const d = CAT["canape-u"].profondeurCm / 100;
    const gens = personnes(res.meubles, CAT);
    expect(gens.length).toBe(5);
    for (const g of gens) {
      const a = ANCRAGES[g.modele.fichier];
      const versAvant = (g.x - m.x) * Math.sin(m.rotation) - (g.z - m.z) * Math.cos(m.rotation);
      const dos = versAvant + (a.dosZ ?? 0) * g.modele.echelle;
      // fesses à ~25 cm de la face ARRIÈRE de la base du U
      expect(dos).toBeGreaterThanOrEqual(-d / 2 + 0.15);
      expect(dos).toBeLessThanOrEqual(-d / 2 + 0.35);
    }
  });
});


/* ── La tablée ─────────────────────────────────────────────────────────────
 *
 * Un repas n'est pas une salle d'examen : les chaises entourent une table, et
 * l'ensemble se pose d'un bloc. Sans ça, le rangeur les éparpillait — le
 * banquet du lounge rendait des rangs de chaises et des tables à côté.
 */
describe("tablées — les chaises tiennent autour de leur table", () => {
  const TABLE = "table-repas";
  const CHAISE = "chaise-repas";
  const CAT: Record<string, MeubleCote> = {
    [TABLE]: {
      slugSite: TABLE, designation: "Table de repas",
      largeurCm: 226, profondeurCm: 139, hauteurCm: 87,
      placesAssises: 0, hauteurAssiseCm: null,
    },
    [CHAISE]: {
      slugSite: CHAISE, designation: "Chaise",
      largeurCm: 43, profondeurCm: 58, hauteurCm: 97,
      placesAssises: 1, hauteurAssiseCm: 45,
    },
  };
  const GROUPEMENT = { centre: TABLE, autour: 8 };
  const panier: LigneLounge[] = [{ slug: TABLE, qte: 2 }, { slug: CHAISE, qte: 16 }];

  const poser = () =>
    implanter(panier, CAT, undefined, { largeurM: 24, profondeurM: 16 }, "tablees", undefined, GROUPEMENT);

  it("pose chaque chaise à portée de SA table, jamais à l'autre bout du sol", () => {
    const { meubles } = poser();
    const tables = meubles.filter((m) => m.slug === TABLE);
    const chaises = meubles.filter((m) => m.slug === CHAISE);
    expect(tables).toHaveLength(2);
    expect(chaises).toHaveLength(16);

    /* Une chaise appartient à sa table si elle est plus près d'elle que la
       demi-diagonale d'une tablée — au-delà, elle mange ailleurs. */
    const PORTEE = 2.6;
    for (const c of chaises) {
      const d = Math.min(...tables.map((t) => Math.hypot(t.x - c.x, t.z - c.z)));
      expect(d, `chaise à ${d.toFixed(2)} m de toute table`).toBeLessThan(PORTEE);
    }
  });

  it("répartit huit chaises par table, pas seize autour d'une seule", () => {
    const { meubles } = poser();
    const tables = meubles.filter((m) => m.slug === TABLE);
    const parTable = tables.map((t) =>
      meubles.filter((m) => m.slug === CHAISE && Math.hypot(t.x - m.x, t.z - m.z) < 2.6).length,
    );
    expect(parTable).toEqual([8, 8]);
  });

  it("tourne chaque chaise VERS sa table — personne ne dîne de dos", () => {
    const { meubles } = poser();
    const tables = meubles.filter((m) => m.slug === TABLE);
    for (const c of meubles.filter((m) => m.slug === CHAISE)) {
      const t = tables.reduce((a, b) =>
        Math.hypot(a.x - c.x, a.z - c.z) <= Math.hypot(b.x - c.x, b.z - c.z) ? a : b);
      /* Convention des MEUBLES : à rotation nulle, la face regarde vers +Z —
         c'est elle qui fait qu'un îlot face à face se regarde vraiment. (Les
         silhouettes de `personnes()`, elles, comptent 0 vers l'écran : deux
         conventions voisines, à ne pas confondre.) */
      const regard = { x: Math.sin(c.rotation), z: Math.cos(c.rotation) };
      const vers = { x: t.x - c.x, z: t.z - c.z };
      const norme = Math.hypot(vers.x, vers.z) || 1;
      const produit = (regard.x * vers.x + regard.z * vers.z) / norme;
      expect(produit, `chaise tournée à ${c.rotation.toFixed(2)} rad`).toBeGreaterThan(0.5);
    }
  });

  it("ne fait jamais disparaître une chaise en trop — une capacité fausse est pire qu'un surplus", () => {
    const { meubles, nonPoses } = implanter(
      [{ slug: TABLE, qte: 1 }, { slug: CHAISE, qte: 11 }],
      CAT, undefined, { largeurM: 24, profondeurM: 16 }, "tablees", undefined, GROUPEMENT,
    );
    expect(nonPoses).toBe(0);
    expect(meubles.filter((m) => m.slug === CHAISE)).toHaveLength(11);
  });
});
