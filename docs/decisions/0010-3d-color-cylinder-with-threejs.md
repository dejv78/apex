# 0010: 3D color cylinder with Three.js

Status: Accepted (2026-11-26). Supersedes [0007](0007-no-webgl-for-now.md) for rendering only; mixing
and gamut computation stay on the CPU.

## Context

The a/b plot hides lightness, which matters a lot to painters (yellows are light, blues are dark).
ADR 0007 deferred WebGL until a 3D (L, a, b) gamut was needed; that is what the cylinder view is.
Options were Three.js (WebGL) or a hand-written SVG projection.

## Decision

- A **3D view** renders OKLab as a cylinder: lightness up, chroma as radius, hue as angle. Same
  scale on all axes, so distances stay true to the color space. Scene axes: +x = +a, +y = L,
  +z = -b, so looking from above matches the 2D plot (`plot-3d-geometry.ts`).
- Rendering uses **Three.js** (MIT) with orbit controls (rotate, zoom, pan, touch). All Three.js
  code lives in `plot-3d-scene.ts` (framework-free); `plot-3d.ts` feeds it from the shared state.
- The 3D view is **lazy-loaded** (`@defer`) when switching to it: about 124 kB transferred in its
  own chunk, none of it in the initial bundle.
- **Shared state**: selection, mixing model and toggles live in `ExplorerState`, provided by
  `Explorer`, so the 2D and 3D views always agree. A **2D / 3D switch** in the toolbar chooses
  one plot at a time.
- Pigments and path dots are drawn **unlit** (exact colors); the mixture gamut is a **point cloud**
  of the sampled mixes in their own colors, with an optional translucent convex **hull** (Advanced,
  3D only); the sRGB gamut is its exact 3D surface in its own colors. Camera presets: top, front,
  side, reset.
- **"Mixture gamut" is the hull in both views** (the outline in 2D, a translucent solid in 3D).
  The **point cloud** is a separate, 3D-only toggle in Advanced ("Mixture point cloud", off by
  default); the samples are computed when either needs them. Path dots are spaced by **full OKLab
  distance** in 3D (a/b distance in 2D), so a black-to-white transition gets as many dots as its
  length deserves.
- When the hull and the sRGB solid are both shown, the **curve where they cross** is drawn as a
  thin line in the hull's own gold, more opaque than the hull but deliberately faint, since it is a
  secondary cue (`core/gamut/triangle-intersection.ts`, triangle-mesh
  intersection, tested on cubes: the curve closes). Inside it the mixtures are within sRGB;
  outside, they exceed it.
- The anchor and the "true color" markers are flat, camera-facing **white rings** (like the SVG
  view), not wireframe spheres, which hid the pigment they surrounded.
- Picking works as in 2D (same click rules, ctrl/⌘+click for the anchor); a press that moved more
  than 5 px is a drag, not a click.
- Without WebGL the 3D view shows a message and the 2D view keeps working.

## Consequences

- The dropdowns stay the accessible way to choose pigments; the canvas is not screen-reader
  friendly.
- Behavior was verified in headless Firefox through WebDriver BiDi (screenshots after a wait, real
  mouse clicks, ctrl+click, drag); jsdom tests cover the state, the geometry and the no-WebGL path
  only, since it has no WebGL.
- A 3D hull of the mixture cloud (convex) overstates what is reachable, like the 2D hull; the
  cloud is the faithful picture.
