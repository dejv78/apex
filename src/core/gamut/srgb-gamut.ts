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
