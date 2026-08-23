import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/*
 * Les deux outils d'une vue 3D : l'agrandir, et l'imprimer.
 *
 * Ils vivent DANS les visualiseurs, pas dans les pages : il y a huit endroits
 * qui montent une scène 3D entre le site et le CRM, et poser le bouton dans
 * chacun aurait fait huit copies à tenir à jour. Monté ici, tout écran qui
 * affiche une tente ou un lounge l'a d'office.
 *
 * PLEIN ÉCRAN — on tente l'API du navigateur, et on retombe sur un plein écran
 * « à la CSS » quand elle est refusée : iOS ne l'accorde pas, et un aperçu
 * embarqué non plus. Le repli marche partout, c'est lui qui compte.
 *
 * IMPRIMER — la capture de la scène part dans une iframe qui s'imprime seule.
 * Pas une nouvelle fenêtre : les bloqueurs de pop-up la mangent, et le
 * commercial croirait le bouton cassé. L'image est mise à plat sur la page,
 * marges comprises, pour qu'elle sorte entière sur une A4.
 */
import { useEffect, useState } from "react";
/** Imprime une image seule, sans quitter la page. Rendue exportée : le CRM
 *  imprime aussi des captures qu'il a déjà en main. */
export function imprimerImage(dataUrl, titre = "") {
    const cadre = document.createElement("iframe");
    cadre.setAttribute("aria-hidden", "true");
    cadre.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(cadre);
    const doc = cadre.contentDocument;
    if (!doc) {
        cadre.remove();
        return;
    }
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${titre.replace(/[<>&]/g, "")}</title>` +
        `<style>@page{margin:12mm}html,body{margin:0;padding:0}` +
        `img{display:block;width:100%;height:auto;page-break-inside:avoid}</style></head>` +
        `<body><img alt=""></body></html>`);
    doc.close();
    const img = doc.querySelector("img");
    if (!img) {
        cadre.remove();
        return;
    }
    /* On n'imprime QU'UNE FOIS l'image chargée : lancer print() avant laisse
       sortir une page blanche, et le commercial ne s'en aperçoit qu'au bac. */
    img.onload = () => {
        cadre.contentWindow?.focus();
        cadre.contentWindow?.print();
        setTimeout(() => cadre.remove(), 1000);
    };
    img.onerror = () => cadre.remove();
    img.src = dataUrl;
}
export function OutilsVue({ hote, capture, libelles, sombre = false, }) {
    const [natif, setNatif] = useState(false);
    const [css, setCss] = useState(false);
    const plein = natif || css;
    const mot = {
        pleinEcran: libelles?.pleinEcran ?? "Plein écran",
        quitter: libelles?.quitter ?? "Quitter le plein écran",
        imprimer: libelles?.imprimer ?? "Imprimer cette vue",
    };
    useEffect(() => {
        const change = () => setNatif(document.fullscreenElement === hote.current);
        document.addEventListener("fullscreenchange", change);
        return () => document.removeEventListener("fullscreenchange", change);
    }, [hote]);
    /* Le repli CSS n'a pas de touche Échap à lui : on la lui donne, sinon on
       reste piégé dans une vue qui occupe tout l'écran. */
    useEffect(() => {
        if (!css)
            return;
        const el = hote.current;
        if (el) {
            el.dataset.pleinEcranCss = "1";
            el.style.cssText += ";position:fixed;inset:0;z-index:9999;width:100%;height:100%";
        }
        const echap = (e) => { if (e.key === "Escape")
            setCss(false); };
        window.addEventListener("keydown", echap);
        return () => {
            window.removeEventListener("keydown", echap);
            if (el) {
                delete el.dataset.pleinEcranCss;
                el.style.position = "";
                el.style.inset = "";
                el.style.zIndex = "";
                el.style.width = "";
                el.style.height = "";
            }
        };
    }, [css, hote]);
    const basculer = () => {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
            return;
        }
        if (css) {
            setCss(false);
            return;
        }
        const p = hote.current?.requestFullscreen();
        if (p)
            p.catch(() => setCss(true));
        else
            setCss(true);
    };
    const bouton = sombre
        ? "rounded-lg border border-white/25 bg-black/25 p-2 text-white/90 backdrop-blur transition-colors hover:bg-black/40"
        : "rounded-lg border border-[#2E4A5E]/25 bg-white/70 p-2 text-[#2E4A5E] backdrop-blur transition-colors hover:bg-[#2E4A5E]/10";
    return (_jsxs(_Fragment, { children: [plein && (_jsxs("button", { type: "button", onClick: basculer, className: "absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg bg-[#2E4A5E] px-3 py-2 text-sm font-semibold text-white shadow-lg", children: [_jsx("svg", { width: "12", height: "12", viewBox: "0 0 12 12", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", children: _jsx("path", { d: "M1 1l10 10M11 1L1 11" }) }), mot.quitter] })), _jsxs("div", { className: "absolute bottom-3 right-3 z-10 flex gap-2", children: [_jsx("button", { type: "button", onClick: () => { const img = capture(); if (img)
                            imprimerImage(img, mot.imprimer); }, title: mot.imprimer, "aria-label": mot.imprimer, className: bouton, children: _jsxs("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinejoin: "round", children: [_jsx("path", { d: "M4.5 6V1.5h7V6" }), _jsx("path", { d: "M4.5 12H2.5A1.5 1.5 0 011 10.5v-3A1.5 1.5 0 012.5 6h11A1.5 1.5 0 0115 7.5v3a1.5 1.5 0 01-1.5 1.5h-2" }), _jsx("path", { d: "M4.5 10h7v4.5h-7z" })] }) }), _jsx("button", { type: "button", onClick: basculer, title: plein ? mot.quitter : mot.pleinEcran, "aria-label": plein ? mot.quitter : mot.pleinEcran, className: bouton, children: _jsx("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", children: plein ? _jsx("path", { d: "M5 1v4H1M9 1v4h4M5 13V9H1M9 13V9h4" }) : _jsx("path", { d: "M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9" }) }) })] })] }));
}
export default OutilsVue;
