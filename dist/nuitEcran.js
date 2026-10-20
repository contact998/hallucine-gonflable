/*
 * La séance de nuit autour de l'écran : ciel étoilé, faisceau du projecteur
 * avec sa poussière, lucioles. Idée folle de la veille GitHub du 20/10/2026
 * (three.js webgl_gpgpu_birds, drei Sparkles/SpotLight), réécrite à la main en
 * quelques centaines de points — aucune dépendance de plus.
 *
 * Repère des scènes d'écran : Z vertical, toile dans le plan y = toileYM, face
 * vers −Y (le public est au sud). Le projecteur se tient dans le public, à une
 * largeur et demie de toile, à hauteur d'homme.
 *
 * `creerNuit` rend un groupe à poser dans la scène, une fonction `animer` à
 * appeler à chaque image, et `liberer` pour rendre la mémoire GPU.
 */
import * as THREE from "three";
/** Où se tient le projecteur : dans le public, assez loin pour couvrir la toile. */
export function positionProjecteur(c) {
    const recul = Math.max(6, c.toileLargeurM * 1.5);
    return new THREE.Vector3(0, c.toileYM - recul, 1.4);
}
/** Les quatre coins de l'image, dans l'ordre bas-gauche, bas-droit, haut-droit, haut-gauche. */
export function coinsImage(c) {
    const d = c.toileLargeurM / 2;
    const y = c.toileYM - 0.02;
    return [
        new THREE.Vector3(-d, y, c.baseM),
        new THREE.Vector3(d, y, c.baseM),
        new THREE.Vector3(d, y, c.hautM),
        new THREE.Vector3(-d, y, c.hautM),
    ];
}
/** La pyramide de lumière : sommet au projecteur, base sur l'image. Quatre faces. */
export function geometrieFaisceau(sommet, coins) {
    const p = [];
    for (let i = 0; i < 4; i++) {
        const a = coins[i];
        const b = coins[(i + 1) % 4];
        p.push(sommet.x, sommet.y, sommet.z, a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    return g;
}
/** Un point tiré au hasard DANS la pyramide (interpolation sommet → base). */
export function pointDansFaisceau(sommet, coins, u, v, t) {
    const bas = coins[0].clone().lerp(coins[1], u);
    const haut = coins[3].clone().lerp(coins[2], u);
    const surImage = bas.lerp(haut, v);
    return sommet.clone().lerp(surImage, t);
}
/** Petit générateur déterministe : la même nuit à chaque ouverture. */
function hasard(graine) {
    let s = graine >>> 0 || 1;
    return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0) / 4294967296);
}
export function creerNuit(c) {
    const r = hasard(20261020);
    const groupe = new THREE.Group();
    const aLiberer = [];
    // Le ciel : une demi-sphère de points, au-dessus de l'horizon.
    const etoiles = [];
    for (let i = 0; i < 700; i++) {
        const az = r() * Math.PI * 2;
        const el = 0.08 + r() * 1.4;
        const R = 150;
        etoiles.push(R * Math.cos(el) * Math.cos(az), R * Math.cos(el) * Math.sin(az) + c.toileYM, R * Math.sin(el));
    }
    const gEt = new THREE.BufferGeometry();
    gEt.setAttribute("position", new THREE.Float32BufferAttribute(etoiles, 3));
    const mEt = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false });
    groupe.add(new THREE.Points(gEt, mEt));
    aLiberer.push(gEt, mEt);
    // Le faisceau : une pyramide additive, à peine visible, et sa poussière.
    const sommet = positionProjecteur(c);
    const coins = coinsImage(c);
    const gFa = geometrieFaisceau(sommet, coins);
    const mFa = new THREE.MeshBasicMaterial({
        color: 0xfff1cf, transparent: true, opacity: 0.07, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false,
    });
    groupe.add(new THREE.Mesh(gFa, mFa));
    aLiberer.push(gFa, mFa);
    const NB_POUSSIERE = 360;
    const graines = Array.from({ length: NB_POUSSIERE }, () => [r(), r(), 0.15 + r() * 0.8, r() * Math.PI * 2]);
    const posPo = new Float32Array(NB_POUSSIERE * 3);
    const gPo = new THREE.BufferGeometry();
    gPo.setAttribute("position", new THREE.BufferAttribute(posPo, 3));
    const mPo = new THREE.PointsMaterial({ color: 0xfff6e0, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    groupe.add(new THREE.Points(gPo, mPo));
    aLiberer.push(gPo, mPo);
    // Les lucioles : quelques dizaines, qui flottent devant l'écran.
    const NB_LUCIOLES = 46;
    const lucioles = Array.from({ length: NB_LUCIOLES }, () => ({
        x: (r() - 0.5) * c.toileLargeurM * 2.2,
        y: c.toileYM - 1 - r() * c.toileLargeurM * 1.6,
        z: 0.4 + r() * 2.6,
        phase: r() * Math.PI * 2,
        vitesse: 0.4 + r() * 0.8,
    }));
    const posLu = new Float32Array(NB_LUCIOLES * 3);
    const gLu = new THREE.BufferGeometry();
    gLu.setAttribute("position", new THREE.BufferAttribute(posLu, 3));
    const mLu = new THREE.PointsMaterial({ color: 0xd8ff7a, size: 5, sizeAttenuation: false, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    groupe.add(new THREE.Points(gLu, mLu));
    aLiberer.push(gLu, mLu);
    const animer = (ms) => {
        const t = ms / 1000;
        for (let i = 0; i < NB_POUSSIERE; i++) {
            const [u, v, prof, ph] = graines[i];
            const p = pointDansFaisceau(sommet, coins, (u + Math.sin(t * 0.07 + ph) * 0.05 + 1) % 1, (v + t * 0.01 + Math.cos(t * 0.11 + ph) * 0.03 + 1) % 1, prof);
            posPo[i * 3] = p.x;
            posPo[i * 3 + 1] = p.y;
            posPo[i * 3 + 2] = p.z;
        }
        gPo.attributes.position.needsUpdate = true;
        for (let i = 0; i < NB_LUCIOLES; i++) {
            const l = lucioles[i];
            posLu[i * 3] = l.x + Math.sin(t * l.vitesse + l.phase) * 0.8;
            posLu[i * 3 + 1] = l.y + Math.cos(t * l.vitesse * 0.7 + l.phase) * 0.6;
            posLu[i * 3 + 2] = l.z + Math.sin(t * l.vitesse * 1.3 + l.phase) * 0.3;
        }
        gLu.attributes.position.needsUpdate = true;
        // Les lucioles s'allument et s'éteignent ensemble, doucement.
        mLu.opacity = 0.55 + 0.4 * Math.sin(t * 1.7) ** 2;
    };
    animer(0);
    return {
        groupe,
        animer,
        liberer: () => {
            groupe.removeFromParent();
            for (const x of aLiberer)
                x.dispose();
        },
    };
}
