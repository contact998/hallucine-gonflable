/*
 * Ce qu'une tente X peut être, et ce qu'elle ne peut pas être.
 *
 * C'est le cœur du module partagé : le site public et le CRM composent la même
 * tente parce qu'ils lisent ce fichier. Il a été écrit après avoir constaté que
 * les deux outils autorisaient des choses différentes — un commercial et son
 * client ne pouvaient pas composer la même chose, et personne ne s'en était
 * aperçu pendant des mois.
 *
 * RÈGLE DE TENUE : toute interdiction écrite ici DOIT dire pourquoi, juste à
 * côté. Trois interdits ont survécu des mois dans le calculateur du CRM faute
 * d'une phrase d'explication — personne ne pouvait les contester sans aller
 * réinterroger l'usine. Une règle sans raison est une règle qu'on ne peut plus
 * enlever.
 *
 * Aucun PRIX ici. Les tarifs vivent au catalogue du CRM, qui en est maître ;
 * ce fichier ne sait que construire les clés pour aller les y chercher.
 */

/** Ordre figé : il sert au code de configuration, qui voyage dans les devis. */
export const COTES = ["avant", "droit", "arriere", "gauche"] as const;
export type Cote = (typeof COTES)[number];

/* ── La gamme ───────────────────────────────────────────────────────────────
 *
 * UNE ligne par modèle, et tout en dérive : les tailles vendables, ce que
 * chaque côté accepte, le préfixe des clés du catalogue. Ouvrir un modèle de
 * plus, c'est ajouter une ligne — pas retoucher dix fichiers.
 *
 * `cleParCote` : chez la N, les quatre côtés n'ont pas les mêmes dimensions
 * (A tient sur le grand côté, B sur le pignon), donc pas le même prix. Sa clé
 * catalogue porte la lettre du côté — `tente-n-3x3-paroi-b`. Chez les trois
 * autres, les côtés sont interchangeables et la clé n'en dit rien.
 *
 * `types` : ce qu'un côté peut porter, par ordre d'affichage. Le Spider n'a pas
 * de paroi courbe à son tarif, la V n'a qu'un seul modèle de paroi — ce ne sont
 * pas des oublis, c'est ce que Bayes fabrique.
 */
