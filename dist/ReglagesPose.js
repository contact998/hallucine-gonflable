import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { MODES_POSE, changerMode, plageTaille, porteesPour } from "./pose.js";
export function ReglagesPose({ pose, onPose, zone, libelle, classes = {}, }) {
    const plage = plageTaille(pose.mode);
    const portees = porteesPour(zone);
    const puce = (choisi) => (choisi ? classes.puceActive : classes.puce) ?? "";
    return (_jsxs("div", { className: classes.conteneur ?? "mt-2 flex w-full flex-col gap-2", children: [_jsx("div", { className: "flex flex-wrap items-center gap-1.5", children: MODES_POSE.map((mode) => (_jsx("button", { type: "button", "aria-pressed": pose.mode === mode, onClick: () => onPose(changerMode(pose, mode)), className: puce(pose.mode === mode), children: libelle(`pose_${mode}`) }, mode))) }), portees.length > 1 && (_jsx("div", { className: "flex flex-wrap items-center gap-1.5", children: portees.map((portee) => (_jsx("button", { type: "button", "aria-pressed": pose.portee === portee, onClick: () => onPose({ ...pose, portee }), className: puce(pose.portee === portee), children: libelle(`portee_${portee}`) }, portee))) })), plage && (_jsxs("label", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: `shrink-0 text-xs ${classes.discret ?? ""}`, children: libelle("pose_taille") }), _jsx("input", { type: "range", min: plage.min, max: plage.max, step: 5, value: pose.taille, onChange: (e) => onPose({ ...pose, taille: Number(e.target.value) }), className: classes.curseur ?? "h-1.5 flex-1", "aria-label": libelle("pose_taille") }), _jsxs("span", { className: `w-12 shrink-0 text-right font-mono text-xs tabular-nums ${classes.discret ?? ""}`, children: [pose.taille, " %"] })] }))] }));
}
