# 0013: Modifier-free selection, no anchor

Status: Accepted (2026-11-27). Supersedes the anchor, click and dropdown rules of
[0009](0009-anchor-first-pigment-selection.md), the click rules of
[0012](0012-multi-pigment-selection.md) and the anchor ring and Ctrl+click picking of
[0010](0010-3d-color-cylinder-with-threejs.md). The 200-connection cap of 0012 stands.

## Context

Selection needed Shift+click (add a pigment) and Ctrl+click (make the anchor), which a phone cannot
do: on touch there was no way to add a third pigment or change the anchor from the plot. With
all-pairs trails (0012) the anchor also stopped mattering: every pair gets a trail anyway, so it was
only a ring, the first dropdown, and the pigment a plain click did not replace.

## Decision

- **One gesture**: a click or tap on a pigment adds it to the selection, and a click on a selected
  pigment removes it (`togglePigment` in `selection.ts`). Any pigment can be removed. It works the
  same with a mouse and a finger.
- **No anchor**: no ring, no "(anchor)" tooltip, no Ctrl/⌘+click, no promotion on removal. The
  selection is an ordered list that only decides the dropdown order.
- **No modifier keys at all**: Shift+click and Ctrl+click are removed on every device, so there is
  one scheme and one short help line.
- **Dropdowns** are labeled "Pigment" (selected) and "Add a pigment" (the empty one). Clearing one
  removes the pigment.
- **Help line** (context-aware, under the plot): nothing selected, one selected, several, and at the
  connection limit (adding is left out because it would be refused). The 3D camera sentence still
  differs for touch (pinch, two-finger drag) and mouse (scroll, right-drag).
- Unchanged from 0009 and 0012: the pre-selected pair, basic controls and the Advanced accordion,
  the hit layer drawn last, clickable end markers, "Unselect all", all-pairs trails and the cap of 200
  connections (adding a pigment that would exceed it is refused; removing always works).

## Consequences

- Comparing one pigment against several is done by selecting them all: the trails between every pair
  are drawn, including that pigment's. Replacing a partner takes two clicks (remove, add) instead of
  one; the dropdowns can swap a pigment directly.
- A lone selected pigment is drawn at its true color without a ring.
- Code and ADR 0008 still call the true-color correction `AnchoredModel`; that has nothing to do
  with the removed anchor pigment, and the toolbar never shows the word.
