import { converter, formatHex, parse } from 'culori';

/** Perceptual OKLab color: l in [0, 1], a/b roughly in [-0.4, 0.4]. */
export interface Oklab {
  l: number;
  a: number;
  b: number;
}

/** Polar form of OKLab: chroma c >= 0, hue h in degrees [0, 360). */
export interface Oklch {
  l: number;
  c: number;
  h: number;
}

/** Gamma-encoded sRGB, each channel in [0, 1] (not clamped unless stated). */
export interface Srgb {
  r: number;
  g: number;
  b: number;
}

const toOklab = converter('oklab');
const toRgb = converter('rgb');

export function srgbToOklab({ r, g, b }: Srgb): Oklab {
  const { l, a, b: bb } = toOklab({ mode: 'rgb', r, g, b });
  return { l, a, b: bb };
}

/** Result may lie outside [0, 1] when the color is outside the sRGB gamut. */
export function oklabToSrgb({ l, a, b }: Oklab): Srgb {
  const { r, g, b: bb } = toRgb({ mode: 'oklab', l, a, b });
  return { r, g, b: bb };
}

export function isInSrgbGamut(color: Oklab, epsilon = 1e-6): boolean {
  const { r, g, b } = oklabToSrgb(color);
  return [r, g, b].every((v) => v >= -epsilon && v <= 1 + epsilon);
}

export function clampSrgb({ r, g, b }: Srgb): Srgb {
  const c = (v: number) => Math.min(1, Math.max(0, v));
  return { r: c(r), g: c(g), b: c(b) };
}

export function oklabToOklch({ l, a, b }: Oklab): Oklch {
  const c = Math.hypot(a, b);
  const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return { l, c, h };
}

export function oklchToOklab({ l, c, h }: Oklch): Oklab {
  const rad = (h * Math.PI) / 180;
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) };
}

export function hexToSrgb(hex: string): Srgb {
  const parsed = parse(hex);
  if (!parsed) throw new Error(`Invalid color: ${hex}`);
  const { r, g, b } = toRgb(parsed);
  return { r, g, b };
}

/** Out-of-gamut colors are clamped. */
export function srgbToHex(color: Srgb): string {
  const { r, g, b } = clampSrgb(color);
  return formatHex({ mode: 'rgb', r, g, b });
}

export function hexToOklab(hex: string): Oklab {
  return srgbToOklab(hexToSrgb(hex));
}

export function oklabToHex(color: Oklab): string {
  return srgbToHex(oklabToSrgb(color));
}

/** WCAG relative luminance of an sRGB color (channels in [0, 1]). */
function relativeLuminance({ r, g, b }: Srgb): number {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Black or white, whichever has the higher WCAG contrast ratio against the background. */
export function readableTextColor(background: Srgb): '#000000' | '#ffffff' {
  const l = relativeLuminance(clampSrgb(background));
  const contrastWithBlack = (l + 0.05) / 0.05;
  const contrastWithWhite = 1.05 / (l + 0.05);
  return contrastWithBlack >= contrastWithWhite ? '#000000' : '#ffffff';
}
