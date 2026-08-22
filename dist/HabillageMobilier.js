import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { MODES_POSE, changerMode } from "./pose.js";
import { hexDeTeinte, TEINTE_NUE } from "./couleurs.js";
export function HabillageMobilier({ cle, onCle, visuel, onFichier, onPose, libelle, classes = {}, }) {
    const courant = habillageMobilier(cle);
    const pastille = (choisi) => (choisi ? classes.pastilleActive : classes.pastille) ?? "";
    const bouton = (choisi) => (choisi ? classes.boutonActif : classes.bouton) ?? "";
    return (_jsxs("div", { className: classes.conteneur ?? "mt-2 flex flex-wrap items-center gap-1.5", children: [HABILLAGES_MOBILIER.map((h) => {
                const choisi = (cle || HABILLAGE_MOBILIER_DEFAUT) === h.cle;
                const nom = h.perso ? libelle("habillage_perso") : libelle(h.label);
                /* Le visuel client n'est pas une couleur : il porte son nom, pas une
                   pastille — on ne connaît pas la maquette, lui en peindre une serait
                   montrer un meuble que le client ne recevra pas. */
                return h.perso ? (_jsx("button", { type: "button", "aria-pressed": choisi, onClick: () => onCle(h.cle), className: bouton(choisi), children: nom }, h.cle)) : (_jsx("button", { type: "button", title: nom, "aria-label": nom, "aria-pressed": choisi, onClick: () => onCle(h.cle), className: pastille(choisi), style: { backgroundColor: h.hex ?? hexDeTeinte(TEINTE_NUE) } }, h.cle));
            }), courant.perso && (_jsxs("label", { className: bouton(false), style: { cursor: "pointer" }, children: [libelle(visuel ? "habillage_visuel_change" : "habillage_visuel_choisir"), _jsx("input", { type: "file", accept: "image/*", style: { display: "none" }, onChange: (e) => {
                            const f = e.target.files?.[0];
                            e.target.value = ""; // re-déposer le MÊME fichier doit refonctionner
                            if (f)
                                onFichier(f);
                        } })] })), courant.perso && visuel && MODES_POSE.map((mode) => (_jsx("button", { type: "button", "aria-pressed": visuel.mode === mode, onClick: () => onPose(changerMode(visuel, mode)), className: bouton(visuel.mode === mode), children: libelle(`pose_${mode}`) }, mode))), _jsx("span", { className: `ml-1 text-xs ${classes.discret ?? ""}`, children: courant.perso ? libelle("habillage_perso_aide") : libelle("habillage_aide") })] }));
}
