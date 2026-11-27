# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

apex (Artists Palette EXplorer, shown to users as "Artists Palette Explorer", ADR 0011, ADR 0015, ADR 0016) is an educational web app for painters: color relationships, gamut, and visualizing how physical pigments mix. Angular, hosted on GitHub Pages at `/apex/`. Personal, non-commercial project that may become public. Sibling project `../moody` is inspiration and the seed pigment dataset (`src/app/color-wheel/pigments.ts`), not code to port.

Read `docs/roadmap.md` for current status and `docs/decisions/` for why things are the way they are. Work proceeds one milestone at a time, each approved by the user before the next starts.

## Commands

- `npm start`: dev server
- `npm test -- --watch=false`: run all tests (Vitest via `ng test`); one file: `npm test -- --watch=false --include='src/app/app.spec.ts'`
- `npm run lint`, `npm run format` / `format:check` (Prettier)
- `npm run build:pages`: production build with `--base-href /apex/` (what CI and deploy use)

CI (`.github/workflows/ci.yml`) runs format check, lint, tests, build. Deploy runs from `master`; GitHub Pages must have source "GitHub Actions" enabled in repo settings.

## Architecture

- `src/core/`: framework-free domain logic (`color`, `pigments`, `gamut`, `mixing`). No Angular imports. The color library is imported only in `core/color`. Mixing goes through a `MixingModel` interface (Mixbox, wrapped by `AnchoredModel` so pure pigments sit at their true OKLab colors; Kubelka-Munk deferred).
- `src/app/features/explorer/`: Angular UI (Angular Material, signals, zoneless, plain services, no NgRx). `ExplorerState` holds the selection, mixing model and toggles, shared by the 2D plot (SVG, `plot-2d`) and the lazy-loaded 3D plot (Three.js, `plot-3d`; ADR 0010). Import `three` only in `plot-3d-scene.ts`. Mixing and gamut computation stay on the CPU (ADR 0007, `docs/domain/performance.md`).
- Fixed neutral mid-gray theme in `src/styles.scss`; do not add dark mode or a theme switcher.

## Gotchas

- Mixbox adds ~156 kB to the bundle, so the initial budget in `angular.json` is 900 kB (warning) / 1.2 MB (error). Mixbox and the pigment data (Artist Pigments) are both CC BY-NC 4.0: non-commercial only, attribution required (footer in the explorer).
- The convex hull of pigment masstones is not the mixture gamut (see `docs/domain/gamut.md`).
- `hex` in the pigment data is clipped to sRGB; `oklab` is the primary value. A test checks that hex matches the clamped OKLab value; past corrections are in `docs/domain/pigment-data.md`.
- The deploy workflow has a "wait for artifact" step because GitHub sometimes lists the uploaded Pages artifact late, failing `deploy-pages` with "No artifacts named github-pages" (upstream issue actions/deploy-pages#451). If it fails anyway, re-run the job.

## Conventions

- English only. Conventional Commits.
- Domain facts live in tests (e.g. OKLab round-trip, blue + yellow gives green). Write the test with the feature.
- Keep knowledge in one place: decisions in ADRs (immutable; supersede, don't edit), domain notes in `docs/domain/`, commands/gotchas here. Update the relevant one in the same change.
- Pigment data needs unique ids (CI codes like PBr7 repeat) and recorded provenance.
