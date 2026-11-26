import type { Oklab } from '../color/color';
import type { Pigment } from '../pigments/pigments';
import type { MixingModel } from './mixing-model';

export interface CurvePoint {
  /** Share of pigment B in the mixture, 0 (pure A) to 1 (pure B). */
  t: number;
  color: Oklab;
}

/** Colors of mixing A and B in `steps` equal ratio steps, from pure A to pure B (steps + 1 points). */
export function mixCurve(model: MixingModel, a: Pigment, b: Pigment, steps: number): CurvePoint[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const color =
      i === 0
        ? model.mix([{ pigment: a, weight: 1 }])
        : i === steps
          ? model.mix([{ pigment: b, weight: 1 }])
          : model.mix([
              { pigment: a, weight: 1 - t },
              { pigment: b, weight: t },
            ]);
    return { t, color };
  });
}

/** Plain linear interpolation in OKLab: the "additive" baseline that real paint does not follow. */
export function linearOklabCurve(a: Pigment, b: Pigment, steps: number): CurvePoint[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return {
      t,
      color: {
        l: a.oklab.l + (b.oklab.l - a.oklab.l) * t,
        a: a.oklab.a + (b.oklab.a - a.oklab.a) * t,
        b: a.oklab.b + (b.oklab.b - a.oklab.b) * t,
      },
    };
  });
}

/**
 * Samples every two-pigment mixture (including the pure pigments) at `steps` ratio steps.
 * Cost: n * (n - 1) / 2 * (steps - 1) mixes for n pigments.
 */
export function samplePairMixtures(
  model: MixingModel,
  pigments: readonly Pigment[],
  steps: number,
): Oklab[] {
  const out: Oklab[] = pigments.map((p) => model.mix([{ pigment: p, weight: 1 }]));
  for (let i = 0; i < pigments.length; i++) {
    for (let j = i + 1; j < pigments.length; j++) {
      for (let k = 1; k < steps; k++) {
        const t = k / steps;
        out.push(
          model.mix([
            { pigment: pigments[i], weight: 1 - t },
            { pigment: pigments[j], weight: t },
          ]),
        );
      }
    }
  }
  return out;
}
