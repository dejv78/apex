# 0009: Anchor-first pigment selection and basic/advanced controls

Status: Accepted (2026-11-26)

## Context

The side panel exposed too many technical controls, and clicking pigments on the plot always
replaced "the last two clicked", which made it awkward to compare one pigment against several.

## Decision

- **Selection model** (`features/explorer/selection.ts`, pure and tested): an ordered list of
  pigment ids, first = the **anchor**. Clicking an unselected pigment adds it; when the list is
  full (`MAX_PIGMENTS = 2`) it replaces the last one, so the anchor stays. Clicking a selected
  pigment removes it; removing the anchor promotes the next pigment to anchor.
- **Ctrl+click** (⌘+click on a Mac, where Ctrl+click opens the context menu) makes a pigment the
  anchor: an unselected pigment replaces the anchor and keeps the partner; the current partner
  swaps roles with the anchor; a lone anchor is replaced.
- **Dropdowns** mirror the list: N + 1 of them until the maximum, labeled "Anchor" and "Mix with".
  A pigment selected in one dropdown is disabled in the others. Clearing a dropdown behaves like
  clicking the pigment. Raising `MAX_PIGMENTS` is the only change needed for the selection side
  of mixing more than two pigments (the mixing view still draws one pair).
- The app opens with a pre-selected pair (lemon yellow, phthalo blue reddish).
- **Basic controls**: the dropdowns, the help text, "Mixture gamut" and "Show all pigments".
  Everything else sits in a collapsed "Advanced" accordion: the true-color correction (ADR 0008),
  "Straight OKLab line" and "sRGB gamut". The gamut area readout was removed.
- Click targets are a transparent layer drawn last in the SVG, because path dots and end markers
  otherwise sit on top of the pigment markers and swallow clicks (`explorer.spec.ts` checks the
  drawing order). End markers are clickable too, for selected pigments hidden from the plot.
- The anchor is drawn with a double ring; a lone selected pigment is drawn at its true color.

## Consequences

- The UI label of the ADR 0008 correction is "Correct mixes to true pigment colors", because
  "anchor" now means the first selected pigment. Code and ADR 0008 still call the model
  `AnchoredModel`; the toolbar label of the model (`Mixbox (anchored)`) also still uses that word.
- Hidden pigments (`hideByDefault`) can be selected through a dropdown but not clicked on the plot
  until "Show all pigments" is on.
