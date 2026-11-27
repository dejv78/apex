import {
  MAX_CONNECTIONS,
  canAddPigment,
  connectionCount,
  helpParts,
  selectionHelp,
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

describe('togglePigment (click or tap)', () => {
  it('adds an unselected pigment and keeps the others, in order', () => {
    expect(togglePigment([], 'a')).toEqual(['a']);
    expect(togglePigment(['a'], 'b')).toEqual(['a', 'b']);
    expect(togglePigment(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
  });

  it('removes a selected pigment, wherever it is in the list', () => {
    expect(togglePigment(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
    expect(togglePigment(['a', 'b', 'c'], 'a')).toEqual(['b', 'c']);
    expect(togglePigment(['a'], 'a')).toEqual([]);
  });

  it('refuses to add a pigment that would exceed the connection limit, but still removes', () => {
    expect(togglePigment(ids(20), 'x')).toEqual(ids(20));
    expect(togglePigment(ids(19), 'x')).toHaveLength(20);
    expect(togglePigment(ids(20), 'p5')).toHaveLength(19);
  });

  it('does not mutate its input', () => {
    const input = ['a', 'b'];
    togglePigment(input, 'c');
    togglePigment(input, 'a');
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

  it('labels selected dropdowns Pigment and the empty one Add a pigment (no anchor)', () => {
    expect(slotsFor(['a', 'b']).map((s) => s.label)).toEqual([
      'Pigment',
      'Pigment',
      'Add a pigment',
    ]);
    expect(slotsFor([]).map((s) => s.label)).toEqual(['Add a pigment']);
    expect(slotsFor(ids(20)).map((s) => s.label)).not.toContain('Add a pigment');
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

  it('removes the pigment when its dropdown is cleared, like clicking it does', () => {
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

describe('selectionHelp', () => {
  /** The help as the user reads it, without the `*action*` markers. */
  const text = (selection: string[]) => selectionHelp(selection).join(' ').replaceAll('*', '');

  it('offers selecting a pigment when nothing is selected', () => {
    expect(text([])).toBe('Click a pigment to select it.');
  });

  it('offers mixing another pigment or unselecting when one is selected', () => {
    expect(text(['a'])).toBe(
      'Click another pigment to mix it with the selected one. Click the selected pigment to unselect it.',
    );
  });

  it('offers adding and removing once there are several', () => {
    const help = 'Click a pigment to add it to the mix. Click a selected pigment to remove it.';
    expect(text(['a', 'b'])).toBe(help);
    expect(text(['a', 'b', 'c'])).toBe(help);
    expect(text(ids(19))).toBe(help);
  });

  it('leaves out adding pigments when the connection limit is reached', () => {
    expect(text(ids(20))).toBe('Click a selected pigment to remove it.');
  });

  it('never mentions modifier keys or an anchor, in any state', () => {
    for (const selection of [[], ['a'], ['a', 'b'], ['a', 'b', 'c'], ids(19), ids(20)]) {
      expect(text(selection)).not.toMatch(/shift|ctrl|anchor/i);
    }
  });
});

describe('helpParts', () => {
  it('splits a line into plain text and highlighted actions', () => {
    expect(helpParts('*Click* a pigment.')).toEqual([
      { text: 'Click', action: true },
      { text: ' a pigment.', action: false },
    ]);
    expect(helpParts('*Drag* to rotate, *scroll* to zoom.')).toEqual([
      { text: 'Drag', action: true },
      { text: ' to rotate, ', action: false },
      { text: 'scroll', action: true },
      { text: ' to zoom.', action: false },
    ]);
    expect(helpParts('No actions here.')).toEqual([{ text: 'No actions here.', action: false }]);
  });

  it('marks an action at the start of every help line, and never leaves a marker unpaired', () => {
    for (const selection of [[], ['a'], ['a', 'b'], ['a', 'b', 'c'], ids(20)]) {
      for (const line of selectionHelp(selection)) {
        expect(line.split('*').length % 2).toBe(1);
        expect(helpParts(line)[0].action).toBe(true);
      }
    }
  });
});
