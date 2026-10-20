import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { versRepereAR } from "./realiteAugmentee.js";

describe("versRepereAR", () => {
  // Un écran schématique dans NOTRE repère : 6 m de large (X), 0,5 m de
  // profondeur (Y), 4 m de haut (Z), posé au sol, face de projection vers −Y.
  const ecran = () => {
    const maille = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 4));
    maille.position.set(0, 0, 2);
    const g = new THREE.Group();
    g.add(maille);
    return g;
  };

  it("la hauteur passe sur Y, sans rien changer aux cotes", () => {
    const taille = new THREE.Box3().setFromObject(versRepereAR(ecran())).getSize(new THREE.Vector3());
    expect(taille.x).toBeCloseTo(6);
    expect(taille.y).toBeCloseTo(4);
    expect(taille.z).toBeCloseTo(0.5);
  });

  it("l'écran reste posé au sol : rien sous Y = 0", () => {
    const boite = new THREE.Box3().setFromObject(versRepereAR(ecran()));
    expect(boite.min.y).toBeCloseTo(0);
  });

  it("la face de projection (−Y chez nous) regarde +Z, vers l'utilisateur", () => {
    const repere = versRepereAR(new THREE.Group());
    const face = new THREE.Vector3(0, -1, 0).applyQuaternion(repere.quaternion);
    expect(face.z).toBeCloseTo(1);
  });
});
