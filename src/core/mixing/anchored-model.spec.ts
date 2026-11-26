import { PIGMENTS, pigmentById } from '../pigments/pigments';
import { AnchoredModel } from './anchored-model';
import { MixboxModel } from './mixbox-model';
import { mixCurve } from './sampling';

const raw = new MixboxModel();
const model = new AnchoredModel(raw);
const dist = (x: { l: number; a: number; b: number }, y: { l: number; a: number; b: number }) =>
  Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b);

describe('AnchoredModel', () => {
  it('reproduces every pure pigment at its true OKLab coordinates', () => {
    for (const p of PIGMENTS) {
      expect(dist(model.mix([{ pigment: p, weight: 3 }]), p.oklab)).toBeLessThan(1e-9);
    }
  });

  it('starts and ends transitions exactly at the pigments', () => {
    const a = pigmentById('lemon-yellow');
    const b = pigmentById('cobalt-teal');
    const curve = mixCurve(model, a, b, 20);
    expect(dist(curve[0].color, a.oklab)).toBeLessThan(1e-9);
    expect(dist(curve[20].color, b.oklab)).toBeLessThan(1e-9);
  });

  it('moves a mid mixture by the weighted average of the two pigments’ offsets', () => {
    const a = pigmentById('lemon-yellow');
    const b = pigmentById('cobalt-teal');
    const parts = [
      { pigment: a, weight: 1 },
      { pigment: b, weight: 1 },
    ];
    const r = raw.mix(parts);
    const m = model.mix(parts);
    const oa = model.offsetOf(a);
    const ob = model.offsetOf(b);
    expect(m.a - r.a).toBeCloseTo((oa.a + ob.a) / 2, 9);
    expect(m.b - r.b).toBeCloseTo((oa.b + ob.b) / 2, 9);
  });

  it('is symmetric and keeps the id and label of the base model visible', () => {
    const a = pigmentById('lemon-yellow');
    const b = pigmentById('ultramarine-deep');
    const x = model.mix([
      { pigment: a, weight: 1 },
      { pigment: b, weight: 3 },
    ]);
    const y = model.mix([
      { pigment: b, weight: 3 },
      { pigment: a, weight: 1 },
    ]);
    expect(dist(x, y)).toBeLessThan(1e-12);
    expect(model.id).toBe('mixbox-anchored');
    expect(model.label).toBe('Mixbox'); // users see the base model's name, not the correction
  });

  it('barely changes pigments that Mixbox already reproduces (inside sRGB)', () => {
    const p = pigmentById('ultramarine-deep');
    expect(Math.hypot(model.offsetOf(p).a, model.offsetOf(p).b)).toBeLessThan(0.03);
  });
});
