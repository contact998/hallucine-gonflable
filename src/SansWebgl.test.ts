import { describe, expect, it, vi } from "vitest";

vi.mock("three", () => ({
  WebGLRenderer: vi.fn(function () {
    throw new Error("THREE.WebGLRenderer: Error creating WebGL context.");
  }),
}));

const { creerRendu } = await import("./SansWebgl.js");

describe("creerRendu", () => {
  it("rend null au lieu de lever quand le navigateur refuse WebGL", () => {
    expect(creerRendu({ antialias: true })).toBeNull();
  });
});
