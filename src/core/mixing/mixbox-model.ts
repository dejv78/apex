import mixbox from 'mixbox';
import { clampSrgb, oklabToSrgb, srgbToOklab, type Oklab } from '../color/color';
import type { Pigment } from '../pigments/pigments';
import { normalizedParts, type MixingModel, type MixPart } from './mixing-model';

/**
 * Mixbox (Secret Weapons, CC BY-NC 4.0, non-commercial use only; see ADR 0006). Mixes in a latent
 * space fitted to four real pigments, so it only sees each pigment's display color.
 */
export class MixboxModel implements MixingModel {
  readonly id = 'mixbox';
  readonly label = 'Mixbox';

  /** Latent vectors are the expensive part of a mix, and a pigment's never changes. */
  private readonly latents = new Map<string, number[]>();

  private latentOf(pigment: Pigment): number[] {
    let latent = this.latents.get(pigment.id);
    if (!latent) {
      const { r, g, b } = clampSrgb(oklabToSrgb(pigment.oklab));
      latent = mixbox.floatRgbToLatent(r, g, b);
      this.latents.set(pigment.id, latent);
    }
    return latent;
  }

  mix(parts: readonly MixPart[]): Oklab {
    const acc = new Array<number>(mixbox.LATENT_SIZE).fill(0);
    for (const { pigment, weight } of normalizedParts(parts)) {
      this.latentOf(pigment).forEach((v, i) => (acc[i] += weight * v));
    }
    const [r, g, b] = mixbox.latentToFloatRgb(acc);
    return srgbToOklab({ r, g, b });
  }
}
