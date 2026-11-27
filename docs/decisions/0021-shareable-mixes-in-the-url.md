# 0021: Shareable mixes in the URL

Status: Accepted (2026-11-27).

## Context

A mix (which pigments, in 2D or 3D, with which overlays) is the result of several clicks. To show it
to someone, or to come back to it, it has to fit in a link.

## Decision

- The explorer state is kept in the **query string** of the address, updated as you click, with no
  reload and **no history entry** (`history.replaceState`; a click on a pigment is not a page visit).
  Opening a link restores the state. Hosting needs nothing: GitHub Pages serves `/apex/?...`.
- What is stored (`explorer-url.ts`): the selection `p=id,id,...` (pigment ids, in selection order),
  `view=3d`, and the on/off settings `hidden`, `gamut`, `linear`, `srgb`, `cloud`, `anchored` as `1`
  or `0`. **Only what differs from a fresh page is written**, so the default state has a clean
  address, and a link stays short and readable. `p=` alone is an empty selection.
- Not stored: the 3D camera, the open dialog, the expanded "Advanced" panel.
- Reading is forgiving: unknown or repeated pigment ids, pigments beyond the 200-connection limit
  (ADR 0012), unknown parameters and bad values are ignored, so an old or hand-edited link still
  opens something sensible. Pigment ids are stable keys (`docs/domain/pigment-data.md`); an id that
  is ever renamed breaks old links, so renames need a mapping.
- A **Copy link to this mix** icon button (a chain link) sits in the header of the "Mix pigments"
  group, next to "Unselect all" (the Material "clear list" icon, lines with a small cross): both act on the current state, so they belong together. Both are
  icon buttons with the label as `title` (tooltip) and `aria-label`. "Unselect all" is disabled, not
  hidden, when nothing is selected, so the header does not change. After copying, the icon becomes
  a tick for three seconds and a screen-reader status says "Link copied"; if copying fails (no
  clipboard on an insecure page) a short message appears under the header.
- The sync is the `ExplorerUrlSync` service, provided by the app only (`app.config.ts`). Tests that
  create the explorer do not provide it, so they never touch the address of the test page.

## Consequences

- The address changes as you click, so it can always be copied from the address bar, too.
- The service worker (ADR 0018) serves a link with a query string offline as well; checked in the
  browser.
- Ids in the link are long-ish (`phthalo-blue-reddish`), which is the price of readability.
