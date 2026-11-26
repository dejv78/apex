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
