# 0016: Title capitalization "Artists Palette Explorer"

Status: Accepted (2026-11-27). Supersedes the capitalization of the title in
[0011](0011-branding-title-logo-font.md) and [0015](0015-project-name-apex.md).

## Context

The title was written "Artists palette explorer". ADR 0015 derived the name **apex** from its
letters (Artists Palette EXplorer). Capitalizing the title as that acronym, with a capital X in
"EXplorer", was tried and looked strange.

## Decision

The title shown to users is **Artists Palette Explorer** (toolbar, `<title>`, README): each word
capitalized, no internal capital. The acronym spelling "Artists Palette EXplorer" is only used to
explain the name (README, CLAUDE.md, ADR 0015). The name in code, repository and URL stays
lowercase `apex`.
