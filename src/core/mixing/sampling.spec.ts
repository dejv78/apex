import { convexHull, polygonArea } from '../gamut/convex-hull';
import { srgbSurfaceSamples } from '../gamut/srgb-gamut';
import { oklabToOklch } from '../color/color';
import { PIGMENTS, pigmentById } from '../pigments/pigments';
import { MixboxModel } from './mixbox-model';
import {
  abDistance,
  evenlySpacedMixCurve,
  linearOklabCurve,
  mixCurve,
  samplePairMixtures,
} from './sampling';

const model = new MixboxModel();
const yellow = pigmentById('lemon-yellow');
const blue = pigmentById('phthalo-blue-redish');
const area = (labs: { a: number; b: number }[]) =>
  polygonArea(convexHull(labs.map((c) => ({ x: c.a, y: c.b }))));

describe('mixing curves', () => {
  it('starts at pure A and ends at pure B, with steps + 1 points', () => {
    const curve = mixCurve(model, yellow, blue, 10);
    expect(curve.length).toBe(11);
    expect(curve[0].color.l).toBeCloseTo(model.mix([{ pigment: yellow, weight: 1 }]).l, 9);
    expect(curve[10].color.l).toBeCloseTo(model.mix([{ pigment: blue, weight: 1 }]).l, 9);
  });

  it('bows out to higher chroma than the straight OKLab line for yellow + blue', () => {
    const real = mixCurve(model, yellow, blue, 10)[5].color;
    const linear = linearOklabCurve(yellow, blue, 10)[5].color;
    expect(oklabToOklch(real).c).toBeGreaterThan(oklabToOklch(linear).c);
  });
});

describe('gamut comparison', () => {
  it('mixtures extend beyond the hull of the pigments as the model reproduces them', () => {
    // Baseline is the model's own output for each pure pigment: Mixbox clamps out-of-sRGB
    // pigments, so the raw masstone hull is not reachable by it (see docs/domain/gamut.md).
    const asSeen = area(PIGMENTS.map((p) => model.mix([{ pigment: p, weight: 1 }])));
    const mixtures = area(samplePairMixtures(model, PIGMENTS, 4));
    expect(mixtures).toBeGreaterThan(asSeen);
  });

  it('has an sRGB a/b outline whose maximum chroma is about 0.32', () => {
    const maxC = Math.max(...srgbSurfaceSamples(8).map((c) => oklabToOklch(c).c));
    expect(maxC).toBeGreaterThan(0.3);
    expect(maxC).toBeLessThan(0.34);
  });
});

describe('mixing performance', () => {
  it('samples all pigment pairs at 8 ratio steps well within a second', () => {
    const start = performance.now();
    const samples = samplePairMixtures(model, PIGMENTS, 8);
    const ms = performance.now() - start;
    expect(samples.length).toBeGreaterThan(30000);
    // Generous bound: a regression guard, not a benchmark (see docs/domain/performance.md).
    expect(ms).toBeLessThan(1000);
  });
});

describe('evenlySpacedMixCurve', () => {
  const SPACING = 0.006;
  const far = () => evenlySpacedMixCurve(model, yellow, pigmentById('ultramarine-deep'), SPACING);
  const near = () =>
    evenlySpacedMixCurve(
      model,
      pigmentById('irgazin-yellow'),
      pigmentById('nickel-azo-yellow'),
      SPACING,
    );

  it('gives close pigments fewer points than distant ones', () => {
    expect(near().length).toBeLessThan(far().length);
    expect(far().length).toBeGreaterThan(30);
  });

  it('starts and ends exactly at the pure pigments and has increasing ratios', () => {
    const curve = far();
    expect(curve[0].t).toBe(0);
    expect(curve[curve.length - 1].t).toBe(1);
    for (let i = 1; i < curve.length; i++) expect(curve[i].t).toBeGreaterThan(curve[i - 1].t);
  });

  it('spaces consecutive points evenly along the path, close to the requested spacing', () => {
    const curve = far();
    // Chords are slightly shorter than the arcs on bends, hence the tolerances.
    const gaps = curve.slice(1).map((p, i) => abDistance(curve[i].color, p.color));
    for (const g of gaps) {
      expect(g).toBeGreaterThan(SPACING * 0.6);
      expect(g).toBeLessThan(SPACING * 1.15);
    }
    const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(mean * 0.5);
  });

  it('number of intervals follows the path length divided by the spacing', () => {
    const probe = mixCurve(model, yellow, pigmentById('ultramarine-deep'), 2000);
    let length = 0;
    for (let i = 1; i < probe.length; i++) length += abDistance(probe[i - 1].color, probe[i].color);
    expect(far().length - 1).toBe(Math.round(length / SPACING));
  });

  it('returns just both ends for identical pigments and rejects a bad spacing', () => {
    expect(evenlySpacedMixCurve(model, yellow, yellow, SPACING).length).toBe(2);
    expect(() => evenlySpacedMixCurve(model, yellow, blue, 0)).toThrow();
  });
});
