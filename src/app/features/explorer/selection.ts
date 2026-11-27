/**
 * The pigments chosen for mixing, as an ordered list of ids. The first one is the anchor: it stays
 * put while the others are swapped. Pure functions, so the click and dropdown rules are testable.
 *
 * Rules:
 * - Clicking an unselected pigment keeps the anchor and makes it the only partner (a plain pair).
 * - Clicking a selected pigment removes it. Removing the anchor promotes the next pigment.
 * - Shift+click adds an unselected pigment to the selection, or removes a selected one (see
 *   `togglePigment`).
 * - Ctrl+click makes a pigment the anchor (see `makeAnchor`).
 * - There are always `selection.length + 1` dropdowns, unless adding a pigment would exceed
 *   `MAX_CONNECTIONS`.
 */

/**
 * Hard limit on the mixing trails (connections) drawn at once, whatever the selection mode. Each
 * trail costs rendering time, and this keeps the app smooth on weak hardware (ADR 0012). Adding a
 * pigment that would exceed it is refused; removing, replacing and re-anchoring are always allowed.
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

export interface Slot {
  index: number;
  /** Selected pigment id, or `null` for the empty dropdown that adds the next pigment. */
  id: string | null;
  label: string;
}

export function clickPigment(selection: readonly string[], id: string): string[] {
  if (selection.includes(id)) return selection.filter((s) => s !== id);
  return selection.length === 0 ? [id] : [selection[0], id];
}

/**
 * Shift+click: add an unselected pigment, keeping the rest; remove a selected one. Adding is
 * refused (the selection is unchanged) when it would exceed `MAX_CONNECTIONS`.
 */
export function togglePigment(selection: readonly string[], id: string): string[] {
  if (selection.includes(id)) return selection.filter((s) => s !== id);
  return canAddPigment(selection) ? [...selection, id] : [...selection];
}

/**
 * Ctrl+click: the pigment becomes the anchor. A selected pigment moves to the front (so the old
 * anchor becomes a partner); an unselected one replaces the anchor and keeps the partners.
 */
export function makeAnchor(selection: readonly string[], id: string): string[] {
  if (selection[0] === id) return [...selection];
  if (selection.includes(id)) return [id, ...selection.filter((s) => s !== id)];
  return selection.length === 0 ? [id] : [id, ...selection.slice(1)];
}

/**
 * A dropdown picked a pigment (`id`) or cleared its slot (`null`). Picking in the empty slot
 * appends; a pigment that is already selected elsewhere is ignored (the UI disables it too).
 */
export function setSlot(selection: readonly string[], index: number, id: string | null): string[] {
  if (id === null) return selection.filter((_, i) => i !== index);
  if (selection.some((s, i) => s === id && i !== index)) return [...selection];
  if (index >= selection.length)
    return canAddPigment(selection) ? [...selection, id] : [...selection];
  return selection.map((s, i) => (i === index ? id : s));
}

export function slotsFor(selection: readonly string[]): Slot[] {
  const count = selection.length + (canAddPigment(selection) ? 1 : 0);
  return Array.from({ length: count }, (_, index) => ({
    index,
    id: selection[index] ?? null,
    label: index === 0 ? 'Anchor' : 'Mix with',
  }));
}
