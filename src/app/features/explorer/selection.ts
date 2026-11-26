/**
 * The pigments chosen for mixing, as an ordered list of ids. The first one is the anchor: it stays
 * put while the others are swapped. Pure functions, so the click and dropdown rules are testable.
 *
 * Rules:
 * - Clicking an unselected pigment adds it; when the list is full it replaces the last pigment, so
 *   the anchor (and any middle pigments) stay.
 * - Clicking a selected pigment removes it. Removing the anchor promotes the next pigment.
 * - Ctrl+click makes a pigment the anchor (see `makeAnchor`).
 * - There are always `selection.length + 1` dropdowns until `max` is reached.
 */

/** How many pigments can be mixed at once. The mixing view currently draws one pair. */
export const MAX_PIGMENTS = 2;

export interface Slot {
  index: number;
  /** Selected pigment id, or `null` for the empty dropdown that adds the next pigment. */
  id: string | null;
  label: string;
}

export function clickPigment(
  selection: readonly string[],
  id: string,
  max = MAX_PIGMENTS,
): string[] {
  if (selection.includes(id)) return selection.filter((s) => s !== id);
  if (selection.length < max) return [...selection, id];
  return [...selection.slice(0, max - 1), id];
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
export function setSlot(
  selection: readonly string[],
  index: number,
  id: string | null,
  max = MAX_PIGMENTS,
): string[] {
  if (id === null) return selection.filter((_, i) => i !== index);
  if (selection.some((s, i) => s === id && i !== index)) return [...selection];
  if (index >= selection.length)
    return selection.length < max ? [...selection, id] : [...selection];
  return selection.map((s, i) => (i === index ? id : s));
}

export function slotsFor(selection: readonly string[], max = MAX_PIGMENTS): Slot[] {
  const count = Math.min(selection.length + 1, max);
  return Array.from({ length: count }, (_, index) => ({
    index,
    id: selection[index] ?? null,
    label: index === 0 ? 'Anchor' : 'Mix with',
  }));
}
