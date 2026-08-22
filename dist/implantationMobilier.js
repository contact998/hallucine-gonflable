/** Le pas entre deux meubles : leur encombrement, plus la circulation. */
const CIRCULATION_M = 0.6;
/** Au-delà, `nonPoses` compte le reste — jamais un silence. */
const PLAFOND_EXEMPLAIRES = 60;
/** Le sol demandé se rend en 4:3, largeur sur profondeur. */
const RATIO_SOL = 4 / 3;
/* Le passage entre deux assises qui se regardent : de quoi poser les pieds et
   circuler, sans que la conversation soit à crier. */
const PASSAGE_ILOT_M = 0.9;
/* Profondeur au sol d'une personne assise, mesurée sur les modèles livrés
   (homme 0,65 m, femme 0,63 m) une fois mis à l'échelle. Elle sert à l'adosser
   sans la faire traverser le dossier. */
const PROFONDEUR_ASSIS = 0.65;
/* Un liseré de sol autour du mobilier. Sans lui les meubles touchent le bord
   exact, et de biais la scène donne l'illusion qu'ils débordent — vérifié :
   géométriquement ils étaient dedans, au millimètre. */
const LISERE_SOL_M = 0.6;
/** Marge de sécurité anti-frontière flottante entre le calcul du besoin et le placement réel. */
const MARGE_SECURITE_M = 0.01;
export function zoneDe(slug) {
    if (slug.startsWith("bar-"))
        return "bars";
    if (slug.startsWith("table-"))
        return "mangeDebout";
    return "assises";
}
/**
 * Aplatit le panier en exemplaires individuels puis les trie par slug, puis
 * par index — jamais par l'ordre d'arrivée des lignes. Un slug absent du
 * catalogue reçu est ignoré : ce module suppose un catalogue complet (déjà
 * garanti en amont par `composerLounge`, qui signale lui-même
 * `catalogue_incomplet`) — ce n'est pas un manque de PLACE, donc pas une
 * raison de compter dans `nonPoses`.
 */
function unitesTriees(panier, catalogue) {
    const unites = [];
    for (const ligne of panier) {
        const item = catalogue[ligne.slug];
        if (!item)
            continue;
        for (let i = 0; i < ligne.qte; i++)
            unites.push({ slug: ligne.slug, index: i, item });
    }
    unites.sort((a, b) => (a.slug === b.slug ? a.index - b.index : a.slug < b.slug ? -1 : 1));
    return unites;
}
function dimsDepuisSurface(surfaceM2) {
    const profondeurM = Math.sqrt(surfaceM2 / RATIO_SOL);
    return { largeurM: RATIO_SOL * profondeurM, profondeurM };
}
/**
 * Recentre un ensemble de meubles sur son sol, sans rien déformer.
 *
 * Translation rigide : les distances entre meubles ne bougent pas, donc aucun
 * chevauchement ne peut apparaître, et aucun meuble ne peut sortir du sol qu'il
 * ne débordait pas déjà — le décalage appliqué est au plus la moitié du vide
 * restant de chaque côté.
 */
