import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { reculPourBoite, eclairerStudio } from "./renduStudio.js";

describe("cadrage des produits et scènes longues", () => {
  for (const aspect of [348 / 420, 1328 / 520, 356 / 199]) {
    for (const dimensions of [[24, 2, 14], [3, 2, 1], [24, 40, 8]]) {
      it(`garde tous les coins dans le cadre : ${dimensions}, aspect ${aspect}`, () => {
        const [x, y, z] = dimensions;
        const box = new THREE.Box3(new THREE.Vector3(-x / 2, -y / 2, 0), new THREE.Vector3(x / 2, y / 2, z));
        const direction = new THREE.Vector3(-0.4, 0.9, 0.78).normalize();
        const camera = new THREE.PerspectiveCamera(38, aspect, 0.02, 400);
        camera.up.set(0, 0, 1);
        const center = box.getCenter(new THREE.Vector3());
        camera.position.copy(center).addScaledVector(direction, reculPourBoite(box, direction, camera.fov, aspect));
        camera.lookAt(center);
        camera.updateMatrixWorld();
        for (const xx of [box.min.x, box.max.x])
          for (const yy of [box.min.y, box.max.y])
            for (const zz of [box.min.z, box.max.z]) {
              const projected = new THREE.Vector3(xx, yy, zz).project(camera);
              expect(Math.abs(projected.x)).toBeLessThan(0.92);
              expect(Math.abs(projected.y)).toBeLessThan(0.92);
              expect(Math.abs(projected.z)).toBeLessThan(1);
            }
      });
    }
  }
  it("ne crée aucune lumière projetant une ombre", () => {
    const scene = new THREE.Scene();
    eclairerStudio(scene);
    expect(scene.children.length).toBe(3);
    expect(scene.children.every((light) => !light.castShadow)).toBe(true);
  });
});
