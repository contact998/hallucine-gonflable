/*
 * La liste de meubles : familles repliées, une ligne par pièce.
 *
 * Elle existait en double dans le site (calculateur et mise en scène) et
 * s'apprêtait à être écrite une troisième fois dans le CRM. Chaque demande de
 * Daniel — « replie les couleurs », « replie aussi quand l'image est posée »,
 * « longue liste et tu nous laisses ajouter alors que ça ne rentre pas » —
 * devait être appliquée à chaque copie, et l'était rarement partout.
 *
 * CE COMPOSANT NE CONNAÎT AUCUN PRIX. La ligne secondaire sous la désignation
 * est rendue par l'application (`detail`) : le site y met un prix public, le
 * CRM une marge ou un prix d'achat. Faire remonter le prix ici obligerait le
 * paquet à choisir lequel des deux — et à trahir l'autre.
 */
import { useState, type ReactNode } from "react";
import { familleMobilier, type FamilleMobilier, FAMILLES_MOBILIER, habillageMobilier } from "./mobilier.js";
import { HabillageMobilier, type ClassesHabillage } from "./HabillageMobilier.js";
import { importerVisuel } from "./visuel.js";
import type { VisuelPose } from "./pose.js";

/** Ce que la liste a besoin de savoir d'un meuble. Volontairement pauvre : ni
 *  prix, ni référence, ni fournisseur — l'application garde son objet complet
 *  et ne prête que ces champs. */
export interface MeubleListe {
  slugSite: string;
  designation: string;
  placesAssises: number;
}

export interface ClassesListe {
  entete: string;
  chevron: string;
  titreFamille: string;
  pastilleCompte: string;
  famille: string;
  ligne: string;
  designation: string;
  detail: string;
  bouton: string;
  boutonDesactive: string;
  compte: string;
  puceHabillage: string;
  puceHabillageActive: string;
  habillage: ClassesHabillage;
}

export interface ListeMobilierProps {
  /** Le catalogue à montrer, dans l'ordre voulu par l'application. */
  meubles: MeubleListe[];
  /** Quantité prise, par slug. Absent = zéro. */
  quantites: Record<string, number>;
  /** Ajout ou retrait d'un exemplaire. L'application décide quoi en faire. */
  onQuantite: (slug: string, delta: number) => void;
  /** `false` refuse le « + » : la pièce ne tiendrait plus. Absent = accepté. */
  accepteEncore?: Record<string, boolean>;
  habillages: Record<string, string>;
  onHabillage: (slug: string, cle: string) => void;
  visuels: Record<string, VisuelPose>;
  onVisuel: (slug: string, pose: VisuelPose | null) => void;
  /** La ligne sous la désignation — places, prix, marge : à l'application. */
  detail?: (meuble: MeubleListe) => ReactNode;
  /** Traduction. Le CRM rend la clé telle quelle ou son libellé français. */
  libelle: (cle: string) => string;
  classes: ClassesListe;
}