export const MODELES = [
  {
    slug: "x",
    libelle: "X",
    tailles: ["3x3", "4x4", "5x5", "6x6", "7x7", "8x8"],
    /* La 4 × 4 et non la 3 × 3 : c'est la taille sur laquelle les deux écrans
       s'ouvrent depuis toujours, un choix commercial. La plus petite de la
       gamme est la taille MODÉLISÉE, ce n'est pas la même chose. */
    tailleDefaut: "4x4",
    cotes: COTES,
    types: ["vide", "paroi", "porte", "fenetre", "courbe", "courbe_fenetre", "jonction"],
    cleParCote: false,
  },
  {
    slug: "spider",
    libelle: "Spider",
    tailles: ["4x4", "6x6", "8x8", "10x10"],
    tailleDefaut: "4x4",
    cotes: COTES,
    types: ["vide", "paroi", "porte", "fenetre", "jonction"],
    cleParCote: false,
  },
  {
    /* Quatre côtés nommés comme ceux de la X — mais qui ne sont PAS
       interchangeables : elle est rectangulaire, donc ses pignons et ses longs
       côtés n'ont ni les mêmes dimensions ni le même prix. Le catalogue les
       distingue par les lettres de Bayes, d'où `lettreCote`.

       Les lettres sont ÉTABLIES sur la géométrie du fichier fournisseur, pas
       devinées — mesures en millimètres dans son propre repère :

         · A — face X = ±1 486, haute de 1 723 : la hauteur de gouttière, donc
           un LONG CÔTÉ. Il n'est modélisé qu'une fois parce que les deux longs
           côtés sont identiques — d'où un seul prix pour gauche ET droit.
         · B — haute de 2 547, jusqu'à la voûte : la PAROI ENTIÈRE d'un pignon,
           celle de l'avant comme celle de l'arrière. C'est Bayes qui l'a dit le
           11/08/2026 ; le fichier ne la pose qu'une fois, sur une face.
         · C — le bandeau courbe, 1 540 → 2 547 sur la face avant. C'est un
           choix de pignon à part entière, et c'est LUI qui porte la bande de
           zip du bas. Sans lettre au tarif : le même se pose sur l'un ou
           l'autre pignon.
         · D — le DEMI-mur, 0 → 1 944. Il ne se vend jamais seul : il vient
           s'accrocher sous le bandeau C, en option. */
    slug: "n",
    libelle: "N",
    tailles: ["3x3", "4x4", "5x5"],
    tailleDefaut: "3x3",
    cotes: COTES,
    /* Une paroi ENTIÈRE devant est une paroi de type B, comme derrière — dit
       par Bayes le 11/08/2026. Le D n'est pas la paroi du pignon avant : c'est
       le DEMI-mur en option sous le bandeau, et il a sa propre entrée. */
    lettreCote: { avant: "b", arriere: "b", gauche: "a", droit: "a" } as Record<string, string>,
    types: ["vide", "paroi", "porte", "fenetre", "courbe"],
    /* Le bandeau courbe est un CHOIX de pignon, pas un supplément — dit par
       Bayes : « quand l'avant porte le bandeau C, il y a une bande de zip, et
       le demi-mur D devient une option ». Les longs côtés n'ont pas d'arc à
       fermer : ils s'arrêtent à la gouttière, à 1 723, et sont droits. */
    typesCote: {
      gauche: ["vide", "paroi", "porte", "fenetre"],
      droit: ["vide", "paroi", "porte", "fenetre"],
    } as Record<string, readonly string[]>,
    /* Le DEMI-MUR se pose SOUS le bandeau, jamais seul : c'est le bandeau qui
       porte la bande de zip sur laquelle il vient s'accrocher. Trois variantes
       au tarif, comme une paroi — pleine, à porte, à fenêtre. */
    demiMur: {
      lettre: "d",
      sousChoix: "courbe",
      cotes: ["avant"],
      types: ["vide", "paroi", "porte", "fenetre"],
      impression: "imp_paroi",
    } as DemiMurModele,
    cleParCote: true,
  },
  {
    /* Trois côtés, et ILS SONT IDENTIQUES — c'est pour ça que Bayes ne facture
       qu'un seul modèle de paroi, au même prix quel que soit le côté. Ils n'ont
       donc ni avant ni arrière à distinguer : A, B, C suffisent, et l'ordre
       n'engage rien. */
    slug: "v",
    libelle: "V",
    tailles: ["4x4", "5x5", "6x6"],
    tailleDefaut: "4x4",
    cotes: ["a", "b", "c"],
    types: ["vide", "paroi"],
    cleParCote: false,
  },
] as const;

/**
 * Le DEMI-MUR : un second étage qui se pose SOUS un choix de côté.
 *
 * Chez la N, sous le bandeau courbe. Un pignon avant se compose donc de deux
 * façons — une paroi entière (type B, du sol à la voûte), ou le bandeau seul,
 * avec ou sans son demi-mur en dessous. C'est Bayes qui l'a dit, et c'est ce
 * que le fichier montre : le demi-mur s'arrête à 1 944 mm sous une ouverture de
 * 2 547, et la bande de zip sur laquelle il s'accroche arrive avec le bandeau.
 */
export interface DemiMurModele {
  /** Lettre du tarif : `tente-n-3x3-paroi-porte-d`. */
  lettre: string;
  /** Le choix de côté SOUS lequel il se pose. Chez la N, le bandeau courbe :
   *  c'est lui qui porte la bande de zip sur laquelle le demi-mur s'accroche,
   *  donc il n'existe pas sans lui. */
  sousChoix: string;
  /** Les côtés où il existe. */
  cotes: readonly string[];
  /** Ce qu'il peut porter, comme une paroi — « vide » = pas de demi-mur. */
  types: readonly string[];
  /** L'option d'impression qu'il déclenche quand son côté est habillé. */
  impression: string;
}

export type Modele = (typeof MODELES)[number] & {
  lettreCote?: Record<string, string>;
  typesCote?: Record<string, readonly string[]>;
  demiMur?: DemiMurModele;
};
export type SlugModele = Modele["slug"];

/** Le modèle historique. Un code de configuration sans modèle est une tente X :
 *  des devis envoyés avant l'ouverture de la gamme pointent dessus. */
export const MODELE_DEFAUT: SlugModele = "x";

/** Rend toujours un modèle — le défaut si le slug est inconnu, pour qu'un lien
 *  trafiqué ouvre une tente X plutôt que de casser la page. */
export const modele = (slug: string | null | undefined): Modele =>
  MODELES.find((m) => m.slug === slug) ?? MODELES[0];

/** Les tailles de la tente X. Conservé pour les appels qui ne connaissent pas
 *  encore la gamme ; dérivé de la table, jamais recopié. */
