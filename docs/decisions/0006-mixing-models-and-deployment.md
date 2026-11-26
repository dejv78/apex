# 0006: Mixing models and deployment

Status: Accepted (2026-11-26)

## Context

Goal is realistic pigment mixing. Kubelka-Munk (KM) needs spectral data per pigment, which is not
yet sourced. Mixbox approximates pigment mixing from colors alone. Mixbox is CC BY-NC; this
project is non-commercial and educational.

## Decision

- `MixingModel` interface in `core/mixing`. First implementation: Mixbox. Target: Kubelka-Munk
  once a reliable spectral data source exists. Both can then be compared.
- If the project ever becomes commercial, the Mixbox license must be revisited.
- Seed pigment data comes from moody (OKLab/OKLCH/RGB entered by hand from artistpigments.org);
  provenance and terms are recorded with the dataset.
- CI (format, lint, test, build) on every PR; deploy to GitHub Pages from `master` with
  `--base-href /paxt/`.

## Consequences

Pages must be enabled in repo settings with source "GitHub Actions" (manual one-time step).
