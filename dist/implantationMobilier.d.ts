/**
 * Le moteur d'implantation du mobilier : où chaque meuble se pose, qui s'assoit
 * dessus, et sur quel sol.
 *
 * IL VIT ICI DEPUIS LE 22/08/2026. Il était dans le site, donc la scène 3D du
 * mobilier aussi, donc le CRM n'en avait aucune : le commercial composait une
 * liste pendant que le client voyait son lounge. Le même écran des deux côtés
 * exigeait de remonter le moteur avec la scène — c'est ce que la tente fait
 * depuis toujours.
 *
 * Ce qu'il ne sait pas : les prix. Il ne connaît que des cotes et des places,
 * lues au catalogue par l'application. Aucun coût ne peut passer par là.
 */
/** Une ligne de panier : un meuble, une quantité, et son habillage.
 *  Déclarée ici parce que le moteur en a besoin — le compositeur de lounge, qui
 *  la produit, reste côté site : il relève du commerce, pas de la géométrie. */
import { familleMobilier } from "./mobilier.js";
export interface LigneLounge {
    slug: string;
    qte: number;
    /** L'habillage voyage AVEC la ligne : c'est elle qui dit à l'atelier quoi
     *  imprimer. Absent = toile nue. */
    habillage?: string;
}
/** Ce que le moteur a besoin de savoir d'un meuble. L'application le lui donne
 *  depuis son catalogue — le paquet ne parle à aucune base. */
export interface MeubleCote {
    slugSite: string;
    designation: string;
    largeurCm: number;
    profondeurCm: number;
    hauteurCm: number;
    placesAssises: number;
    hauteurAssiseCm?: number | null;
}
type MobilierItem = MeubleCote;
/**
 * Comment on range les assises.
 *  · « rangs » — toutes face à l'écran. C'est un cinéma en plein air : personne
 *    ne s'assoit dos à la toile.
 *  · « ilots » — appariées face à face. C'est un lounge : on se regarde.
 *  · « tablees » — autour d'une table. C'est un repas ; il faut alors dire
 *    LAQUELLE des pièces est la table, par `groupement`.
 */
export type Disposition = "rangs" | "ilots" | "tablees";
/**
 * Une tablée : une pièce centrale, et ce qui s'assoit autour.
 *
 * Le moteur ne connaît ni banquet ni traiteur — il connaît un centre et des
 * satellites. C'est l'application qui dit « la table de huit, huit chaises » ;
 * le jour où l'on sert un buffet autour d'un îlot, la même mécanique servira
 * sans un mot de plus ici.
 */
export interface Groupement {
    /** Le slug de la pièce centrale. */
    centre: string;
    /** Combien de satellites l'entourent, au plus. */
    autour: number;
}
export interface MeublePose {
    slug: string;
    /** Mètres, repère au sol, origine au centre. L'écran est au NORD (z négatif). */
    x: number;
    z: number;
    /** Radians, 0 = face à l'écran. */
    rotation: number;
}
export interface Implantation {
    sol: {
        largeurM: number;
        profondeurM: number;
    };
    meubles: MeublePose[];
    /** Silhouettes d'échelle, déduites des meubles posés. Ni comptées ni facturées. */
    personnes?: Personne[];
    /** Exemplaires non posés faute de place — annoncés, jamais tus. */
    nonPoses: number;
}
/**
 * Trois zones, du nord au sud : les assises devant l'écran, les mange-debout
 * derrière ; les bars occupent une colonne à part sur le bord est.
 *
 * `MobilierItem` ne porte aucun champ de catégorie — le CRM ne le fournit
 * pas — la classification se fait donc sur le `slugSite`, dont la convention
 * de nommage (déjà celle du moteur `lounge.ts`) sépare sans ambiguïté les
 * trois familles du catalogue actuel : `bar-*`, `table-*`, et tout le reste
 * (canapés, poufs, chaises, tabourets) qui s'assoit face à l'écran.
 *
 * La famille d'un meuble se décide dans `mobilier.ts`, une seule fois. Elle
 * était écrite ici ET là-bas — deux copies du même `startsWith`, remontées côte
 * à côte dans ce paquet. Ajouter une famille aurait tenu tant qu'on pensait aux
 * deux. `zoneDe` reste comme nom d'appoint : le moteur raisonne en zones du
 * plan, l'interface en familles du catalogue, c'est le même découpage vu de
 * deux métiers.
 */
