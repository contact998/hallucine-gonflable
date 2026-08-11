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
export const COTES = ["avant", "droit", "arriere", "gauche"];
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
             · B — face Y = −1 389, haute de 2 547 (jusqu'à la voûte) : un pignon.
               Bayes l'appelle lui-même `B_Back_…`, donc l'ARRIÈRE.
             · D — face Y = +1 389, même hauteur de pignon, `D_Front_…` : l'AVANT.
             · C — n'est PAS un côté : 0,74 kg, posé entre 1 540 et 2 547 mm sur la
               face avant, au-dessus du demi-mur D. C'est le bandeau courbe, la
               ligne la moins chère du tarif. Il passe donc par « paroi courbe »,
               qui n'a pas de lettre. */
        slug: "n",
        libelle: "N",
        tailles: ["3x3", "4x4", "5x5"],
        tailleDefaut: "3x3",
        /* TROIS côtés, pas quatre — dit par Daniel le 11/08/2026, et confirmé par
           les fermetures éclair du fichier fournisseur : le cache-zip porte 104 et
           106 points sur les deux longs côtés, 60 sur le pignon avant, et ZÉRO sur
           le pignon arrière. Rien ne peut s'y accrocher, donc rien ne s'y vend.
           Ce pignon-là est la paroi FIXE de la tente : il est toujours dessiné, il
           ne se choisit pas. Voir `socle` dans `vue3d.ts`. */
        cotes: ["avant", "droit", "gauche"],
        lettreCote: { avant: "d", gauche: "a", droit: "a" },
        types: ["vide", "paroi", "porte", "fenetre", "courbe"],
        /* Le bandeau courbe n'est pas une paroi de plus : c'est le croissant qui
           ferme le haut d'un PIGNON, mesuré de 1 540 à 2 547 mm sur un pignon qui
           monte à 2 547. Les longs côtés s'arrêtent à la gouttière, à 1 723, et sont
           droits — aucun arc à combler, donc rien à leur vendre. Il était proposé
           sur les quatre côtés : sur les deux longs, un choix qui ne pouvait ni se
           dessiner ni se fabriquer. */
        typesCote: {
            gauche: ["vide", "paroi", "porte", "fenetre"],
            droit: ["vide", "paroi", "porte", "fenetre"],
        },
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
];
/** Le modèle historique. Un code de configuration sans modèle est une tente X :
 *  des devis envoyés avant l'ouverture de la gamme pointent dessus. */
export const MODELE_DEFAUT = "x";
/** Rend toujours un modèle — le défaut si le slug est inconnu, pour qu'un lien
 *  trafiqué ouvre une tente X plutôt que de casser la page. */
export const modele = (slug) => MODELES.find((m) => m.slug === slug) ?? MODELES[0];
/** Les tailles de la tente X. Conservé pour les appels qui ne connaissent pas
 *  encore la gamme ; dérivé de la table, jamais recopié. */
export const TAILLES = modele(MODELE_DEFAUT).tailles;
/** Ce qu'un CÔTÉ de ce modèle accepte. Tous n'acceptent pas forcément la même
 *  chose : chez la N, le bandeau courbe ferme le haut d'un pignon et n'a rien à
 *  faire sur un long côté, qui est droit. Sans côté, la réponse est celle du
 *  modèle — ce qu'il vend, tous côtés confondus. */
export const typesDuCote = (m, cote) => (cote && m.typesCote?.[cote]) || m.types;
/** Ce type de côté est-il au catalogue de ce modèle ? Le Spider n'a pas de
 *  paroi courbe, la V n'a qu'un modèle de paroi — demander une clé pour un type
 *  absent ne trouverait aucun prix, autant le dire tout de suite. */
export const typePossible = (m, type, cote) => typesDuCote(m, cote).includes(type);
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
];
export const typeCote = (valeur) => TYPES_COTE.find((t) => t.valeur === valeur) ?? TYPES_COTE[0];
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
const AUVENT_COMPATIBLE = new Set(["vide", "paroi", "porte", "fenetre"]);
/**
 * L'auvent se monte-t-il sur ce côté ?
 *
 * Non sur une paroi COURBE : le bandeau déborde vers l'extérieur, l'auvent n'a
 * pas où se fixer. Non sur une JONCTION : ce côté est collé à une autre tente,
 * il n'y a pas d'air libre au-dessus. Rien d'autre ne l'empêche.
 */
