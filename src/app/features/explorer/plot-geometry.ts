import { oklabToHex } from '../../../core/color/color';

/** Half-width of the plotted a/b plane (OKLab chroma of real pigments stays below ~0.25). */
export const EXTENT = 0.3;
/** Side of the square plot area in SVG units; the circle of radius EXTENT fills it. */
export const SIZE = 600;
/** Room around the plot for the hue labels. */
export const MARGIN = 56;
/** SVG units per OKLab unit. */
export const SCALE = SIZE / 2 / EXTENT;
export const VIEW_BOX = `${-MARGIN} ${-MARGIN} ${SIZE + 2 * MARGIN} ${SIZE + 2 * MARGIN}`;

const CENTER = SIZE / 2;

/** OKLab a/b plane to SVG coordinates (b points up). */
export function toSvg(a: number, b: number): { x: number; y: number } {
  return { x: CENTER + a * SCALE, y: CENTER - b * SCALE };
}

/** Faint grid line positions along each axis, in OKLab units (no numeric labels are drawn). */
export const TICK_VALUES = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3];

export const aTicks = TICK_VALUES.map((v) => ({
  value: v,
  x: toSvg(v, 0).x,
}));
export const bTicks = TICK_VALUES.map((v) => ({
  value: v,
  y: toSvg(0, v).y,
}));

/** Chroma rings. */
export const rings = [0.1, 0.2, 0.3].map((c) => ({ c, r: c * SCALE }));

/** Hue angle (OKLCH degrees, 0 = +a, 90 = +b) as spoke ends and labels outside the circle. */
export const hueMarks = Array.from({ length: 12 }, (_, i) => {
  const deg = i * 30;
  const rad = (deg * Math.PI) / 180;
  const end = toSvg(EXTENT * Math.cos(rad), EXTENT * Math.sin(rad));
  const label = {
    x: CENTER + (EXTENT * SCALE + 26) * Math.cos(rad),
    y: CENTER - (EXTENT * SCALE + 26) * Math.sin(rad),
  };
  return { deg, x: end.x, y: end.y, labelX: label.x, labelY: label.y };
});

/** Representative colors of the four axis ends (mid lightness, moderate chroma). */
const END = 0.14;
const LIGHTNESS = 0.75;
export const axisColors = {
  aPlus: oklabToHex({ l: LIGHTNESS, a: END, b: 0 }),
  aMinus: oklabToHex({ l: LIGHTNESS, a: -END, b: 0 }),
  bPlus: oklabToHex({ l: LIGHTNESS, a: 0, b: END }),
  bMinus: oklabToHex({ l: LIGHTNESS, a: 0, b: -END }),
};
