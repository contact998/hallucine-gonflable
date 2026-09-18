import { type TeinteTente } from "./couleurs.js";
export interface ClassesNuancier {
    conteneur?: string;
    /** Une pastille de teinte, non choisie. */
    pastille?: string;
    /** La même, choisie. */
    pastilleActive?: string;
    /** Les textes discrets : la référence Pantone, l'aide. */
    discret?: string;
    /** Le champ de saisie de la référence. */
    champ?: string;
}
export declare function Nuancier({ valeur, onChoix, libelle, classes, teintes, surMesure, nom, }: {
    /** Clé de la teinte choisie — une teinte du nuancier ou `#RRGGBB|réf`.
     *  Vide = aucune pastille marquée (ex. « couleurs d'origine » d'un logo). */
    valeur: string;
    onChoix: (cle: string) => void;
    libelle: (cle: string) => string;
    classes?: ClassesNuancier;
    teintes?: readonly TeinteTente[];
    /** Proposer la couleur sur mesure (par défaut : oui). */
    surMesure?: boolean;
    /** Le nom de ce qu'on colore, pour les lecteurs d'écran : « Toit », « Face avant ». */
    nom?: string;
}): import("react").JSX.Element;
export default Nuancier;
