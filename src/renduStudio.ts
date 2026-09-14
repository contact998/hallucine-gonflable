import * as THREE from "three";

/** Éclairage commun, neutre et sans ombre portée. */
export function eclairerStudio(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8f969e, 1.65));
  const principale = new THREE.DirectionalLight(0xffffff, 2.1);
  principale.position.set(-3, -5, 9);
  const appoint = new THREE.DirectionalLight(0xffffff, 0.7);
  appoint.position.set(5, 3, 5);
  scene.add(principale, appoint);
}

/** Distance nécessaire pour que les huit coins tiennent dans les deux axes.
 * La direction va du centre vers la caméra ; Z est vertical dans nos scènes.
 * Le calcul tient compte de la profondeur, sans éloigner inutilement les scènes longues.
 */
export function reculPourBoite(boite: THREE.Box3, direction: THREE.Vector3, fov: number, aspect: number): number {
  const centre = boite.getCenter(new THREE.Vector3());
  const avant = direction.clone().normalize();
  const droite = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 0, 1), avant).normalize();
  const haut = new THREE.Vector3().crossVectors(avant, droite).normalize();
  const tanV = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  const tanH = tanV * aspect;
  let recul = 0;
  for (const x of [boite.min.x, boite.max.x])
    for (const y of [boite.min.y, boite.max.y])
      for (const z of [boite.min.z, boite.max.z]) {
        const coin = new THREE.Vector3(x, y, z).sub(centre);
        recul = Math.max(recul, coin.dot(avant) + 1.1 * Math.max(Math.abs(coin.dot(droite)) / tanH, Math.abs(coin.dot(haut)) / tanV));
      }
  return Math.max(recul, 0.1);
}

/** Matière de toile commune aux tentes seules et aux abris du lounge. */
export function matiereTente(source: THREE.MeshStandardMaterial, structure: boolean) {
  const tissu = new THREE.MeshPhysicalMaterial();
  THREE.MeshStandardMaterial.prototype.copy.call(tissu, source);
  tissu.side = THREE.DoubleSide;
  tissu.metalness = 0;
  tissu.roughness = structure ? 0.57 : 0.78;
  tissu.clearcoat = structure ? 0.12 : 0.035;
  tissu.clearcoatRoughness = 0.65;
  return tissu;
}
