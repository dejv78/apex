# 0011: Branding: title, logo and title font

Status: Accepted (2026-11-26). The "paxt stays the repository and code name" line is superseded by
[0015](0015-project-name-apex.md).

## Context

The toolbar showed the working name "Paxt" in plain type and a placeholder favicon. The toolbar also
carried a technical hint that used the word "anchor" for something other than the anchor pigment
(ADR 0009).

## Decision

- **Title**: "Artists palette explorer" (toolbar, `<title>`, README). "paxt" stays the repository and
  code name.
- **Font**: Fraunces (Google Fonts, weight 500, `SOFT` and `WONK` axes pinned in the URL), a soft,
  slightly quirky modern serif; the stylesheet link is in `index.html`. Chosen over Fraunces italic,
  Playfair Display italic, Young Serif and Gloock.
- **Logo**: a classic artist's palette (kidney shape with a thumb hole) in white, with three paint
  splashes in the printing primaries: yellow (`#ffb800`, a golden yellow; the first choice `#ffd21f`
  washed out against the white palette), magenta (`#e5167d`) and cyan (`#00a8e1`). `public/logo.svg` is used in the
  toolbar and, identically, as `public/favicon.svg`. A variant with a light gray palette and a fourth
  (white) splash was tried and rejected: calmer, but less striking, and the white splash read as a
  hole. The SVG is the source of truth; edit it directly.
- **Layout rules** (viewBox 0 0 128 128; the SVG repeats the numbers in a comment):
  - Magenta is equally far from yellow and cyan, so the perpendicular from magenta onto the
    yellow-cyan line meets it at its midpoint. This is the original layout (yellow (38, 43),
    magenta (72, 31), cyan (103.23, 49.03)); cyan was placed where all its droplets stay inside the
    palette outline (an earlier position overflowed it).
  - The splash group (shapes and droplets, not the highlights) is then turned 12 degrees
    counterclockwise around the palette's middle (64, 63), along the perimeter. A rigid rotation keeps
    the first rule exact. Centers: yellow (34.41, 48.84), magenta (65.17, 30.04), cyan (99.47, 41.18).
    Droplets that would touch the outline were pulled slightly toward their splash (at least 2.2 units
    of room remain).
  - The thumb hole is centered at (50.58, 86.34), a third closer to the cutout than the first
    design: the visible gap between the hole's edge and the cutout went from 32.1 to 21.4 units.
- **Toolbar hint**: names the view and the color space, then the model: "OKLab hue and chroma map"
  (2D) or "OKLab color cylinder" (3D), then "Mixbox mixing". Both the plot and the pigment
  coordinates are OKLab, so that stays visible. The model's label is the plain base name (the
  "anchored" correction, ADR 0008, is an implementation detail).

## Consequences

- The logo is also the browser tab icon (SVG favicon; the old `favicon.ico` was removed, so browsers
  without SVG favicon support show the default icon).
- Fonts are loaded from Google Fonts at runtime (as Roboto already was); self-hosting them remains
  an open item in the backlog.
- On narrow screens (under 760 px) the hint is hidden and the title shrinks so the 2D / 3D switch
  keeps its room.
