# 0005: Framework-free core, SVG-first rendering

Status: Accepted (2026-11-26)

## Context

Domain logic (color, pigments, mixing) must be fast to test and independent of the UI. Moody used
Pixi/WebGL; artistpigments.org's mixer is slow, so performance may matter later.

## Decision

- `src/core/{color,pigments,mixing}` contains no Angular imports; UI lives in `src/app/features/`.
- The color library (culori or colorjs.io) is imported only inside `core/color`.
- Render with SVG (canvas for dense plots). WebGL (e.g. Mixbox's GL mixer, image gamut) is added
  only when measured performance requires it, via a new ADR.

## Consequences

Domain-fact tests run without TestBed.
