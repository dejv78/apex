import { intersectTriangleSets } from './triangle-intersection';

/** A unit cube [x, x + s] ... as 12 triangles. */
function cube(x: number, y: number, z: number, s = 1): number[] {
  const c = (i: number, j: number, k: number) => [x + i * s, y + j * s, z + k * s];
  const quad = (a: number[], b: number[], cc: number[], d: number[]) => [
    ...a,
    ...b,
    ...cc,
    ...a,
    ...cc,
    ...d,
  ];
  return [
    ...quad(c(0, 0, 0), c(1, 0, 0), c(1, 1, 0), c(0, 1, 0)),
    ...quad(c(0, 0, 1), c(1, 0, 1), c(1, 1, 1), c(0, 1, 1)),
    ...quad(c(0, 0, 0), c(1, 0, 0), c(1, 0, 1), c(0, 0, 1)),
    ...quad(c(0, 1, 0), c(1, 1, 0), c(1, 1, 1), c(0, 1, 1)),
    ...quad(c(0, 0, 0), c(0, 1, 0), c(0, 1, 1), c(0, 0, 1)),
    ...quad(c(1, 0, 0), c(1, 1, 0), c(1, 1, 1), c(1, 0, 1)),
  ];
}

const segmentLength = (s: number[], i: number) =>
  Math.hypot(s[i + 3] - s[i], s[i + 4] - s[i + 1], s[i + 5] - s[i + 2]);

describe('intersectTriangleSets', () => {
  it('finds the segment where a vertical triangle cuts a flat one', () => {
    const flat = [-1, -1, 0, 3, -1, 0, -1, 3, 0]; // z = 0, covers x + y <= 2
    const upright = [0, 0.5, -1, 0, 0.5, 1, 2, 0.5, 0]; // y = 0.5
    const segments = intersectTriangleSets(flat, upright);
    expect(segments.length).toBe(6);
    const [x1, y1, z1, x2, y2, z2] = segments;
    expect([y1, z1, y2, z2]).toEqual([0.5, 0, 0.5, 0]);
    expect(Math.min(x1, x2)).toBeCloseTo(0, 9);
    expect(Math.max(x1, x2)).toBeCloseTo(1.5, 9);
  });

  it('is symmetric: the same curve in either argument order, up to segment direction', () => {
    const flat = [-1, -1, 0, 3, -1, 0, -1, 3, 0];
    const upright = [0, 0.5, -1, 0, 0.5, 1, 2, 0.5, 0];
    const ab = intersectTriangleSets(flat, upright);
    const ba = intersectTriangleSets(upright, flat);
    expect(segmentLength(ab, 0)).toBeCloseTo(segmentLength(ba, 0), 9);
  });

  it('returns nothing for triangles that do not touch, are parallel, or are coplanar', () => {
    const a = [0, 0, 0, 1, 0, 0, 0, 1, 0];
    expect(intersectTriangleSets(a, [5, 5, 5, 6, 5, 5, 5, 6, 5])).toEqual([]);
    expect(intersectTriangleSets(a, [0, 0, 1, 1, 0, 1, 0, 1, 1])).toEqual([]);
    expect(intersectTriangleSets(a, [0.2, 0.2, 0, 0.5, 0.2, 0, 0.2, 0.5, 0])).toEqual([]);
    expect(intersectTriangleSets([], a)).toEqual([]);
  });

  it('does not report a crossing when the plane cut misses the other triangle', () => {
    const flat = [0, 0, 0, 1, 0, 0, 0, 1, 0];
    // Crosses the plane z = 0 far away from the flat triangle.
    const far = [10, 10, -1, 10, 10, 1, 12, 10, 0];
    expect(intersectTriangleSets(flat, far)).toEqual([]);
  });

  it('traces the closed loop where two overlapping cubes cross, and every point lies on both surfaces', () => {
    const a = cube(0, 0, 0);
    const b = cube(0.5, 0.5, 0.5);
    const segments = intersectTriangleSets(a, b);
    expect(segments.length / 6).toBeGreaterThanOrEqual(6);

    // A closed loop: each endpoint is shared by exactly two segments.
    const key = (p: number[]) => p.map((v) => v.toFixed(6)).join(',');
    const uses = new Map<string, number>();
    for (let i = 0; i < segments.length; i += 6) {
      for (const p of [segments.slice(i, i + 3), segments.slice(i + 3, i + 6)]) {
        uses.set(key(p), (uses.get(key(p)) ?? 0) + 1);
      }
    }
    expect([...uses.values()].every((count) => count === 2)).toBe(true);

    const eps = 1e-9;
    const onSurface = (p: number[], lo: number, hi: number) => {
      const inside = p.every((v) => v >= lo - eps && v <= hi + eps);
      const onFace = p.some((v) => Math.abs(v - lo) < eps || Math.abs(v - hi) < eps);
      return inside && onFace;
    };
    for (let i = 0; i < segments.length; i += 6) {
      for (const p of [segments.slice(i, i + 3), segments.slice(i + 3, i + 6)]) {
        expect(onSurface(p, 0, 1)).toBe(true);
        expect(onSurface(p, 0.5, 1.5)).toBe(true);
      }
    }
  });

  it('finds no crossing between disjoint cubes and one between touching-through cubes', () => {
    expect(intersectTriangleSets(cube(0, 0, 0), cube(3, 3, 3))).toEqual([]);
    expect(intersectTriangleSets(cube(0, 0, 0), cube(0.9, 0, 0)).length).toBeGreaterThan(0);
  });
});
