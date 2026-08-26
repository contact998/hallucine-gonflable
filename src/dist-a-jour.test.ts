/*
 * dist/ est versionné (voir .gitignore) : le module s'installe depuis GitHub et
 * ne doit surtout pas déclencher d'installation imbriquée chez le consommateur.
 * Le revers, c'est qu'un dist/ oublié part en production sans rien casser au
 * build — le site consommerait une version périmée du module en silence.
 *
 * Ce test recompile dans un dossier temporaire et compare. tsc est déterministe :
 * si src/ a bougé sans que dist/ suive, la comparaison tombe.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("dist/ versionné", () => {
  it("correspond exactement à ce que src/ produit", () => {
    const temoin = mkdtempSync(join(tmpdir(), "tente-dist-"));
    try {
      execFileSync(
        "npx",
        ["tsc", "-p", "tsconfig.build.json", "--outDir", temoin],
        { cwd: RACINE, stdio: "pipe" },
      );

      /* Les fichiers cachés ne sont pas des sorties de compilation : macOS pose
         un `.metadata_never_index` dans les dossiers exclus de Spotlight, et il
         faisait tomber ce test sans que src/ ni dist/ aient bougé. */
      const compiles = (d: string) => readdirSync(d).filter((f) => !f.startsWith(".")).sort();
      const attendus = compiles(temoin);
      const publies = compiles(join(RACINE, "dist"));
      expect(publies).toEqual(attendus);

      for (const fichier of attendus) {
        const frais = readFileSync(join(temoin, fichier), "utf8");
        const versionne = readFileSync(join(RACINE, "dist", fichier), "utf8");
        expect(versionne, `dist/${fichier} est périmé — relancer « npm run build »`)
          .toBe(frais);
      }
    } finally {
      rmSync(temoin, { recursive: true, force: true });
    }
  });
});
