/*
 * La vitre PVC d'une pièce de tente — détection et matière, partagées entre le
 * viewer tente et l'abri du lounge. Le fichier est séparé (ni dans `vue3d.ts`,
 * qui ne dépend pas de three et doit le rester, ni dans `Viewer.tsx`, dont
 * l'import embarquerait tout le viewer tente dans la scène du lounge).
 */
import * as THREE from "three";

/** Toile blanche translucide — l'opacité 0,42 est celle que portait la matière
 *  « vitre » du STEP, reprise telle quelle plutôt que redevinée. */
export const VITRE_MAT = new THREE.MeshStandardMaterial({
  color: 0xdfe7ec,
  transparent: true,
  opacity: 0.42,
  roughness: 0.15,
  metalness: 0,
  side: THREE.DoubleSide,
  depthWrite: false,
});

/** Repère la vitre par la géométrie plutôt que par un indice de morceau : Bayes
 *  réordonne ses exports. La vitre est le morceau dont la boîte est la plus
 *  petite ET tient entièrement dans celle du plus grand. Si rien ne correspond
 *  — nouvel export, découpe différente — on ne marque rien : la paroi reste
 *  unie, elle ne casse pas.
 *
 *  On compare des AIRES, pas des volumes. Les panneaux de la N sont des plans
 *  d'épaisseur nulle : leur volume vaut zéro, celui de la toile comme celui de
 *  la vitre, et la comparaison ne départageait rien. L'aire de la plus grande
 *  face vaut pour les deux découpes — 697 000 contre 5 762 000 mm² sur la X,
 *  880 000 contre 4 617 000 sur la N. */
export function marquerVitre(scene: THREE.Object3D): void {
  const mailles: THREE.Mesh[] = [];
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) mailles.push(m);
  });
  if (mailles.length < 2) return;
  // Les boîtes se comparent dans le même repère : la scène sort du chargeur
  // sans que ses matrices aient été calculées une seule fois.
  scene.updateMatrixWorld(true);
  const boites = mailles.map((m) => {
    m.geometry.computeBoundingBox();
    return m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld);
  });
  const aire = (b: THREE.Box3) => {
    const d = b.getSize(new THREE.Vector3());
    const [a, deux] = [d.x, d.y, d.z].sort((x, y) => y - x);
    return a * deux;
  };
  let iPetit = 0, iGrand = 0;
  boites.forEach((b, i) => {
    if (aire(b) < aire(boites[iPetit])) iPetit = i;
    if (aire(b) > aire(boites[iGrand])) iGrand = i;
  });
  if (iPetit === iGrand) return;
  // Tolérance de 20 mm : la vitre affleure la toile, ses bords coïncident.
  const grand = boites[iGrand].clone().expandByScalar(20);
  if (!grand.containsBox(boites[iPetit])) return;
  mailles[iPetit].userData.vitre = true;
  mailles[iPetit].material = VITRE_MAT;
}

/** La vitre ne se teint pas, ne s'imprime pas, ne s'éclaircit pas : c'est du
 *  transparent, pas de la toile. Un seul test, appelé partout où on peint. */
export const estVitre = (o: THREE.Object3D) => o.userData.vitre === true;
