# 0015: Project name "apex"

Status: Accepted (2026-11-27). Supersedes the line of [0011](0011-branding-title-logo-font.md) that
kept "paxt" as the repository and code name.

## Context

The project started as "paxt", short for Palette Exploration Tool. ADR 0011 gave the app the title
"Artists palette explorer" and kept "paxt" as the code name. The title offers a better short name:
**apex**, from **A**rtists **P**alette **EX**plorer.

## Decision

- The project, package, Angular project, repository and GitHub Pages path are all **apex**; the
  title shown to users stays "Artists palette explorer".
- The GitHub repository was renamed from `dejv78/paxt` to `dejv78/apex`. The site moves to
  `https://dejv78.github.io/apex/`, and the production build uses `--base-href /apex/`
  (`npm run build:pages`). The build output is `dist/apex/browser`.
- GitHub redirects the old repository and git URLs but not Pages, so the old address
  `https://dejv78.github.io/paxt/` is dead. That was accepted: it had been shared with one person.

## Consequences

- Older ADRs (0003, 0006, 0011) still say "paxt" where they describe what was true then; they are
  history and are not edited. `--base-href /paxt/` in 0006 now reads `/apex/`.
- Anything outside the repository that carried the old name (the local folder, the IDE module file,
  Claude Code's per-project memory folder, bookmarks) was updated or must be.
