/**
 * Picking with a finger. Pigment markers are a few pixels wide on a phone, far smaller than a
 * fingertip, so on touch devices (`ExplorerState.touchOnly`) the markers are drawn larger and a tap
 * selects the pigment nearest to it within a radius, instead of requiring a direct hit (ADR 0014).
 * A mouse keeps direct hits only.
 */

/** Marker size on touch devices, relative to a mouse. About what the crowded plot can take. */
export const TOUCH_MARKER_SCALE = 1.6;
/** How far from a pigment, in screen pixels, a tap still selects it. */
export const TOUCH_PICK_RADIUS = 22;

export interface PickTarget<T> {
  /** Screen position in pixels (the same space as the tap). */
  x: number;
  y: number;
  item: T;
  /** Distance from the camera in 3D, to break ties between overlapping targets (nearer wins). */
  depth?: number;
}

/**
 * The target nearest to (`x`, `y`) within `radius`, or `null` if none is that close. At equal
 * distance the one with the smaller `depth` wins.
 */
export function nearestTarget<T>(
  targets: readonly PickTarget<T>[],
  x: number,
  y: number,
  radius: number,
): T | null {
  let best: PickTarget<T> | null = null;
  let bestDistance = Infinity;
  for (const target of targets) {
    const distance = Math.hypot(target.x - x, target.y - y);
    if (distance > radius) continue;
    const nearer = distance < bestDistance;
    const tie = distance === bestDistance && (target.depth ?? 0) < (best?.depth ?? 0);
    if (nearer || tie) {
      best = target;
      bestDistance = distance;
    }
  }
  return best ? best.item : null;
}
