/*
 * Le plan de visée : on clique un côté sur le dessin, pas dans une liste.
 *
 * Il vivait dans la page du site. Le calculateur du CRM, lui, n'avait qu'une
 * liste de quatre sélecteurs empilés — le commercial devait deviner lequel
 * était l'avant. Puisque les deux en ont besoin, il vit ici.
 *
 * LE DESSIN VIENT DU MODÈLE, jamais d'une liste écrite en dur. La X, le Spider
 * et la N gardent leur carré aux côtés creusés, au pixel près. La V n'a ni
 * avant ni arrière : ses trois côtés regardent à 120° l'un de l'autre, et ses
 * positions sortent de `angleCote` — la mesure qui oriente déjà les parois en
 * 3D. Le plan et la tente ne peuvent donc pas se contredire.
 *
 * Ce composant ne connaît AUCUN prix et aucune règle de vente : ce qu'il
 * affiche au milieu et à droite est rendu par l'application.
 */
import { useMemo, type ReactNode } from "react";
import { angleCote } from "./vue3d.js";
import type { Modele } from "./composition.js";

export interface ClassesPlanCotes {
  cadre: string;
  colonne: string;
  colonneFin: string;
  titre: string;
  contour: string;
  pastilleActive: string;
  pastillePrise: string;
  pastilleVide: string;
  sigle: string;
  texte: string;
  /** Le nom du côté, en tête de ligne du récapitulatif. */
  nomCote: string;
  /** Une ligne de récapitulatif dont le côté ne porte rien — grisée. */
  ligneEteinte: string;
}

/** Le contour et les pastilles, en coordonnées du viewBox 170×158. */
export function planDeVisee(modele: Modele) {
  const cotes = modele.cotes as readonly string[];
  if (cotes.includes("avant"))
    return {
      contour: "M32 36 Q85 52 138 36 Q122 78 138 120 Q85 104 32 120 Q48 78 32 36 Z",
      /* Filtré sur les côtés du modèle : le pignon arrière de la N fait partie
         de la tente et ne se choisit plus. Une pastille pour un côté absent
         ouvre le panneau sur du vide. */
      pastilles: [
        { c: "arriere", x: 85, y: 26, sigle: "AR" },
        { c: "droit", x: 152, y: 78, sigle: "D" },
        { c: "avant", x: 85, y: 130, sigle: "AV" },
        { c: "gauche", x: 18, y: 78, sigle: "G" },
      ].filter((p) => cotes.includes(p.c)),
    };

  const surPlan = (az: number) => ({
    x: 85 + 72 * Math.sin((az * Math.PI) / 180),
    y: 78 - 62 * Math.cos((az * Math.PI) / 180),
  });
  const tries = cotes.map((c) => ({ c, az: angleCote(modele, c) })).sort((a, b) => a.az - b.az);
  /* Les pieds tombent à mi-chemin entre deux côtés, chaque pastille au milieu
     de SON côté. */
  const pieds = tries.map(({ az }, i) => {
    const suivant = tries[(i + 1) % tries.length].az;
    return surPlan(az + (((suivant - az + 360) % 360) / 2));
  });
  return {
    contour: `M${pieds.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L")} Z`,
    pastilles: tries.map(({ c }, i) => {
      const a = pieds[(i - 1 + pieds.length) % pieds.length], b = pieds[i];
      return { c, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, sigle: c.toUpperCase() };
    }),
  };
}

export function PlanCotes({
  modele, actif, onActif, occupe, nomCote, choix, recap, eteint, libelle, classes,
}: {
  modele: Modele;
  actif: string;
  onActif: (cote: string) => void;
  /** Ce côté porte-t-il quelque chose ? Sert à remplir la pastille. */
  occupe: (cote: string) => boolean;
  nomCote: (cote: string) => string;
  /** « Votre choix » — le côté EN COURS seulement, rendu par l'application. */
  choix: ReactNode;
  /** Une ligne de récapitulatif par côté. */
  recap: (cote: string) => ReactNode;
  /** Ce côté ne porte rien : sa ligne se grise. */
  eteint?: (cote: string) => boolean;
  libelle: (cle: string) => string;
  classes: ClassesPlanCotes;
}) {
  const plan = useMemo(() => planDeVisee(modele), [modele]);

  return (
    <div className={classes.cadre}>
      <div className={classes.colonne}>
        <p className={classes.titre}>{libelle("choisir_cote")}</p>
        <svg viewBox="0 0 170 158" role="img" aria-label={libelle("choisir_cote")} className="w-full h-auto">
          <path d={plan.contour} className={classes.contour} strokeWidth="1.4" />
          {plan.pastilles.map(({ c, x, y, sigle }) => (
            <g key={c} className="cursor-pointer" onClick={() => onActif(c)}>
              <circle cx={x} cy={y} r={14}
                className={actif === c ? classes.pastilleActive : occupe(c) ? classes.pastillePrise : classes.pastilleVide}
                strokeWidth={actif === c ? 2.4 : 1.6} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" className={classes.sigle}>
                {sigle}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className={classes.colonne}>
        <p className={classes.titre}>{libelle("votre_choix")}</p>
        <div className={classes.texte}>{choix}</div>
      </div>
      <div className={classes.colonneFin}>
        <p className={classes.titre}>{libelle("recapitulatif")}</p>
        {/* La tente en un coup d'œil : une ligne par côté, toujours dans le
            même ordre. Les prix vivent ailleurs. */}
        <ul className="text-xs leading-relaxed space-y-0.5">
          {(modele.cotes as readonly string[]).map((c) => (
            <li key={c} className={eteint?.(c) ? classes.ligneEteinte : ""}>
              <span className={classes.nomCote}>{nomCote(c)}</span>
              {recap(c)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default PlanCotes;
