# 0004: Fixed neutral theme

Status: Accepted (2026-11-26)

## Context

Surrounding colors bias how a swatch is perceived, which matters for a color tool.

## Decision

A single fixed theme with a neutral mid-gray canvas (`src/styles.scss`). It does not follow the
system light/dark preference and has no switcher.

## Consequences

Revisit if user testing shows a need for alternatives.