export const TAILLES = modele(MODELE_DEFAUT).tailles;
export type Taille = string;

/** Ce type de côté est-il au catalogue de ce modèle ? Le Spider n'a pas de
 *  paroi courbe, la V n'a qu'un modèle de paroi — demander une clé pour un type
 *  absent ne trouverait aucun prix, autant le dire tout de suite. */
export const typesDuCote = (m: Modele, cote?: string): readonly string[] =>
  (cote && m.typesCote?.[cote]) || (m.types as readonly string[]);

export const typePossible = (m: Modele, type: string, cote?: string): boolean =>
  typesDuCote(m, cote).includes(type);

/**
 * Clé de REPLI quand le tarif n'a pas encore la ligne d'un choix que le dessin
 * sait pourtant montrer : la paroi pleine du même modèle et de la même taille.
 *
 * Le dessin fait foi (décision de Daniel, 11/08/2026). Une pièce que Bayes
 * livre est un produit : la cacher parce qu'une ligne manque au tarif coûte
 * plus cher qu'afficher un prix à confirmer. L'écran DOIT le dire — en rouge —
 * et le commercial va chercher le vrai prix avant d'envoyer le devis.
 *
 * Cas vécus : la porte de la V, les deux parois courbes du Spider — modélisées,
 * dépliées, prêtes, et invisibles depuis l'ouverture de la gamme.
 */
export const cleRepliCote = (m: Modele, taille: string, cote?: string): string | null =>
  cleTypeCote(m, taille, "paroi", cote);

/** Le bandeau se pose-t-il sur CE côté, au-dessus de CE choix de paroi ?
 *  Voir `BandeauModele` : la réponse vient des hauteurs mesurées, côté par
 *  côté, pas d'une règle générale. */
export const demiMurPossible = (m: Modele, cote: string, choixCote: string): boolean =>
  !!m.demiMur && m.demiMur.cotes.includes(cote) && choixCote === m.demiMur.sousChoix;

/** Ce que le demi-mur peut porter — les mêmes types qu'une paroi. */
export const typesDemiMur = (m: Modele): readonly string[] => m.demiMur?.types ?? [];

/** Clé catalogue d'un demi-mur : `tente-n-3x3-paroi-porte-d`. */
export function cleDemiMur(m: Modele, taille: string, type: string): string | null {
  const d = m.demiMur;
  if (!d || !d.types.includes(type)) return null;
  const t = typeCote(type);
  if (!t.slug) return null;
  return `tente-${m.slug}-${taille}-${t.slug}-${d.lettre}`;
}

/**
 * Ce qu'un côté peut porter. Un côté porte UN seul type — ils sont exclusifs
 * par construction, ce qui rend inutile toute règle du genre « pas de porte sur
 * une jonction » : le côté est l'un ou l'autre.
 *
 * `slug` : suffixe de la clé catalogue, `tente-x-<taille>-<slug>`.
 * `impression` : l'option d'impression que ce type déclenche quand le client
 * choisit une couleur ou pose une image — chez ce produit, une couleur EST une
 * impression, la toile étant blanche.
 */
export const TYPES_COTE = [
  { valeur: "vide", libelle: "choix_vide", slug: null, impression: null },
  { valeur: "paroi", libelle: "choix_paroi", slug: "paroi", impression: "imp_paroi" },
  { valeur: "porte", libelle: "choix_porte", slug: "paroi-porte", impression: "imp_paroi" },
  { valeur: "fenetre", libelle: "choix_fenetre", slug: "paroi-fenetre", impression: "imp_paroi" },
  { valeur: "courbe", libelle: "choix_courbe", slug: "paroi-courbe", impression: "imp_courbe" },
  { valeur: "courbe_fenetre", libelle: "choix_courbe_fenetre", slug: "paroi-courbe-fenetre", impression: "imp_courbe" },
  { valeur: "jonction", libelle: "choix_jonction", slug: "jonction", impression: null },
] as const;

export type TypeCote = (typeof TYPES_COTE)[number]["valeur"];

export const typeCote = (valeur: string) =>
  TYPES_COTE.find((t) => t.valeur === valeur) ?? TYPES_COTE[0];

