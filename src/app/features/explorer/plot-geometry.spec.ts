import { oklabToOklch, hexToOklab } from '../../../core/color/color';
import {
  EXTENT,
  SCALE,
  SIZE,
  aTicks,
  axisColors,
  bTicks,
  hueMarks,
  rings,
  toSvg,
} from './plot-geometry';

describe('plot geometry', () => {
  it('puts the origin at the center and +a to the right, +b upwards', () => {
    expect(toSvg(0, 0)).toEqual({ x: SIZE / 2, y: SIZE / 2 });
    expect(toSvg(0.1, 0).x).toBeGreaterThan(SIZE / 2);
    expect(toSvg(0, 0.1).y).toBeLessThan(SIZE / 2);
    expect(toSvg(EXTENT, 0).x).toBeCloseTo(SIZE, 6);
  });

  it('places hue marks like OKLCH hues: 0° right, 90° top, 180° left, 270° bottom', () => {
    const at = (deg: number) => hueMarks.find((m) => m.deg === deg)!;
    expect(at(0).x).toBeCloseTo(SIZE, 6);
    expect(at(90).y).toBeCloseTo(0, 6);
    expect(at(180).x).toBeCloseTo(0, 6);
    expect(at(270).y).toBeCloseTo(SIZE, 6);
    expect(hueMarks.length).toBe(12);
    // Labels sit outside the circle.
    expect(at(90).labelY).toBeLessThan(0);
    expect(at(0).labelX).toBeGreaterThan(SIZE);
  });

  it('has ticks and rings consistent with the scale', () => {
    expect(aTicks.find((t) => t.value === 0)!.x).toBe(SIZE / 2);
    expect(bTicks.find((t) => t.value === 0.1)!.y).toBeCloseTo(SIZE / 2 - 0.1 * SCALE, 9);
    expect(rings.map((r) => r.c)).toEqual([0.1, 0.2, 0.3]);
    expect(rings[2].r).toBeCloseTo(SIZE / 2, 9);
  });

  it('colors the axis ends by their hue: +a pink/magenta, -a green, +b yellow, -b blue', () => {
    const hue = (hex: string) => oklabToOklch(hexToOklab(hex)).h;
    expect(hue(axisColors.aPlus)).toBeCloseTo(0, 0);
    expect(hue(axisColors.bPlus)).toBeCloseTo(90, 0);
    expect(hue(axisColors.aMinus)).toBeCloseTo(180, 0);
    expect(hue(axisColors.bMinus)).toBeCloseTo(270, 0);
  });
});
