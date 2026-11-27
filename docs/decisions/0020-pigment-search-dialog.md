# 0020: "Add pigment…" dialog with search and filters

Status: Accepted (2026-11-27). Builds on [0017](0017-selection-chips.md): chips show and remove the
selection, this dialog adds to it without hunting for a marker in the plot.

## Context

With dropdowns gone (ADR 0017), the only way to add a pigment was to click it in the plot. That is
hard for pigments that are hidden by default, sit close to others, or are known only by name or code.

## Decision

- An **Add pigment…** button under the chips opens a dialog listing **every** pigment (97, the ones
  hidden from the plot included).
- **Search** is full text over the name and the Colour Index code: every word of the query must
  appear in either, in any order, ignoring case and accents ("blue ultra", "pr 122", "pr122").
- **Order** switches between hue and alphabetical by name. Hue is the default. It goes round the
  OKLab hue wheel of the plot in decreasing direction, which reads more naturally than the
  increasing one. The circle must be cut open somewhere: cutting at 0° would split the reds (the
  purple-leaning ones, such as YInTiCo red, are at 345° to 359°), so the order starts at 110°, in the
  empty gap between Terre verte and the yellows (`HUE_ORDER_START`). It reads yellow, orange, red,
  violet, blue, green, with the purple-leaning reds at the end of the reds. Colors with no usable
  hue (chroma below 0.02) come last, lightest first.
- **Color family** filter, from the code prefix: PR red, PO orange, PY yellow, PG green, PB blue,
  PV violet, PBr brown, PBk black, PW white. A natural pigment (N for "Natural" instead of P: NR9, NB1)
  joins the family of its synthetic twin, so NR9 is red and NB1 blue. Everything else (P-T) is Other. Each filter
  shows how many pigments match the current search, and is disabled at zero.
- A click on a row toggles the pigment exactly like a click in the plot (same 200-connection limit,
  rows of unselected pigments are disabled at it). The dialog stays open to add several; **Done**
  closes it.
- The logic is framework-free in `core/pigments/catalog.ts` (families, search, ordering) with tests;
  the dialog is `pigment-picker` in the explorer feature.

## Consequences

- The dialog is loaded on first use (`open-pigment-picker.ts`). It uses a plain `<input>` and plain
  filter buttons, not `mat-form-field` and `mat-chip-listbox`: those pulled `@angular/forms` and the
  form-field code into the initial bundle, about 150 kB more. The initial bundle grew by 17 kB,
  the dialog chunk is 80 kB.
- Filters for extinct and fugitive pigments (from the backlog) are not part of this; the data
  already has both flags.
