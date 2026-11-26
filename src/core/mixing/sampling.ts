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

/** Distance between two colors on the OKLab a/b plane (lightness is ignored). */
export function abDistance(x: Oklab, y: Oklab): number {
  return Math.hypot(x.a - y.a, x.b - y.b);
}

/**
 * Mixes of A and B that are equally spaced along the mixing path on the a/b plane, so close
 * pigments get few points and distant pigments many (about path length / `spacing` intervals).
 *
 * Both pure pigments are always the first and last point. The path is measured on a fine probe
 * of `probeSteps` ratio steps; each interior point's ratio is then solved on that measured
 * path and mixed exactly. The achieved spacing is the path length divided by a whole number of
 * intervals, so it equals `spacing` only approximately.
 */
export function evenlySpacedMixCurve(
  model: MixingModel,
  a: Pigment,
  b: Pigment,
  spacing: number,
  probeSteps = 256,
): CurvePoint[] {
  if (!(spacing > 0)) throw new Error('spacing must be positive');
  const probe = mixCurve(model, a, b, probeSteps);
  const length = [0];
  for (let i = 1; i < probe.length; i++) {
    length.push(length[i - 1] + abDistance(probe[i - 1].color, probe[i].color));
  }
  const total = length[length.length - 1];
  const intervals = Math.max(1, Math.round(total / spacing));

  const out: CurvePoint[] = [probe[0]];
  let j = 1;
  for (let k = 1; k < intervals; k++) {
    const target = (total * k) / intervals;
    while (length[j] < target) j++;
    const span = length[j] - length[j - 1];
    const fraction = span > 0 ? (target - length[j - 1]) / span : 0;
    const t = (j - 1 + fraction) / probeSteps;
    out.push({
      t,
      color: model.mix([
        { pigment: a, weight: 1 - t },
        { pigment: b, weight: t },
      ]),
    });
  }
  out.push(probe[probe.length - 1]);
  return out;
}