/* ── Les règles de fabrication ──────────────────────────────────────────────
 *
 * Il n'y en a que DEUX, et elles sont toutes deux géométriques : on les vérifie
 * à l'œil sur la 3D, sans rien demander à personne.
 *
 * Trois autres ont été retirées le 08/08/2026 après examen, parce qu'elles ne
 * décrivaient aucune impossibilité — elles sont listées ici pour qu'on ne les
 * réinvente pas :
 *
 *   · « 4 éléments au maximum, parois et auvents confondus ». Le compte
 *     plafonnait au nombre de côtés, comme si un auvent prenait la place d'une
 *     paroi. Il se monte AU-DESSUS. Quatre parois plus un auvent est une tente
 *     ordinaire, et la règle l'interdisait.
 *   · « une seule porte en 3×3 et 4×4 ». Une porte est une paroi avec une
 *     ouverture ; la taille ne change pas ce qu'un côté peut recevoir, c'est le
 *     même dessin agrandi.
 *   · « aucun auvent dès qu'un côté est en jonction ». La jonction concerne le
 *     côté collé à l'autre tente ; un auvent sur un autre côté est sur un autre
 *     côté. La portée de la règle n'avait aucun rapport avec sa cause.
 */

/** Types de côté qui acceptent un auvent PAR-DESSUS. L'auvent n'est pas un
 *  choix de côté : il se cumule (décision du 06/08/2026). */
const AUVENT_COMPATIBLE = new Set<string>(["vide", "paroi", "porte", "fenetre"]);

/**
 * L'auvent se monte-t-il sur ce côté ?
 *
 * Non sur une paroi COURBE : le bandeau déborde vers l'extérieur, l'auvent n'a
 * pas où se fixer. Non sur une JONCTION : ce côté est collé à une autre tente,
 * il n'y a pas d'air libre au-dessus. Rien d'autre ne l'empêche.
 */
export function auventPossible(type: string): boolean {
  return AUVENT_COMPATIBLE.has(type);
}

/* ── La rangée de tentes reliées ────────────────────────────────────────────
 *
 * N tentes IDENTIQUES accolées le long du côté en jonction, décrites en UNE
 * composition + un nombre. La dérivation vit ici, et nulle part ailleurs :
 * le visualiseur en tire ce qu'il dessine, le chiffrage du CRM ce qu'il
 * facture — deux copies auraient fini par montrer une rangée et en vendre
 * une autre.
 *
 * Le modèle est SYMÉTRIQUE (décision de Daniel, 21/08/2026) : le choix du
 * côté opposé à la jonction ferme LES DEUX bouts de la rangée, avec ses
 * annexes (auvent, demi-mur, impression) ; les tentes se traversent — les
 * faces intermédiaires sont ouvertes sous les gouttières. Une rangée de n
 * porte donc n − 1 jonctions : celle de la dernière tente cède sa place au
 * mur du bout.
 */

/** Ce qu'une tente d'une rangée porte par côté. `impCote` est le drapeau
 *  d'impression de paroi du CRM — dérivé ici pour que le prix suive le mur. */
export interface TenteRangee {
  cotes: Record<string, string>;
  auvents: Record<string, boolean>;
  demiMurs?: Record<string, string>;
  impCote?: Record<string, boolean>;
}

/** Le plafond du compteur, partout : le site, le CRM et le code d'URL comptent
 *  jusqu'ici et pas plus loin. Au-delà, ce n'est plus une rangée qu'on livre en
 *  une fois, c'est un chantier qui se discute. */
export const NB_TENTES_MAX = 10;

/** Le nombre de tentes reliées, assaini : entier, borné à [1, `NB_TENTES_MAX`].
 *  Un nombre absent, illisible ou trafiqué vaut « une seule tente ». */
export function nbTentesRangee(n: unknown): number {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return 1;
  return Math.min(NB_TENTES_MAX, Math.max(1, v));
}

/**
 * La rangée a-t-elle un sens sur cette composition ?
 *
 * Il faut EXACTEMENT un côté en jonction — c'est lui qui donne l'axe — et un
 * modèle à quatre côtés, pour que le côté opposé existe. Ailleurs, le compteur
 * ne doit ni s'afficher, ni voyager dans le code, ni chiffrer quoi que ce soit.
 */
export function rangeePossible(m: Modele, cotes: Record<string, string>): boolean {
  const cotesModele = m.cotes as readonly string[];
  return cotesModele.length === 4 && cotesModele.filter((c) => cotes[c] === "jonction").length === 1;
}

/**
 * Les n tentes de la rangée, dérivées du module composé.
 *
 * Rend `[module]` tel quel — même référence — quand la rangée n'a pas de
 * sens : n ≤ 1, aucun côté en jonction, plusieurs (l'axe serait ambigu ; ces
 * compositions restent le geste manuel d'aujourd'hui), ou un modèle sans
 * côté opposé (la V et ses trois côtés).
 */
