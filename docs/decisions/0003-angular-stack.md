# 0003: Angular stack and tooling

Status: Accepted (2026-11-26)

## Context

Predecessor project `moody` used Angular 19 with zone.js, PrimeNG, Pixi, NgRx signals and Karma,
with no lint, CI or tests. Paxt starts fresh.

## Decision

Current Angular (22), standalone components, signals, zoneless change detection, SCSS.
Plain signals and services; no NgRx until real cross-cutting state appears. Vitest via
`ng test`. angular-eslint and Prettier, both enforced in CI. Angular Material for UI components.

## Consequences

Moody code is not ported wholesale; only ideas and data are reused.
