/**
 * Réglages de pose d'un visuel : posé une seule fois, répété en mosaïque ou
 * étiré pour remplir — et sur quoi. N'apparaît qu'une image posée : sans elle,
 * il n'y a rien à régler.
 *
 * UN SEUL EXEMPLAIRE, ici, depuis le 22/08/2026. Le site en avait un
 * (`ReglagesPoseTente.tsx`, 97 lignes) et le CRM un autre (`ReglagesPose.tsx`,
 * 89 lignes) : le même composant écrit deux fois, dans deux dépôts. Chaque
 * demande devait être appliquée aux deux endroits, et une seule l'était.
 *
 * CE QUI DIFFÉRAIT VRAIMENT entre les deux copies : la palette de classes et la
 * façon de traduire un libellé. Rien d'autre — même modes, mêmes portées, même
 * curseur, mêmes règles. Ces deux choses arrivent donc en props :
 *
 *  · `libelle(cle)` — le site passe son `t` i18n, le CRM sa table française ;
 *  · `classes` — chaque application donne ses classes. Le paquet n'a pas à
 *    connaître les thèmes de ses consommateurs, et un `variant: "clair"` aurait
 *    fini par en énumérer quatre.
 */
import { type VisuelPose } from "./pose.js";
/** Les classes que l'application fournit. Toutes optionnelles : sans elles le
 *  composant reste lisible, juste sans identité visuelle. */
export interface ClassesPose {
    conteneur?: string;
    /** Un bouton de mode ou de portée, non choisi. */
    puce?: string;
    /** Le même, choisi. */
    puceActive?: string;
    /** Les textes discrets : « Taille », le pourcentage. */
    discret?: string;
    curseur?: string;
}
export declare function ReglagesPose({ pose, onPose, zone, libelle, classes, }: {
    pose: VisuelPose;
    onPose: (pose: VisuelPose) => void;
    /** Clé de zone — le toit propose un mode de plus : une image sur ses quatre
     *  pans. Absente pour une paroi, qui est d'un seul tenant. */
    zone?: string;
    /** Traduit `pose_remplir`, `portee_pan`, `pose_taille`… */
    libelle: (cle: string) => string;
    classes?: ClassesPose;
}): import("react").JSX.Element;
