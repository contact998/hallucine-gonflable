/**
 * L'habillage du MOBILIER gonflable — la même palette que les tentes, plus le
 * visuel du client.
 *
 * POURQUOI DANS UN PAQUET QUI S'APPELLE « tente ». Parce que c'est lui qui
 * possède déjà les teintes, et qu'il est installé par le site ET par le CRM.
 * La seule alternative était d'en recopier la liste dans chaque dépôt : le site
 * en avait une, le CRM en a reçu une le 22/08/2026, et ajouter une couleur
 * aurait demandé d'y penser deux fois sans que rien ne prévienne en cas d'oubli.
 * Le nom du paquet est désormais plus étroit que son rôle — il porte le
 * vocabulaire visuel de la gamme gonflable, tentes et mobilier.
 *
 * CE N'EST PAS UNE OPTION PAYANTE, contrairement aux impressions de tente. Chez
 * Bayes, la housse mobilier est sublimée à la fabrication : un seul prix au
 * tarif, pas de variante nue. Le devis PORTE le choix pour l'atelier, il ne le
 * facture pas. Une tente, elle, part en toile nue et facture chaque zone —
 * les deux gammes partagent les couleurs, pas le modèle économique.
 *
 * DEUX LIBELLÉS, UNE LISTE. Le site traduit en six langues et lit `label`, la
 * clé i18n. Le CRM est un outil interne francophone et lit `libelleFr`. Ce qui
 * ne doit jamais diverger, c'est la LISTE — pas la façon de l'écrire.
 */
import { TEINTES, TEINTE_NUE } from "./couleurs.js";
/** Le client fournit sa maquette : la housse est imprimée à son visuel. */
export const HABILLAGE_MOBILIER_PERSO = "perso";
/** L'habillage par défaut : la toile nue, comme les tentes. */
export const HABILLAGE_MOBILIER_DEFAUT = TEINTE_NUE;
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const HABILLAGES_MOBILIER = [
    ...TEINTES.map((t) => ({
        cle: t.cle,
        hex: t.hex,
        label: t.label,
        libelleFr: t.cle === TEINTE_NUE ? null : majuscule(t.cle),
        perso: false,
    })),
    {
        cle: HABILLAGE_MOBILIER_PERSO,
        hex: null,
        label: "habillage_perso",
        libelleFr: "impression du visuel client",
        perso: true,
    },
];
const PAR_CLE = new Map(HABILLAGES_MOBILIER.map((h) => [h.cle, h]));
/**
 * Toujours un habillage. Une clé inconnue — un lien de devis écrit par une
 * version plus récente — retombe sur la toile nue : la couleur est un détail,
 * le panier et le prix ne le sont pas.
 */
export function habillageMobilier(cle) {
    return PAR_CLE.get(cle ?? "") ?? PAR_CLE.get(HABILLAGE_MOBILIER_DEFAUT);
}
/*
 * PAS DE FONCTION D'IMPORT D'IMAGE ICI, et c'est délibéré.
 *
 * `importerVisuel` de `visuel.ts` fait déjà exactement ce qu'il faut : contrôle
 * du format et du poids, réduction à 720p, aplatissement sur blanc — parce
 * qu'un PNG transparent posé sur du noir donnerait une housse noire là où le
 * client attend de la toile nue —, et des erreurs typées pour que l'appelant
 * traduise le bon message.
 *
 * Une housse de meuble et une toile de tente posent le même problème. J'en ai
 * écrit une deuxième version le 22/08/2026 avant de m'apercevoir que celle-ci
 * existait : elle a vécu dix minutes, dans la v0.22.0, et n'a jamais servi.
 * Le mode de pose se partage pareil : `MODES_POSE`, `changerMode`,
 * `composerPan` valent pour toute surface imprimable.
 */