export declare const zoneDe: typeof familleMobilier;
export declare function implanter(panier: LigneLounge[], catalogue: Record<string, MobilierItem>, surfaceM2?: number, emprise?: {
    largeurM: number;
    profondeurM: number;
}, disposition?: Disposition, 
/** Voir `personnes()` : absent = une silhouette par place. */
invites?: number, 
/** Qui est la table, et combien s'assoient autour — pour « tablees ». */
groupement?: Groupement): Implantation;
/**
 * Un exemplaire de PLUS de ce meuble tiendrait-il encore ? C'est le VRAI
 * moteur qui répond — jamais une règle de surface : un canapé de 2 m peut
 * refuser là où deux poufs passent. Sert à éteindre le bouton « + » AVANT
 * la faute, au lieu de laisser ajouter puis gronder.
 * Sans surface ni abri, le sol est inventé à la demande : tout tient, par
 * construction — le bouton reste donc toujours actif, et c'est voulu.
 */
export declare function peutAccueillir(panier: {
    slug: string;
    qte: number;
}[], catalogue: Record<string, MobilierItem>, slug: string, surfaceM2?: number, emprise?: {
    largeurM: number;
    profondeurM: number;
}, disposition?: Disposition): boolean;
/**
 * Où poser des gens dans la scène — assis sur les assises, debout autour des
 * mange-debout.
 *
 * POURQUOI. Un lounge dessiné sans personne ne dit pas sa taille : le client
 * voit des volumes gris et ne sait pas si un canapé fait un mètre ou trois.
 * C'est la convention des rendus d'architecte, et elle vaut ici pour la même
 * raison. Ce sont des SILHOUETTES d'échelle, pas des personnages : elles
 * donnent la mesure, elles ne racontent pas une fête.
 *
 * Ces gens ne sont ni comptés, ni facturés, ni placés par le rangeur : ils se
 * déduisent des meubles déjà posés. Ajouter ou retirer une silhouette ne peut
 * donc pas déplacer un meuble ni changer un prix.
 */
export interface Personne {
    x: number;
    z: number;
    /** L'angle que la personne REGARDE : 0 = vers l'écran (−z), comme les meubles. */
    rotation: number;
    assis: boolean;
    /** Décalage vertical du modèle, en mètres — calculé des ancrages mesurés. */
    elevationM: number;
    /** Le GLB et son échelle : choisis ICI pour que les ancrages et le rendu parlent du même fichier. */
    modele: ModeleSilhouette;
    /** Index du meuble qui assoit ou attable cette personne, dans `meubles`. */
    duMeuble: number;
}
/**
 * Points de contact MESURÉS À LA MAIN dans les GLB livrés, en unités du fichier.
 *
 * ⚠️ CE QUI EST VRAI, ici et maintenant : le script de mesure qui a produit ces
 * nombres (`mesurer-personnes.mjs`) N'EST PAS dans ce dépôt — il est resté dans
 * le site au déménagement du moteur (22/08/2026), et AUCUN test ici ne confronte
 * ces cotes aux fichiers GLB (ceux-ci vivent sur R2, hors de portée d'un test
 * unitaire). Ce que ce dépôt vérifie, c'est la COHÉRENCE du placement qui en
 * découle — `implantationMobilier.test.ts` contrôle que semelles et fesses
 * tombent au bon endroit (« fesses sur le coussin… ») et qu'aucune silhouette
 * de `modeleSilhouette` n'a d'ancrage manquant. Re-dériver ces cotes à partir
 * des GLB reste à faire : il faudrait rapatrier le script et une fixture ici.
 *
 * Toute nouvelle silhouette EXIGE une entrée : `elevationDebout` /
 * `elevationAssis` lisent `ANCRAGES[fichier]` SANS repli — un fichier absent
 * lève à la lecture, il ne se pose pas de travers en silence.
 *
 * Deux surprises qui ont coûté trois allers-retours de captures d'écran :
 *  - l'origine des modèles n'est NI au centre du corps NI sous les fesses,
 *    elle est près des talons — tout placement « au centre » rejette le corps
 *    d'un demi-mètre vers l'arrière, à travers dossiers et voisins ;
 *  - la pose assise est sculptée pour une assise de ~39 cm (homme) / ~36 cm
 *    (femme), pas 45 : l'hypothèse « chaise standard » enfonçait pieds et
 *    fesses dans tout ce qui dépasse ces hauteurs.
 */
