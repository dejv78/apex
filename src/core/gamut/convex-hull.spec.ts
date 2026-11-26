import { convexHull, polygonArea } from './convex-hull';

describe('convexHull', () => {
  it('returns the corners of a square and drops interior and collinear points', () => {
    const hull = convexHull([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ]);
    expect(hull.length).toBe(4);
    expect(polygonArea(hull)).toBeCloseTo(4, 9);
  });

  it('handles degenerate inputs', () => {
    expect(convexHull([])).toEqual([]);
    expect(convexHull([{ x: 1, y: 1 }])).toEqual([{ x: 1, y: 1 }]);
  });

  it('computes polygon area of a right triangle', () => {
    expect(
      polygonArea([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 3 },
      ]),
    ).toBe(6);
  });
});
