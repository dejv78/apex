import { oklabToOklch } from '../color/color';
import { pigmentById } from '../pigments/pigments';
import { MixboxModel } from './mixbox-model';

const model = new MixboxModel();
const mixOf = (a: string, b: string, wa = 1, wb = 1) =>
  model.mix([
    { pigment: pigmentById(a), weight: wa },
    { pigment: pigmentById(b), weight: wb },
  ]);

describe('MixboxModel', () => {
  it('returns the pigment itself for a single part, regardless of weight', () => {
    const p = pigmentById('ultramarine-deep');
    const lab = model.mix([{ pigment: p, weight: 7 }]);
    const expected = model.mix([{ pigment: p, weight: 1 }]);
    expect(lab.l).toBeCloseTo(expected.l, 9);
    expect(lab.l).toBeCloseTo(p.oklab.l, 1);
  });

  it('mixes blue and yellow to green (subtractive), where linear OKLab mixing gives gray', () => {
    const blue = pigmentById('phthalo-blue-reddish');
    const yellow = pigmentById('lemon-yellow');
    const mixed = oklabToOklch(mixOf(blue.id, yellow.id));
    expect(mixed.h).toBeGreaterThan(120);
    expect(mixed.h).toBeLessThan(180);
    expect(mixed.c).toBeGreaterThan(0.05);

    const linear = oklabToOklch({
      l: (blue.oklab.l + yellow.oklab.l) / 2,
      a: (blue.oklab.a + yellow.oklab.a) / 2,
      b: (blue.oklab.b + yellow.oklab.b) / 2,
    });
    expect(linear.c).toBeLessThan(mixed.c);
  });

  it('is symmetric: swapping parts with their weights gives the same color', () => {
    const x = mixOf('lemon-yellow', 'ultramarine-deep', 1, 3);
    const y = mixOf('ultramarine-deep', 'lemon-yellow', 3, 1);
    expect(x.l).toBeCloseTo(y.l, 9);
    expect(x.a).toBeCloseTo(y.a, 9);
  });

  it('ignores zero weights and rejects an empty mixture', () => {
    const p = pigmentById('lemon-yellow');
    expect(() => model.mix([{ pigment: p, weight: 0 }])).toThrow();
  });
});
