# Mixing models

`core/mixing/mixing-model.ts` defines `MixingModel.mix(parts)`: pigment + weight in, OKLab out.

## Mixbox (implemented, `MixboxModel`)

- Library: `mixbox` 2.0, CC BY-NC 4.0 (non-commercial only; ADR 0006).
- Mixes weighted latent vectors (7 components) fitted to four real pigments; the pigment's
  display color is the only input. It knows nothing about the actual pigment chemistry.
- Input colors are clamped to sRGB first, so out-of-gamut pigments (saturated cyans and greens) are
  mixed from their clipped display color.
- Speed: ~1.5M mixes/s (`docs/domain/performance.md`); latents are cached per pigment.
- Cost: ~156 kB of the bundle (embedded lookup table); initial bundle budget is therefore 900 kB.
- Domain-fact test: blue + yellow gives a green hue, and more chroma than a linear OKLab mix.

## Anchoring (`AnchoredModel`, default in the explorer)

Wraps a model so pure pigments come out at their true OKLab colors (ADR 0008). Needed for Mixbox
because it clamps to sRGB; not needed for a spectral model.

## Transition sampling (`evenlySpacedMixCurve`)

The explorer draws a two-pigment transition as dots that are equally spaced along the mixing path
on the a/b plane (6 SVG units, about 0.006 OKLab), so the number of dots follows the path length:
5 mixes for PY129 to PY150 (close), 77 for PY3 to PB29 (far).

- Spacing is measured on the a/b plane only; lightness changes are ignored.
- The path is measured on a 256-step probe; each dot's ratio is then solved on that path and mixed
  exactly. Ends are always the pure pigments. The achieved spacing is length / a whole number of
  intervals, so it only approximates the requested spacing.
- Cost is negligible (about 260 mixes per transition at about 1.5M mixes/s).

## Kubelka-Munk (planned, M3)

Needs per-pigment spectral data (reflectance or K/S coefficients) that the project does not have
yet. Finding a reliable source is an open question in `docs/roadmap.md`.
