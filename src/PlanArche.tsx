/*
 * Le plan coté d'une arche, en SVG — sans three.js.
 *
 * Deux usages : l'IMAGE principale des quatre formes qu'aucun modèle 3D ne sait
 * dessiner (pieds, ronde, demi, soufflerie), et le plan coté de toutes, sous la
 * scène. Le dessin sort de `geometrieArche` (archePlan.ts), testé à part ; ce
 * composant ne fait que le tracer.
 *
 * Il ne connaît ni thème ni langue :
 *  · les couleurs suivent `currentColor` par défaut — le plan se lit sur le
 *    fond sombre du site comme sur le blanc du CRM sans rien régler — et
 *    chaque application peut poser SES classes, comme pour `PlanCotes` ;
 *  · les nombres passent par `formatCm` : le site y branche ses pieds pour le
 *    .com et le .uk, le CRM laisse les centimètres.
 *
 * Le visuel du client se pose sur la face avant, composé par
 * `composerFaceArche` — le MÊME canevas que la 3D projette. Composé dans un
 * effet, donc jamais au prérendu : le HTML servi montre le plan nu, le
 * navigateur ajoute l'image ensuite, sans écart d'hydratation.
 */
import { useEffect, useId, useMemo, useState } from "react";
import { chargerImage } from "./visuel.js";
import type { VisuelPose } from "./pose.js";
import { composerFaceArche, geometrieArche, type CoteTracee, type CotesArche } from "./archePlan.js";

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

const cmParDefaut = (cm: number) => `${Math.round(cm)} cm`;

export function PlanArche({
  cotes,
  fond,
  visuel,
  formatCm = cmParDefaut,
  libelles,
  classes = {},
  className,
  titre,
}: {
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
  libelles?: { diametre?: string; pieds?: string };
  classes?: ClassesPlanArche;
  /** Les classes du `<svg>` — sa taille. Défaut : pleine largeur. */
  className?: string;
  /** Ce que lit un lecteur d'écran. */
  titre?: string;
}) {
  const g = useMemo(
    () => geometrieArche(cotes),
    // Les cinq nombres, pas l'objet : une page qui le reconstruit à chaque rendu
    // ne doit pas faire recalculer le dessin pour rien.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cotes.forme, cotes.largeurCm, cotes.hauteurCm, cotes.profondeurCm, cotes.hauteurPiedsCm],
  );
  /* Les identifiants de React portent des deux-points : illisibles dans un
     `url(#…)` sur certains moteurs. On n'en garde que les lettres et chiffres. */
  const idBrut = useId();
  const idDecoupe = `plan-arche-${idBrut.replace(/[^a-zA-Z0-9]/g, "")}`;

  const [image, setImage] = useState<string | null>(null);
  const cleVisuel = visuel ? `${visuel.url}|${visuel.mode}|${visuel.taille}` : "";
  useEffect(() => {
    if (!visuel || !g) { setImage(null); return; }
    let vivant = true;
    chargerImage(visuel.url)
      .then((img) => {
        if (!vivant) return;
        const toile = composerFaceArche(img, visuel, cotes, fond ?? "#ffffff");
        setImage(toile.toDataURL("image/jpeg", 0.85));
      })
      .catch(() => { if (vivant) setImage(null); });
    return () => { vivant = false; };
    // La pose se résume à sa clé ; les cotes, à la géométrie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleVisuel, g, fond]);

  if (!g) return null;
  const vb = g.viewBox;
  const tic = g.police * 0.35;
  const texteDe = (c: CoteTracee) => {
    const v = formatCm(c.valeurCm);
    if (c.cle === "diametre") return `${libelles?.diametre ?? "Ø"} ${v}`;
    if (c.cle === "pieds") return `${libelles?.pieds ?? "pieds"} ${v}`;
    return v;
  };

  return (
    <svg
      viewBox={`${vb.x} ${vb.y} ${vb.largeur} ${vb.hauteur}`}
      role="img"
      aria-label={titre}
      className={className ?? "h-auto w-full"}
    >
      {titre && <title>{titre}</title>}
      <defs>
        <clipPath id={idDecoupe}>
          <path d={g.contour} />
        </clipPath>
      </defs>

      <line
        x1={g.sol.x1} y1={g.sol.y} x2={g.sol.x2} y2={g.sol.y}
        stroke="currentColor" strokeOpacity={0.35} strokeWidth={1}
        vectorEffect="non-scaling-stroke" className={classes.sol}
      />

      <path
        d={g.contour}
        fill={fond ?? (classes.corps ? undefined : "none")}
        className={classes.corps}
      />
      {image && (
        <image
          href={image}
          x={0} y={0} width={g.largeur} height={g.hauteur}
          preserveAspectRatio="none"
          clipPath={`url(#${idDecoupe})`}
        />
      )}
      <path
        d={g.contour}
        fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round"
        vectorEffect="non-scaling-stroke" className={classes.trait}
      />
      {g.profil && (
        <path
          d={g.profil.contour}
          fill={fond ?? (classes.corps ? undefined : "none")}
          stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round"
          vectorEffect="non-scaling-stroke" className={`${classes.corps ?? ""} ${classes.trait ?? ""}`.trim() || undefined}
        />
      )}

      {g.cotes.map((c) => (
        <g key={c.cle} stroke="currentColor" strokeOpacity={0.7} strokeWidth={1} className={classes.cote}>
          {c.attaches.map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} vectorEffect="non-scaling-stroke" strokeOpacity={0.6} />
          ))}
          <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} vectorEffect="non-scaling-stroke" />
          {/* Les bouts de cote en traits obliques, à la manière d'un plan
              d'architecte : une flèche se déforme dès que le trait ne suit pas
              l'échelle du dessin. */}
          {[[c.x1, c.y1], [c.x2, c.y2]].map(([x, y], i) => (
            <line key={`t${i}`} x1={x - tic} y1={y + tic} x2={x + tic} y2={y - tic} vectorEffect="non-scaling-stroke" strokeWidth={1.5} />
          ))}
        </g>
      ))}
      {g.cotes.map((c) => (
        <text
          key={`v-${c.cle}`}
          x={c.texte.x}
          y={c.texte.y}
          fontSize={g.police}
          textAnchor={c.texte.ancre}
          dominantBaseline="central"
          fill="currentColor"
          className={classes.texte}
          transform={c.texte.vertical ? `rotate(-90 ${c.texte.x} ${c.texte.y})` : undefined}
        >
          {texteDe(c)}
        </text>
      ))}
    </svg>
  );
}

export default PlanArche;
