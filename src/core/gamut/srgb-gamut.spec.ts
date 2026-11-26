import { oklabToOklch } from '../color/color';
import { srgbGamutMesh, srgbSurfaceSamples } from './srgb-gamut';

describe('srgbGamutMesh', () => {
  const steps = 8;
  const mesh = srgbGamutMesh(steps);

  it('has a grid of vertices and two triangles per cell on each of the six cube faces', () => {
    expect(mesh.vertices.length).toBe(6 * (steps + 1) ** 2);
    expect(mesh.colors.length).toBe(mesh.vertices.length);
    expect(mesh.indices.length).toBe(6 * steps * steps * 2 * 3);
    expect(Math.max(...mesh.indices)).toBeLessThan(mesh.vertices.length);
    expect(Math.min(...mesh.indices)).toBeGreaterThanOrEqual(0);
  });

  it('contains the black and white corners and the sRGB primaries as vertices', () => {
    const has = (r: number, g: number, b: number) =>
      mesh.colors.some((c) => c[0] === r && c[1] === g && c[2] === b);
    for (const rgb of [
      [0, 0, 0],
      [1, 1, 1],
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]) {
      expect(has(rgb[0], rgb[1], rgb[2])).toBe(true);
    }
    const white = mesh.vertices[mesh.colors.findIndex((c) => c.every((v) => v === 1))];
    expect(white.l).toBeCloseTo(1, 3);
  });

  it('has the same extent as the sampled surface: lightness 0 to 1, chroma up to about 0.32', () => {
    const maxChroma = (labs: { l: number; a: number; b: number }[]) =>
      Math.max(...labs.map((c) => oklabToOklch(c).c));
    expect(Math.min(...mesh.vertices.map((v) => v.l))).toBeCloseTo(0, 3);
    expect(Math.max(...mesh.vertices.map((v) => v.l))).toBeCloseTo(1, 3);
    expect(maxChroma(mesh.vertices)).toBeCloseTo(maxChroma(srgbSurfaceSamples(8)), 2);
  });

  it('is widest at mid lightness: chroma of blue (L 0.45) exceeds that near black and white', () => {
    const blue =
      mesh.vertices[mesh.colors.findIndex((c) => c[0] === 0 && c[1] === 0 && c[2] === 1)];
    const nearBlack = mesh.vertices.filter((v) => v.l < 0.1);
    const nearWhite = mesh.vertices.filter((v) => v.l > 0.95);
    const chroma = (v: { l: number; a: number; b: number }) => oklabToOklch(v).c;
    expect(chroma(blue)).toBeGreaterThan(Math.max(...nearBlack.map(chroma)));
    expect(chroma(blue)).toBeGreaterThan(Math.max(...nearWhite.map(chroma)));
  });
});
