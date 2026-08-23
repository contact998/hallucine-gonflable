/**
 * L'enroulement « toute la tente » — partagé entre les deux viewers.
 *
 * Vit dans son propre fichier parce que le viewer tente et le viewer lounge
 * sont chargés en différé indépendamment : importer l'un depuis l'autre pour
 * une fonction fondrait leurs paquets. Ici, chacun ne tire que ces trente
 * lignes.
 */
import * as THREE from "three";
/**
 * Enroule une grille autour de la tente ENTIÈRE, comme une banderole : le tour
 * devient la largeur, la hauteur reste la hauteur.
 *
 * Pourquoi pas la projection du dessus : elle est juste pour un toit, mais les
 * parois sont verticales — vues d'en haut elles se réduiraient à des traînées.
 * L'enroulement les rend parfaitement, au prix d'un SOMMET DE TOIT ÉTIRÉ,
 * comme le pôle sur un planisphère. C'est inhérent, pas un défaut d'exécution.
 *
 * Le repère est celui de la tente, pas de la pièce : c'est ce qui raccorde une
 * paroi au toit. `u` part de l'arrière (angle 0) et fait le tour ; `v` monte du
 * sol au sommet, mesuré sur la hauteur totale passée en paramètre.
 */
export function enroulerAutourDeLaTente(groupe, hauteur) {
    const mailles = [];
    groupe.traverse((o) => {
        const m = o;
        if (m.isMesh && m.geometry.getAttribute("position"))
            mailles.push(m);
    });
    if (!mailles.length || hauteur <= 0)
        return;
    groupe.updateMatrixWorld(true);
    const p = new THREE.Vector3();
    for (const m of mailles) {
        /* Recalculée à chaque pose : une paroi change de côté par rotation, donc
           son enroulement change aussi. La grille du dessus, elle, ne bougeait pas. */
        const pos = m.geometry.getAttribute("position");
        const uv = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++) {
            p.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
            /* Angle depuis l'arrière, ramené dans [0,1]. Le sens suit celui des
               côtés du configurateur pour qu'une image posée « devant » y reste. */
            const angle = Math.atan2(p.x, -p.y);
            uv[i * 2] = (angle / (2 * Math.PI) + 0.5) % 1;
            uv[i * 2 + 1] = 1 - Math.min(1, Math.max(0, p.z / hauteur));
        }
        m.geometry.setAttribute("uv1", new THREE.BufferAttribute(uv, 2));
    }
}