export function rangeeTentes(m: Modele, module: TenteRangee, n: number): TenteRangee[] {
  /* Le plafond `NB_TENTES_MAX` vit DANS la fonction, pas dans un commentaire :
     un appelant qui transmet un n brut (état non issu de `decoderConfig`) ne
     peut plus faire cloner des centaines de socles et parois — l'onglet gelait.
     `nbTentesRangee` assainit aussi le nombre (entier, ≥ 1), donc tous les
     appelants présents et futurs sont bornés d'un seul geste. */
  const nb = nbTentesRangee(n);
  const cotesModele = m.cotes as readonly string[];
  const axes = cotesModele.filter((c) => module.cotes[c] === "jonction");
  if (nb <= 1 || !rangeePossible(m, module.cotes)) return [module];
  const axe = axes[0];
  const oppose = cotesModele[(cotesModele.indexOf(axe) + 2) % 4];

  const tentes: TenteRangee[] = [];
  for (let i = 0; i < nb; i++) {
    const cotes = { ...module.cotes };
    const auvents = { ...module.auvents };
    const demiMurs = { ...module.demiMurs };
    const impCote = { ...module.impCote };
    if (i > 0) {
      // Ouverte vers la précédente : le mur du bout n'existe qu'au départ.
      cotes[oppose] = "vide";
      auvents[oppose] = false;
      demiMurs[oppose] = "vide";
      impCote[oppose] = false;
    }
    if (i === nb - 1) {
      // Le bout d'arrivée : le miroir du départ, annexes comprises.
      cotes[axe] = module.cotes[oppose] ?? "vide";
      auvents[axe] = module.auvents[oppose] ?? false;
      demiMurs[axe] = module.demiMurs?.[oppose] ?? "vide";
      impCote[axe] = module.impCote?.[oppose] ?? false;
    }
    tentes.push({ cotes, auvents, demiMurs, impCote });
  }
  return tentes;
}

/* ── Impressions et accessoires ─────────────────────────────────────────── */

/** Option d'impression → suffixe de clé catalogue. */
export const IMPRESSIONS = {
  imp_toit: "impression-toit",
  imp_zip: "impression-cache-zip",
  imp_structure: "impression-structure",
  imp_pvc: "impression-pvc-pieds",
  imp_paroi: "impression-paroi",
  /* Imprimer une paroi à PORTE coûte plus cher qu'une paroi pleine — Bayes l'a
     séparé sur la V le 12/08/2026 (51/61/71 $ contre 40/46/52). Voir
     `impressionsCote` : les tentes dont le tarif ne fait pas la différence
     n'ont pas cette clé et gardent `imp_paroi`. */
  imp_paroi_porte: "impression-paroi-porte",
  imp_courbe: "impression-paroi-courbe",
  imp_auv_bandeau: "impression-auvent-bandeau",
  imp_auv_toile: "impression-auvent-toile",
  imp_auv_pied: "impression-auvent-pied",
  imp_auv_pvc: "impression-auvent-pvc",
  imp_jonction: "impression-jonction",
} as const;
export type Impression = keyof typeof IMPRESSIONS;

/** Toujours proposées. */
export const IMP_SOCLE: Impression[] = ["imp_toit", "imp_zip", "imp_structure", "imp_pvc"];
/** Proposées seulement si la composition porte un auvent. */
export const IMP_AUVENT: Impression[] = [
  "imp_auv_bandeau", "imp_auv_toile", "imp_auv_pied", "imp_auv_pvc",
];
/** Proposée seulement si la composition porte une jonction. */
export const IMP_JONCTION: Impression[] = ["imp_jonction"];

/**
 * Les impressions qui peuvent chiffrer un côté, de la PLUS PRÉCISE à la plus
 * générale — le premier prix trouvé au catalogue gagne.
 *
 * Une seule entrée pour presque tout : c'est la paroi à porte qui fait
 * exception, et seulement chez les tentes dont Bayes sépare les deux tarifs.
 * Le repli n'est pas une commodité, il est la règle : sans lui, ajouter une clé
 * plus fine ferait DISPARAÎTRE la ligne d'impression des tentes qui ne l'ont
 * pas au tarif — une porte imprimée gratuite, ce qui ne se voit pas sur un
 * devis. C'est ici, dans le module, parce que le site et le CRM doivent tomber
 * sur le même prix ; deux replis écrits séparément finiraient par diverger.
 */
