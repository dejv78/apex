import mixbox from 'mixbox';
import { clampSrgb, oklabToSrgb, srgbToOklab, type Oklab } from '../color/color';
import { normalizedParts, type MixingModel, type MixPart } from './mixing-model';

/**
 * Mixbox (Secret Weapons, CC BY-NC 4.0, non-commercial use only; see ADR 0006). Mixes in a latent
 * space fitted to four real pigments, so it only sees each pigment's display color.
 */
export class MixboxModel implements MixingModel {
  readonly id = 'mixbox';
  readonly label = 'Mixbox';

  mix(parts: readonly MixPart[]): Oklab {
    const acc = new Array<number>(mixbox.LATENT_SIZE).fill(0);
    for (const { pigment, weight } of normalizedParts(parts)) {
      const { r, g, b } = clampSrgb(oklabToSrgb(pigment.oklab));
      const latent = mixbox.floatRgbToLatent(r, g, b);
      latent.forEach((v, i) => (acc[i] += weight * v));
    }
    const [r, g, b] = mixbox.latentToFloatRgb(acc);
    return srgbToOklab({ r, g, b });
  }
}
