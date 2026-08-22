import type { Implantation } from "./implantationMobilier.js";
/** L'abri au-dessus du lounge, décrit par l'application : le paquet sait le
 *  dessiner, pas le tarifer. */
export interface Abri {
    modele: string;
    taille: string;
}
import type { VisuelPose } from "./pose.js";
type Props = {
    implantation: Implantation;
    labelChargement?: string;
    /** Message quand des modèles n'ont pas pu être chargés — reçoit leur nombre. */
    labelEchec?: (n: number) => string;
    /** Reçoit la fonction de capture (JPEG data-URL) — jointe à la demande de devis. */
    captureRef?: React.MutableRefObject<(() => string | null) | null>;
    /** L'abri au-dessus du lounge. La tente NUE — toit, pieds, cache-zip —, jamais
        ses parois : on montre un abri, pas une tente fermée dans laquelle le
        mobilier serait invisible. */
    abri?: Abri | null;
    /** Teinte choisie par meuble (slug → clé d'habillage). Absent = teinte nue. */
    habillages?: Record<string, string>;
    /** Visuel déposé par le client (slug → pose). Posé sur la housse, avec son
        mode — la MÊME mécanique que les toiles de tente. */
    visuels?: Record<string, VisuelPose>;
};
export default function MobilierViewer({ implantation, labelChargement, labelEchec, captureRef, abri, habillages, visuels }: Props): import("react").JSX.Element;
export {};
