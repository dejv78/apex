# 0002: Knowledge layers

Status: Accepted (2026-11-26)

## Context

Project knowledge must survive across sessions and contributors without repetition. Duplicated
knowledge goes stale, so each kind of knowledge needs exactly one home.

## Decision

- `CLAUDE.md`: commands, conventions, gotchas. Short; updated in the same change as what it describes.
- `docs/decisions/`: ADRs (this directory). Immutable; superseded, not edited.
- `docs/domain/`: color science, mixing theory, dataset provenance. Written when code first needs it.
- `docs/roadmap.md`: milestones and next steps.
- Tests encode domain facts (e.g. OKLab round-trip is lossless, blue + yellow mixes to green).
- Code and git history (Conventional Commits) describe what and when; they are not repeated in docs.
- The PR template asks whether an ADR, domain doc, CLAUDE.md or roadmap update is needed.

## Consequences

Planned later: a `/decision` project skill to scaffold ADRs and a hook that reminds about docs
when `src/` changes. User-facing docs are deferred until the app is public.
