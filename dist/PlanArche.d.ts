import type { VisuelPose } from "./pose.js";
import { type CotesArche } from "./archePlan.js";
export interface ClassesPlanArche {
    /** Le trait de l'arche et de son profil. */
    trait?: string;
    /** Le corps de l'arche quand aucune teinte n'est donnée. */
    corps?: string;
    /** Les lignes de cote et d'attache. */
    cote?: string;
    /** Le texte des cotes. */
    texte?: string;
    /** La ligne de sol. */
    sol?: string;
}
export declare function PlanArche({ cotes, fond, visuel, formatCm, libelles, classes, className, titre, }: {
    cotes: CotesArche;
    /** La teinte de fond, en hexadécimal (`hexDeTeinte`). Absente : le corps
     *  prend la classe `corps`, ou reste transparent. */
    fond?: string | null;
    /** Le visuel de la face AVANT — posé comme sur la 3D. */
    visuel?: VisuelPose | null;
    /** Écrit une cote. Défaut : « 400 cm ». */
    formatCm?: (cm: number) => string;
    /** Les deux mots des cotes : le préfixe du diamètre (« Ø » par défaut) et
     *  celui du tube de pied (« pieds »). */
    libelles?: {
        diametre?: string;
        pieds?: string;
    };
    classes?: ClassesPlanArche;
    /** Les classes du `<svg>` — sa taille. Défaut : pleine largeur. */
    className?: string;
    /** Ce que lit un lecteur d'écran. */
    titre?: string;
}): import("react").JSX.Element | null;
export default PlanArche;
