/*
 * Code de configuration d'une tente X — la composition tient dans un paramètre
 * d'URL lisible à l'œil nu, pour que le commercial renvoie au client SA tente
 * depuis le devis : /configurateur-tente-gonflable?c=4x4.pFa-.02.sl
 *
 * Format, séparé par des points :
 *   1. taille           « 4x4 »
 *   2. les 4 côtés      une lettre par côté, dans l'ordre avant · droit ·
 *                       arrière · gauche ; MAJUSCULE = un auvent en plus
 *   3. impressions      les indices cochés, collés
 *   4. accessoires      les initiales cochées, collées
 *   5. tentes reliées   le nombre, écrit SEULEMENT au-delà d'une tente
 *                       (ajouté le 25/08/2026 : sans lui, un devis de rangée
 *                       rouvrait le prix d'UNE tente)
 *
 * Volontairement court et stable plutôt qu'un JSON encodé : ça tient dans un
 * SMS, ça survit aux retours à la ligne des logiciels de messagerie, et ça se
 * relit à l'œil en cas de litige sur ce qui avait été demandé.
 *
 * PARTAGÉ avec le CRM : il reçoit ce code dans la demande de devis et
 * reconstitue le lien. Toute évolution du format doit rester rétro-compatible
 * (un ancien code doit continuer à s'ouvrir), sinon les devis déjà envoyés
 * pointent dans le vide.
 */

import {
  MODELES, MODELE_DEFAUT, modele as trouverModele, TAILLES, COTES,
  typePossible, demiMurPossible, typesDemiMur, rangeePossible, nbTentesRangee,
} from "./composition.js";

/** Dérivées de la table des modèles — une seule source pour la gamme. */
export const TAILLES_TENTE = TAILLES;
export type TailleTente = string;

export const COTES_TENTE = COTES;
export type CoteTente = (typeof COTES_TENTE)[number];

/** Lettre ↔ choix de côté. `-` = côté ouvert. Une lettre attribuée ne change
 *  plus jamais : les devis déjà envoyés portent ces codes. */
const LETTRE_COTE: Record<string, string> = {
  "-": "vide",
  p: "paroi",
  o: "porte",
  f: "fenetre",
  c: "courbe",
  // « w » comme window : c (courbe) et f (fenêtre) étaient déjà pris.
  w: "courbe_fenetre",
  j: "jonction",
};
const COTE_LETTRE: Record<string, string> = Object.fromEntries(
  Object.entries(LETTRE_COTE).map(([l, v]) => [v, l]),
);

/**
 * Le DEMI-MUR se pose sous le bandeau : il faut donc écrire deux informations
 * dans le caractère d'un côté — le choix du côté, et ce que porte le demi-mur.
 * Plutôt qu'un segment de plus, qui obligerait à relire tout le format, chaque
 * combinaison reçoit sa lettre. Une lettre attribuée ne change plus jamais :
 * celles-ci s'AJOUTENT, et « c » garde son sens de bandeau seul.
 *
 * La majuscule reste l'auvent, et se cumule encore par-dessus.
 */
const LETTRE_DEMI_MUR: Record<string, string> = {
  q: "paroi",
  r: "porte",
  s: "fenetre",
};
const DEMI_MUR_LETTRE: Record<string, string> = Object.fromEntries(
  Object.entries(LETTRE_DEMI_MUR).map(([l, v]) => [v, l]),
);

/** Ordre figé : la POSITION sert de code (en base 36, un seul caractère même
 *  au-delà de la dixième), ne jamais réordonner ni insérer au milieu. */
export const IMPRESSIONS_TENTE = [
  "imp_toit", "imp_zip", "imp_structure", "imp_pvc", "imp_paroi", "imp_courbe",
  "imp_auv_bandeau", "imp_auv_toile", "imp_auv_pied", "imp_auv_pvc", "imp_jonction",
  // Ajoutée le 14/08/2026 — EN BOUT DE LISTE, comme l'exige la règle ci-dessus :
  // les liens de configuration déjà envoyés codent les positions précédentes.
  "imp_paroi_porte",
] as const;

/** Initiale ↔ accessoire. Même règle : une initiale attribuée ne change plus. */
const LETTRE_ACC: Record<string, string> = {
  s: "acc_sac",
  l: "acc_led",
  p: "acc_pompe_main",
  v: "acc_valves",
  e: "acc_lest_eau",
};
const ACC_LETTRE: Record<string, string> = Object.fromEntries(
  Object.entries(LETTRE_ACC).map(([l, v]) => [v, l]),
);

export interface ConfigTente {
  /** Slug du modèle (`x`, `spider`, `n`, `v`). */
  modele: string;
  taille: string;
  cotes: Record<string, string>;
  auvents: Record<string, boolean>;
  /** Ce que porte le demi-mur de chaque côté, quand ce côté peut en recevoir un
   *  — « vide » ou absent = pas de demi-mur. Voir `DemiMurModele`. */
  demiMurs: Record<string, string>;
  options: string[];
  /** Tentes IDENTIQUES reliées le long du côté en jonction — absent ou 1 = la
   *  tente seule. N'a de sens que sur une composition où `rangeePossible` :
   *  ailleurs il ne s'écrit pas et ne se relit pas. */
  nb?: number;
}

/*
 * Le MODÈLE en tête, et seulement s'il n'est pas la tente X.
 *
 * Les codes émis avant l'ouverture de la gamme n'ont pas de modèle — ils sont
 * dans des devis partis chez des clients, et doivent continuer à ouvrir une
 * tente X. Omettre le segment pour la X garde ces codes-là valides ET laisse
 * les nouveaux codes de X identiques à ce qu'ils ont toujours été.
 *
 * Aucune ambiguïté à la lecture : un slug de modèle ne ressemble jamais à une
 * taille (« spider » contre « 4x4 »), et l'inverse non plus.
 */

