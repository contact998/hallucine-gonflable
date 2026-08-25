import { modele as trouverModele, typeCote, demiMurPossible, cleTente, cleTypeCote, cleRepliCote, cleAuvent, cleDemiMur, cleImpression, cleAccessoire, IMPRESSIONS, IMP_SOCLE, IMP_AUVENT, IMP_JONCTION, impressionsCote, rangeeTentes, nbTentesRangee, } from "./composition.js";
import { dessinable } from "./vue3d.js";
/** Le total de lignes chiffrées, quantités comprises. */
export const totalLignesTarif = (lignes) => lignes.reduce((s, l) => s + l.prix * (l.quantite ?? 1), 0);
/**
 * Les lignes chiffrées d'une tente composée, dans l'ordre d'affichage de la
 * page : le pack, puis chaque côté (choix, impression, demi-mur, auvent), puis
 * les options. Seules les lignes dont le tarif connaît le prix apparaissent.
 *
 * `c.nb` au-delà de 1 chiffre la RANGÉE entière — voir `lignesTarifRangee`.
 */
export function lignesTarifTente(c, prixDe, impCotes) {
    const n = nbTentesRangee(c.nb);
    return n > 1 ? lignesTarifRangee(c, prixDe, n, impCotes) : lignesUneTente(c, prixDe, impCotes);
}
/** Le détail d'UNE tente — l'arithmétique historique, inchangée. */
function lignesUneTente(c, prixDe, impCotes) {
    const m = trouverModele(c.modele);
    const out = [];
    const prixImp = (k) => prixDe(cleImpression(m, c.taille, k));
    /** Le prix d'un choix de côté, et s'il est PROVISOIRE (repli paroi pleine). */
    const prixType = (type, cote) => {
        const cle = cleTypeCote(m, c.taille, type, cote);
        const direct = cle ? prixDe(cle) : null;
        if (direct != null)
            return { prix: direct, provisoire: false };
        if (!dessinable(m, cote, type))
            return { prix: null, provisoire: false };
        const repli = cleRepliCote(m, c.taille, cote);
        const p = repli ? prixDe(repli) : null;
        return { prix: p, provisoire: p != null };
    };
    /** L'impression qui chiffre un côté : la plus précise que le tarif connaisse. */
    const impDuType = (type) => impressionsCote(type).find((i) => prixImp(i) != null);
    const pack = prixDe(cleTente(m, c.taille));
    if (pack != null)
        out.push({ genre: "base", prix: pack });
    for (const cote of m.cotes) {
        const type = c.cotes[cote] ?? "vide";
        if (type !== "vide") {
            const { prix, provisoire } = prixType(type, cote);
            if (prix != null)
                out.push({ genre: "cote", cote, cle: typeCote(type).libelle, provisoire, prix });
            const impLiee = impDuType(type);
            if (impCotes?.[cote] && impLiee) {
                const pi = prixImp(impLiee);
                if (pi != null)
                    out.push({ genre: "impression_cote", cote, prix: pi });
            }
        }
        const dm = c.demiMurs?.[cote] ?? "vide";
        if (dm !== "vide" && demiMurPossible(m, cote, type)) {
            const cleDm = cleDemiMur(m, c.taille, dm);
            const pdm = cleDm ? prixDe(cleDm) : null;
            if (pdm != null)
                out.push({ genre: "demi_mur", cote, cle: typeCote(dm).libelle, prix: pdm });
            /* Le demi-mur est une toile de plus : habiller ce côté l'imprime aussi. */
            if (impCotes?.[cote] && m.demiMur) {
                const pi = prixImp(m.demiMur.impression);
                if (pi != null)
                    out.push({ genre: "impression_demi_mur", cote, prix: pi });
            }
        }
        if (c.auvents[cote]) {
            const pa = prixDe(cleAuvent(m, c.taille));
            if (pa != null)
                out.push({ genre: "auvent", cote, prix: pa });
        }
    }
    const aAuvent = m.cotes.some((cote) => c.auvents[cote]);
    const aJonction = m.cotes.some((cote) => c.cotes[cote] === "jonction");
    const impsVisibles = [
        ...IMP_SOCLE,
        ...(aAuvent ? IMP_AUVENT : []),
        ...(aJonction ? IMP_JONCTION : []),
    ].filter((k) => prixImp(k) != null);
    for (const k of c.options) {
        if (IMPRESSIONS[k]) {
            if (!impsVisibles.includes(k))
                continue;
            const p = prixImp(k);
            if (p != null)
                out.push({ genre: "impression", cle: k, prix: p });
        }
        else {
            const p = prixDe(cleAccessoire(m, c.taille, k));
            if (p != null)
                out.push({ genre: "accessoire", cle: k, prix: p });
        }
    }
    return out;
}
/**
 * Les lignes chiffrées d'une RANGÉE de n tentes identiques reliées.
 *
 * La dérivation des tentes vient de `rangeeTentes` — jamais recalculée ici :
 * c'est elle qui décide que la dernière tente ferme le bout au lieu de porter
 * une jonction, donc qu'une rangée de n porte n − 1 jonctions. Deux copies
 * auraient fini par dessiner une rangée et en facturer une autre.
 *
 * Deux écarts volontaires entre les tentes, les MÊMES que le chiffrage du CRM :
 *   · les ACCESSOIRES ne se comptent qu'une fois — le sac, la pompe, les lests
 *     se règlent pour l'ensemble, pas par tente ;
 *   · l'impression de jonction ne suit que les tentes qui en portent une — la
 *     dernière n'a rien à imprimer de ce côté-là (`lignesUneTente` le sait
 *     déjà : une option sans support ne se chiffre pas).
 *
 * Les lignes identiques fusionnent et portent leur `quantite` : trois fois le
 * même pack s'écrit « × 3 », pas trois lignes à la file.
 */
