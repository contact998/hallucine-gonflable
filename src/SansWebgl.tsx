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
export function creerRendu(parametres: THREE.WebGLRendererParameters): THREE.WebGLRenderer | null {
  try {
    return new THREE.WebGLRenderer(parametres);
  } catch {
    return null;
  }
}

/**
 * Rend le contexte WebGL au navigateur, tout de suite.
 *
 * `dispose()` libère les objets de three.js mais laisse le CONTEXTE vivant
 * jusqu'au ramasse-miettes. Les vues se remontent à chaque gamme, chaque
 * modèle, chaque page : les contextes s'empilaient jusqu'à ce que le
 * navigateur refuse le suivant — « WebGL indisponible » sur une machine qui
 * l'a très bien (configurateur d'écran, 19/10/2026).
 */
export function libererRendu(rendu: THREE.WebGLRenderer): void {
  rendu.dispose();
  rendu.forceContextLoss();
}

export const LABEL_SANS_WEBGL = "La vue 3D ne peut pas s’afficher sur ce navigateur (WebGL indisponible).";

/** Ce qui tient la place de la scène quand `creerRendu` a rendu `null`. */
export function SansWebgl({ label }: { label: string }) {
  return (
    <span role="status" className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-[#2E4A5E]/70">
      {label}
    </span>
  );
}
