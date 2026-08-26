/*
 * @hallucine/gonflable — le vocabulaire partagé de la gamme gonflable.
 *
 * Un seul exemplaire, installé par le site public ET par le CRM, pour que le
 * commercial et le client composent exactement le même objet. Les deux outils
 * avaient divergé en silence : le calculateur interdisait trois compositions
 * que le site vendait.
 *
 * Il s'appelait « tente » jusqu'à la v0.37.0, parce qu'il a commencé par elle.
 * Le mobilier l'avait déjà rejoint depuis longtemps, l'écran étanche arrive :
 * le nom mentait, et il a coûté une explication de trop.
 *
 * Ce qui est ici : la composition et ses règles, le code de configuration qui
 * voyage dans les devis, les teintes, la façon de poser un visuel, et les
 * scènes 3D des trois gammes.
 * Ce qui n'y est PAS : les prix, les coûts, les marges. Ils appartiennent au
 * catalogue du CRM ; ce module ne sait que fabriquer les clés pour les lire —
 * et n'a donc AUCUN moyen d'exposer un prix d'achat à un client.
 *
 * ⚠️ Le site et le CRM doivent rester sur la MÊME version. Mettre à jour l'un
 * sans l'autre, c'est recréer la divergence qu'on vient de supprimer.
 */
export * from "./composition.js";
export * from "./config.js";
export * from "./tarif.js";
export * from "./couleurs.js";
export * from "./mobilier.js";
export * from "./pose.js";
export * from "./vue3d.js";
export * from "./ecran.js";

/* Le visualiseur 3D et la composition des pans. Ils demandent React et
   three.js — déclarés en dépendances de pair : chaque application fournit
   les siens, on n'en embarque pas un deuxième exemplaire. */
export { default as TenteViewer } from "./Viewer.js";
export { ReglagesPose, type ClassesPose } from "./ReglagesPose.js";
export { HabillageMobilier, type ClassesHabillage } from "./HabillageMobilier.js";

/* Le mobilier : son moteur d'implantation et sa scène 3D. Ils étaient dans le
   site, ce qui privait le CRM de toute vue 3D — le commercial composait une
   liste pendant que le client voyait son lounge. Même remède que la tente. */
export * from "./implantationMobilier.js";
export { default as MobilierViewer, type EcranLounge } from "./MobilierViewer.js";
/* La visée d'un côté : une seule mécanique, celle que montent les deux scènes. */
export { azimutPourCote, prochainAzimut, viser, viseeNeuve, type Visee } from "./viseeCote.js";

/* L'écran étanche : sa scène, et la règle qui le met à n'importe quelle taille
   depuis l'unique modèle du fournisseur (voir ecran.ts). */
export { default as EcranViewer } from "./EcranViewer.js";
export { OutilsVue, imprimerImage } from "./OutilsVue.js";
export { PlanCotes, planDeVisee, type ClassesPlanCotes } from "./PlanCotes.js";
export { ListeMobilier, type MeubleListe, type ClassesListe, type ListeMobilierProps } from "./ListeMobilier.js";
export * from "./visuel.js";