/** Composition → code d'URL. */
export function encoderConfig(c: ConfigTente): string {
  const m = trouverModele(c.modele);
  const cotesModele = m.cotes as readonly string[];
  const cotes = cotesModele.map((cote) => {
    const type = c.cotes[cote] ?? "vide";
    /* Demi-mur posé ET possible sous ce choix : la lettre du couple. Sinon la
       lettre du choix seul — un demi-mur impossible ne s'écrit pas, il ne se
       relirait pas. */
    const dm = c.demiMurs?.[cote] ?? "vide";
    const lettre =
      dm !== "vide" && demiMurPossible(m, cote, type) && DEMI_MUR_LETTRE[dm]
        ? DEMI_MUR_LETTRE[dm]
        : COTE_LETTRE[type] ?? "-";
    if (!c.auvents[cote]) return lettre;
    // « - » n'a pas de majuscule : un côté ouvert SOUS un auvent s'écrit « A ».
    return lettre === "-" ? "A" : lettre.toUpperCase();
  }).join("");

  const imps = IMPRESSIONS_TENTE
    .map((k, i) => (c.options.includes(k) ? i.toString(36) : ""))
    .join("");
  const accs = Object.entries(ACC_LETTRE)
    .filter(([cle]) => c.options.includes(cle))
    .map(([, l]) => l)
    .join("");

  /* Le nombre ne s'écrit qu'au-delà d'une tente, et seulement là où la rangée
     a un sens : sans rangée, le code reste IDENTIQUE au caractère près à celui
     d'avant cette version — c'est ce qui garde les devis déjà partis valides. */
  const n = rangeePossible(m, c.cotes) ? nbTentesRangee(c.nb) : 1;
  const nb = n > 1 ? String(n) : "";

  const tete = m.slug === MODELE_DEFAUT ? [] : [m.slug];
  return [...tete, c.taille, cotes, imps, accs, nb].join(".").replace(/\.+$/, "");
}

/** Code d'URL → composition. Rend `null` si le code est inexploitable :
 *  la page repart alors sur ses valeurs par défaut plutôt que sur du bancal. */
export function decoderConfig(code: string | null | undefined): ConfigTente | null {
  if (!code) return null;
  const segments = code.trim().split(".");

  /* Segment de tête = un modèle connu ? Sinon c'est une taille, donc un code
     d'avant la gamme, donc une tente X. */
  const enTete = MODELES.some((m) => m.slug === segments[0]) ? segments.shift()! : MODELE_DEFAUT;
  const m = trouverModele(enTete);

  const [taille, cotesStr = "", imps = "", accs = "", nbStr = ""] = segments;
  if (!(m.tailles as readonly string[]).includes(taille)) return null;

  const cotes: Record<string, string> = {};
  const auvents: Record<string, boolean> = {};
  const demiMurs: Record<string, string> = {};
  (m.cotes as readonly string[]).forEach((cote, i) => {
    const brut = cotesStr[i] ?? "-";
    if (brut === "A") {
      cotes[cote] = "vide";
      auvents[cote] = true;
      demiMurs[cote] = "vide";
      return;
    }
    const bas = brut.toLowerCase();
    /* Une lettre de couple = bandeau + demi-mur. Le bandeau seul reste « c »,
       comme depuis le premier jour : les codes déjà partis dans des devis le
       portent, et il veut toujours dire la même chose. */
    const dm = LETTRE_DEMI_MUR[bas];
    cotes[cote] = dm ? m.demiMur?.sousChoix ?? "vide" : LETTRE_COTE[bas] ?? "vide";
    /* Un type que ce modèle ne vend pas retombe à « vide » : ça arrive par un
       code émis avant qu'on le sache, ou par une URL retouchée à la main. Un
       côté ouvert se voit ; un choix fantôme dans un devis, non. */
    if (!typePossible(m, cotes[cote], cote)) cotes[cote] = "vide";
    /* Le demi-mur ne survit que là où le dessin le permet : sous le bandeau, et
       sur le seul pignon qui en a un. */
    demiMurs[cote] =
      dm && demiMurPossible(m, cote, cotes[cote]) && typesDemiMur(m).includes(dm) ? dm : "vide";
    // Majuscule = auvent en supplément, jamais sur un côté qui l'exclut
    // (courbe, jonction) — un code trafiqué ne doit pas produire l'impossible.
    auvents[cote] =
      brut !== brut.toLowerCase() &&
      ["vide", "paroi", "porte", "fenetre"].includes(cotes[cote]);
  });

  const options: string[] = [];
  for (const ch of imps) {
    const i = parseInt(ch, 36);
    const k = Number.isNaN(i) ? undefined : IMPRESSIONS_TENTE[i];
    if (k) options.push(k);
  }
  for (const ch of accs) {
    const k = LETTRE_ACC[ch.toLowerCase()];
    if (k) options.push(k);
  }

  /* Un nombre trafiqué, illisible, ou posé sur une composition sans jonction
     retombe à une tente : mieux vaut chiffrer la tente qu'on voit que facturer
     une rangée que personne n'a composée. */
  const n = rangeePossible(m, cotes) ? nbTentesRangee(nbStr) : 1;

  return { modele: m.slug, taille, cotes, auvents, demiMurs, options, ...(n > 1 ? { nb: n } : {}) };
}
