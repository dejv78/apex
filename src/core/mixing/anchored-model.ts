import type { Oklab } from '../color/color';
import type { Pigment } from '../pigments/pigments';
import { normalizedParts, type MixingModel, type MixPart } from './mixing-model';

/**
 * Wraps a mixing model so that pure pigments come out at their true OKLab coordinates.
 *
 * Some models (Mixbox) only work inside sRGB, so a saturated pigment outside it is mixed from a
 * clamped color, and every mixture inherits that error. This wrapper measures, per pigment, the
 * offset between the true color and the model's output for the pure pigment, and adds the
 * weight-averaged offsets to every mixture. Effects:
 * - a pure pigment is reproduced exactly, and the correction fades in smoothly along a transition;
 * - for pigments the model already reproduces, the correction is close to zero.
 *
 * This is a heuristic correction, not a physical prediction: near a pigment outside the model's
 * gamut the result is an extrapolation (see ADR 0008).
 */
export class AnchoredModel implements MixingModel {
  readonly id: string;
  readonly label: string;
  private readonly offsets = new Map<string, Oklab>();

  constructor(private readonly base: MixingModel) {
    this.id = `${base.id}-anchored`;
    // The correction is an implementation detail, so users see the base model's name.
    this.label = base.label;
  }

  /** Offset from the model's pure-pigment output to the pigment's true color. */
  offsetOf(pigment: Pigment): Oklab {
    let offset = this.offsets.get(pigment.id);
    if (!offset) {
      const seen = this.base.mix([{ pigment, weight: 1 }]);
      offset = {
        l: pigment.oklab.l - seen.l,
        a: pigment.oklab.a - seen.a,
        b: pigment.oklab.b - seen.b,
      };
      this.offsets.set(pigment.id, offset);
    }
    return offset;
  }

  mix(parts: readonly MixPart[]): Oklab {
    const normalized = normalizedParts(parts);
    const raw = this.base.mix(normalized);
    let { l, a, b } = raw;
    for (const { pigment, weight } of normalized) {
      const o = this.offsetOf(pigment);
      l += weight * o.l;
      a += weight * o.a;
      b += weight * o.b;
    }
    return { l, a, b };
  }
}