export declare const ANCRAGES: Record<string, {
    semelleY: number;
    fessesY?: number;
    talonZ?: number;
    dosZ?: number;
}>;
/**
 * Lacet correctif par meuble, MESURÉ À LA MAIN dans les GLB.
 *
 * La scène attend la largeur le long de x et le dossier au fond (+y). Or ces
 * fichiers posent la profondeur sur X : dossier des canapés et de la chaise
 * vers −X, base des banquettes U/N vers +X, tables longues couchées sur Y.
 * Sans ce quart de tour, le canapé 2 places se dessinait EN TRAVERS de
 * l'emprise que le moteur lui réserve : ses assis flottaient à côté, et la
 * banquette U asseyait ses convives hors de sa base.
 *
 * ⚠️ Comme `ANCRAGES`, ces signes viennent d'un script de mesure qui n'est PAS
 * dans ce dépôt (resté dans le site, 22/08/2026), et aucun test ici ne les
 * confronte aux GLB. PIRE que les ancrages : le lecteur (`MobilierViewer`,
 * `LACET_MEUBLE[pose.slug] ?? 0`) retombe SILENCIEUSEMENT sur 0 pour un meuble
 * absent — il se dessine alors de travers sans un mot, le bug d'origine. Tout
 * nouveau meuble Bayes suivant la même convention d'axes DOIT recevoir son
 * entrée ici. Le test « le lacet reste un quart de tour » verrouille au moins
 * la forme des valeurs, faute de pouvoir les re-mesurer sur les fichiers.
 */
export declare const LACET_MEUBLE: Record<string, number>;
export declare function personnes(meubles: MeublePose[], catalogue: Record<string, MobilierItem>, 
/** Nombre d'INVITÉS à dessiner. Absent : une silhouette par place, comme
    toujours. Présent, il COMMANDE : on assoit d'abord (jusqu'aux places),
    on attable ensuite, et le surplus se tient debout dans l'espace libre —
    5 invités sur 2 places, c'est 2 assis et 3 debout, pas 2 personnes. */
invites?: number, 
/** Le sol où les debout libres ont le droit de se tenir. */
sol?: {
    largeurM: number;
    profondeurM: number;
}, 
/** Les meubles auxquels on S'ATTABLE — une personne a le droit de les
 *  chevaucher, c'est même tout l'objet d'un couvert. Sans cette exception,
 *  le contrôle anti-chevauchement refusait les convives d'une tablée : les
 *  chaises restaient dressées et vides autour de la table. */
attablables?: ReadonlySet<string>): Personne[];
/**
 * Quel modèle 3D pour quelle silhouette, et à quelle échelle.
 *
 * Les gens ne sont plus des capsules : ce sont des modèles CC0 de Quaternius
 * (« Posed Background Characters », domaine public, aucune attribution exigée —
 * la licence est copiée dans `client/public/models/personnes/LICENCE.txt`).
 *
 * ÉCHELLE. Les fichiers sont à une échelle arbitraire : un homme debout mesure
 * 3,83 unités, une femme 3,70. On ramène chacun à sa taille réelle, et la pose
 * ASSISE d'un même personnage garde EXACTEMENT le facteur de sa pose debout —
 * sinon la même personne changerait de taille en s'asseyant.
 *
 * Ces valeurs vivent ici, dans le module pur, et pas dans le composant 3D :
 * c'est là que la version précédente cachait ses cotes, et personne n'a vu que
 * les gens flottaient. Ce qui doit être juste est testable.
 */
export interface ModeleSilhouette {
    /** Nom du GLB dans `client/public/models/personnes/`. */
    fichier: string;
    /** Facteur à appliquer au modèle pour obtenir une personne à sa taille. */
    echelle: number;
    /** Taille visée, en mètres — ce que le test vérifie. */
    tailleM: number;
}
/**
 * Alterne hommes et femmes selon l'index — jamais au hasard : une scène rejouée
 * depuis un lien de devis doit montrer les mêmes personnes des mois plus tard.
 */
export declare function modeleSilhouette(assis: boolean, index: number): ModeleSilhouette;
export {};
