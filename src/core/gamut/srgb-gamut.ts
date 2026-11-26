import { srgbToOklab, type Oklab } from '../color/color';

/**
 * Samples the surface of the sRGB cube and returns the colors in OKLab. The sRGB gamut is not
 * convex in OKLab, so its a/b outline is taken as the hull of these dense surface samples.
 */
export function srgbSurfaceSamples(steps = 16): Oklab[] {
  const out: Oklab[] = [];
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const u = i / steps;
      const v = j / steps;
      for (const k of [0, 1]) {
        out.push(srgbToOklab({ r: u, g: v, b: k }));
        out.push(srgbToOklab({ r: u, g: k, b: v }));
        out.push(srgbToOklab({ r: k, g: u, b: v }));
      }
    }
  }
  return out;
}

export interface GamutMesh {
  /** Surface vertices in OKLab. */
  vertices: Oklab[];
  /** The same vertices as sRGB in [0, 1], for coloring the surface. */
  colors: [number, number, number][];
  /** Triangle indices into `vertices`, three per triangle. */
  indices: number[];
}

/**
 * The surface of the sRGB gamut as a triangle mesh in OKLab: each face of the RGB cube is a
 * (steps + 1)² grid, mapped through the OKLab transform, so the curved 3D shape is exact up to
 * the grid resolution. Vertices on cube edges are duplicated between faces.
 */
export function srgbGamutMesh(steps = 16): GamutMesh {
  const vertices: Oklab[] = [];
  const colors: [number, number, number][] = [];
  const indices: number[] = [];
  const faces: ((u: number, v: number, k: number) => [number, number, number])[] = [
    (u, v, k) => [k, u, v],
    (u, v, k) => [u, k, v],
    (u, v, k) => [u, v, k],
  ];
  for (const face of faces) {
    for (const k of [0, 1]) {
      const base = vertices.length;
      for (let i = 0; i <= steps; i++) {
        for (let j = 0; j <= steps; j++) {
          const [r, g, b] = face(i / steps, j / steps, k);
          vertices.push(srgbToOklab({ r, g, b }));
          colors.push([r, g, b]);
        }
      }
      for (let i = 0; i < steps; i++) {
        for (let j = 0; j < steps; j++) {
          const p = base + i * (steps + 1) + j;
          const q = p + steps + 1;
          indices.push(p, q, p + 1, p + 1, q, q + 1);
        }
      }
    }
  }
  return { vertices, colors, indices };
}
