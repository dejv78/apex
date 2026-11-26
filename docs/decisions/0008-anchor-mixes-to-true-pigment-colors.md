# 0008: Anchor mixes to true pigment colors

Status: Accepted (2026-11-26)

## Context

Mixbox works inside sRGB. Saturated pigments outside sRGB (cyans, greens, some yellows) were
clamped before mixing, so a transition started and ended away from the pigment's true OKLab
position. For painting, where sRGB is irrelevant, this visual disconnection was misleading, and
it made the mixture gamut look smaller than the pigments' own hull.

## Decision

`AnchoredModel` (`core/mixing/anchored-model.ts`) wraps any `MixingModel`. For each pigment it
measures the offset between the true OKLab color and the model's output for the pure pigment, and
adds the weight-averaged offsets to every mixture. The explorer uses it by default, with a toggle
to see the raw model.

## Consequences

- Pure pigments are reproduced exactly; corrections fade in linearly along a transition.
- Measured: 13 of 97 pigments have an offset above 0.02 (largest 0.067, manganese blue); the median
  is zero. The mixture hull (a/b, all pairs) is now larger than the pigment hull: 0.1283 vs 0.1118
  (visible pigments), where raw Mixbox gave 0.1086.
- It is a heuristic, not a physical prediction. Near a pigment outside the model's gamut the result
  is an extrapolation of Mixbox, so shapes there should be read as plausible, not measured. A
  Kubelka-Munk model (deferred, `docs/domain/spectral-data.md`) would not need this correction.
