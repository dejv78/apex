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

## Implications

- The slowness of other web mixers is not inherent to Mixbox-style mixing. ADR 0007: no WebGL.
- Revisit when workloads grow by 100x or more: three-pigment mixtures of all pigments (about 150k
  triples x ratios, ~10^7 mixes, a few seconds), a 3D (L, a, b) gamut, per-pixel image work, or
  Kubelka-Munk over many wavelengths. Measure first, then decide (new ADR).
