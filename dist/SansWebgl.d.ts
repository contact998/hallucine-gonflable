import * as THREE from "three";
/**
 * Le moteur de rendu, ou `null` quand le navigateur refuse WebGL.
 *
 * `new THREE.WebGLRenderer()` LÈVE quand le contexte ne s'ouvre pas —
 * accélération graphique coupée, pilote sur liste noire, trop de contextes
 * ouverts, bureau à distance. Levée dans un `useEffect`, l'erreur remontait
 * jusqu'au garde-fou de l'application et emportait toute la page (« An
 * unexpected error occurred », hallucinecran.fr, 18/10/2026) pour une vue qui
 * n'en est qu'un morceau. Ici la scène se retire seule et la page vit.
 */
export declare function creerRendu(parametres: THREE.WebGLRendererParameters): THREE.WebGLRenderer | null;
export declare const LABEL_SANS_WEBGL = "La vue 3D ne peut pas s\u2019afficher sur ce navigateur (WebGL indisponible).";
/** Ce qui tient la place de la scène quand `creerRendu` a rendu `null`. */
export declare function SansWebgl({ label }: {
    label: string;
}): import("react").JSX.Element;
