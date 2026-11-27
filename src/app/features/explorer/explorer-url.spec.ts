import { MAX_CONNECTIONS } from './selection';
import { PIGMENTS } from '../../../core/pigments/pigments';
import { DEFAULT_SNAPSHOT, type ExplorerSnapshot, fromQuery, toQuery } from './explorer-url';

const snapshot = (changes: Partial<ExplorerSnapshot> = {}): ExplorerSnapshot => ({
  ...DEFAULT_SNAPSHOT,
  selection: [...DEFAULT_SNAPSHOT.selection],
  ...changes,
});

describe('explorer URL', () => {
  it('writes nothing for the default state, and reads it back from nothing', () => {
    expect(toQuery(snapshot())).toBe('');
    expect(fromQuery('')).toEqual(snapshot());
  });

  it('writes the selection as readable comma-separated ids', () => {
    expect(toQuery(snapshot({ selection: ['viridian', 'cobalt-blue', 'lemon-yellow'] }))).toBe(
      'p=viridian,cobalt-blue,lemon-yellow',
    );
  });

  it('keeps the selection order, which decides the chip order', () => {
    expect(fromQuery('p=viridian,lemon-yellow').selection).toEqual(['viridian', 'lemon-yellow']);
  });

  it('tells an empty selection from the default one', () => {
    expect(toQuery(snapshot({ selection: [] }))).toBe('p=');
    expect(fromQuery('p=').selection).toEqual([]);
    expect(fromQuery('').selection).toEqual(DEFAULT_SNAPSHOT.selection);
  });

  it('writes only the settings that differ from the defaults', () => {
    expect(toQuery(snapshot({ mode: '3d' }))).toBe('view=3d');
    expect(toQuery(snapshot({ showMixtureGamut: false, showSrgb: true, anchored: false }))).toBe(
      'gamut=0&srgb=1&anchored=0',
    );
  });

  it('round-trips any state', () => {
    const states = [
      snapshot({ selection: ['viridian'], mode: '3d' }),
      snapshot({ selection: [], showHidden: true, showLinear: true }),
      snapshot({
        showMixtureGamut: false,
        showSrgb: true,
        showMixtureCloud: true,
        anchored: false,
      }),
      snapshot({ selection: PIGMENTS.slice(0, 20).map((p) => p.id), mode: '3d', showHidden: true }),
    ];
    for (const s of states) expect(fromQuery(toQuery(s))).toEqual(s);
  });

  it('accepts a leading question mark, as in location.search', () => {
    expect(fromQuery('?p=viridian&view=3d')).toEqual(
      snapshot({ selection: ['viridian'], mode: '3d' }),
    );
  });

  it('ignores unknown, repeated and misspelled pigments, and keeps the rest', () => {
    expect(fromQuery('p=viridian,nonsense,viridian,,lemon-yellow').selection).toEqual([
      'viridian',
      'lemon-yellow',
    ]);
    expect(fromQuery('p=nonsense').selection).toEqual([]);
  });

  it('cuts a selection that would exceed the connection limit, like clicking would', () => {
    const ids = PIGMENTS.slice(0, 30).map((p) => p.id);
    const selection = fromQuery(`p=${ids.join(',')}`).selection;
    expect(selection).toEqual(ids.slice(0, 20)); // 190 connections; a 21st would make 210
    expect((selection.length * (selection.length - 1)) / 2).toBeLessThanOrEqual(MAX_CONNECTIONS);
  });

  it('ignores unknown parameters and values it cannot use', () => {
    expect(fromQuery('view=sideways&gamut=maybe&x=1&hidden=1')).toEqual(
      snapshot({ showHidden: true }),
    );
  });
});
