# 0014: Larger markers and nearest-pigment picking on touch devices

Status: Accepted (2026-11-27)

## Context

On a phone (iPhone 17, 402 px wide) the 2D plot is drawn at about half size, so a pigment is a
7.6 px circle with a 9 px click target, against the 44-48 px recommended for fingers. The 59 visible
pigments are packed: the median distance to the nearest neighbour is 15 px, and one in ten pigments
has a neighbour within 9 px. Selecting a pigment needed a pinch-zoom of the page. A 44 px target is
impossible without overlaps; 3D has the same problem (tiny spheres, exact ray hits).

## Decision

On touch devices (`ExplorerState.touchOnly`, the `(pointer: coarse)` media query) only:

- **Markers are drawn 1.6 times larger** (`TOUCH_MARKER_SCALE` in `pick-nearest.ts`): pigment, end
  and true-color-ring markers in 2D, pigment and end spheres in 3D. About what the crowded plot
  takes before it turns into a blob. Trail dots keep their size.
- **A tap selects the pigment nearest to it within 22 screen pixels** (`TOUCH_PICK_RADIUS`,
  `nearestTarget`), in both views, instead of needing a direct hit. In 3D candidates are projected
  to the screen and, at equal distance, the one nearer to the camera wins. The candidates are the
  visible pigments plus the selected ones (which can be hidden from the plot, so they stay
  removable).
- A mouse is unchanged: same sizes, direct hits only.

## Consequences

- Imprecise taps work: in a headless Firefox run at iPhone size, 60 of 60 taps 8-10 px off a marker
  selected the nearest pigment, against 6 of 60 with direct hits. Taps in empty space (further than
  22 px from every pigment) do nothing.
- In the most crowded spots the nearest pigment can still be one of several tightly packed ones;
  the real fix is zoom and pan in the plot (roadmap backlog), to be done if this proves
  not to be enough.
- 2D handles taps on the component's host element, since the nearest-pigment search needs the tap
  position, not the element that was hit. On touch devices the per-marker click handlers do nothing,
  so a tap is never counted twice.
