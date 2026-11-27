# Performance measurements

Measured 2026-11-26 with `MixboxModel` (latent vectors cached per pigment).

| Workload                                                                 | Colors mixed | Time    | Environment      |
| ------------------------------------------------------------------------ | ------------ | ------- | ---------------- |
| All 97 pigments, all pairs, 8 ratio steps (`samplePairMixtures`)         | 32,689       | 18.6 ms | Node/V8 (Vitest) |
| 54 visible pigments, all pairs, 8 ratio steps (explorer "Mixture gamut") | 12,036       | 8 ms    | Firefox headless |

That is about 1.5 million two-pigment mixes per second on one CPU thread. A 20-step ratio curve
or a mixer slider drag is negligible.

Without the per-pigment latent cache, every mix would also run the pigment-to-latent conversion
(a lookup-table interpolation) twice; the cache keeps that off the hot path.

`sampling.spec.ts` keeps a loose regression guard (all pairs under 1 s), not a benchmark.

## 3D view (2026-11-26, Node/V8)

- Convex hull of the 12,036 mixture samples (`ConvexGeometry`): 12 ms, 516 triangles.
- Crossing of that hull with the 3,072-triangle sRGB mesh (`intersectTriangleSets`): 13 ms, 273
  segments. Both run only when the hull or the sRGB solid changes.

## Multi-pigment trails (2026-11-27, Node/V8, ADR 0012)

Cost of `ExplorerState.pairs` (all-pairs trails, cold cache) for the first N visible pigments.
Dots are interior trail points: in 2D each is an SVG `<circle>` with a `<title>`, in 3D one
instance of a single `InstancedMesh`.

| N   | pairs | dots 2D | ms 2D | dots 3D | ms 3D |
| --- | ----- | ------- | ----- | ------- | ----- |
| 5   | 10    | 197     | 5     | 514     | 1     |
| 10  | 45    | 719     | 9     | 1,568   | 5     |
| 20  | 190   | 3,874   | 26    | 7,683   | 20    |
| 40  | 780   | 21,351  | 82    | 35,607  | 80    |

Computing the trails is cheap; the limit is rendering (DOM nodes in 2D).

Headless Firefox 1400x900 (WebDriver BiDi, synthetic shift+clicks, 60 Hz), first N visible
pigments selected, production build:

| N   | 2D dots | DOM nodes | 2D: add one pigment | 2D idle frames (avg / max) | switch to 3D | 3D idle frames |
| --- | ------- | --------- | ------------------- | -------------------------- | ------------ | -------------- |
| 5   | 306     | 1,149     | 24 ms               | 16.7 / 18 ms               | 88 ms        | 16.6 / 18 ms   |
| 10  | 1,104   | 2,855     | 26 ms               | 16.7 / 18 ms               | 87 ms        | 16.6 / 18 ms   |
| 20  | 4,403   | 9,673     | 74 ms               | 16.6 / 18 ms               | 136 ms       | 16.6 / 18 ms   |
| 40  | 21,351  | 44,009    | 217 ms              | 17.5 / 73 ms               | 266 ms       | 16.7 / 18 ms   |
| 59  | 53,691  | 109,107   | n/a (all selected)  | 18.1 / 130 ms              | 499 ms       | 16.7 / 18 ms   |

Selecting all 59 default-visible pigments at once took 1.0 s. Idle frames stay at 60 Hz even with
109k DOM nodes, so the cost is the update when the selection changes (about 0.2 s at 40, one
second at 59) and the occasional long frame, not steady-state drawing. Not measured: hover,
dragging in 2D with many nodes, and rotating the 3D view (idle frames only). The 3D dots are one
instanced mesh, so 3D should scale better than 2D.

Because of the 40-pigment cost (780 connections), ADR 0012 caps the trails at 200 connections
(20 pigments mixed with each other), with a wide margin for weaker hardware than this test machine.

## Implications

- The slowness of other web mixers is not inherent to Mixbox-style mixing. ADR 0007: no WebGL.
- Revisit when workloads grow by 100x or more: three-pigment mixtures of all pigments (about 150k
  triples x ratios, ~10^7 mixes, a few seconds), a 3D (L, a, b) gamut, per-pixel image work, or
  Kubelka-Munk over many wavelengths. Measure first, then decide (new ADR).
