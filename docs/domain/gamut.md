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
