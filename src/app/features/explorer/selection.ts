/**
 * The pigments chosen for mixing, as an ordered list of ids (ADR 0013). Every selected pigment is
 * mixed with every other one, so the order only decides the chip order. Pure functions, so the
 * click rules are testable.
 *
 * Rules:
 * - Clicking (or tapping) an unselected pigment adds it to the selection; clicking a selected one
 *   removes it (see `togglePigment`). There are no modifier keys: a mouse and a finger do the same.
 * - Adding a pigment that would exceed `MAX_CONNECTIONS` is refused; removing is always allowed.
 */

/**
 * Hard limit on the mixing trails (connections) drawn at once, whatever the selection mode. Each
 * trail costs rendering time, and this keeps the app smooth on weak hardware (ADR 0012). Adding a
 * pigment that would exceed it is refused; removing and replacing are always allowed.
 */
export const MAX_CONNECTIONS = 200;

/**
 * How many trails a selection of `pigments` draws. Today every pigment is mixed with every other
 * (N(N-1)/2); another selection mode (groups, single pairs) would change this function, and
 * `MAX_CONNECTIONS` keeps applying to its result.
 */
export function connectionCount(pigments: number): number {
  return pigments < 2 ? 0 : (pigments * (pigments - 1)) / 2;
}

/** Whether one more pigment fits within `MAX_CONNECTIONS`. */
export function canAddPigment(selection: readonly string[]): boolean {
  return connectionCount(selection.length + 1) <= MAX_CONNECTIONS;
}

/**
 * A click on a pigment: add it if it is not selected, remove it if it is. Adding is refused (the
 * selection is unchanged) when it would exceed `MAX_CONNECTIONS`.
 */
export function togglePigment(selection: readonly string[], id: string): string[] {
  if (selection.includes(id)) return selection.filter((s) => s !== id);
  return canAddPigment(selection) ? [...selection, id] : [...selection];
}

/**
 * The click actions available right now, as short sentences for the help line under the plot. It
 * mirrors the rules above and lists only what a click can do in the current state, so it must
 * change together with them (`selection.spec.ts` pins the wording per state).
 *
 * Adding is left out at `MAX_CONNECTIONS` (it would be refused); the side panel explains the
 * limit. Actions are wrapped in `*...*` (see `helpParts`).
 */
export function selectionHelp(selection: readonly string[]): string[] {
  const count = selection.length;
  if (count === 0) return ['*Click on a pigment* to select it.'];
  if (count === 1) {
    return [
      '*Click on another pigment* to mix it with the selected one.',
      '*Click on the selected pigment* to unselect it.',
    ];
  }
  return canAddPigment(selection)
    ? [
        '*Click on an unselected pigment* to add it to the mix.',
        '*Click on a selected pigment* to remove it.',
      ]
    : ['*Click on a selected pigment* to remove it.'];
}

export interface HelpPart {
  text: string;
  /** The user action (a click, a drag, ...) rather than its explanation: shown highlighted. */
  action: boolean;
}

/** Splits a help line into plain and highlighted parts; `*action*` marks an action. */
export function helpParts(line: string): HelpPart[] {
  return line
    .split('*')
    .map((text, i) => ({ text, action: i % 2 === 1 }))
    .filter((part) => part.text !== '');
}
