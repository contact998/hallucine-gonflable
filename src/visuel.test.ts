/*
 * Le CONTRAT d'erreur typée de l'import de visuel.
 *
 * `importerVisuel` a besoin d'un navigateur (FileReader, Image, canvas) : il
 * n'est pas testable ici. Mais l'appelant — `ListeMobilier`, monté par le site
 * ET le CRM — ne fait remonter le bon message que si l'échec voyage TYPÉ, avec
 * sa cause. C'est ce contrat que ce fichier verrouille : le jour où quelqu'un
 * remplace l'`ErreurVisuel` par un rejet nu, la housse muette du 23/08/2026
 * revient, et ce test doit tomber avant.
 */
import { describe, it, expect } from "vitest";
import { ErreurVisuel, FORMATS, type EchecVisuel } from "./visuel.js";

describe("ErreurVisuel", () => {
  it("porte sa cause pour que l'appelant traduise le bon message", () => {
    for (const cause of ["format", "poids", "illisible"] as EchecVisuel[]) {
      const e = new ErreurVisuel(cause);
      expect(e).toBeInstanceOf(Error);
      expect(e.cause_).toBe(cause);
    }
  });
});

describe("FORMATS", () => {
  it("accepte ce que l'atelier sait imprimer", () => {
    for (const t of ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]) {
      expect(FORMATS.test(t)).toBe(true);
    }
  });
  it("refuse le reste — dont le HEIC des téléphones, d'où un « format » à dire", () => {
    for (const t of ["image/heic", "image/gif", "application/pdf", "text/plain", ""]) {
      expect(FORMATS.test(t)).toBe(false);
    }
  });
});
