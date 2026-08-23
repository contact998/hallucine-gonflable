import { modele as trouverModele, typeCote, demiMurPossible, cleTente, cleTypeCote, cleRepliCote, cleAuvent, cleDemiMur, cleImpression, cleAccessoire, IMPRESSIONS, IMP_SOCLE, IMP_AUVENT, IMP_JONCTION, impressionsCote, } from "./composition.js";
import { dessinable } from "./vue3d.js";
/**
 * Les lignes chiffrées d'une tente composée, dans l'ordre d'affichage de la
 * page : le pack, puis chaque côté (choix, impression, demi-mur, auvent), puis
 * les options. Seules les lignes dont le tarif connaît le prix apparaissent.
 */
export function lignesTarifTente(c, prixDe, impCotes) {
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
 * Le total d'une tente composée — celui que la page du configurateur affiche.
 * `null` si le pack de base n'a pas de prix : sans lui le total serait un
 * morceau de tente, et un abri sous-facturé en silence est pire qu'un « prix à
 * confirmer » qui se voit.
 */
export function totalTenteComposee(c, prixDe) {
    const m = trouverModele(c.modele);
    if (prixDe(cleTente(m, c.taille)) == null)
        return null;
    return lignesTarifTente(c, prixDe).reduce((s, l) => s + l.prix, 0);
}
