import { type GammeArche3D } from "./arche.js";
import { type VisuelPose } from "./pose.js";
type Props = {
    /** La forme — celle du catalogue CRM (`ArcheItem.forme`). Seule la droite
     *  a un modèle ; les autres affichent `labelEchec`. */
    forme: GammeArche3D;
    /** Les trois cotes du catalogue, en mètres (`ArcheItem.*Cm / 100`), jamais
     *  écrites dans une page. */
    largeurM: number;
    hauteurM: number;
    profondeurM: number;
    /** La teinte de fond — une clé de nuancier, lue par `hexDeTeinte`. Défaut :
     *  le blanc, la toile nue. */
    teinte?: string;
    /** Le visuel de la face avant, ou rien. */
    visuelAvant?: VisuelPose | null;
    /** Celui de la face arrière — le même objet que `visuelAvant` quand le
     *  client veut le même des deux côtés. */
    visuelArriere?: VisuelPose | null;
    /** La face que la caméra présente : on règle l'arrière, on regarde l'arrière. */
    face?: "avant" | "arriere";
    /** La personne de 1,75 m sous l'arche. Vrai par défaut — c'est l'échelle. */
    silhouette?: boolean;
    /** Reçoit la fonction de capture (JPEG data-URL) — jointe à la demande de devis. */
    captureRef?: React.MutableRefObject<(() => string | null) | null>;
    labelChargement?: string;
    /** Dit que la 3D manque — forme sans modèle, ou fichier injoignable. */
    labelEchec?: string;
    /** Le libellé du bouton qui relance un chargement raté. Absent : pas de bouton. */
    labelReessayer?: string;
    libellesOutils?: {
        pleinEcran?: string;
        quitter?: string;
        imprimer?: string;
    };
};
export default function ArcheViewer({ forme, largeurM, hauteurM, profondeurM, teinte, visuelAvant, visuelArriere, face, silhouette, captureRef, labelChargement, labelEchec, labelReessayer, libellesOutils, }: Props): import("react").JSX.Element;
export {};
