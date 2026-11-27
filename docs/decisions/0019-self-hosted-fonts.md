# 0019: Self-hosted fonts

Status: Accepted (2026-11-27). Supersedes the Google Fonts part of
[0011](0011-branding-title-logo-font.md) and the font caching of [0018](0018-pwa.md).

## Context

Roboto, the Fraunces title font and an icon font were loaded from Google Fonts. That needs a network
on the first visit, so the offline PWA (ADR 0018) could show fallback fonts, and every visit
contacted a third party.

## Decision

- Fonts come from npm and are bundled by the build (`styles` in `angular.json`): `@fontsource/roboto`
  (latin 400 and 500, the weights Material uses) and `@fontsource-variable/fraunces` (`full.css`,
  all axes; the browser downloads only the subsets it needs, latin in practice). Both are SIL OFL 1.1.
- The title keeps its look from ADR 0011 with `font-variation-settings: 'SOFT' 100, 'WONK' 1`; the
  family is now named `Fraunces Variable`.
- The Material Symbols icon font is dropped: no component uses ligature icons (the chip cross is an
  inline SVG).
- `ngsw-config.json` no longer lists Google URLs; the font files are ordinary assets
  (`/**/*.woff2`), cached on first use.

## Consequences

- No requests to third parties; the first visit needs no font service, and fonts work offline.
- About 150 kB of fonts more in the deployed output, but only the latin files are downloaded
  (Roboto about 22 kB per weight, Fraunces about 121 kB).
- Fonts are updated through npm (Dependabot would cover this once enabled).