export function lignesTarifRangee(c, prixDe, n, impCotes) {
    const m = trouverModele(c.modele);
    const tentes = rangeeTentes(m, { cotes: c.cotes, auvents: c.auvents, demiMurs: c.demiMurs ?? {}, impCote: impCotes ?? {} }, nbTentesRangee(n));
    if (tentes.length === 1)
        return lignesUneTente(c, prixDe, impCotes);
    const estImpression = (k) => !!IMPRESSIONS[k];
    const fusion = new Map();
    const ordre = [];
    tentes.forEach((t, i) => {
        const lignes = lignesUneTente({
            ...c,
            cotes: t.cotes,
            auvents: t.auvents,
            demiMurs: t.demiMurs ?? {},
            options: i === 0 ? c.options : c.options.filter(estImpression),
        }, prixDe, t.impCote);
        for (const l of lignes) {
            const cle = [l.genre, l.cote ?? "", l.cle ?? "", l.provisoire ? 1 : 0, l.prix].join("|");
            const deja = fusion.get(cle);
            if (deja) {
                deja.quantite = (deja.quantite ?? 1) + 1;
            }
            else {
                fusion.set(cle, l);
                ordre.push(l);
            }
        }
    });
    /* L'ordre d'affichage se refait à la fin. Sans lui, le mur qui ferme le bout
       de la DERNIÈRE tente arrivait après les accessoires — le client lisait
       « sac de transport, éclairage LED, paroi à fenêtre ». Le tri est stable :
       à l'intérieur d'un côté, la jonction reste avant le mur du bout, et les
       options gardent l'ordre où le client les a cochées. */
    const cotesModele = m.cotes;
    const phase = (l) => l.genre === "base" ? 0
        : l.genre === "impression" ? 2
            : l.genre === "accessoire" ? 3
                : 1;
    return ordre.sort((a, b) => {
        const d = phase(a) - phase(b);
        if (d !== 0)
            return d;
        if (phase(a) !== 1)
            return 0;
        return cotesModele.indexOf(a.cote ?? "") - cotesModele.indexOf(b.cote ?? "");
    });
}
/**
 * Le total d'une tente composée — celui que la page du configurateur affiche.
 * `null` si le pack de base n'a pas de prix : sans lui le total serait un
 * morceau de tente, et un abri sous-facturé en silence est pire qu'un « prix à
 * confirmer » qui se voit.
 */
export function totalTenteComposee(c, prixDe) {
    const m = trouverModele(c.modele);
    if (prixDe(cleTente(m, c.taille)) == null)
        return null;
    return totalLignesTarif(lignesTarifTente(c, prixDe));
}
