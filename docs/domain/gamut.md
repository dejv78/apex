# Gamut

## Pigment hull vs. mixture gamut

The explorer draws the convex hull of the pigments' masstone points in the OKLab a/b plane
(`core/gamut/convex-hull.ts`). This is a **visual aid and a lower bound only**, not the real
gamut of what can be mixed:

- Linear mixing in OKLab can never leave the hull, but real (subtractive) mixing can. Observed with
  Mixbox: lemon yellow + phthalo blue (reddish) gives a green (OKLCH C 0.176, h 143) outside the hull
  of the visible pigments' masstones.
- The hull is computed over the a/b plane only; lightness is ignored. A proper pigment gamut is a
  3D (L, a, b) solid, and mixtures with white/black/tints change L and C together.
- Display clipping: colors outside sRGB (`isInSrgbGamut`) are clamped for display (`oklabToHex`),
  so a swatch can differ from the true OKLab value.

Open work: sample the mixture space through a `MixingModel` to compute an honest mixture gamut.

## Measured comparison (a/b plane, 54 visible pigments, 2026-11-26)

Hull areas: pigment masstones 0.1118, Mixbox two-pigment mixtures 0.1086, sRGB 0.1749.

- The mixture hull is **not** simply bigger than the masstone hull. It bulges where subtractive
  mixing produces greens beyond the masstone hull (blue + yellow), but Mixbox clamps saturated
  out-of-sRGB pigments (cyans, greens) before mixing and cannot reproduce them, so the net area is
  slightly smaller. Compared against the model's own output for the pure pigments, mixtures
  strictly extend the hull (tested in `sampling.spec.ts`).
- Even with clamping, nothing exceeds the sRGB gamut (0.1749): Mixbox works in sRGB, so it cannot
  model pigments more saturated than the display, which is a real limit for the gamut-exploration
  goal. Kubelka-Munk (M3) is not bound by it, only the display conversion is.
- The sRGB outline is the a/b hull of dense samples of the cube surface (`core/gamut/srgb-gamut.ts`),
  because the sRGB gamut is not convex in OKLab; the drawn polygon is therefore an approximation.
