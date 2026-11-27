import { oklabToOklch } from '../color/color';
import type { Pigment } from './pigments';

/**
 * Finding pigments in the list: color families, full-text search and ordering. Pure functions over
 * the dataset, with no UI in them (ADR 0020).
 */

export type FamilyId =
  'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'violet' | 'brown' | 'black' | 'white' | 'other';

export interface ColorFamily {
  id: FamilyId;
  label: string;
}

/** The families in the order the filter shows them. `other` collects everything else. */
export const COLOR_FAMILIES: readonly ColorFamily[] = [
  { id: 'red', label: 'Red' },
  { id: 'orange', label: 'Orange' },
  { id: 'yellow', label: 'Yellow' },
  { id: 'green', label: 'Green' },
  { id: 'blue', label: 'Blue' },
  { id: 'violet', label: 'Violet' },
  { id: 'brown', label: 'Brown' },
  { id: 'black', label: 'Black' },
  { id: 'white', label: 'White' },
  { id: 'other', label: 'Other' },
];

/** Letters of the Colour Index generic name (PR in PR122) and the family they belong to. */
const FAMILY_BY_PREFIX: Record<string, FamilyId> = {
  PR: 'red',
  PO: 'orange',
  PY: 'yellow',
  PG: 'green',
  PB: 'blue',
  PV: 'violet',
  PBr: 'brown',
  PBk: 'black',
  PW: 'white',
};

/**
 * The color family of a pigment, from its Colour Index code: PR... is red, PB... blue, PBr...
 * brown and so on. A natural pigment (N instead of P: NR9, NB1) belongs to the family of its
 * synthetic twin (PR, PB). Oddities like P-T are `other`.
 */
export function colorFamily(code: string): FamilyId {
  const prefix = /^[A-Za-z]+/.exec(code)?.[0] ?? '';
  const synthetic = prefix.startsWith('N') ? `P${prefix.slice(1)}` : prefix;
  return FAMILY_BY_PREFIX[synthetic] ?? 'other';
}

/** Lowercase and without accents, so "Ultramarine" and "ultramarine" or "Cadmium" match alike. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Full-text search in a pigment's name and code. The query is split into words and every word must
 * appear (anywhere, in any order) in the name or the code, ignoring case and accents: "blue ultra"
 * finds Ultramarine blue, "pr 122" and "pr122" both find PR122. An empty query matches everything.
 */
export function matchesQuery(pigment: Pigment, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const name = normalize(pigment.name);
  const code = normalize(pigment.code);
  return words.every((w) => name.includes(w) || code.includes(w));
}

export type PigmentOrder = 'hue' | 'name';

/** Below this OKLab chroma a color has no usable hue (blacks, whites, grays). */
const ACHROMATIC_CHROMA = 0.02;

/**
 * Where the hue order starts and ends, in degrees on the OKLab hue wheel. Hue is a circle, so the
 * list has to be cut open somewhere. 0° would slice through the reds (the purple-leaning ones sit at
 * 345° to 359°, the others at 3° to 39°), so the cut is in the empty gap between the yellow-greens
 * and the yellows: Terre verte is at 116°, the greenest yellow at 105°. The list then reads from
 * yellow through orange, red and violet to blue and green.
 */
export const HUE_ORDER_START = 110;

/**
 * A new array in the requested order. `hue` goes round the OKLab hue wheel of the plot in decreasing
 * direction, starting at `HUE_ORDER_START` (110°, yellow) and ending just above it (green); colors
 * with no usable hue (blacks, whites) come last, lightest first. `name` is alphabetical by pigment
 * name. Ties are broken by name.
 */
export function sortPigments(pigments: readonly Pigment[], order: PigmentOrder): Pigment[] {
  const byName = (a: Pigment, b: Pigment) =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
  if (order === 'name') return [...pigments].sort(byName);
  const keyed = pigments.map((p) => {
    const { l, c, h } = oklabToOklch(p.oklab);
    // Degrees travelled from the start going down; 0 for a color exactly at the start.
    const turn = (HUE_ORDER_START - h + 360) % 360;
    return { p, l, gray: c < ACHROMATIC_CHROMA, turn };
  });
  keyed.sort((x, y) => {
    if (x.gray !== y.gray) return x.gray ? 1 : -1;
    if (x.gray) return y.l - x.l || byName(x.p, y.p);
    return x.turn - y.turn || byName(x.p, y.p);
  });
  return keyed.map((k) => k.p);
}

/** The pigments of one family, or all of them for `'all'`. */
export function filterByFamily(pigments: readonly Pigment[], family: FamilyId | 'all'): Pigment[] {
  return family === 'all' ? [...pigments] : pigments.filter((p) => colorFamily(p.code) === family);
}

/** Search, family filter and order in one step: what the pigment list shows. */
export function findPigments(
  pigments: readonly Pigment[],
  options: { query: string; family: FamilyId | 'all'; order: PigmentOrder },
): Pigment[] {
  return sortPigments(
    filterByFamily(pigments, options.family).filter((p) => matchesQuery(p, options.query)),
    options.order,
  );
}
