# Mixing models

`core/mixing/mixing-model.ts` defines `MixingModel.mix(parts)`: pigment + weight in, OKLab out.

## Mixbox (implemented, `MixboxModel`)

- Library: `mixbox` 2.0, CC BY-NC 4.0 (non-commercial only; ADR 0006).
- Mixes weighted latent vectors (7 components) fitted to four real pigments; the pigment's
  display color is the only input. It knows nothing about the actual pigment chemistry.
- Input colors are clamped to sRGB first, so out-of-gamut pigments (saturated cyans and greens) are
  mixed from their clipped display color.
- Cost: ~156 kB of the bundle (embedded lookup table); initial bundle budget is therefore 900 kB.
- Domain-fact test: blue + yellow gives a green hue, and more chroma than a linear OKLab mix.

## Kubelka-Munk (planned, M3)

Needs per-pigment spectral data (reflectance or K/S coefficients) that the project does not have
yet. Finding a reliable source is an open question in `docs/roadmap.md`.
