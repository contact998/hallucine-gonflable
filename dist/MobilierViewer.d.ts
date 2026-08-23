import type { Implantation } from "./implantationMobilier.js";
/** L'abri au-dessus du lounge, décrit par l'application : le paquet sait le
 *  dessiner, pas le tarifer. `config` = la composition reçue du configurateur
 *  tente — présente, l'abri se dessine construit ; absente, il reste nu.
 *  `nb` = tentes IDENTIQUES reliées en rangée (dérivée par `rangeeAbri`, la
 *  même que le viewer tente) ; absent ou 1 = la tente seule. */
export interface Abri {
    modele: string;
    taille: string;
    config?: CompositionAbri | null;
    nb?: number;
    /** L'image du client sur TOUTE la tente — enroulée autour de l'ensemble
     *  (toit, parois, auvents), jamais sur les meubles. Même mécanique que la
     *  portée « tente » du viewer tente. Absente : la toile sort d'usine. */
    visuel?: VisuelPose | null;
}
import type { VisuelPose } from "./pose.js";
import { type CompositionAbri } from "./vue3d.js";
/** Le gris-bleu du fond de studio. Propriété de la SCÈNE, pas des applications :
 *  il ne bascule pas en mode sombre — un canapé se regarde sur le même fond des
 *  deux côtés, sinon les couleurs ne se comparent plus. */
export declare const FOND_SCENE = "#eef2f5";
export declare const urlMeuble: (slug: string) => string;
/**
 * Une silhouette — un modèle CC0 de Quaternius, chargé et cloné comme un meuble.
 *
 * Ce sont des personnages POSÉS, pas animés : ils donnent l'échelle et la vie
 * d'une scène sans coûter une animation. La licence (domaine public) est copiée
 * dans `licences/silhouettes-quaternius.txt`, ici — les modèles sont partagés,
 * leur licence doit l'être aussi. Crédit demandé par l'auteur :
 * « Background characters by Quaternius ».
 *
 * Les fichiers sont en Y-vertical, cette scène est en Z-vertical (convention
 * CAO reprise du viewer tente) : on les couche d'un quart de tour, comme les
 * capsules de la version précédente. L'échelle et le choix du modèle viennent
 * du module pur, où ils sont testés.
 */
export declare const urlPersonne: (fichier: string) => string;
type Props = {
    implantation: Implantation;
    labelChargement?: string;
    /** Message quand des modèles n'ont pas pu être chargés — reçoit leur nombre. */
    labelEchec?: (n: number) => string;
    /** Reçoit la fonction de capture (JPEG data-URL) — jointe à la demande de devis. */
    captureRef?: React.MutableRefObject<(() => string | null) | null>;
    /** L'abri au-dessus du lounge — construit si `config` voyage avec lui, nu
        sinon, en rangée de `nb` tentes reliées. La paroi entre la caméra et les
        meubles s'efface en douceur : on voit la tente construite ET le lounge. */
    abri?: Abri | null;
    /** Teinte choisie par meuble (slug → clé d'habillage). Absent = teinte nue. */
    habillages?: Record<string, string>;
    /** Visuel déposé par le client (slug → pose). Posé sur la housse, avec son
        mode — la MÊME mécanique que les toiles de tente. */
    visuels?: Record<string, VisuelPose>;
    /** Les mots des outils de vue (agrandir, imprimer). Le site les traduit en
     *  six langues, le CRM n'en parle qu'une — d'où des mots injectés, pas écrits
     *  ici. Absents : le français par défaut. */
    libellesOutils?: {
        pleinEcran?: string;
        quitter?: string;
        imprimer?: string;
    };
    /** Effacer la paroi entre la caméra et les meubles quand on tourne (défaut,
     *  le comportement historique). `false` : les parois restent pleines quel que
     *  soit l'angle — demandé par Daniel le 23/08/2026 pour les scènes prêtes du
     *  site, où la tente doit se montrer telle qu'elle sera construite. */
    effacerParois?: boolean;
};
export default function MobilierViewer({ implantation, labelChargement, labelEchec, captureRef, abri, habillages, visuels, libellesOutils, effacerParois }: Props): import("react").JSX.Element;
export {};
