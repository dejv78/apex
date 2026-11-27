import {
  MAX_CONNECTIONS,
  canAddPigment,
  connectionCount,
  clickPigment,
  makeAnchor,
  setSlot,
  slotsFor,
  togglePigment,
} from './selection';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

describe('connection limit', () => {
  it('counts every pigment mixed with every other', () => {
    expect([0, 1, 2, 3, 5, 20].map(connectionCount)).toEqual([0, 0, 1, 3, 10, 190]);
  });

  it('allows 20 pigments (190 connections) but not a 21st (210), with the limit at 200', () => {
    expect(MAX_CONNECTIONS).toBe(200);
    expect(canAddPigment(ids(19))).toBe(true);
    expect(canAddPigment(ids(20))).toBe(false);
  });
});

describe('clickPigment', () => {
  it('makes the first clicked pigment the anchor', () => {
    expect(clickPigment([], 'a')).toEqual(['a']);
  });

  it('adds the second clicked pigment as the mixing partner of the anchor', () => {
    expect(clickPigment(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('replaces only the partner when a third one is clicked, keeping the anchor', () => {
    expect(clickPigment(['a', 'b'], 'c')).toEqual(['a', 'c']);
    expect(clickPigment(['a', 'c'], 'd')).toEqual(['a', 'd']);
  });

  it('resets a multi-selection to the anchor and the clicked pigment', () => {
    expect(clickPigment(['a', 'b', 'c', 'd'], 'e')).toEqual(['a', 'e']);
  });

  it('unselects a clicked second pigment and keeps the anchor', () => {
    expect(clickPigment(['a', 'b'], 'b')).toEqual(['a']);
  });

  it('unselects a clicked anchor, which promotes the remaining pigment to anchor', () => {
    expect(clickPigment(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('unselects the only selected pigment and nothing else happens', () => {
    expect(clickPigment(['a'], 'a')).toEqual([]);
  });

  it('does not mutate its input', () => {
    const input = ['a', 'b'];
    clickPigment(input, 'c');
    expect(input).toEqual(['a', 'b']);
  });
});

describe('togglePigment (shift+click)', () => {
  it('adds an unselected pigment and keeps the others', () => {
    expect(togglePigment([], 'a')).toEqual(['a']);
    expect(togglePigment(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
  });

  it('refuses to add a pigment that would exceed the connection limit', () => {
    expect(togglePigment(ids(20), 'x')).toEqual(ids(20));
    expect(togglePigment(ids(19), 'x')).toHaveLength(20);
  });

  it('removes a selected pigment, also at the limit', () => {
    expect(togglePigment(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
    expect(togglePigment(ids(20), 'p5')).toHaveLength(19);
  });

  it('promotes the next pigment when the anchor is removed', () => {
    expect(togglePigment(['a', 'b', 'c'], 'a')).toEqual(['b', 'c']);
  });

  it('does not mutate its input', () => {
    const input = ['a', 'b'];
    togglePigment(input, 'c');
    expect(input).toEqual(['a', 'b']);
  });
});

describe('slotsFor', () => {
  it('offers N + 1 dropdowns until the connection limit is reached', () => {
    expect(slotsFor([]).map((s) => s.id)).toEqual([null]);
    expect(slotsFor(['a']).map((s) => s.id)).toEqual(['a', null]);
    expect(slotsFor(['a', 'b']).map((s) => s.id)).toEqual(['a', 'b', null]);
    expect(slotsFor(['a', 'b', 'c', 'd', 'e']).map((s) => s.id)).toHaveLength(6);
    expect(slotsFor(ids(19))).toHaveLength(20); // 190 connections: room for a 20th
    expect(slotsFor(ids(20))).toHaveLength(20); // 190 connections, a 21st would make 210
  });

  it('labels the first dropdown Anchor and the others Mix with', () => {
    expect(slotsFor(['a']).map((s) => s.label)).toEqual(['Anchor', 'Mix with']);
    expect(slotsFor([]).map((s) => s.label)).toEqual(['Anchor']);
  });
});

describe('setSlot', () => {
  it('appends when the empty dropdown picks a pigment', () => {
    expect(setSlot([], 0, 'a')).toEqual(['a']);
    expect(setSlot(['a'], 1, 'b')).toEqual(['a', 'b']);
  });

  it('replaces the pigment of a filled dropdown', () => {
    expect(setSlot(['a', 'b'], 1, 'c')).toEqual(['a', 'c']);
    expect(setSlot(['a', 'b'], 0, 'c')).toEqual(['c', 'b']);
  });

  it('clearing the anchor promotes the next pigment, as clicking it does', () => {
    expect(setSlot(['a', 'b'], 0, null)).toEqual(['b']);
    expect(setSlot(['a', 'b'], 1, null)).toEqual(['a']);
  });

  it('ignores a pigment that is already selected in another dropdown', () => {
    expect(setSlot(['a', 'b'], 1, 'a')).toEqual(['a', 'b']);
  });

  it('appends below the connection limit and refuses at it', () => {
    expect(setSlot(['a', 'b'], 2, 'c')).toEqual(['a', 'b', 'c']);
    expect(setSlot(ids(20), 20, 'x')).toEqual(ids(20));
  });

  it('still replaces and clears pigments at the connection limit', () => {
    expect(setSlot(ids(20), 3, 'x')[3]).toBe('x');
    expect(setSlot(ids(20), 3, null)).toHaveLength(19);
  });
});

describe('makeAnchor (ctrl+click)', () => {
  it('makes the first pigment the anchor when nothing is selected', () => {
    expect(makeAnchor([], 'a')).toEqual(['a']);
  });

  it('replaces a lone anchor', () => {
    expect(makeAnchor(['a'], 'b')).toEqual(['b']);
  });

  it('replaces the anchor with an unselected pigment and keeps the partner', () => {
    expect(makeAnchor(['a', 'b'], 'c')).toEqual(['c', 'b']);
  });

  it('swaps the roles when the partner is ctrl+clicked', () => {
    expect(makeAnchor(['a', 'b'], 'b')).toEqual(['b', 'a']);
  });

  it('does nothing when the anchor itself is ctrl+clicked', () => {
    expect(makeAnchor(['a', 'b'], 'a')).toEqual(['a', 'b']);
  });

  it('does not mutate its input', () => {
    const input = ['a', 'b'];
    makeAnchor(input, 'b');
    expect(input).toEqual(['a', 'b']);
  });
});
