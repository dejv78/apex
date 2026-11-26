# Roadmap

Work proceeds one milestone at a time; each is reviewed and approved before the next starts.

- [x] **M0 Foundation**: Angular scaffold, lint/format/test, CI + Pages deploy, CLAUDE.md, ADRs, docs skeleton, PR template.
- [x] **M1 Core + first view**: `core/color` wrapper with tests; validated pigment dataset (unique ids, provenance); SVG OKLab hue wheel with pigment markers and gamut hull; Mixbox-backed mixer.
- [ ] **M2 Exploration**: mixing-ratio visualization, gamut comparison, performance measurement (decides WebGL).
- [ ] **M3 Physical model**: find spectral data, implement Kubelka-Munk behind `MixingModel`, compare with Mixbox.

M1 delivered: `core/color`, `core/pigments` (97 pigments, schema-validated), `core/gamut`
(convex hull), `core/mixing` (Mixbox), and an explorer page (SVG a/b wheel, hull toggle, 3-slot mixer).

## Open questions

- Source of spectral reflectance data for KM.
- Whether photo (image gamut) analysis is in scope.
