# Color spaces and how to read the plot

## OKLab and OKLCH

- **OKLab** (Ottosson, 2020) is a perceptually uniform color space: `L` lightness (0 black, 1
  white), `a` green-red axis, `b` blue-yellow axis. Equal distances look roughly equally different.
- **OKLCH** is its polar form: `C` chroma (distance from the gray axis in the a/b plane) and `h` hue
  angle in degrees. `core/color` converts between sRGB, hex, OKLab and OKLCH.

## The explorer's a/b plane

- Horizontal axis `a`: left (a−) is green, right (a+) is magenta/red.
- Vertical axis `b`: bottom (b−) is blue, top (b+) is yellow.
- **Hue angle** is measured counterclockwise from +a: 0° right (magenta-red), 90° top (yellow),
  180° left (green), 270° bottom (blue). Hue marks are drawn every 30° outside the circle.
- **Chroma rings** at C = 0.1, 0.2, 0.3; the plotted radius is 0.3 (real pigments stay below
  about 0.25). The axis lines are drawn as gradients between their end colors.
- Lightness is not shown: the plot is a projection along `L`, so very different lightnesses can
  overlap (see the backlog in `docs/roadmap.md`).
- Geometry (extent, scale, ticks, hue marks) lives in
  `src/app/features/explorer/plot-geometry.ts`, tested in `plot-geometry.spec.ts`.

## The 3D view: the color cylinder

OKLCH is a cylinder: `L` is the vertical axis (0 at the bottom, 1 at the top), `C` the radius and `h`
the angle. The 3D view draws it with the same scale on all axes (1 OKLab unit = 4 scene units).

- Looking from the top shows the 2D a/b plot. The front view shows `a` against lightness, and the
  side view `b` against lightness.
- What it reveals: the lightest pigments are the yellows (L about 0.9) and the darkest the blues and
  violets; the usable chroma shrinks towards black and white.
- The sRGB gamut is a distorted cube in OKLab: apex at black, widest around the saturated blues,
  reds and yellows, apex at white. Several saturated cyan and green pigments poke out of it.
- Scene axes: +x = +a, +y = L, +z = -b (so the top view matches the 2D plot). The mapping, hue lines
  and chroma rings are in `src/app/features/explorer/plot-3d-geometry.ts` (tested).
- **Where mixtures leave sRGB:** with the mixture gamut (hull) and the sRGB gamut both on, a thin
  gold line (the hull's color, more opaque) marks the curve where the two surfaces cross. It consists of closed loops around the parts
  of the hull that stick out of sRGB (mostly saturated cyans and greens). It is computed from the
  hull's triangles and the sRGB mesh (`intersectTriangleSets`).