export function auventPossible(type) {
    return AUVENT_COMPATIBLE.has(type);
}
/* ── Impressions et accessoires ─────────────────────────────────────────── */
/** Option d'impression → suffixe de clé catalogue. */
export const IMPRESSIONS = {
    imp_toit: "impression-toit",
    imp_zip: "impression-cache-zip",
    imp_structure: "impression-structure",
    imp_pvc: "impression-pvc-pieds",
    imp_paroi: "impression-paroi",
    imp_courbe: "impression-paroi-courbe",
    imp_auv_bandeau: "impression-auvent-bandeau",
    imp_auv_toile: "impression-auvent-toile",
    imp_auv_pied: "impression-auvent-pied",
    imp_auv_pvc: "impression-auvent-pvc",
    imp_jonction: "impression-jonction",
};
/** Toujours proposées. */
export const IMP_SOCLE = ["imp_toit", "imp_zip", "imp_structure", "imp_pvc"];
/** Proposées seulement si la composition porte un auvent. */
export const IMP_AUVENT = [
    "imp_auv_bandeau", "imp_auv_toile", "imp_auv_pied", "imp_auv_pvc",
];
/** Proposée seulement si la composition porte une jonction. */
export const IMP_JONCTION = ["imp_jonction"];
/** Accessoires. `slug` nul = la clé dépend de la taille (le lest en eau). */
export const ACCESSOIRES = [
    { valeur: "acc_sac", slug: "tente-accessoire-sac" },
    { valeur: "acc_led", slug: "tente-accessoire-led" },
    { valeur: "acc_pompe_main", slug: "tente-accessoire-pompe-main" },
    { valeur: "acc_valves", slug: "tente-accessoire-valves" },
    { valeur: "acc_lest_eau", slug: null },
];
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
export const cleTente = (m, taille) => `tente-${m.slug}-${taille}`;
/**
 * Un type de côté. `null` si ce type ne se facture pas (côté ouvert) ou s'il
 * n'existe pas chez ce modèle.
 *
 * `cote` n'est lu que chez les modèles à côtés facturés séparément (la N) ; il
 * est ignoré ailleurs, où les côtés sont interchangeables. La paroi courbe fait
 * exception même chez la N : elle n'existe que sur un côté, donc sa clé n'a pas
 * besoin de le préciser — et le catalogue la porte sans lettre.
 */
export function cleTypeCote(m, taille, type, cote) {
    if (!typePossible(m, type, cote))
        return null;
    const t = typeCote(type);
    if (!t.slug)
        return null;
    /* La paroi courbe fait exception même chez un modèle facturé par côté : elle
       n'existe que sur un côté, donc le catalogue la porte sans lettre. */
    if (!m.cleParCote || t.slug.startsWith("paroi-courbe")) {
        return `tente-${m.slug}-${taille}-${t.slug}`;
    }
    /* Facturé par côté : sans lettre établie, on ne rend PAS de clé. Une clé
       approchée trouverait le prix d'un AUTRE côté — un devis faux qui a l'air
       juste est pire qu'un prix manquant, qui se voit. */
    const lettre = cote ? m.lettreCote?.[cote] : undefined;
    if (!lettre)
        return null;
    return `tente-${m.slug}-${taille}-${t.slug}-${lettre}`;
}
export const cleAuvent = (m, taille) => `tente-${m.slug}-${taille}-auvent`;
export const cleImpression = (m, taille, imp) => `tente-${m.slug}-${taille}-${IMPRESSIONS[imp]}`;
/** Les accessoires ne dépendent pas tous de la taille — le lest, si. Et ils ne
 *  dépendent d'aucun modèle : un sac est un sac. */
export function cleAccessoire(m, taille, acc) {
    const a = ACCESSOIRES.find((x) => x.valeur === acc);
    return a?.slug ?? `tente-${m.slug}-${taille}-lest-eau`;
}
