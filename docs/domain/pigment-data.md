# Pigment data

## Source and provenance

`src/core/pigments/pigments.json` was converted from `moody`'s `pigments.ts` (98 entries, now 97 after corrections). Values
(OKLab, OKLCH, hex) were entered manually by the project author from
[Artist Pigments](https://artistpigments.org/); both the OKLab coordinates and the hex values are the
site's own, not converted by this project.

## License

Artist Pigments content is licensed **CC BY-NC 4.0** (site footer, checked 2026-11-26). Consequences:

- Non-commercial use only (matches the project; same restriction as Mixbox, ADR 0006).
- Attribution is required, and changes must be indicated: the app footer credits the source for the
  OKLab and hex values (`Explorer` footer, fed by `PIGMENT_DATASET.source`). The footer also
  states that the application itself is MIT-licensed, with a link to `LICENSE` on GitHub.
- The dataset keeps this license even if the app code is licensed differently; keep the `source`
  block in `pigments.json` with the data.

Each entry is a single **masstone** color (OKLab). There is no tint, undertone or spectral data,
so it cannot drive a physical mixing model (Kubelka-Munk) by itself.

## Conventions

- `id` is the unique key (slug of the name, with the CI code appended where names collide).
  Colour Index codes are not unique: PBr7 covers raw/burnt umber and sienna.
- Ids are keys that code and tests refer to (for example the default selection in `ExplorerState`).
  When fixing a typo, prefer changing only `name`; if an `id` changes too, update every reference
  (`grep` for the old id). CI catches a missed one: the tests fail, and the deploy workflow runs them
  before building, so a broken id never reaches the live site (this happened with
  `phthalo-blue-redish`, 2026-11-26).
- `oklab` is the primary data. OKLCH is derived (`oklabToOklch`) and not stored.
- `hex` is a display value. Pigments outside the sRGB gamut have clipped hex values, so hex and
  OKLab legitimately differ for saturated cyans, greens and yellows.

## Data corrections

- 2026-11-26: three entries had a hex copied from another pigment (`caput-mortuum`, `nitroso-green`,
  `phthalo-turquoise`). The author could not recall the original samples, so `caput-mortuum` was
  re-measured (both OKLab and hex). `phthalo-turquoise` was replaced by `aqua-green` (Winsor &
  Newton; pigment PALOMAR TURQUOISE, no CI index, code `P-T`). `nitroso-green` was removed because
  Artist Pigments no longer lists a watercolour measurement for it.
- `pigments.spec.ts` guards this: hex must match the clamped OKLab value within a tolerance.

Pigments without a Colour Index name use a short made-up code (e.g. `P-T`); the `note` says why.
