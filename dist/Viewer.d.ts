import type { VisuelPose } from "./pose.js";
export interface TenteViewerProps {
    /** Choix courant de chaque côté (valeurs du configurateur). */
    cotes: Record<string, string>;
    /** Auvent coché par côté — se cumule avec l'élément du côté. */
    auvents: Record<string, boolean>;
    /** Ce que porte le demi-mur de chaque côté — le second étage posé SOUS le
     *  choix du côté. « vide » ou absent = pas de demi-mur. */
    demiMurs?: Record<string, string>;
    /** Teinte choisie par zone (« toit », « structure ») — clé du nuancier. */
    couleurs: Record<string, string>;
    /** Teinte de la paroi de chaque côté — une case d'impression par côté. */
    couleursCote: Record<string, string>;
    /** Visuel du client par zone du socle (« toit », « zip », « auvent ») avec
     *  la façon dont il se pose : remplir, une fois, ou en mosaïque. La teinte de
     *  la zone lui sert de fond — elle ne disparaît plus sous l'image. */
    visuels: Record<string, VisuelPose | null>;
    /** Visuel de la paroi de chaque côté, même règle. */
    visuelsCote: Record<string, VisuelPose | null>;
    /** Modèle de tente (`x`, `spider`, `n`, `v`). Obligatoire : un défaut
     *  afficherait silencieusement une tente X à la place d'une autre. */
    modele: string;
    /** Taille choisie, au format « 5x5 » — sert de facteur d'échelle. */
    taille: string;
    /** Côté mis en avant — légèrement éclairci pour qu'on le repère. */
    actif?: string;
    /** Texte de remplacement pendant le chargement. */
    labelChargement: string;
    /** Reçoit la fonction de capture (JPEG data-URL) — jointe à la demande de devis. */
    captureRef?: React.MutableRefObject<(() => string | null) | null>;
}
export default function TenteViewer({ cotes, auvents, demiMurs, couleurs, couleursCote, visuels, visuelsCote, modele, taille, actif, labelChargement, captureRef }: TenteViewerProps): import("react").JSX.Element;
