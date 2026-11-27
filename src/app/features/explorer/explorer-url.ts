import { PIGMENTS } from '../../../core/pigments/pigments';
import { canAddPigment } from './selection';

/**
 * Everything of the explorer that goes into the address, so a mix can be shared as a link
 * (ADR 0021). The 3D camera and the open dialog are not part of it.
 */
export interface ExplorerSnapshot {
  /** Selected pigment ids, in selection order. */
  selection: string[];
  mode: '2d' | '3d';
  showHidden: boolean;
  showMixtureGamut: boolean;
  showLinear: boolean;
  showSrgb: boolean;
  showMixtureCloud: boolean;
  anchored: boolean;
}

/** The state of a fresh page. Only what differs from it is written to the address. */
export const DEFAULT_SNAPSHOT: Readonly<ExplorerSnapshot> = {
  selection: ['lemon-yellow', 'phthalo-blue-reddish'],
  mode: '2d',
  showHidden: false,
  showMixtureGamut: true,
  showLinear: false,
  showSrgb: false,
  showMixtureCloud: false,
  anchored: true,
};

/** Query parameter of each on/off setting. Written as `1` or `0`, and only when not the default. */
const FLAGS = {
  showHidden: 'hidden',
  showMixtureGamut: 'gamut',
  showLinear: 'linear',
  showSrgb: 'srgb',
  showMixtureCloud: 'cloud',
  anchored: 'anchored',
} as const;

type FlagKey = keyof typeof FLAGS;
const FLAG_KEYS = Object.keys(FLAGS) as FlagKey[];

/**
 * The query string (without the `?`) for a state: empty for the default state. The pigments are
 * `p=id,id,...` (ids are lowercase slugs, so commas stay readable); `p=` alone means an empty
 * selection, and no `p` the default pair.
 */
export function toQuery(state: ExplorerSnapshot): string {
  const parts: string[] = [];
  if (state.selection.join(',') !== DEFAULT_SNAPSHOT.selection.join(',')) {
    parts.push(`p=${state.selection.map(encodeURIComponent).join(',')}`);
  }
  if (state.mode !== DEFAULT_SNAPSHOT.mode) parts.push(`view=${state.mode}`);
  for (const key of FLAG_KEYS) {
    if (state[key] !== DEFAULT_SNAPSHOT[key]) parts.push(`${FLAGS[key]}=${state[key] ? 1 : 0}`);
  }
  return parts.join('&');
}

/**
 * The state a query string describes, starting from the defaults. Anything unusable is ignored
 * rather than failing: unknown pigment ids, repeated ids, pigments beyond the connection limit,
 * unknown parameters and values. A link can be old, hand-edited or cut short.
 */
export function fromQuery(query: string): ExplorerSnapshot {
  const state: ExplorerSnapshot = {
    ...DEFAULT_SNAPSHOT,
    selection: [...DEFAULT_SNAPSHOT.selection],
  };
  const params = new URLSearchParams(query);

  const p = params.get('p');
  if (p !== null) {
    const known = new Set(PIGMENTS.map((x) => x.id));
    const selection: string[] = [];
    for (const id of p.split(',')) {
      if (known.has(id) && !selection.includes(id) && canAddPigment(selection)) selection.push(id);
    }
    state.selection = selection;
  }
  if (params.get('view') === '3d') state.mode = '3d';
  for (const key of FLAG_KEYS) {
    const value = params.get(FLAGS[key]);
    if (value === '1') state[key] = true;
    else if (value === '0') state[key] = false;
  }
  return state;
}
