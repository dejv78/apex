# 0012: Multi-pigment selection with all-pairs trails

Status: Accepted (2026-11-27). Supersedes the two-pigment cap of ADR 0009.

## Context

ADR 0009 prepared the selection for more than two pigments but the mixing view drew only one trail,
anchor to partner. To compare several pigments at once, every selected pigment should be mixed with
every other.

## Decision

- **Shift+click** adds an unselected pigment to the selection, or removes a selected one
  (`togglePigment`). Ctrl/⌘+click still makes the anchor.
- A **plain click** on an unselected pigment keeps the anchor and makes the clicked pigment the only
  partner, so it is the quick way back to a plain pair.
- **Hard cap of 200 connections** (`MAX_CONNECTIONS` in `selection.ts`), chosen conservatively from
  measurements (`docs/domain/performance.md`) so the app stays smooth on weaker hardware. With
  every pigment mixed with every other (N(N-1)/2) that is 20 pigments (190); a 21st would make 210.
  Shift+click and the empty dropdown refuse to add a pigment that would exceed it, the empty
  dropdown disappears, and the panel says the limit is reached. Removing, replacing, re-anchoring
  and the plain click always work. The dropdowns are otherwise N + 1.
- The cap is on **connections, not pigments**, and applies to every selection mode. Future modes
  (groups mixing only within the group, individual pairs) change `connectionCount` and must keep
  the cap; it is never lifted for a mode.
- **Trails for all pairs**: N(N-1)/2 trails (`ExplorerState.pairs`), cached per
  (model, view mode, pigment pair), so adding a pigment only computes its N-1 new trails. One end
  marker and one set of dots is drawn per pigment pair; the anchor keeps its ring.
- The mixture gamut and point cloud are unchanged: they still cover all visible pigments.

## Consequences

- Rendering cost grows quadratically with the selection: dots in 2D are SVG nodes, in 3D one
  instanced mesh. Measured limits go to `docs/domain/performance.md`; add a cap (new ADR) if needed.
- The tooltip of a dot names its two pigments. Dots of different pairs may overlap.
