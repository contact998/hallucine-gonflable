/*
 * L'arche gonflable : comment la dessiner à n'importe quelle taille à partir
 * du seul modèle que le fournisseur ait livré pour sa forme.
 *
 * Contrairement à l'écran, une arche n'a pas de jupe qui doit garder une cote
 * fixe : chaque taille du catalogue a SES largeur, hauteur et profondeur
 * propres (elles ne suivent pas un même facteur — une arche de 8 m n'est pas
 * une arche de 4 m agrandie d'un bloc, son tube est plus épais). La mise à
 * l'échelle se fait donc PAR AXE, à partir des trois cotes catalogue, jamais
 * par un seul facteur uniforme.
 *
 * Ce module ne connaît AUCUN prix ni aucune taille commerciale : les trois
 * nombres dont il a besoin — largeur, hauteur, profondeur — viennent du
 * catalogue du CRM (`ArcheItem.largeurCm/hauteurCm/profondeurCm`), qui en est
 * la seule source.
 */
/** Dossier du modèle sur R2, à côté de `ecran` et `tente-x`. */
export const DOSSIER_ARCHE = "arche";
/**
 * Les formes qui ont VRAIMENT un fichier sur R2 aujourd'hui — pas les cinq de
 * `GammeArche3D`, qui ne fait que lister ce que le catalogue vend. Une seule
 * livraison Bayes à ce jour (droite, 16/09/2026) : les quatre autres
 * tenteraient un GET qui échoue à coup sûr. Même mécanique que
 * `gammeEcran3D`/`ecranModelise`, qui figent aussi les gammes livrées plutôt
 * que de deviner — à élargir d'une ligne à chaque nouvelle livraison.
 */
export const ARCHE_FORMES_MODELISEES = ["droite"];
/** Vrai quand un modèle 3D sait dessiner cette forme. */
export const archeModelisee = (forme) => ARCHE_FORMES_MODELISEES.includes(forme);
/**
 * Le facteur d'échelle par axe pour une taille donnée.
 *
 * Lance quand une mesure ou une cible est inutilisable : mieux vaut ne pas
 * dessiner d'arche qu'en dessiner une aplatie ou retournée.
 */
export function calerArche(m, cible) {
    if (!(m.largeurMM > 0) || !(m.hauteurMM > 0) || !(m.profondeurMM > 0)) {
        throw new Error("calerArche : mesures du modèle inutilisables");
    }
    if (!(cible.largeurM > 0) || !(cible.hauteurM > 0) || !(cible.profondeurM > 0)) {
        throw new Error("calerArche : cotes cibles inutilisables");
    }
    return {
        facteurX: (cible.largeurM * 1000) / m.largeurMM,
        facteurY: (cible.profondeurM * 1000) / m.profondeurMM,
        facteurZ: (cible.hauteurM * 1000) / m.hauteurMM,
    };
}