function centrer(meubles, catalogue, largeurM, profondeurM) {
    if (meubles.length === 0)
        return meubles;
    let xMin = Infinity, xMax = -Infinity, zMin = Infinity, zMax = -Infinity;
    for (const m of meubles) {
        const item = catalogue[m.slug];
        if (!item)
            continue;
        /* Une rotation d'un demi-tour ne change pas l'encombrement ; un quart de
           tour l'échangerait — on ne pose que 0 et π, mais on le calcule proprement
           pour que ça reste vrai si un quart de tour apparaît un jour. */
        const droit = Math.abs(Math.cos(m.rotation)) > 0.5;
        const w = (droit ? item.largeurCm : item.profondeurCm) / 100;
        const d = (droit ? item.profondeurCm : item.largeurCm) / 100;
        xMin = Math.min(xMin, m.x - w / 2);
        xMax = Math.max(xMax, m.x + w / 2);
        zMin = Math.min(zMin, m.z - d / 2);
        zMax = Math.max(zMax, m.z + d / 2);
    }
    if (!Number.isFinite(xMin))
        return meubles;
    const dx = -(xMin + xMax) / 2;
    const dz = -(zMin + zMax) / 2;
    /* On ne pousse jamais au-delà du sol : si l'ensemble déborde déjà, on le
       laisse où il est plutôt que d'aggraver. */
    const marge = (v, demi, min, max) => max - min > 2 * demi ? 0 : v;
    return meubles.map((m) => ({
        ...m,
        x: m.x + marge(dx, largeurM / 2, xMin, xMax),
        z: m.z + marge(dz, profondeurM / 2, zMin, zMax),
    }));
}
/** Un meuble seul : le bloc dégénéré, face à l'écran. */
function blocSimple(u) {
    return {
        wM: u.item.largeurCm / 100,
        dM: u.item.profondeurCm / 100,
        unites: [u],
        deplier: (x, z) => [{ slug: u.slug, x, z, rotation: 0 }],
    };
}
/**
 * Deux assises face à face, séparées par un passage. C'est le geste qui fait
 * lire un lounge : on ne s'assoit pas côte à côte en rang d'oignon, on se
 * regarde. La seconde pivote d'un demi-tour — d'où deux orientations dans la
 * scène là où il n'y en avait qu'une.
 */
function blocFaceAFace(a, b, passage, quartDeTour) {
    const wA = a.item.largeurCm / 100, dA = a.item.profondeurCm / 100;
    const wB = b.item.largeurCm / 100, dB = b.item.profondeurCm / 100;
    const largeurIlot = Math.max(wA, wB);
    const profondeurIlot = dA + passage + dB;
    /* Un quart de tour fait pivoter TOUT l'îlot : les deux assises se regardent
       toujours, mais sur l'autre axe. C'est ce qui empêche une pièce de ressembler
       à un dortoir — sans lui, tous les îlots s'alignaient sur le même axe et la
       scène gardait son air de rangée malgré les vis-à-vis. L'encombrement du
       bloc s'échange en conséquence : le rangeur continue de ne voir qu'un
       rectangle, et le contrôle de non-chevauchement reste vrai. */
    return {
        wM: quartDeTour ? profondeurIlot : largeurIlot,
        dM: quartDeTour ? largeurIlot : profondeurIlot,
        unites: [a, b],
        deplier: (x, z) => {
            const ecartA = -profondeurIlot / 2 + dA / 2;
            const ecartB = profondeurIlot / 2 - dB / 2;
            if (!quartDeTour) {
                return [
                    { slug: a.slug, x, z: z + ecartA, rotation: 0 },
                    { slug: b.slug, x, z: z + ecartB, rotation: Math.PI },
                ];
            }
            return [
                { slug: a.slug, x: x + ecartA, z, rotation: Math.PI / 2 },
                { slug: b.slug, x: x + ecartB, z, rotation: -Math.PI / 2 },
            ];
        },
    };
}
/**
 * Regroupe les assises en îlots. « rangs » les laisse toutes face à l'écran —
 * c'est ce qu'on veut pour un cinéma en plein air, où personne ne s'assoit dos
 * à la toile. « ilots » les apparie deux à deux.
 *
 * L'appariement est DÉTERMINISTE : les unités arrivent déjà triées par slug
 * puis par index, et on les prend dans cet ordre. Deux compositions identiques
 * donnent les mêmes îlots, des mois plus tard, depuis un lien de devis.
 */
