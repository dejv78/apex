import type { Oklab } from '../color/color';
import type { Pigment } from '../pigments/pigments';

/** A pigment and its relative amount in a mixture (weights need not sum to 1). */
export interface MixPart {
  pigment: Pigment;
  weight: number;
}

/**
 * Predicts the color of a pigment mixture. Implementations: Mixbox (approximate, color-only) now,
 * Kubelka-Munk (physical, spectral) later. The UI depends only on this interface.
 */
export interface MixingModel {
  readonly id: string;
  readonly label: string;
  /** Resulting color, possibly outside sRGB. Throws if there is no positive total weight. */
  mix(parts: readonly MixPart[]): Oklab;
}

export function normalizedParts(parts: readonly MixPart[]): MixPart[] {
  const active = parts.filter((p) => p.weight > 0);
  const total = active.reduce((sum, p) => sum + p.weight, 0);
  if (total <= 0) throw new Error('Mixture needs at least one part with positive weight');
  return active.map((p) => ({ pigment: p.pigment, weight: p.weight / total }));
}
