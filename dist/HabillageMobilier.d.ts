import { type VisuelPose } from "./pose.js";
export interface ClassesHabillage {
    conteneur?: string;
    /** Une pastille de teinte, non choisie. */
    pastille?: string;
    /** La même, choisie. */
    pastilleActive?: string;
    /** Le bouton « Mon visuel » et « Poser une image ». */
    bouton?: string;
    boutonActif?: string;
    /** La phrase d'aide et les textes discrets. */
    discret?: string;
}
export declare function HabillageMobilier({ cle, onCle, visuel, onFichier, onPose, libelle, classes, }: {
    /** Clé d'habillage courante — une teinte, ou « perso ». */
    cle: string;
    onCle: (cle: string) => void;
    /** Le visuel déposé, s'il y en a un. */
    visuel: VisuelPose | null;
    /** Un fichier vient d'être choisi. L'appelant le passe à `importerVisuel`,
     *  puis range la pose — le paquet ne décide pas où elle est gardée. */
    onFichier: (fichier: File) => void;
    onPose: (pose: VisuelPose) => void;
    libelle: (cle: string) => string;
    classes?: ClassesHabillage;
}): import("react").JSX.Element;
