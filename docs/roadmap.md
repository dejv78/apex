# Roadmap

Work proceeds one milestone at a time; each is reviewed and approved before the next starts.

- [x] **M0 Foundation**: Angular scaffold, lint/format/test, CI + Pages deploy, CLAUDE.md, ADRs, docs skeleton, PR template.
- [x] **M1 Core + first view**: `core/color` wrapper with tests; validated pigment dataset (unique ids, provenance); SVG OKLab hue wheel with pigment markers and gamut hull; Mixbox-backed mixer.
- [x] **M2 Exploration**: mixing-ratio visualization, gamut comparison, performance measurement (decides WebGL).
- [ ] **Deferred (nice to have): physical model**: implement Kubelka-Munk behind `MixingModel` and compare with Mixbox. Decided 2026-11-26 that Mixbox is good enough for the project's purposes for now. Research on spectral data sources is in `docs/domain/spectral-data.md`; resume from there.
- [ ] **M3 Polish**: in progress, in small steps agreed with the author. Done so far: two-pigment mixing shown as a series of sampled dots (replaces the weight sliders; the dot series and true-color ring follow Artist Pigments); mixes anchored to the pigments' true OKLab colors (ADR 0008); dots equally spaced along the path, so the count follows the pigment distance; diagram axes (gradient a/b axes with end names, faint grid lines, hue angles every 30°); simpler controls: the mixture gamut is shown by default, the pigment hull toggle was removed; basic controls plus a collapsed "Advanced" accordion, and an anchor-first click workflow with dynamic dropdowns (ADR 0009); 3D color cylinder with Three.js, lazy-loaded, switchable with the 2D view (ADR 0010), which answers the lightness question; mixture gamut as a point cloud plus optional hull, sRGB gamut as a 3D solid, and a line where the mixture hull crosses it; "Mixture gamut" is the hull in both views, the point cloud is an Advanced 3D toggle; multi-pigment selection with trails between all pairs, capped at 200 connections (ADR 0012), then made modifier-free (click or tap toggles a pigment, no anchor, no Shift/Ctrl) so it works on phones (ADR 0013); on touch devices larger markers and a tap that picks the nearest pigment within 22 px (ADR 0014); an "Unselect all" button; selected pigments shown as removable chips in their own color instead of dropdowns (ADR 0017); shareable mixes: the selection, view and settings live in the address, with a "Copy link" button (ADR 0021); an "Add pigment…" dialog with full-text search, a color family filter and hue or alphabetical order (ADR 0020); a context-aware help line under the plot that lists only the clicks available in the current selection state (`selectionHelp` in `selection.ts`); self-hosted fonts (ADR 0019); installable offline-capable PWA with service worker, manifest and icons (ADR 0018); branding: title "Artists Palette Explorer" (ADR 0016), white palette logo with yellow, magenta and cyan splashes, Fraunces title font, toolbar hint naming the OKLab view (ADR 0011).

## Backlog (proposed 2026-11-26, to consider later)

- Understanding colors: a plain 2D lightness view (L against chroma) if the 3D view proves too heavy for some users; hue labels, legend for fugitive and extinct pigments, zoom and pan, pigment detail card; tint ladder (mix with white or black); three-pigment mixtures and a lightness-sliced gamut.
- Usability: keyboard access and screen-reader labels for the SVG pigments; better phone layout.
- Project health: component tests for the explorer; browser smoke test in CI against the deployed page; real README (live link, screenshots, license credits); Dependabot.

M1 delivered: `core/color`, `core/pigments` (97 pigments, schema-validated), `core/gamut`
(convex hull), `core/mixing` (Mixbox), and an explorer page (SVG a/b wheel, hull toggle, 3-slot mixer).

M2 delivered: ratio curve and gradient strip (vs. straight OKLab interpolation), sRGB and mixture
gamut overlays with hull areas, measured performance (ADR 0007: no WebGL).

## Open questions

- Source and license of spectral reflectance data for KM (deferred; see `docs/domain/spectral-data.md`).
- Whether photo (image gamut) analysis is in scope.