export function ListeMobilier({
  meubles, quantites, onQuantite, accepteEncore,
  habillages, onHabillage, visuels, onVisuel,
  detail, libelle, classes,
}: ListeMobilierProps) {
  /* Les familles sont REPLIÉES au départ : la liste s'ouvre sur trois lignes,
     pas sur quinze meubles. Un état React, pas un <details> natif — chaque
     changement de panier re-rend la liste et le navigateur écraserait le
     dépliage que l'utilisateur vient de faire. */
  const [ouvertes, setOuvertes] = useState<Record<string, boolean>>({});
  /* Une seule palette ouverte à la fois, et refermée dès que la couleur est
     choisie ou l'image posée : neuf pastilles sous chaque meuble pris rendaient
     la liste inutilisable. La pastille de la ligne montre l'état courant. */
  const [palette, setPalette] = useState<string | null>(null);

  return (
    <div>
      {FAMILLES_MOBILIER.map((famille) => {
        const dedans = meubles.filter((m) => familleMobilier(m.slugSite) === famille);
        if (dedans.length === 0) return null;
        const compte = dedans.reduce((s, m) => s + (quantites[m.slugSite] ?? 0), 0);
        const ouverte = ouvertes[famille] ?? false;
        return (
          <section key={famille} className={classes.famille}>
            <button type="button" aria-expanded={ouverte}
              onClick={() => setOuvertes((g) => ({ ...g, [famille]: !ouverte }))}
              className={classes.entete}>
              <span className={`${classes.chevron} ${ouverte ? "rotate-90" : ""}`}>▸</span>
              <span className={classes.titreFamille}>{libelle(`piece_groupe_${famille}`)}</span>
              {/* Le compte reste visible famille REPLIÉE : on ne perd jamais de
                  vue ce qui est déjà pris. */}
              {compte > 0 && <span className={classes.pastilleCompte}>{compte}</span>}
            </button>
            {ouverte && (
              <ul>
                {dedans.map((m) => {
                  const qte = quantites[m.slugSite] ?? 0;
                  const cle = habillages[m.slugSite] ?? "";
                  const hab = habillageMobilier(cle);
                  const visuel = visuels[m.slugSite] ?? null;
                  const peutAjouter = accepteEncore?.[m.slugSite] ?? true;
                  return (
                    <li key={m.slugSite} className={classes.ligne}>
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className={classes.designation}>{m.designation}</p>
                          <p className={classes.detail}>{detail?.(m)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* L'habillage n'apparaît QUE sur un meuble pris :
                              quinze nuanciers sur des lignes à zéro noient ceux
                              qui comptent. */}
                          {qte > 0 && (
                            <button type="button"
                              aria-label={libelle("habillage_titre")}
                              aria-expanded={palette === m.slugSite}
                              onClick={() => setPalette((s) => (s === m.slugSite ? null : m.slugSite))}
                              className={palette === m.slugSite ? classes.puceHabillageActive : classes.puceHabillage}
                              style={{
                                backgroundColor: hab.hex ?? undefined,
                                backgroundImage: visuel ? `url(${visuel.url})` : undefined,
                                backgroundSize: "cover",
                              }} />
                          )}
                          <button type="button" aria-label="-" onClick={() => onQuantite(m.slugSite, -1)}
                            disabled={qte === 0}
                            className={qte === 0 ? classes.boutonDesactive : classes.bouton}>−</button>
                          <span className={classes.compte}>{qte}</span>
                          {/* Refuser, pas prévenir. Un « + » qui accepte un
                              meuble que la scène ne posera pas vend au client
                              ce qu'il ne pourra pas installer. */}
                          <button type="button" aria-label="+" onClick={() => onQuantite(m.slugSite, 1)}
                            disabled={!peutAjouter}
                            title={peutAjouter ? undefined : libelle("piece_plein")}
                            className={peutAjouter ? classes.bouton : classes.boutonDesactive}>+</button>
                        </div>
                      </div>
                      {qte > 0 && palette === m.slugSite && (
                        <HabillageMobilier
                          cle={cle}
                          onCle={(c) => {
                            onHabillage(m.slugSite, c);
                            /* Une teinte choisie referme — on a vu la couleur.
                               « Mon visuel » ouvre un dépôt : on reste. */
                            if (!habillageMobilier(c).perso) setPalette(null);
                          }}
                          visuel={visuel}
                          onFichier={async (f) => {
                            try {
                              const url = await importerVisuel(f);
                              onVisuel(m.slugSite, { url, mode: "remplir", taille: 1, portee: "pan" });
                              /* On REFERME aussi ici : la pastille montre la
                                 maquette, et huit teintes plus trois modes
                                 ouverts sous chaque meuble habillé rallongent
                                 la liste pour un réglage qu'on ne retouche pas. */
                              setPalette(null);
                            } catch { /* format, poids ou image illisible : housse nue */ }
                          }}
                          onPose={(pose) => onVisuel(m.slugSite, pose)}
                          libelle={libelle}
                          classes={classes.habillage}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default ListeMobilier;
