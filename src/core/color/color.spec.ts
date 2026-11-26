import {
  hexToOklab,
  isInSrgbGamut,
  oklabToHex,
  oklabToOklch,
  oklabToSrgb,
  oklchToOklab,
  srgbToOklab,
} from './color';

describe('color', () => {
  it('maps sRGB white to OKLab (1, 0, 0) and black to (0, 0, 0)', () => {
    const white = srgbToOklab({ r: 1, g: 1, b: 1 });
    expect(white.l).toBeCloseTo(1, 4);
    expect(white.a).toBeCloseTo(0, 4);
    expect(white.b).toBeCloseTo(0, 4);
    expect(srgbToOklab({ r: 0, g: 0, b: 0 }).l).toBeCloseTo(0, 6);
  });

  it('round-trips sRGB through OKLab losslessly', () => {
    for (const rgb of [
      { r: 0.2, g: 0.5, b: 0.8 },
      { r: 1, g: 0, b: 0 },
      { r: 0.9, g: 0.85, b: 0.1 },
    ]) {
      const back = oklabToSrgb(srgbToOklab(rgb));
      expect(back.r).toBeCloseTo(rgb.r, 6);
      expect(back.g).toBeCloseTo(rgb.g, 6);
      expect(back.b).toBeCloseTo(rgb.b, 6);
    }
  });

  it('round-trips OKLab through OKLCH, with hue in [0, 360)', () => {
    const lab = { l: 0.6, a: -0.1, b: -0.05 };
    const lch = oklabToOklch(lab);
    expect(lch.h).toBeGreaterThanOrEqual(0);
    expect(lch.h).toBeLessThan(360);
    const back = oklchToOklab(lch);
    expect(back.a).toBeCloseTo(lab.a, 9);
    expect(back.b).toBeCloseTo(lab.b, 9);
  });

  it('places primary hues where expected on the OKLab hue wheel', () => {
    // Known OKLCH hues of sRGB primaries: red ~29, yellow ~110, green ~142, blue ~264.
    const hue = (hex: string) => oklabToOklch(hexToOklab(hex)).h;
    expect(hue('#ff0000')).toBeCloseTo(29.2, 0);
    expect(hue('#ffff00')).toBeCloseTo(109.8, 0);
    expect(hue('#00ff00')).toBeCloseTo(142.5, 0);
    expect(hue('#0000ff')).toBeCloseTo(264.1, 0);
  });

  it('detects colors outside the sRGB gamut', () => {
    expect(isInSrgbGamut(hexToOklab('#336699'))).toBe(true);
    expect(isInSrgbGamut({ l: 0.5, a: 0.3, b: 0.3 })).toBe(false);
  });

  it('formats hex and clamps out-of-gamut values', () => {
    expect(oklabToHex(hexToOklab('#336699'))).toBe('#336699');
    expect(oklabToHex({ l: 0.5, a: 0.3, b: 0.3 })).toMatch(/^#[0-9a-f]{6}$/);
  });
});
