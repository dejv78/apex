# 0007: No WebGL for now

Status: Accepted (2026-11-26). Superseded in part by [0010](0010-3d-color-cylinder-with-threejs.md): the 3D view uses WebGL for rendering; mixing and gamut computation still run on the CPU as decided here.

## Context

ADR 0005 deferred WebGL until measured performance required it. M2 measured the Mixbox model:
about 1.5 million mixes per second on one CPU thread (`docs/domain/performance.md`). Mixture
gamut sampling over all pigment pairs takes under 20 ms.

## Decision

Keep mixing and gamut computation on the CPU, rendering in SVG. Do not add WebGL (Mixbox's GLSL
mixer or Pixi).

## Consequences

Revisit if a workload grows by two orders of magnitude (triples of all pigments, 3D gamut,
image-based gamut, per-wavelength Kubelka-Munk over many samples), or if SVG rendering becomes
slow. Supersede this ADR then, with new measurements.