function enBlocs(unites, disposition, passage) {
    if (disposition === "rangs")
        return unites.map(blocSimple);
    const blocs = [];
    for (let i = 0; i < unites.length; i += 2) {
        const a = unites[i], b = unites[i + 1];
        /* Un îlot sur deux pivote d'un quart de tour. Alterner, plutôt que tirer au
           sort : la scène doit se rejouer à l'identique depuis un lien de devis des
           mois plus tard, et un `Math.random` le rendrait impossible. */
        const quartDeTour = (i / 2) % 2 === 1;
        blocs.push(b ? blocFaceAFace(a, b, passage, quartDeTour) : blocSimple(a));
    }
    return blocs;
}
/**
 * Rangées d'une zone : on remplit d'ouest en est (x croissant) puis, la
 * rangée pleine, du nord au sud (z croissant, l'écran étant au nord). Le pas
 * est l'encombrement de chaque meuble plus `CIRCULATION_M`.
 *
 * Un meuble trop profond pour la rangée en cours (zMax dépassé) part en
 * échec SANS faire avancer le curseur de rangée : un meuble suivant, plus
 * petit, garde sa chance dans la même rangée. Un meuble trop large pour la
 * zone entière (même vide) échoue immédiatement, sans quoi le passage à la
 * rangée suivante boucle indéfiniment.
 */
function shelfPack(rect, blocs, circulation) {
    const largeurZone = rect.xMax - rect.xMin;
    let rowX = rect.xMin;
    let rowZ = rect.zMin;
    let rowMaxDepth = 0;
    const placements = [];
    const echecs = [];
    for (const b of blocs) {
        if (b.wM > largeurZone) {
            echecs.push(...b.unites);
            continue;
        }
        if (rowX + b.wM > rect.xMax) {
            rowZ += rowMaxDepth + circulation;
            rowX = rect.xMin;
            rowMaxDepth = 0;
        }
        if (rowZ + b.dM > rect.zMax) {
            echecs.push(...b.unites);
            continue;
        }
        placements.push(...b.deplier(rowX + b.wM / 2, rowZ + b.dM / 2));
        rowX += b.wM + circulation;
        rowMaxDepth = Math.max(rowMaxDepth, b.dM);
    }
    return { placements, echecs, finalRowZ: rowZ, finalRowMaxDepth: rowMaxDepth };
}
/**
 * La zone principale (assises + mange-debout) partage une même largeur mais
 * une rangée est FORCÉE entre les deux groupes, même incomplète : c'est ce
 * qui garantit que toute assise reste strictement au nord de tout
 * mange-debout, quel que soit le remplissage de la dernière rangée d'assises.
 */
function packZonePrincipale(rect, assises, mangeDebout, circulation) {
    const resAssises = shelfPack(rect, assises, circulation);
    if (mangeDebout.length === 0)
        return resAssises;
    const zRupture = assises.length === 0 ? rect.zMin : resAssises.finalRowZ + resAssises.finalRowMaxDepth + circulation;
    const resDebout = shelfPack({ ...rect, zMin: zRupture }, mangeDebout, circulation);
    return {
        placements: [...resAssises.placements, ...resDebout.placements],
        echecs: [...resAssises.echecs, ...resDebout.echecs],
        finalRowZ: resDebout.finalRowZ,
        finalRowMaxDepth: resDebout.finalRowMaxDepth,
    };
}
/**
 * Largeur de zone estimée pour une passe de mesure (sol non imposé) : une
 * grille approximativement carrée, dimensionnée sur le PLUS LARGE meuble du
 * lot — une borne large mais jamais insuffisante, qui ne peut donc jamais
 * faire échouer à tort un meuble plus étroit lors de la mesure.
 */
