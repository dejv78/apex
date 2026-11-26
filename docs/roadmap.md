# Roadmap

Work proceeds one milestone at a time; each is reviewed and approved before the next starts.

- [x] **M0 Foundation**: Angular scaffold, lint/format/test, CI + Pages deploy, CLAUDE.md, ADRs, docs skeleton, PR template.
- [x] **M1 Core + first view**: `core/color` wrapper with tests; validated pigment dataset (unique ids, provenance); SVG OKLab hue wheel with pigment markers and gamut hull; Mixbox-backed mixer.
- [x] **M2 Exploration**: mixing-ratio visualization, gamut comparison, performance measurement (decides WebGL).
- [ ] **Deferred (nice to have): physical model**: implement Kubelka-Munk behind `MixingModel` and compare with Mixbox. Decided 2026-11-26 that Mixbox is good enough for the project's purposes for now. Research on spectral data sources is in `docs/domain/spectral-data.md`; resume from there.
- [ ] **M3 Polish**: scope to be agreed with the author.

M1 delivered: `core/color`, `core/pigments` (97 pigments, schema-validated), `core/gamut`
(convex hull), `core/mixing` (Mixbox), and an explorer page (SVG a/b wheel, hull toggle, 3-slot mixer).

M2 delivered: ratio curve and gradient strip (vs. straight OKLab interpolation), sRGB and mixture
gamut overlays with hull areas, measured performance (ADR 0007: no WebGL).

## Open questions

- Source and license of spectral reflectance data for KM (deferred; see `docs/domain/spectral-data.md`).
- Whether photo (image gamut) analysis is in scope.