export function impressionsCote(type: string): Impression[] {
  const t = typeCote(type);
  if (!t.impression) return [];
  return t.valeur === "porte"
    ? ["imp_paroi_porte", t.impression as Impression]
    : [t.impression as Impression];
}

/** Accessoires. `slug` nul = la clé dépend de la taille (le lest en eau). */
export const ACCESSOIRES = [
  { valeur: "acc_sac", slug: "tente-accessoire-sac" },
  { valeur: "acc_led", slug: "tente-accessoire-led" },
  { valeur: "acc_pompe_main", slug: "tente-accessoire-pompe-main" },
  { valeur: "acc_valves", slug: "tente-accessoire-valves" },
  { valeur: "acc_lest_eau", slug: null },
] as const;
export type Accessoire = (typeof ACCESSOIRES)[number]["valeur"];

/* ── Les clés du catalogue ──────────────────────────────────────────────────
 *
 * C'est le CONTRAT avec le catalogue du CRM. Les deux applications doivent
 * construire exactement les mêmes clés, sinon l'une trouve un prix là où
 * l'autre n'en trouve pas — et c'est indétectable à l'œil.
 */

/*
 * Le modèle est un paramètre OBLIGATOIRE, jamais un défaut implicite. Un défaut
 * laisserait un appelant oublié fabriquer tranquillement des clés de tente X
 * pour un Spider : il trouverait des prix — les mauvais — et rien ne le
 * signalerait. En l'exigeant, le compilateur montre tous les appels le jour où
 * la gamme s'élargit.
 */

/** La tente nue : toit + structure, sans aucun côté. */
export const cleTente = (m: Modele, taille: string) => `tente-${m.slug}-${taille}`;

/**
 * Un type de côté. `null` si ce type ne se facture pas (côté ouvert) ou s'il
 * n'existe pas chez ce modèle.
 *
 * `cote` n'est lu que chez les modèles à côtés facturés séparément (la N) ; il
 * est ignoré ailleurs, où les côtés sont interchangeables. La paroi courbe fait
 * exception même chez la N : elle n'existe que sur un côté, donc sa clé n'a pas
 * besoin de le préciser — et le catalogue la porte sans lettre.
 */
export function cleTypeCote(m: Modele, taille: string, type: string, cote?: string): string | null {
  if (!typePossible(m, type, cote)) return null;
  const t = typeCote(type);
  if (!t.slug) return null;

  /* La paroi courbe fait exception même chez un modèle facturé par côté : elle
     n'existe que sur un côté, donc le catalogue la porte sans lettre. */
  if (!m.cleParCote || t.slug.startsWith("paroi-courbe")) {
    return `tente-${m.slug}-${taille}-${t.slug}`;
  }

  /* Facturé par côté : sans lettre établie, on ne rend PAS de clé. Une clé
     approchée trouverait le prix d'un AUTRE côté — un devis faux qui a l'air
     juste est pire qu'un prix manquant, qui se voit. */
  const lettre = cote ? m.lettreCote?.[cote] : undefined;
  if (!lettre) return null;
  return `tente-${m.slug}-${taille}-${t.slug}-${lettre}`;
}

export const cleAuvent = (m: Modele, taille: string) => `tente-${m.slug}-${taille}-auvent`;

export const cleImpression = (m: Modele, taille: string, imp: Impression) =>
  `tente-${m.slug}-${taille}-${IMPRESSIONS[imp]}`;

/** Les accessoires ne dépendent pas tous de la taille — le lest, si. Et ils ne
 *  dépendent d'aucun modèle : un sac est un sac.
 *
 *  Le lest en eau est traité EXPLICITEMENT : c'est le seul dont le slug dépend
 *  de la taille (il est `null` dans ACCESSOIRES pour cette raison). Toute valeur
 *  ABSENTE de la table rend `null`, comme `cleTypeCote` — jamais un repli muet
 *  sur la clé du lest. Sans ce garde-fou, une clé d'option périmée ou fautive
 *  (une ConfigTente bâtie à la main par un appelant) devenait une ligne « lest
 *  en eau » chiffrée au prix du lest, sans le moindre signal. */
export function cleAccessoire(m: Modele, taille: string, acc: string): string | null {
  if (acc === "acc_lest_eau") return `tente-${m.slug}-${taille}-lest-eau`;
  return ACCESSOIRES.find((x) => x.valeur === acc)?.slug ?? null;
}