function largeurZoneEstimeeBlocs(blocs, circulation) {
    if (blocs.length === 0)
        return circulation;
    const largeurMax = Math.max(...blocs.map((b) => b.wM));
    /* On vise le RATIO du sol, pas une grille carrée en NOMBRE de blocs.
       Compter les blocs traitait un canapé de 2 m et un pouf de 0,7 m comme
       équivalents : soixante blocs donnaient huit colonnes, soit un sol de
       20,8 × 7,4 m — une bande, et une scène qui ressemblait à un entrepôt. On
       part de l'AIRE occupée et on en déduit la largeur qui donne les bonnes
       proportions. */
    const aire = blocs.reduce((s, b) => s + (b.wM + circulation) * (b.dM + circulation), 0);
    const largeurVisee = Math.sqrt(aire * RATIO_SOL);
    const colonnes = Math.max(1, Math.round(largeurVisee / (largeurMax + circulation)));
    return colonnes * (largeurMax + circulation);
}
export function implanter(panier, catalogue, surfaceM2, 
/* L'emprise EXACTE quand elle est connue — une tente 6×6 fait 6 × 6, pas
   6,93 × 5,20. Déduire la forme de l'aire au ratio 4:3 laissait le mobilier
   dépasser latéralement de l'abri : jusqu'à 1,24 m sous une 8×8, mesuré.
   Le client paie une tente, il doit voir ses meubles dessous. */
emprise, 
/* Comment ranger les assises. Par défaut en îlots : c'est un lounge. Un
   cinéma en plein air demande « rangs » — tout le monde face à la toile. */
disposition = "ilots", 
/** Voir `personnes()` : absent = une silhouette par place. */
invites) {
    const toutes = unitesTriees(panier, catalogue);
    const aPlacer = toutes.slice(0, PLAFOND_EXEMPLAIRES);
    const horsPlafond = toutes.length - aPlacer.length;
    const assises = aPlacer.filter((u) => zoneDe(u.slug) === "assises");
    const mangeDebout = aPlacer.filter((u) => zoneDe(u.slug) === "mangeDebout");
    const bars = aPlacer.filter((u) => zoneDe(u.slug) === "bars");
    const largeurBarMax = bars.length > 0 ? Math.max(...bars.map((u) => u.item.largeurCm / 100)) : 0;
    /* Les assises deviennent des îlots ; les mange-debout et les bars restent
       seuls — on ne met pas deux mange-debout face à face, ils n'ont pas de face. */
    const blocsAssises = enBlocs(assises, disposition, PASSAGE_ILOT_M);
    const blocsDebout = mangeDebout.map(blocSimple);
    const blocsBars = bars.map(blocSimple);
    const largeurColonneBar = bars.length > 0 ? largeurBarMax + CIRCULATION_M : 0;
    let largeurM;
    let profondeurM;
    if (emprise && emprise.largeurM > 0 && emprise.profondeurM > 0) {
        // Une emprise EXACTE est connue (une tente) : elle commande la forme, pas
        // seulement l'aire. Le ratio 4:3 ferait déborder les meubles de l'abri.
        largeurM = emprise.largeurM;
        profondeurM = emprise.profondeurM;
    }
    else if (surfaceM2 && surfaceM2 > 0) {
        // La surface DEMANDÉE commande : en 4:3, quitte à laisser des exemplaires non posés.
        ({ largeurM, profondeurM } = dimsDepuisSurface(surfaceM2));
    }
    else if (aPlacer.length === 0) {
        // Panier vide : un sol par défaut, valide, sans meuble à y loger.
        largeurM = 4;
        profondeurM = 3;
    }
    else {
        // Aucune surface fournie : le sol se dimensionne sur la surface NÉCESSAIRE — mesurée
        // en rejouant le même algorithme de placement sur un sol volontairement surdimensionné
        // (profondeur infinie), puis en resserrant le sol final à ce qui a été réellement
        // consommé. La largeur, elle, reste identique entre la mesure et le placement final :
        // c'est ce qui garantit que le second passage reproduit EXACTEMENT les mêmes rangées.
        const largeurPrincipale = largeurZoneEstimeeBlocs([...blocsAssises, ...blocsDebout], CIRCULATION_M);
        const mesurePrincipale = packZonePrincipale({ xMin: 0, xMax: largeurPrincipale, zMin: 0, zMax: Infinity }, blocsAssises, blocsDebout, CIRCULATION_M);
        const profondeurPrincipale = assises.length + mangeDebout.length > 0 ? mesurePrincipale.finalRowZ + mesurePrincipale.finalRowMaxDepth : 0;
        let profondeurBars = 0;
        if (bars.length > 0) {
            const mesureBars = shelfPack({ xMin: 0, xMax: largeurColonneBar, zMin: 0, zMax: Infinity }, blocsBars, CIRCULATION_M);
            profondeurBars = mesureBars.finalRowZ + mesureBars.finalRowMaxDepth;
        }
        profondeurM = Math.max(profondeurPrincipale, profondeurBars, 0.01) + MARGE_SECURITE_M;
        largeurM = largeurPrincipale + (bars.length > 0 ? CIRCULATION_M + largeurColonneBar : 0);
    }
    const xHalf = largeurM / 2;
    const zHalf = profondeurM / 2;
    const largeurColonneBarEff = bars.length > 0 ? Math.min(largeurColonneBar, Math.max(0, largeurM - CIRCULATION_M)) : 0;
    const rectPrincipal = {
        xMin: -xHalf,
        xMax: xHalf - (bars.length > 0 ? largeurColonneBarEff + CIRCULATION_M : 0),
        zMin: -zHalf,
        zMax: zHalf,
    };
    const resultatPrincipal = packZonePrincipale(rectPrincipal, blocsAssises, blocsDebout, CIRCULATION_M);
    let placementsBars = [];
    let echecsBars = [];
    if (bars.length > 0) {
        const rectBars = { xMin: xHalf - largeurColonneBarEff, xMax: xHalf, zMin: -zHalf, zMax: zHalf };
        const resultatBars = shelfPack(rectBars, blocsBars, CIRCULATION_M);
        placementsBars = resultatBars.placements;
        echecsBars = resultatBars.echecs;
    }
    const echecsGeometrie = resultatPrincipal.echecs.length + echecsBars.length;
    /* L'orientation vient désormais des blocs eux-mêmes : une assise appariée
       regarde sa voisine, tout le reste regarde l'écran. Ce module la décide,
       parce qu'elle est indissociable de la position — deux canapés face à face
       ne sont pas deux canapés côte à côte qu'on aurait tournés après coup. */
    const brut = [...resultatPrincipal.placements, ...placementsBars];
    /* CENTRAGE. Le rangeur remplit depuis le coin nord-ouest : un canapé seul se
       retrouvait plaqué dans un angle d'un sol trois fois trop grand, et le vide
       à côté ressemblait à une erreur. On recentre l'ensemble d'un bloc — une
       translation rigide, qui ne peut donc créer aucun chevauchement, et qui
       rapproche chaque meuble du centre plutôt que des bords. */
    const meubles = centrer(brut, catalogue, largeurM, profondeurM);
    /* Le liseré s'ajoute APRÈS le placement : il agrandit le sol DESSINÉ sans
       donner un centimètre de plus au rangeur, donc sans rien changer à ce qui
       tient ou ne tient pas.
       Il ne s'applique QU'au sol que nous inventons. Une tente garde sa taille —
       c'est celle du produit vendu — et une surface demandée par le client garde
       la sienne : lui en dessiner davantage serait lui mentir sur la place dont
       il dispose. */
    const solInvente = !emprise && !(surfaceM2 && surfaceM2 > 0);
    const solLargeur = solInvente ? largeurM + LISERE_SOL_M : largeurM;
    const solProfondeur = solInvente ? profondeurM + LISERE_SOL_M : profondeurM;
    return {
        sol: { largeurM: solLargeur, profondeurM: solProfondeur },
        meubles,
        /* Le sol SANS liseré : les debout libres se tiennent sur la surface vraie
           (celle de la tente ou celle demandée), pas sur la marge dessinée. */
        personnes: personnes(meubles, catalogue, invites, { largeurM, profondeurM }),
        nonPoses: horsPlafond + echecsGeometrie,
    };
}
/**
 * Un exemplaire de PLUS de ce meuble tiendrait-il encore ? C'est le VRAI
 * moteur qui répond — jamais une règle de surface : un canapé de 2 m peut
 * refuser là où deux poufs passent. Sert à éteindre le bouton « + » AVANT
 * la faute, au lieu de laisser ajouter puis gronder.
 * Sans surface ni abri, le sol est inventé à la demande : tout tient, par
 * construction — le bouton reste donc toujours actif, et c'est voulu.
 */
