import type { Oklab } from '../../../core/color/color';

/**
 * Geometry of the 3D color cylinder. Scene axes: +x is +a, +y is lightness (up), and +z is -b,
 * so that looking straight down from above shows the same picture as the 2D a/b plot (+a to the
 * right, +b up the screen).
 */

/** Scene units per OKLab unit, the same on all axes, so distances stay true to the color space. */
export const SCENE_SCALE = 4;
/** Chroma at the edge of the cylinder, as in the 2D plot. */
export const CYLINDER_CHROMA = 0.3;
export const CYLINDER_RADIUS = CYLINDER_CHROMA * SCENE_SCALE;
/** Total height of the cylinder (lightness 0 to 1). */
export const CYLINDER_HEIGHT = SCENE_SCALE;

export type Vec3 = [number, number, number];

/** OKLab to scene coordinates; lightness 0.5 sits at y = 0. */
export function toScene(lab: Oklab): Vec3 {
  return [lab.a * SCENE_SCALE, (lab.l - 0.5) * SCENE_SCALE, -lab.b * SCENE_SCALE];
}

/** A horizontal circle of the given chroma at the given lightness, as a closed polyline. */
export function circleAt(chroma: number, lightness: number, segments = 96): Vec3[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const angle = (i / segments) * 2 * Math.PI;
    return toScene({
      l: lightness,
      a: chroma * Math.cos(angle),
      b: chroma * Math.sin(angle),
    });
  });
}

/** Hue angles drawn as vertical lines on the cylinder wall, with the label position above them. */
export const HUE_ANGLES = Array.from({ length: 12 }, (_, i) => i * 30);

export function hueLine(deg: number): { bottom: Vec3; top: Vec3; label: Vec3 } {
  const rad = (deg * Math.PI) / 180;
  const at = (l: number, c: number) => toScene({ l, a: c * Math.cos(rad), b: c * Math.sin(rad) });
  return {
    bottom: at(0, CYLINDER_CHROMA),
    top: at(1, CYLINDER_CHROMA),
    label: at(1, CYLINDER_CHROMA + 0.045),
  };
}

/** Lightness values marked along the central axis. */
export const LIGHTNESS_TICKS = [0, 0.25, 0.5, 0.75, 1];

/** Chroma rings drawn on the floor of the cylinder. */
export const CHROMA_RINGS = [0.1, 0.2, 0.3];

/** Camera presets: direction from the cylinder's center to the camera. */
export const VIEW_PRESETS = {
  /** Looking straight down: the 2D a/b plot. The tiny z avoids the pole singularity. */
  top: [0, 1, 0.001],
  /** Along -z: shows a (left-right) against lightness. */
  front: [0, 0, 1],
  /** Along -x: shows b (left-right) against lightness. */
  side: [1, 0, 0],
  /** A three-quarter view from above. */
  reset: [0.55, 0.4, 0.8],
} as const satisfies Record<string, Vec3>;

export type ViewPreset = keyof typeof VIEW_PRESETS;
