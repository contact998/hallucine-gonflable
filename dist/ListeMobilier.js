import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useState } from "react";
import { familleMobilier, FAMILLES_MOBILIER, habillageMobilier } from "./mobilier.js";
import { HabillageMobilier } from "./HabillageMobilier.js";
import { importerVisuel, ErreurVisuel } from "./visuel.js";
import { poseInitiale } from "./pose.js";
export function ListeMobilier({ meubles, quantites, onQuantite, accepteEncore, habillages, onHabillage, visuels, onVisuel, onErreur, detail, libelle, classes, }) {
    /* Les familles sont REPLIÉES au départ : la liste s'ouvre sur trois lignes,
       pas sur quinze meubles. Un état React, pas un <details> natif — chaque
       changement de panier re-rend la liste et le navigateur écraserait le
       dépliage que l'utilisateur vient de faire. */
    const [ouvertes, setOuvertes] = useState({});
    /* Une seule palette ouverte à la fois, et refermée dès que la couleur est
       choisie ou l'image posée : neuf pastilles sous chaque meuble pris rendaient
       la liste inutilisable. La pastille de la ligne montre l'état courant. */
    const [palette, setPalette] = useState(null);
    return (_jsx("div", { children: FAMILLES_MOBILIER.map((famille) => {
            const dedans = meubles.filter((m) => familleMobilier(m.slugSite) === famille);
            if (dedans.length === 0)
                return null;
            const compte = dedans.reduce((s, m) => s + (quantites[m.slugSite] ?? 0), 0);
            const ouverte = ouvertes[famille] ?? false;
            return (_jsxs("section", { className: classes.famille, children: [_jsxs("button", { type: "button", "aria-expanded": ouverte, onClick: () => setOuvertes((g) => ({ ...g, [famille]: !ouverte })), className: classes.entete, children: [_jsx("span", { className: `${classes.chevron} ${ouverte ? "rotate-90" : ""}`, children: "\u25B8" }), _jsx("span", { className: classes.titreFamille, children: libelle(`piece_groupe_${famille}`) }), compte > 0 && _jsx("span", { className: classes.pastilleCompte, children: compte })] }), ouverte && (_jsx("ul", { children: dedans.map((m) => {
                            const qte = quantites[m.slugSite] ?? 0;
                            const cle = habillages[m.slugSite] ?? "";
                            const hab = habillageMobilier(cle);
                            const visuel = visuels[m.slugSite] ?? null;
                            const peutAjouter = accepteEncore?.[m.slugSite] ?? true;
                            return (_jsxs("li", { className: classes.ligne, children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: classes.designation, children: m.designation }), _jsx("p", { className: classes.detail, children: detail?.(m) })] }), _jsxs("div", { className: "flex items-center gap-2", children: [qte > 0 && (_jsx("button", { type: "button", "aria-label": libelle("habillage_titre"), "aria-expanded": palette === m.slugSite, onClick: () => setPalette((s) => (s === m.slugSite ? null : m.slugSite)), className: palette === m.slugSite ? classes.puceHabillageActive : classes.puceHabillage, style: {
                                                            backgroundColor: hab.hex ?? undefined,
                                                            backgroundImage: visuel ? `url(${visuel.url})` : undefined,
                                                            backgroundSize: "cover",
                                                        } })), _jsx("button", { type: "button", "aria-label": "-", onClick: () => onQuantite(m.slugSite, -1), disabled: qte === 0, className: qte === 0 ? classes.boutonDesactive : classes.bouton, children: "\u2212" }), _jsx("span", { className: classes.compte, children: qte }), _jsx("button", { type: "button", "aria-label": "+", onClick: () => onQuantite(m.slugSite, 1), disabled: !peutAjouter, title: peutAjouter ? undefined : libelle("piece_plein"), className: peutAjouter ? classes.bouton : classes.boutonDesactive, children: "+" })] })] }), qte > 0 && palette === m.slugSite && (_jsx(HabillageMobilier, { cle: cle, onCle: (c) => {
                                            onHabillage(m.slugSite, c);
                                            /* Une teinte choisie referme — on a vu la couleur.
                                               « Mon visuel » ouvre un dépôt : on reste. */
                                            if (!habillageMobilier(c).perso)
                                                setPalette(null);
                                        }, visuel: visuel, onFichier: async (f) => {
                                            try {
                                                const url = await importerVisuel(f);
                                                onVisuel(m.slugSite, poseInitiale(url));
                                                /* On REFERME aussi ici : la pastille montre la
                                                   maquette, et huit teintes plus trois modes
                                                   ouverts sous chaque meuble habillé rallongent
                                                   la liste pour un réglage qu'on ne retouche pas. */
                                                setPalette(null);
                                            }
                                            catch (e) {
                                                /* `importerVisuel` lève une `ErreurVisuel` typée
                                                   EXPRÈS pour que l'application dise le bon message
                                                   traduit. L'avaler rejouait le « bouton muet » du
                                                   23/08/2026 sur le composant partagé site + CRM. */
                                                if (e instanceof ErreurVisuel)
                                                    onErreur?.(e.cause_);
                                            }
                                        }, onPose: (pose) => onVisuel(m.slugSite, pose), libelle: libelle, classes: classes.habillage }))] }, m.slugSite));
                        }) }))] }, famille));
        }) }));
}
export default ListeMobilier;
