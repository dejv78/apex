export interface Point {
  x: number;
  y: number;
}

/**
 * Convex hull (Andrew's monotone chain), counter-clockwise in a y-up coordinate system.
 * Collinear points are dropped. Fewer than 3 distinct points are returned as-is.
 */
export function convexHull(points: readonly Point[]): Point[] {
  const pts = [...points].sort((p, q) => p.x - q.x || p.y - q.y);
  const unique = pts.filter((p, i) => i === 0 || p.x !== pts[i - 1].x || p.y !== pts[i - 1].y);
  if (unique.length < 3) return unique;

  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const build = (input: Point[]): Point[] => {
    const out: Point[] = [];
    for (const p of input) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...build(unique), ...build([...unique].reverse())];
}

export function polygonArea(poly: readonly Point[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    sum += p.x * q.y - q.x * p.y;
  }
  return Math.abs(sum) / 2;
}