export function peutAccueillir(panier, catalogue, slug, surfaceM2, emprise, disposition = "ilots") {
    const essai = panier.filter((l) => l.qte > 0).map((l) => ({ ...l }));
    const ligne = essai.find((l) => l.slug === slug);
    if (ligne)
        ligne.qte += 1;
    else
        essai.push({ slug, qte: 1 });
    return implanter(essai, catalogue, surfaceM2, emprise, disposition).nonPoses === 0;
}
/**
 * Points de contact MESURÉS dans les GLB livrés, en unités du fichier
 * (`scripts/mesurer-personnes.mjs` les recalcule ; un test les confronte aux
 * fichiers, ces nombres ne sont donc pas « en dur » mais dérivés et vérifiés).
 *
 * Deux surprises qui ont coûté trois allers-retours de captures d'écran :
 *  - l'origine des modèles n'est NI au centre du corps NI sous les fesses,
 *    elle est près des talons — tout placement « au centre » rejette le corps
 *    d'un demi-mètre vers l'arrière, à travers dossiers et voisins ;
 *  - la pose assise est sculptée pour une assise de ~39 cm (homme) / ~36 cm
 *    (femme), pas 45 : l'hypothèse « chaise standard » enfonçait pieds et
 *    fesses dans tout ce qui dépasse ces hauteurs.
 */
