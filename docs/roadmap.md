# Roadmap

Work proceeds one milestone at a time; each is reviewed and approved before the next starts.

- [x] **M0 Foundation**: Angular scaffold, lint/format/test, CI + Pages deploy, CLAUDE.md, ADRs, docs skeleton, PR template.
- [ ] **M1 Core + first view**: `core/color` wrapper with tests; validated pigment dataset (unique ids, provenance); SVG OKLab hue wheel with pigment markers and gamut hull; Mixbox-backed mixer.
- [ ] **M2 Exploration**: mixing-ratio visualization, gamut comparison, performance measurement (decides WebGL).
- [ ] **M3 Physical model**: find spectral data, implement Kubelka-Munk behind `MixingModel`, compare with Mixbox.

## Open questions

- Terms of use for data from artistpigments.org.
- Source of spectral reflectance data for KM.
- Whether photo (image gamut) analysis is in scope.
