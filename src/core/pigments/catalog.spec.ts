import { oklabToOklch } from '../color/color';
import {
  COLOR_FAMILIES,
  HUE_ORDER_START,
  colorFamily,
  filterByFamily,
  findPigments,
  matchesQuery,
  sortPigments,
} from './catalog';
import { PIGMENTS, pigmentById, type Pigment } from './pigments';

describe('colorFamily', () => {
  it('maps Colour Index prefixes to families', () => {
    expect(colorFamily('PR122')).toBe('red');
    expect(colorFamily('PO73')).toBe('orange');
    expect(colorFamily('PY3')).toBe('yellow');
    expect(colorFamily('PG7')).toBe('green');
    expect(colorFamily('PB29')).toBe('blue');
    expect(colorFamily('PV19')).toBe('violet');
    expect(colorFamily('PBr7')).toBe('brown');
    expect(colorFamily('PBk9')).toBe('black');
    expect(colorFamily('PW6')).toBe('white');
  });

  it('puts a natural pigment (N) into the family of its synthetic twin (P)', () => {
    expect(colorFamily('NR9')).toBe('red');
    expect(colorFamily('NB1')).toBe('blue');
    expect(colorFamily('NBr8')).toBe('brown');
  });

  it('puts oddities into Other', () => {
    expect(colorFamily('P-T')).toBe('other');
    expect(colorFamily('N')).toBe('other');
    expect(colorFamily('')).toBe('other');
  });

  it('does not mistake PBr (brown) or PBk (black) for PB (blue)', () => {
    expect(pigmentById('burnt-umber').code).toBe('PBr7');
    expect(colorFamily(pigmentById('burnt-umber').code)).toBe('brown');
    expect(colorFamily(pigmentById('ivory-black').code)).toBe('black');
  });

  it('gives every pigment of the dataset exactly one listed family', () => {
    const ids = new Set(COLOR_FAMILIES.map((f) => f.id));
    for (const p of PIGMENTS) expect(ids.has(colorFamily(p.code))).toBe(true);
    const total = COLOR_FAMILIES.reduce((n, f) => n + filterByFamily(PIGMENTS, f.id).length, 0);
    expect(total).toBe(PIGMENTS.length);
  });
});

describe('matchesQuery', () => {
  const ultramarine = pigmentById('ultramarine-deep');
  const names = (q: string) => PIGMENTS.filter((p) => matchesQuery(p, q)).map((p) => p.id);

  it('matches everything for an empty or blank query', () => {
    expect(names('')).toHaveLength(PIGMENTS.length);
    expect(names('   ')).toHaveLength(PIGMENTS.length);
  });

  it('searches the name, ignoring case', () => {
    expect(matchesQuery(ultramarine, 'ULTRAMARINE')).toBe(true);
    expect(matchesQuery(ultramarine, 'tramar')).toBe(true);
    expect(matchesQuery(ultramarine, 'viridian')).toBe(false);
  });

  it('searches the code, with or without a space', () => {
    const code = ultramarine.code; // PB29
    expect(matchesQuery(ultramarine, code.toLowerCase())).toBe(true);
    expect(matchesQuery(ultramarine, 'pb 29')).toBe(true);
    expect(matchesQuery(ultramarine, 'pb29')).toBe(true);
    expect(matchesQuery(ultramarine, 'pb30')).toBe(false);
  });

  it('needs every word, in any order, in the name or the code', () => {
    expect(matchesQuery(ultramarine, 'deep ultramarine')).toBe(true);
    expect(matchesQuery(ultramarine, 'ultramarine pb29')).toBe(true);
    expect(matchesQuery(ultramarine, 'ultramarine viridian')).toBe(false);
  });

  it('ignores accents on either side', () => {
    expect(matchesQuery({ ...ultramarine, name: 'Crème rouge' }, 'creme')).toBe(true);
    expect(matchesQuery(ultramarine, 'ultramariné')).toBe(true);
  });
});

describe('sortPigments', () => {
  it('orders by name, alphabetically and without regard to case, and does not touch the input', () => {
    const input = [...PIGMENTS];
    const sorted = sortPigments(PIGMENTS, 'name');
    expect(PIGMENTS).toEqual(input);
    expect(sorted).toHaveLength(PIGMENTS.length);
    for (let i = 1; i < sorted.length; i++)
      expect(
        sorted[i - 1].name.localeCompare(sorted[i].name, 'en', { sensitivity: 'base' }),
      ).toBeLessThanOrEqual(0);
  });

  const hueOf = (p: Pigment) => oklabToOklch(p.oklab).h;
  const chromatic = (p: Pigment) => oklabToOklch(p.oklab).c >= 0.02;

  it('orders by decreasing hue angle from the start of the order, colors with no hue last', () => {
    const sorted = sortPigments(PIGMENTS, 'hue');
    const lch = sorted.map((p) => oklabToOklch(p.oklab));
    const firstGray = lch.findIndex((c) => c.c < 0.02);
    expect(firstGray).toBeGreaterThan(50);
    const turn = (h: number) => (HUE_ORDER_START - h + 360) % 360;
    for (let i = 1; i < firstGray; i++)
      expect(turn(lch[i].h)).toBeGreaterThanOrEqual(turn(lch[i - 1].h));
    for (let i = firstGray; i < lch.length; i++) expect(lch[i].c).toBeLessThan(0.02);
    for (let i = firstGray + 1; i < lch.length; i++)
      expect(lch[i].l).toBeLessThanOrEqual(lch[i - 1].l);
  });

  it('cuts the hue circle in a gap, so no pigment sits next to the cut', () => {
    for (const p of PIGMENTS.filter(chromatic))
      expect(Math.abs(hueOf(p) - HUE_ORDER_START)).toBeGreaterThan(4);
  });

  it('starts at the yellows and ends at the greens', () => {
    const sorted = sortPigments(PIGMENTS, 'hue').filter(chromatic);
    expect(sorted[0].code.startsWith('PY')).toBe(true);
    expect(sorted[sorted.length - 1].code.startsWith('PG')).toBe(true);
  });

  it('keeps the purple-leaning reds at the end of the reds, not split off at the start', () => {
    const reds = findPigments(PIGMENTS, { query: '', family: 'red', order: 'hue' }).map(
      (p) => p.name,
    );
    expect(reds.slice(-2)).toEqual(['YInTiCo red', 'Ultramarine pink']);
    expect(reds[0]).not.toBe('YInTiCo red');
  });
});

describe('findPigments', () => {
  it('lists every pigment, including the ones hidden from the plot, when nothing is asked', () => {
    expect(findPigments(PIGMENTS, { query: '', family: 'all', order: 'name' })).toHaveLength(
      PIGMENTS.length,
    );
    expect(PIGMENTS.some((p) => p.hideByDefault)).toBe(true);
  });

  it('combines the family filter, the search and the order', () => {
    const blues = findPigments(PIGMENTS, { query: '', family: 'blue', order: 'name' });
    expect(blues.length).toBeGreaterThan(5);
    expect(blues.every((p) => /^[PN]B\d/.test(p.code))).toBe(true);
    const cobalt = findPigments(PIGMENTS, { query: 'cobalt', family: 'blue', order: 'hue' });
    expect(cobalt.length).toBeGreaterThan(0);
    expect(cobalt.every((p) => /cobalt/i.test(p.name))).toBe(true);
    expect(findPigments(PIGMENTS, { query: 'cobalt', family: 'red', order: 'name' })).toEqual([]);
  });
});
