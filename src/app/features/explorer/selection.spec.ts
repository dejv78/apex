import { MAX_PIGMENTS, clickPigment, makeAnchor, setSlot, slotsFor } from './selection';

describe('clickPigment', () => {
  it('makes the first clicked pigment the anchor', () => {
    expect(clickPigment([], 'a')).toEqual(['a']);
  });

  it('adds the second clicked pigment as the mixing partner of the anchor', () => {
    expect(clickPigment(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('replaces only the second pigment when a third one is clicked, keeping the anchor', () => {
    expect(clickPigment(['a', 'b'], 'c')).toEqual(['a', 'c']);
    expect(clickPigment(['a', 'c'], 'd')).toEqual(['a', 'd']);
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

  it('generalizes to a larger maximum: new pigments are added, then the last is replaced', () => {
    expect(clickPigment(['a', 'b'], 'c', 3)).toEqual(['a', 'b', 'c']);
    expect(clickPigment(['a', 'b', 'c'], 'd', 3)).toEqual(['a', 'b', 'd']);
    expect(clickPigment(['a', 'b', 'c'], 'a', 3)).toEqual(['b', 'c']);
  });
});

describe('slotsFor', () => {
  it('offers N + 1 dropdowns up to the maximum', () => {
    expect(MAX_PIGMENTS).toBe(2);
    expect(slotsFor([]).map((s) => s.id)).toEqual([null]);
    expect(slotsFor(['a']).map((s) => s.id)).toEqual(['a', null]);
    expect(slotsFor(['a', 'b']).map((s) => s.id)).toEqual(['a', 'b']);
    expect(slotsFor(['a', 'b'], 3).map((s) => s.id)).toEqual(['a', 'b', null]);
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

  it('never grows beyond the maximum', () => {
    expect(setSlot(['a', 'b'], 2, 'c')).toEqual(['a', 'b']);
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
