/**
 * Le nuancier : les teintes de l'atelier, avec leur référence Pantone, et la
 * couleur sur mesure du client.
 *
 * UN SEUL EXEMPLAIRE, ici — la tente, le mobilier, le lounge, l'arche et le
 * logo recoloré posent tous la même question. Le site l'écrivait en pastilles
 * recopiées trois fois dans la seule page tente.
 *
 * La référence Pantone se LIT : c'est elle qui part à l'atelier, et c'est ce
 * que demande un client qui a une charte graphique. Le nom d'une teinte
 * (« rouge ») ne suffit pas à fabriquer ; la référence si.
 *
 * Ce composant ne connaît aucun prix. `libelle` traduit (le site passe son `t`,
 * le CRM sa table française) ; une clé non traduite retombe sur le français.
 */
import { useState } from "react";
import { TEINTES, lireTeinte, teinteSurMesure, estTeinteSurMesure, type TeinteTente } from "./couleurs.js";

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

const DEFAUTS: Record<string, string> = {
  teinte_sur_mesure: "Votre couleur",
  teinte_sur_mesure_aide: "Référence Pantone (facultatif)",
  teinte_sur_mesure_sans_ref: "Donnez votre référence Pantone si vous la connaissez",
};

/** La pastille arc-en-ciel de la couleur sur mesure, tant qu'aucune n'est choisie. */
const ARC_EN_CIEL = "conic-gradient(#D50032, #FFC72C, #00843D, #0057B8, #7A1FA2, #D50032)";

export function Nuancier({
  valeur,
  onChoix,
  libelle,
  classes = {},
  teintes = TEINTES,
  surMesure = true,
  nom,
}: {
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
}) {
  const txt = (cle: string) => {
    const v = libelle(cle);
    return v && v !== cle ? v : DEFAUTS[cle] ?? cle;
  };
  const courante = valeur ? lireTeinte(valeur) : null;
  const choisieSurMesure = estTeinteSurMesure(valeur);
  const [editeur, setEditeur] = useState(false);
  const ouvert = editeur || choisieSurMesure;
  const [ref, setRef] = useState(courante?.surMesure ? courante.pantone : "");
  const hexSurMesure = choisieSurMesure ? courante!.hex : "#C8102E";
  const pastille = (choisi: boolean) =>
    (choisi ? classes.pastilleActive : classes.pastille) ??
    `h-7 w-7 rounded-full border-2 ${choisi ? "border-amber-400" : "border-white/25"}`;
  const prefixe = nom ? `${nom} — ` : "";

  return (
    <div className={classes.conteneur ?? "flex flex-col gap-1.5"}>
      <div className="flex flex-wrap items-center gap-1.5">
        {teintes.map((t) => {
          const choisi = valeur === t.cle;
          const titre = t.pantone ? `${libelle(t.label)} — Pantone ${t.pantone}` : libelle(t.label);
          return (
            <button key={t.cle} type="button" title={titre} aria-label={`${prefixe}${titre}`}
              aria-pressed={choisi} onClick={() => { setEditeur(false); onChoix(t.cle); }}
              className={pastille(choisi)} style={{ backgroundColor: t.hex }} />
          );
        })}
        {surMesure && (
          <button type="button" title={txt("teinte_sur_mesure")} aria-label={`${prefixe}${txt("teinte_sur_mesure")}`}
            aria-pressed={choisieSurMesure} aria-expanded={ouvert}
            onClick={() => {
              setEditeur(true);
              if (!choisieSurMesure) onChoix(teinteSurMesure(hexSurMesure, ref));
            }}
            className={pastille(choisieSurMesure)}
            style={{ background: choisieSurMesure ? courante!.hex : ARC_EN_CIEL }} />
        )}
      </div>

      {ouvert && surMesure && (
        <div className="flex flex-wrap items-center gap-2">
          <input type="color" value={hexSurMesure.toLowerCase()} aria-label={`${prefixe}${txt("teinte_sur_mesure")}`}
            onChange={(e) => onChoix(teinteSurMesure(e.target.value, ref))}
            className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
          <input type="text" value={ref} maxLength={30} placeholder="186 C"
            aria-label={`${prefixe}${txt("teinte_sur_mesure_aide")}`}
            onChange={(e) => { setRef(e.target.value); onChoix(teinteSurMesure(hexSurMesure, e.target.value)); }}
            className={classes.champ ?? "w-28 rounded border border-white/20 bg-transparent px-2 py-1 text-xs"} />
          <span className={`text-xs ${classes.discret ?? ""}`}>{txt("teinte_sur_mesure_aide")}</span>
        </div>
      )}

      {courante && courante.cle === valeur && (courante.pantone || courante.surMesure) && (
        <span className={`text-xs ${classes.discret ?? ""}`}>
          {courante.pantone ? `Pantone ${courante.pantone}` : txt("teinte_sur_mesure_sans_ref")}
        </span>
      )}
    </div>
  );
}

export default Nuancier;
