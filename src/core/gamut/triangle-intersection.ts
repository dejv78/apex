/**
 * Where two triangle meshes cross: the curve in which their surfaces intersect, as line segments.
 * Used to show where the mixture hull leaves the sRGB gamut. Pure geometry, no dependencies.
 */

/** Triangle soup: three vertices per triangle, three numbers per vertex (x, y, z). */
export type Triangles = ArrayLike<number>;

type Vec = [number, number, number];

/** Distance below which a vertex counts as lying on the other triangle's plane. */
const PLANE_EPSILON = 1e-9;
/** Segments shorter than this (as a fraction of the full intersection segment) are dropped. */
const MIN_FRACTION = 1e-9;

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec, b: Vec): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const lerp = (a: Vec, b: Vec, t: number): Vec => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

function readTriangle(t: Triangles, offset: number): [Vec, Vec, Vec] {
  const v = (i: number): Vec => [t[offset + i], t[offset + i + 1], t[offset + i + 2]];
  return [v(0), v(3), v(6)];
}

/** Axis-aligned bounds per triangle: minX, minY, minZ, maxX, maxY, maxZ. */
function bounds(t: Triangles): Float64Array {
  const n = t.length / 9;
  const out = new Float64Array(n * 6);
  for (let i = 0; i < n; i++) {
    for (let axis = 0; axis < 3; axis++) {
      const a = t[i * 9 + axis];
      const b = t[i * 9 + 3 + axis];
      const c = t[i * 9 + 6 + axis];
      out[i * 6 + axis] = Math.min(a, b, c);
      out[i * 6 + 3 + axis] = Math.max(a, b, c);
    }
  }
  return out;
}

/**
 * The part of triangle `p` that lies on the plane of triangle `q` (the plane's cut through `p`),
 * as two end points; `null` if `p` does not cross the plane.
 */
function planeCut(p: [Vec, Vec, Vec], d: number[]): [Vec, Vec] | null {
  const points: Vec[] = [];
  for (let i = 0; i < 3; i++) if (Math.abs(d[i]) <= PLANE_EPSILON) points.push(p[i]);
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3;
    if (
      (d[i] > PLANE_EPSILON && d[j] < -PLANE_EPSILON) ||
      (d[i] < -PLANE_EPSILON && d[j] > PLANE_EPSILON)
    ) {
      points.push(lerp(p[i], p[j], d[i] / (d[i] - d[j])));
    }
  }
  return points.length === 2 ? [points[0], points[1]] : null;
}

/** Appends the segment where triangles `p` and `q` intersect, if they do, to `out`. */
function intersectPair(p: [Vec, Vec, Vec], q: [Vec, Vec, Vec], out: number[]): void {
  const raw = cross(sub(q[1], q[0]), sub(q[2], q[0]));
  const length = Math.hypot(raw[0], raw[1], raw[2]);
  if (length === 0) return; // degenerate triangle
  const n: Vec = [raw[0] / length, raw[1] / length, raw[2] / length];

  const d = p.map((v) => dot(n, sub(v, q[0])));
  if (d.every((x) => x > PLANE_EPSILON) || d.every((x) => x < -PLANE_EPSILON)) return;
  if (d.every((x) => Math.abs(x) <= PLANE_EPSILON)) return; // coplanar: no curve to draw

  const cut = planeCut(p, d);
  if (!cut) return;

  // Clip the cut to triangle q with its three edge half-planes (in q's plane).
  const centroid: Vec = [
    (q[0][0] + q[1][0] + q[2][0]) / 3,
    (q[0][1] + q[1][1] + q[2][1]) / 3,
    (q[0][2] + q[1][2] + q[2][2]) / 3,
  ];
  let t0 = 0;
  let t1 = 1;
  for (let k = 0; k < 3; k++) {
    const edge = sub(q[(k + 1) % 3], q[k]);
    let inward = cross(n, edge);
    if (dot(inward, sub(centroid, q[k])) < 0) inward = [-inward[0], -inward[1], -inward[2]];
    const f0 = dot(inward, sub(cut[0], q[k]));
    const f1 = dot(inward, sub(cut[1], q[k]));
    if (f0 < 0 && f1 < 0) return;
    if (f0 < 0) t0 = Math.max(t0, f0 / (f0 - f1));
    else if (f1 < 0) t1 = Math.min(t1, f0 / (f0 - f1));
  }
  if (t1 - t0 <= MIN_FRACTION) return;
  out.push(...lerp(cut[0], cut[1], t0), ...lerp(cut[0], cut[1], t1));
}

/**
 * All segments where a triangle of `a` crosses a triangle of `b`, as a flat list of 6 numbers per
 * segment (x1, y1, z1, x2, y2, z2). Coplanar overlaps are skipped. Brute force with a bounding-box
 * test per pair, which is plenty for a few thousand triangles per side.
 */
export function intersectTriangleSets(a: Triangles, b: Triangles): number[] {
  const boxesA = bounds(a);
  const boxesB = bounds(b);
  const out: number[] = [];
  for (let i = 0; i < a.length / 9; i++) {
    const ai = i * 6;
    let triangleA: [Vec, Vec, Vec] | null = null;
    for (let j = 0; j < b.length / 9; j++) {
      const bj = j * 6;
      if (
        boxesA[ai] > boxesB[bj + 3] ||
        boxesA[ai + 3] < boxesB[bj] ||
        boxesA[ai + 1] > boxesB[bj + 4] ||
        boxesA[ai + 4] < boxesB[bj + 1] ||
        boxesA[ai + 2] > boxesB[bj + 5] ||
        boxesA[ai + 5] < boxesB[bj + 2]
      ) {
        continue;
      }
      triangleA ??= readTriangle(a, i * 9);
      intersectPair(triangleA, readTriangle(b, j * 9), out);
    }
  }
  return out;
}
