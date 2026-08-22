/**
 * Le panneau d'habillage d'un meuble : les teintes, le visuel du client, et le
 * mode de pose. Celui qui s'ouvre sous une ligne quand on clique sa pastille.
 *
 * UN SEUL EXEMPLAIRE, ici. Le site l'avait dans `ConfigurateurMobilier.tsx`, le
 * CRM dans `ComposerGammeDialog.tsx` — deux fois le même geste, dans deux
 * dépôts. C'est ce dédoublement qui a obligé Daniel à répéter trois fois
 * « replie les couleurs » : chaque demande devait être appliquée deux fois, et
 * une seule l'était. Même remède que `ReglagesPose` le 22/08/2026.
 *
 * CE QUI RESTE À L'APPLICATION : la ligne elle-même — nom, prix, boutons de
 * quantité — parce qu'elle est vraiment différente (le CRM a ses composants
 * Money et Button, le site sa palette sombre), et l'état du dépliage, parce que
 * « une seule ligne ouverte à la fois » est une décision d'écran.
 *
 * CE QUI ARRIVE EN PROPS : `libelle` pour traduire — le site passe son `t`
 * i18n, le CRM sa table française —, et `classes` pour l'habillage visuel. Le
 * paquet n'a pas à connaître les thèmes de ses consommateurs.
 */
import { HABILLAGES_MOBILIER, HABILLAGE_MOBILIER_DEFAUT, habillageMobilier } from "./mobilier.js";
import { MODES_POSE, changerMode, type VisuelPose } from "./pose.js";
import { hexDeTeinte, TEINTE_NUE } from "./couleurs.js";

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

export function HabillageMobilier({
  cle,
  onCle,
  visuel,
  onFichier,
  onPose,
  libelle,
  classes = {},
}: {
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
}) {
  const courant = habillageMobilier(cle);
  const pastille = (choisi: boolean) => (choisi ? classes.pastilleActive : classes.pastille) ?? "";
  const bouton = (choisi: boolean) => (choisi ? classes.boutonActif : classes.bouton) ?? "";

  return (
    <div className={classes.conteneur ?? "mt-2 flex flex-wrap items-center gap-1.5"}>
      {HABILLAGES_MOBILIER.map((h) => {
        const choisi = (cle || HABILLAGE_MOBILIER_DEFAUT) === h.cle;
        const nom = h.perso ? libelle("habillage_perso") : libelle(h.label);
        /* Le visuel client n'est pas une couleur : il porte son nom, pas une
           pastille — on ne connaît pas la maquette, lui en peindre une serait
           montrer un meuble que le client ne recevra pas. */
        return h.perso ? (
          <button key={h.cle} type="button" aria-pressed={choisi} onClick={() => onCle(h.cle)}
            className={bouton(choisi)}>
            {nom}
          </button>
        ) : (
          <button key={h.cle} type="button" title={nom} aria-label={nom} aria-pressed={choisi}
            onClick={() => onCle(h.cle)} className={pastille(choisi)}
            style={{ backgroundColor: h.hex ?? hexDeTeinte(TEINTE_NUE) }} />
        );
      })}

      {/* Le dépôt n'a de sens qu'en « mon visuel » : proposer une image quand on
          a choisi le rouge n'apprend rien. */}
      {courant.perso && (
        <label className={bouton(false)} style={{ cursor: "pointer" }}>
          {libelle(visuel ? "habillage_visuel_change" : "habillage_visuel_choisir")}
          <input type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = ""; // re-déposer le MÊME fichier doit refonctionner
              if (f) onFichier(f);
            }} />
        </label>
      )}

      {/* Le mode de pose : les mêmes mots que les toiles de tente. Rien à poser
          sans image, donc rien à régler. */}
      {courant.perso && visuel && MODES_POSE.map((mode) => (
        <button key={mode} type="button" aria-pressed={visuel.mode === mode}
          onClick={() => onPose(changerMode(visuel, mode))}
          className={bouton(visuel.mode === mode)}>
          {libelle(`pose_${mode}`)}
        </button>
      ))}

      <span className={`ml-1 text-xs ${classes.discret ?? ""}`}>
        {courant.perso ? libelle("habillage_perso_aide") : libelle("habillage_aide")}
      </span>
    </div>
  );
}
