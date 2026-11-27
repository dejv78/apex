# 0017: Selected pigments as chips, no dropdowns

Status: Accepted (2026-11-27). Supersedes the dropdowns of [0009](0009-anchor-first-pigment-selection.md)
and [0013](0013-modifier-free-selection.md); their click rules stand.

## Context

Clicking or tapping pigments in the plot is the main way to select them (ADR 0013). The panel's
dropdowns (one per selected pigment plus an empty one) duplicated that with a long list that is hard
to scan, and they showed no colors.

## Decision

- The panel lists the selected pigments as **chips**, in selection order. A chip has the pigment's
  sRGB `hex` as its background, the Colour Index code in bold followed by the name, and a cross that
  unselects the pigment.
- The text is black or white, whichever has the higher WCAG contrast against the chip color
  (`readableTextColor` in `core/color`; tests check at least 4.5:1 over a grid of colors).
- Adding a pigment is done only in the plot. With nothing selected the panel says so.
- The dropdown helpers (`slotsFor`, `setSlot`, `pickInSlot`, `isTaken`) are removed.

## Consequences

- Pigments hidden from the plot (`hideByDefault`) can no longer be picked from a list; turn on "Show
  all pigments" to click them.
- The 200-connection limit (ADR 0012) still applies; the panel keeps its "Limit reached" note.
