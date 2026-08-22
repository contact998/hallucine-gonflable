import { type ReactNode } from "react";
import { type ClassesHabillage } from "./HabillageMobilier.js";
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
export declare function ListeMobilier({ meubles, quantites, onQuantite, accepteEncore, habillages, onHabillage, visuels, onVisuel, detail, libelle, classes, }: ListeMobilierProps): import("react").JSX.Element;
export default ListeMobilier;
