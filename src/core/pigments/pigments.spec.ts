import { hexToOklab, oklabToHex } from '../color/color';
import {
  PIGMENT_DATASET,
  PIGMENTS,
  pigmentById,
  validatePigmentDataset,
  type PigmentDataset,
} from './pigments';

describe('pigment dataset', () => {
  it('passes schema validation and has unique ids', () => {
    expect(PIGMENTS.length).toBeGreaterThan(90);
    expect(new Set(PIGMENTS.map((p) => p.id)).size).toBe(PIGMENTS.length);
  });

  it('records provenance', () => {
    expect(PIGMENT_DATASET.source.url).toContain('artistpigments.org');
    expect(PIGMENT_DATASET.source.license).toBe('CC BY-NC 4.0');
  });

  it('rejects duplicate ids', () => {
    const p = PIGMENTS[0];
    const bad: PigmentDataset = { ...PIGMENT_DATASET, pigments: [p, p] };
    expect(() => validatePigmentDataset(bad)).toThrow(/Duplicate/);
  });

  it('keeps Colour Index codes non-unique but ids unique (PBr7 is umber and sienna)', () => {
    const pbr7 = PIGMENTS.filter((p) => p.code === 'PBr7');
    expect(pbr7.length).toBeGreaterThan(1);
    expect(pigmentById('burnt-umber').code).toBe('PBr7');
  });

  it('has hex values consistent with the OKLab values', () => {
    // `hex` is a display value: saturated pigments outside sRGB are clipped, so compare against
    // the clamped OKLab color. A larger gap means a data-entry error (e.g. a hex copied from
    // another pigment).
    const outliers = PIGMENTS.filter((p) => {
      const h = hexToOklab(p.hex);
      const c = hexToOklab(oklabToHex(p.oklab));
      return Math.hypot(h.l - c.l, h.a - c.a, h.b - c.b) > 0.08;
    }).map((p) => p.id);
    expect(outliers).toEqual([]);
  });
});
