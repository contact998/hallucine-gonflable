/*
 * @hallucine/tente — le module de la tente gonflable X.
 *
 * Un seul exemplaire, installé par le site public ET par le CRM, pour que le
 * commercial et le client composent exactement la même tente. Les deux outils
 * avaient divergé en silence : le calculateur interdisait trois compositions
 * que le site vendait.
 *
 * Ce qui est ici : la composition et ses règles, le code de configuration qui
 * voyage dans les devis, les teintes, la façon de poser un visuel — et
 * l'habillage du MOBILIER, qui partage la même palette (voir mobilier.ts).
 * Ce qui n'y est PAS : les prix, les coûts, les marges. Ils appartiennent au
 * catalogue du CRM ; ce module ne sait que fabriquer les clés pour les lire —
 * et n'a donc AUCUN moyen d'exposer un prix d'achat à un client.
 *
 * ⚠️ Le site et le CRM doivent rester sur la MÊME version. Mettre à jour l'un
 * sans l'autre, c'est recréer la divergence qu'on vient de supprimer.
 */
export * from "./composition.js";
export * from "./config.js";
export * from "./couleurs.js";
export * from "./mobilier.js";
export * from "./pose.js";
export * from "./vue3d.js";
/* Le visualiseur 3D et la composition des pans. Ils demandent React et
   three.js — déclarés en dépendances de pair : chaque application fournit
   les siens, on n'en embarque pas un deuxième exemplaire. */
export { default as TenteViewer } from "./Viewer.js";
export { ReglagesPose } from "./ReglagesPose.js";
export { HabillageMobilier } from "./HabillageMobilier.js";
/* Le mobilier : son moteur d'implantation et sa scène 3D. Ils étaient dans le
   site, ce qui privait le CRM de toute vue 3D — le commercial composait une
   liste pendant que le client voyait son lounge. Même remède que la tente. */
export * from "./implantationMobilier.js";
export { default as MobilierViewer } from "./MobilierViewer.js";
export * from "./visuel.js";
