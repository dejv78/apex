import { convexHull, polygonArea } from '../gamut/convex-hull';
import { srgbSurfaceSamples } from '../gamut/srgb-gamut';
import { oklabToOklch } from '../color/color';
import { PIGMENTS, pigmentById } from '../pigments/pigments';
import { MixboxModel } from './mixbox-model';
import { linearOklabCurve, mixCurve, samplePairMixtures } from './sampling';

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
