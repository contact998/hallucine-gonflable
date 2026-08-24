type Props = {
    /** Largeur de la toile de projection, en mètres — la cote que le catalogue
     *  appelle « 6 m ». Vient de `CatalogueSpecs.toileLargeurM` (CRM), jamais
     *  d'un nombre écrit dans une page. */
    toileLargeurM: number;
    /** Hauteur de la base de l'image, en mètres (`CatalogueSpecs.hauteurBaseImageM`).
     *  Absente : la géométrie du fournisseur est laissée telle quelle. */
    baseImageM?: number | null;
    /** Poser quelqu'un à côté. Vrai par défaut — c'est l'échelle. */
    silhouette?: boolean;
    /** Reçoit la fonction de capture (JPEG data-URL) — jointe à la demande de devis. */
    captureRef?: React.MutableRefObject<(() => string | null) | null>;
    labelChargement?: string;
    /** Dit qu'un modèle manque plutôt que de montrer une scène amputée. */
    labelEchec?: string;
    libellesOutils?: {
        pleinEcran?: string;
        quitter?: string;
        imprimer?: string;
    };
};
export default function EcranViewer({ toileLargeurM, baseImageM, silhouette, captureRef, labelChargement, labelEchec, libellesOutils, }: Props): import("react").JSX.Element;
export {};
