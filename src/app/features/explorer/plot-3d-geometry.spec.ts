import {
  CHROMA_RINGS,
  CYLINDER_HEIGHT,
  CYLINDER_RADIUS,
  HUE_ANGLES,
  SCENE_SCALE,
  VIEW_PRESETS,
  circleAt,
  hueLine,
  toScene,
} from './plot-3d-geometry';

describe('3D cylinder geometry', () => {
  it('maps lightness to height, centered at mid lightness', () => {
    expect(toScene({ l: 0.5, a: 0, b: 0 })).toEqual([0, 0, -0]);
    expect(toScene({ l: 1, a: 0, b: 0 })[1]).toBe(CYLINDER_HEIGHT / 2);
    expect(toScene({ l: 0, a: 0, b: 0 })[1]).toBe(-CYLINDER_HEIGHT / 2);
  });

  it('maps +a to +x and +b to -z, so a top view matches the 2D plot', () => {
    expect(toScene({ l: 0.5, a: 0.1, b: 0 })[0]).toBeGreaterThan(0);
    expect(toScene({ l: 0.5, a: 0, b: 0.1 })[2]).toBeLessThan(0);
    expect(toScene({ l: 0.5, a: 0.3, b: 0 })[0]).toBeCloseTo(CYLINDER_RADIUS, 9);
  });

  it('keeps distances equal on all axes (same scale for lightness and a/b)', () => {
    const o = toScene({ l: 0.5, a: 0, b: 0 });
    const dist = (p: number[]) => Math.hypot(p[0] - o[0], p[1] - o[1], p[2] - o[2]);
    expect(dist(toScene({ l: 0.6, a: 0, b: 0 }))).toBeCloseTo(0.1 * SCENE_SCALE, 9);
    expect(dist(toScene({ l: 0.5, a: 0.1, b: 0 }))).toBeCloseTo(0.1 * SCENE_SCALE, 9);
    expect(dist(toScene({ l: 0.5, a: 0, b: 0.1 }))).toBeCloseTo(0.1 * SCENE_SCALE, 9);
  });

  it('draws closed horizontal circles at a fixed height and radius', () => {
    const ring = circleAt(0.2, 0.25, 32);
    expect(ring.length).toBe(33);
    expect(ring[0][0]).toBeCloseTo(ring[32][0], 9);
    for (const p of ring) {
      expect(p[1]).toBeCloseTo((0.25 - 0.5) * SCENE_SCALE, 9);
      expect(Math.hypot(p[0], p[2])).toBeCloseTo(0.2 * SCENE_SCALE, 9);
    }
    expect(CHROMA_RINGS).toEqual([0.1, 0.2, 0.3]);
  });

  it('has hue lines every 30 degrees with 0° on +x and 90° towards -z (+b)', () => {
    expect(HUE_ANGLES.length).toBe(12);
    const h0 = hueLine(0);
    expect(h0.bottom[0]).toBeCloseTo(CYLINDER_RADIUS, 9);
    expect(h0.top[1]).toBeGreaterThan(h0.bottom[1]);
    expect(hueLine(90).top[2]).toBeLessThan(0);
    expect(Math.hypot(h0.label[0], h0.label[2])).toBeGreaterThan(CYLINDER_RADIUS);
  });

  it('defines the four camera presets, with the top view looking along -y', () => {
    expect(Object.keys(VIEW_PRESETS).sort()).toEqual(['front', 'reset', 'side', 'top']);
    expect(VIEW_PRESETS.top[1]).toBe(1);
  });
});
