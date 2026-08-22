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
import { MODES_POSE, changerMode, plageTaille, porteesPour, type VisuelPose } from "./pose.js";

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

export function ReglagesPose({
  pose,
  onPose,
  zone,
  libelle,
  classes = {},
}: {
  pose: VisuelPose;
  onPose: (pose: VisuelPose) => void;
  /** Clé de zone — le toit propose un mode de plus : une image sur ses quatre
   *  pans. Absente pour une paroi, qui est d'un seul tenant. */
  zone?: string;
  /** Traduit `pose_remplir`, `portee_pan`, `pose_taille`… */
  libelle: (cle: string) => string;
  classes?: ClassesPose;
}) {
  const plage = plageTaille(pose.mode);
  const portees = porteesPour(zone);
  const puce = (choisi: boolean) => (choisi ? classes.puceActive : classes.puce) ?? "";

  return (
    <div className={classes.conteneur ?? "mt-2 flex w-full flex-col gap-2"}>
      <div className="flex flex-wrap items-center gap-1.5">
        {MODES_POSE.map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={pose.mode === mode}
            onClick={() => onPose(changerMode(pose, mode))}
            className={puce(pose.mode === mode)}
          >
            {libelle(`pose_${mode}`)}
          </button>
        ))}
      </div>

      {/* La PORTÉE est une autre question que le geste : sur quoi il s'applique.
          Elle ne s'affiche que là où il y a plusieurs pans à trancher. */}
      {portees.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {portees.map((portee) => (
            <button
              key={portee}
              type="button"
              aria-pressed={pose.portee === portee}
              onClick={() => onPose({ ...pose, portee })}
              className={puce(pose.portee === portee)}
            >
              {libelle(`portee_${portee}`)}
            </button>
          ))}
        </div>
      )}

      {plage && (
        <label className="flex items-center gap-2.5">
          <span className={`shrink-0 text-xs ${classes.discret ?? ""}`}>{libelle("pose_taille")}</span>
          <input
            type="range"
            min={plage.min}
            max={plage.max}
            step={5}
            value={pose.taille}
            onChange={(e) => onPose({ ...pose, taille: Number(e.target.value) })}
            className={classes.curseur ?? "h-1.5 flex-1"}
            aria-label={libelle("pose_taille")}
          />
          <span className={`w-12 shrink-0 text-right font-mono text-xs tabular-nums ${classes.discret ?? ""}`}>
            {pose.taille} %
          </span>
        </label>
      )}
    </div>
  );
}
