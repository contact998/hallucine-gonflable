/*
 * Le détourage : il retire le fond uni d'un logo, et RIEN d'autre. Un
 * détourage raté troue le visuel du client ; ces tests gardent la prudence.
 */
import { describe, it, expect } from "vitest";
import { detourerFondUni, aDeLaTransparence } from "./detourage.js";

type Rgb = [number, number, number];

/** Une image `l × h` remplie de `fond`, où `dessin(x, y)` peint le logo. */
function image(l: number, h: number, fond: Rgb, dessin: (x: number, y: number) => Rgb | null) {
  const px = new Uint8ClampedArray(l * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < l; x++) {
    const c = dessin(x, y) ?? fond;
    const i = (y * l + x) * 4;
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
  }
  return px;
}
const alpha = (px: Uint8ClampedArray, l: number, x: number, y: number) => px[(y * l + x) * 4 + 3];

describe("detourerFondUni", () => {
  it("retire le blanc autour d'un logo, garde le logo", () => {
    const px = image(40, 30, [255, 255, 255], (x, y) => (x >= 10 && x < 30 && y >= 8 && y < 22 ? [200, 16, 46] : null));
    const r = detourerFondUni(px, 40, 30);
    expect(r.detoure).toBe(true);
    expect(r.fond).toEqual([255, 255, 255]);
    expect(alpha(px, 40, 0, 0)).toBe(0);
    expect(alpha(px, 40, 20, 15)).toBe(255);
  });

  it("garde le blanc ENFERMÉ dans le logo — l'œil d'un O ne se troue pas", () => {
    /* Un anneau rouge : le blanc du centre n'est pas relié au bord. */
    const px = image(40, 40, [255, 255, 255], (x, y) => {
      const d = Math.hypot(x - 20, y - 20);
      return d >= 8 && d <= 14 ? [200, 16, 46] : null;
    });
    expect(detourerFondUni(px, 40, 40).detoure).toBe(true);
    expect(alpha(px, 40, 20, 20)).toBe(255);
    expect(alpha(px, 40, 1, 1)).toBe(0);
  });

  it("avale le bruit d'un JPEG sur le fond", () => {
    const px = image(40, 30, [250, 250, 250], (x, y) => {
      if (x >= 12 && x < 28 && y >= 10 && y < 20) return [0, 60, 150];
      return (x + y) % 3 === 0 ? [241, 246, 238] : null;
    });
    expect(detourerFondUni(px, 40, 30).detoure).toBe(true);
    expect(alpha(px, 40, 3, 3)).toBe(0);
  });

  it("laisse une PHOTO telle quelle : son pourtour n'est pas uni", () => {
    const px = image(40, 30, [255, 255, 255], (x, y) => [(x * 7) % 256, (y * 11) % 256, ((x + y) * 5) % 256]);
    const avant = px.slice();
    expect(detourerFondUni(px, 40, 30).detoure).toBe(false);
    expect(px).toEqual(avant);
  });

  it("renonce quand il ne resterait presque rien", () => {
    const px = image(40, 30, [255, 255, 255], () => null);
    expect(detourerFondUni(px, 40, 30).detoure).toBe(false);
    expect(aDeLaTransparence(px)).toBe(false);
  });

  it("ne retouche pas une image déjà transparente", () => {
    const px = image(10, 10, [255, 255, 255], () => null);
    px[3] = 0;
    expect(detourerFondUni(px, 10, 10).detoure).toBe(false);
    expect(aDeLaTransparence(px)).toBe(true);
  });

  it("adoucit la lisière au lieu de laisser un liseré de fond", () => {
    /* Un pixel à mi-chemin entre le rouge et le blanc, collé au fond. */
    const px = image(40, 30, [255, 255, 255], (x, y) => {
      if (x >= 10 && x < 30 && y >= 8 && y < 22) return x === 10 ? [228, 136, 151] : [200, 16, 46];
      return null;
    });
    detourerFondUni(px, 40, 30);
    const a = alpha(px, 40, 10, 15);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(255);
    /* La part de blanc est retirée : le pixel tire vers le rouge du logo. */
    expect(px[(15 * 40 + 10) * 4 + 1]).toBeLessThan(136);
  });
});