export const ANCRAGES = {
    "homme-assis": { semelleY: -0.041, fessesY: 0.853, talonZ: -0.207, dosZ: -1.053 },
    "femme-assise": { semelleY: -0.012, fessesY: 0.812, talonZ: -0.172, dosZ: -1.091 },
    "homme-debout": { semelleY: -0.041 },
    "femme-debout": { semelleY: -0.012 },
};
/**
 * Lacet correctif par meuble, MESURÉ dans les GLB (`scripts/mesurer-personnes.mjs`).
 *
 * La scène attend la largeur le long de x et le dossier au fond (+y). Or ces
 * fichiers posent la profondeur sur X : dossier des canapés et de la chaise
 * vers −X, base des banquettes U/N vers +X, tables longues couchées sur Y.
 * Sans ce quart de tour, le canapé 2 places se dessinait EN TRAVERS de
 * l'emprise que le moteur lui réserve : ses assis flottaient à côté, et la
 * banquette U asseyait ses convives hors de sa base. Un test confronte ces
 * signes aux fichiers — comme `ANCRAGES`, mesuré puis verrouillé.
 */
export const LACET_MEUBLE = {
    "canape-double": -Math.PI / 2,
    "canape-simple": -Math.PI / 2,
    "chaise": -Math.PI / 2,
    "canape-n": -Math.PI / 2,
    "canape-u": -Math.PI / 2,
    "table-bistro-longue": Math.PI / 2,
    "table-bistro-courbe": Math.PI / 2,
};
/** Semelles posées sur le sol, jamais dessous. */
function elevationDebout(m) {
    return -ANCRAGES[m.fichier].semelleY * m.echelle;
}
/**
 * Assis : fesses posées SUR le coussin — et si le coussin est plus bas que la
 * pose du modèle, on ne descend que jusqu'à ce que les semelles touchent le
 * sol : mieux vaut un centimètre d'air sous les fesses, invisible, que des
 * pieds qui crèvent le plancher, criants.
 */
