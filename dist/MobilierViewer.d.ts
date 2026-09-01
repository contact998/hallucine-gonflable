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
    /** La teinte de la toile — une clé de `TEINTES`, la même palette que le
     *  viewer tente. Elle peint tout ce qui s'imprime (les vitres restent des
     *  vitres) et sert de FOND sous le visuel du client, comme la teinte d'une
     *  zone chez la tente. Absente ou nue : la toile sort d'usine. */
    teinte?: string | null;
}
import { type VisuelPose } from "./pose.js";
import type { GammeEcran3D } from "./ecran.js";
import { type CompositionAbri } from "./vue3d.js";
/**
 * L'abri, tel que `piecesAbri` le décrit : le socle toujours (toit, pieds,
 * cache-zip), et — quand la composition voyage avec l'abri — les parois,
 * demi-murs et auvents que le client a construits, tournés par la MÊME formule
 * que le viewer tente (décision du 23/08/2026 : le réalisme du lounge, c'est la
 * fidélité au produit construit, pas un décor).
 *
 * Une tente fermée cacherait le lounge : chaque pièce de côté est donc montée
 * dans son propre sous-groupe, marqué de son azimut (`azimutAbri`) et de ses
 * matières (`matsAbri`) — la boucle de rendu efface en douceur la paroi qui se
 * trouve entre la caméra et les meubles, et la repose dès qu'on tourne.
 *
 * Même convention d'unités que le mobilier : les pièces sont en millimètres, et
 * l'échelle vaut 0,001 × `echelle(modèle, taille)` — c'est exactement ce que
 * fait le viewer tente, et s'en écarter ferait diverger deux vues de la même
 * tente, ce que le module partagé existe pour empêcher.
 */
/**
 * Combien de pièces d'abri ont manqué leur chargement, toutes tentes de la
 * rangée confondues. Comptées pour la bannière d'échecs déjà en place : une
 * paroi tombée (coupure réseau sur `side_wall`) laisse la tente BÉANTE, et le
 * client la prend pour SA composition — « j'avais pourtant fermé ce côté ». Les
 * meubles comptent déjà leurs manques ; l'abri était le seul objet dont
 * l'amputation partielle restait muette. L'échec TOTAL, lui, reste assumé.
 */
export declare function echecsAbri<T>(charges: readonly (T | null)[][]): number;
/** L'écran du cinéma, décrit par l'application : le paquet sait le dessiner et
 *  le dimensionner, pas le tarifer. Les deux cotes sortent du catalogue CRM
 *  (`CatalogueSpecs`), jamais d'un nombre écrit dans une page. Gamme ÉTANCHE
 *  seulement — c'est la seule que Bayes a modélisée. */
export interface EcranLounge {
    /** Quel modèle poser. Se lit sur le slug du catalogue (`gammeEcran3D`). */
    gamme: GammeEcran3D;
    /** Largeur de la toile de projection, en mètres — le « 6 m » du catalogue. */
    toileLargeurM: number;
    /** Hauteur de la base de l'image. Absente : la géométrie du fournisseur est
     *  laissée telle quelle, sans jupe retouchée. */
    baseImageM?: number | null;
}
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
    /** Le côté de l'abri à présenter de face — celui qu'on vient de cliquer sur
     *  le plan de visée. La scène pivote jusqu'à lui, exactement comme le
     *  visualiseur de tente : c'est la MÊME mécanique (`viseeCote`), pas une
     *  seconde. Absent : la caméra reste où on l'a laissée. */
    coteActif?: string | null;
    /** L'écran de projection devant les assises, ou rien. Une taille qui sort de
     *  ce que la géométrie sait rendre laisse la scène SANS écran plutôt qu'avec
     *  un dessin faux — le lounge ne s'en trouve pas amputé. */
    ecran?: EcranLounge | null;
    /** Effacer la paroi entre la caméra et les meubles quand on tourne (défaut,
     *  le comportement historique). `false` : les parois restent pleines quel que
     *  soit l'angle — demandé par Daniel le 23/08/2026 pour les scènes prêtes du
     *  site, où la tente doit se montrer telle qu'elle sera construite. */
    effacerParois?: boolean;
};
export default function MobilierViewer({ implantation, labelChargement, labelEchec, captureRef, abri, coteActif, ecran, habillages, visuels, libellesOutils, effacerParois }: Props): import("react").JSX.Element;
export {};
