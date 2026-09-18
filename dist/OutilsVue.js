import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/*
 * Les outils d'une vue 3D : l'agrandir, l'imprimer, en télécharger l'image, et
 * la présenter sous un angle tout prêt (face, côté, dessus, ¾).
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
 *
 * TÉLÉCHARGER — la même scène, en PNG cette fois : c'est un fichier qu'on va
 * glisser dans un dossier de mairie ou un courriel, pas une pièce jointe de
 * devis — la netteté y compte plus que le poids.
 *
 * LES VUES — chaque visualiseur fournit SES vues (il sait où est sa face et
 * comment cadrer sa scène, voir `vuesCamera.ts`) ; ce composant ne fait que les
 * nommer et les poser à l'écran, au même endroit dans les trois scènes.
 */
import { useEffect, useState } from "react";
/** Le nom de fichier par défaut d'une image téléchargée. */
export const NOM_IMAGE_DEFAUT = "hallucine-configuration.png";
/**
 * Enregistre une image (data-URL) sous ce nom, sans quitter la page.
 *
 * Passée par un Blob plutôt que par la data-URL elle-même : un lien de
 * plusieurs mégaoctets dans `href` est refusé par certains navigateurs, et
 * Safari sur iPhone ouvre alors l'image au lieu de la proposer à
 * l'enregistrement. Exportée : le CRM enregistre aussi des captures qu'il a
 * déjà en main.
 */
export function telechargerImage(dataUrl, nom = NOM_IMAGE_DEFAUT) {
    const [entete, donnees = ""] = dataUrl.split(",", 2);
    const type = /^data:([^;,]+)/.exec(entete)?.[1] ?? "image/png";
    const binaire = atob(donnees);
    const octets = new Uint8Array(binaire.length);
    for (let i = 0; i < binaire.length; i++)
        octets[i] = binaire.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([octets], { type }));
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = nom;
    lien.rel = "noopener";
    lien.style.display = "none";
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    /* Libéré plus tard, pas tout de suite : certains navigateurs lisent l'adresse
       APRÈS le clic, et une adresse déjà révoquée donne un fichier vide. */
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
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
export function OutilsVue({ hote, capture, libelles, sombre = false, vues, nomFichier = NOM_IMAGE_DEFAUT, }) {
    const [natif, setNatif] = useState(false);
    const [css, setCss] = useState(false);
    const plein = natif || css;
    const mot = {
        pleinEcran: libelles?.pleinEcran ?? "Plein écran",
        quitter: libelles?.quitter ?? "Quitter le plein écran",
        imprimer: libelles?.imprimer ?? "Imprimer cette vue",
        telecharger: libelles?.telecharger ?? "Télécharger l’image",
        vues: libelles?.vues ?? "Vues toutes prêtes",
    };
    const nomVue = {
        face: libelles?.face ?? "Face",
        cote: libelles?.cote ?? "Côté",
        dessus: libelles?.dessus ?? "Dessus",
        troisQuarts: libelles?.troisQuarts ?? "¾",
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
    /* Les vues : une barre de quatre mots, pas quatre icônes — « Dessus » se
       lit, un pictogramme de cube vu d'en haut se devine. */
    const barreVues = sombre
        ? "flex overflow-hidden rounded-lg border border-white/25 bg-black/25 text-xs text-white/90 backdrop-blur"
        : "flex overflow-hidden rounded-lg border border-[#2E4A5E]/25 bg-white/70 text-xs text-[#2E4A5E] backdrop-blur";
    const boutonVue = sombre
        ? "px-2.5 py-1.5 font-medium transition-colors hover:bg-black/40"
        : "px-2.5 py-1.5 font-medium transition-colors hover:bg-[#2E4A5E]/10";
    return (_jsxs(_Fragment, { children: [plein && (_jsxs("button", { type: "button", onClick: basculer, className: "absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg bg-[#2E4A5E] px-3 py-2 text-sm font-semibold text-white shadow-lg", children: [_jsx("svg", { width: "12", height: "12", viewBox: "0 0 12 12", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", children: _jsx("path", { d: "M1 1l10 10M11 1L1 11" }) }), mot.quitter] })), vues && vues.length > 0 && (
            /* En haut à gauche : le coin que les pages laissent libre (la taille
               s'affiche à droite, l'aide « faites tourner » en bas). En plein
               écran, la sortie prend ce coin — les vues descendent d'un cran. */
            _jsx("div", { role: "group", "aria-label": mot.vues, className: `absolute left-3 z-10 ${plein ? "top-14" : "top-3"} ${barreVues}`, children: vues.map(({ cle, aller }, i) => (_jsx("button", { type: "button", onClick: aller, title: nomVue[cle], className: `${boutonVue}${i > 0 ? (sombre ? " border-l border-white/25" : " border-l border-[#2E4A5E]/20") : ""}`, children: nomVue[cle] }, cle))) })), _jsxs("div", { className: "absolute bottom-3 right-3 z-10 flex gap-2", children: [_jsx("button", { type: "button", onClick: () => { const img = capture("image/png"); if (img)
                            telechargerImage(img, nomFichier); }, title: mot.telecharger, "aria-label": mot.telecharger, className: bouton, children: _jsxs("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M8 1.5v8.5M4.5 6.5L8 10l3.5-3.5" }), _jsx("path", { d: "M2 11.5v2A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5v-2" })] }) }), _jsx("button", { type: "button", onClick: () => { const img = capture(); if (img)
                            imprimerImage(img, mot.imprimer); }, title: mot.imprimer, "aria-label": mot.imprimer, className: bouton, children: _jsxs("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinejoin: "round", children: [_jsx("path", { d: "M4.5 6V1.5h7V6" }), _jsx("path", { d: "M4.5 12H2.5A1.5 1.5 0 011 10.5v-3A1.5 1.5 0 012.5 6h11A1.5 1.5 0 0115 7.5v3a1.5 1.5 0 01-1.5 1.5h-2" }), _jsx("path", { d: "M4.5 10h7v4.5h-7z" })] }) }), _jsx("button", { type: "button", onClick: basculer, title: plein ? mot.quitter : mot.pleinEcran, "aria-label": plein ? mot.quitter : mot.pleinEcran, className: bouton, children: _jsx("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", children: plein ? _jsx("path", { d: "M5 1v4H1M9 1v4h4M5 13V9H1M9 13V9h4" }) : _jsx("path", { d: "M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9" }) }) })] })] }));
}
export default OutilsVue;