function elevationAssis(m, assiseM) {
    const a = ANCRAGES[m.fichier];
    return Math.max(assiseM - (a.fessesY ?? 0) * m.echelle, -a.semelleY * m.echelle);
}
/** Au-delà, la scène devient une foule illisible et le rendu s'alourdit pour rien. */
const PLAFOND_PERSONNES = 28;
export function personnes(meubles, catalogue, 
/** Nombre d'INVITÉS à dessiner. Absent : une silhouette par place, comme
    toujours. Présent, il COMMANDE : on assoit d'abord (jusqu'aux places),
    on attable ensuite, et le surplus se tient debout dans l'espace libre —
    5 invités sur 2 places, c'est 2 assis et 3 debout, pas 2 personnes. */
invites, 
/** Le sol où les debout libres ont le droit de se tenir. */
sol) {
    const quota = invites === undefined ? Infinity : Math.min(invites, PLAFOND_PERSONNES);
    /* Une personne « occupe » ce rayon : en deçà, deux silhouettes fusionnent
       visuellement. 0,20 m laisse passer deux voisins d'une banquette 4 places
       (0,45 m d'entraxe) mais élimine les superpositions. */
    const RAYON = 0.2;
    const out = [];
    let compte = 0; // alternance homme/femme sur les CANDIDATS : stable même si un candidat est refusé
    /* Un candidat n'entre que s'il ne chevauche ni une personne d'un AUTRE
       meuble, ni un autre meuble. Les voisins du MÊME meuble, eux, sont serrés à
       dessein — une banquette U met ses 5 places à 36 cm. Et les meubles tournent
       parfois d'un quart de tour : le test se fait dans le repère du meuble,
       jamais sur des rectangles supposés alignés aux axes. */
    const accepter = (p) => {
        for (const q of out) {
            if (p.duMeuble >= 0 && q.duMeuble === p.duMeuble)
                continue;
            const dx = p.x - q.x, dz = p.z - q.z;
            if (dx * dx + dz * dz < (2 * RAYON) ** 2)
                return;
        }
        for (let j = 0; j < meubles.length; j++) {
            if (j === p.duMeuble)
                continue;
            const m = meubles[j];
            const it = catalogue[m.slug];
            if (!it)
                continue;
            const c = Math.cos(m.rotation), s = Math.sin(m.rotation);
            const dx = p.x - m.x, dz = p.z - m.z;
            const u = Math.abs(dx * c + dz * s); // le long de la largeur du meuble
            const v = Math.abs(dx * s - dz * c); // le long de sa profondeur
            if (u < it.largeurCm / 200 + RAYON && v < it.profondeurCm / 200 + RAYON)
                return;
        }
        out.push(p);
    };
    for (let mi = 0; mi < meubles.length; mi++) {
        const m = meubles[mi];
        const item = catalogue[m.slug];
        if (!item)
            continue;
        const w = item.largeurCm / 100;
        const d = item.profondeurCm / 100;
        /* Un demi-tour échange le sens, pas l'encombrement : on projette le long de
           l'axe du meuble via son cosinus, ce qui reste juste pour le quart de tour
           des blocs face à face horizontaux. */
        const cos = Math.cos(m.rotation), sin = Math.sin(m.rotation);
        if (item.placesAssises > 0) {
            /* Assis : une silhouette par place, réparties sur la largeur de l'assise. */
            const n = item.placesAssises;
            const assiseM = (item.hauteurAssiseCm ?? 45) / 100;
            for (let i = 0; i < n && out.length < quota; i++) {
                const modele = modeleSilhouette(true, compte++);
                const long = (i + 0.5) / n - 0.5; // -0,5 … +0,5 le long du meuble
                const a = ANCRAGES[modele.fichier];
                const talonM = -(a.talonZ ?? 0) * modele.echelle;
                /* Deux familles d'assises, deux ancrages :
                   - banquettes PROFONDES (U/N, 1,85 m) : l'assise est la BASE, au fond ;
                     fesses à 25 cm de la face arrière, jambes vers le centre ouvert ;
                   - le reste : talons 7 cm DEVANT la face avant du catalogue — les GLB
                     débordent de ~5 cm sur la cote publique, et les tibias doivent
                     pendre devant la face RENDUE, pas devant la théorique. */
                const avance = d > 1.2
                    ? -d / 2 + 0.25 - (a.dosZ ?? 0) * modele.echelle
                    : d / 2 + 0.07 + talonM;
                accepter({
                    x: m.x + long * w * cos + avance * sin,
                    z: m.z + long * w * sin - avance * cos,
                    rotation: m.rotation,
                    assis: true,
                    elevationM: elevationAssis(modele, assiseM),
                    modele,
                    duMeuble: mi,
                });
            }
        }
        else {
            /* Debout : deux silhouettes de part et d'autre du mange-debout, tournées
               vers lui — c'est ainsi qu'on se tient autour d'une table haute. */
            const ecart = d / 2 + 0.45;
            for (const sens of [1, -1]) {
                if (out.length >= quota)
                    break;
                const modele = modeleSilhouette(false, compte++);
                accepter({
                    x: m.x - sens * ecart * sin,
                    z: m.z + sens * ecart * cos,
                    /* Chacun REGARDE la table : celui posé côté +z regarde vers −z (angle
                       du meuble), celui d'en face ajoute le demi-tour. L'ancien code
                       portait le flip inverse, compensé par un π caché dans le rendu —
                       qui retournait aussi les assis, corps entier devant le canapé. */
                    rotation: m.rotation + (sens === 1 ? 0 : Math.PI),
                    assis: false,
                    elevationM: elevationDebout(modele),
                    modele,
                    duMeuble: mi,
                });
            }
        }
    }
    /* Le surplus d'invités se tient DEBOUT dans l'espace libre : balayage d'une
       grille du fond de la scène vers l'avant (au cinéma, on se tient derrière
       les rangées, pas devant l'écran), chaque candidat passant par le même
       filtre anti-collision que les autres. Le regard va au barycentre des
       meubles : un groupe tourné vers la scène, pas des sentinelles au garde-
       à-vous. */
    if (invites !== undefined && sol && out.length < quota) {
        const cx = meubles.length ? meubles.reduce((s, m) => s + m.x, 0) / meubles.length : 0;
        const cz = meubles.length ? meubles.reduce((s, m) => s + m.z, 0) / meubles.length : 0;
        const PAS = 0.55;
        const demiL = Math.max(0, sol.largeurM / 2 - 0.3);
        const demiP = Math.max(0, sol.profondeurM / 2 - 0.3);
        for (let z = demiP; z >= -demiP - 1e-9 && out.length < quota; z -= PAS) {
            for (let x = -demiL; x <= demiL + 1e-9 && out.length < quota; x += PAS) {
                const modele = modeleSilhouette(false, compte++);
                accepter({
                    x,
                    z,
                    rotation: Math.atan2(cx - x, -(cz - z)),
                    assis: false,
                    elevationM: elevationDebout(modele),
                    modele,
                    duMeuble: -1,
                });
            }
        }
    }
    return out.slice(0, PLAFOND_PERSONNES);
}
/* Hauteurs MESURÉES dans les fichiers livrés, en unités du modèle. */
const HAUTEUR_FICHIER = { hommeDebout: 3.83, femmeDebout: 3.70 };
/* Tailles visées, en mètres. */
const TAILLE_REELLE = { homme: 1.75, femme: 1.65 };
const ECHELLE_HOMME = TAILLE_REELLE.homme / HAUTEUR_FICHIER.hommeDebout;
const ECHELLE_FEMME = TAILLE_REELLE.femme / HAUTEUR_FICHIER.femmeDebout;
/**
 * Alterne hommes et femmes selon l'index — jamais au hasard : une scène rejouée
 * depuis un lien de devis doit montrer les mêmes personnes des mois plus tard.
 */
export function modeleSilhouette(assis, index) {
    const homme = index % 2 === 0;
    return {
        fichier: homme ? (assis ? "homme-assis" : "homme-debout") : (assis ? "femme-assise" : "femme-debout"),
        echelle: homme ? ECHELLE_HOMME : ECHELLE_FEMME,
        tailleM: homme ? TAILLE_REELLE.homme : TAILLE_REELLE.femme,
    };
}
