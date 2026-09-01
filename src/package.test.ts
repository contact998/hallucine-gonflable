/*
 * package.json doit dire la VÉRITÉ sur ses dépendances de pair.
 *
 * L'unique point d'entrée `.` ré-exporte les viewers (Viewer, MobilierViewer,
 * EcranViewer…) qui importent three et React au CHARGEMENT du module : on ne
 * peut pas importer `cleTente` ou `lignesTarifTente` sans que Node résolve
 * three. Tant que c'est le cas, react et three ne sont PAS optionnels — les
 * marquer `optional` était un mensonge du manifeste (un script serveur sans ces
 * paquets casserait à l'import, pas « en douceur »).
 *
 * Ce test tombe le jour où quelqu'un rétablit `peerDependenciesMeta.optional`
 * sans avoir d'abord découpé l'export en `.` (le cœur pur : composition, config,
 * tarif, ecran…) et `./3d` (les viewers). Ce découpage-là rendrait l'option
 * honnête ; en attendant, le manifeste dit la vérité.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const pkg = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8"),
);

describe("package.json — l'honnêteté des peers", () => {
  it("react et three restent déclarés en peers", () => {
    expect(pkg.peerDependencies?.react).toBeTruthy();
    expect(pkg.peerDependencies?.three).toBeTruthy();
  });

  it("ne les dit pas optionnels tant que `.` tire les viewers", () => {
    const meta = pkg.peerDependenciesMeta ?? {};
    expect(meta.react?.optional ?? false).toBe(false);
    expect(meta.three?.optional ?? false).toBe(false);
  });
});
