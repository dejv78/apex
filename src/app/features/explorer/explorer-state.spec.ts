import { TestBed } from '@angular/core/testing';
import { ExplorerState } from './explorer-state';

describe('ExplorerState', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [ExplorerState] });
    return TestBed.inject(ExplorerState);
  }

  it('starts in 2D with a pre-selected pair and the mixture gamut shown', () => {
    const state = setup();
    expect(state.mode()).toBe('2d');
    expect(state.selection()).toEqual(['lemon-yellow', 'phthalo-blue-reddish']);
    expect(state.pairs().map((p) => [p.a.id, p.b.id])).toEqual([
      ['lemon-yellow', 'phthalo-blue-reddish'],
    ]);
    expect(state.showMixtureGamut()).toBe(true);
    expect(state.mixtureSamples().length).toBeGreaterThan(5000);
  });

  it('builds a transition with exact pigment ends and no mixture samples while the gamut is off', () => {
    const state = setup();
    const t = state.pairs()[0];
    expect(t.samples.length).toBeGreaterThan(10);
    expect(t.samples[0].t).toBe(0);
    expect(t.samples[t.samples.length - 1].t).toBe(1);
    // With the true-color correction the ends sit on the pigments' true OKLab colors.
    expect(t.samples[0].color.a).toBeCloseTo(t.a.oklab.a, 9);
    state.showMixtureGamut.set(false);
    expect(state.mixtureSamples()).toEqual([]);
  });

  it('has no transition for a lone pigment, which is then the "solo" pigment', () => {
    const state = setup();
    state.selection.set(['lemon-yellow']);
    expect(state.pairs()).toEqual([]);
    expect(state.solo()?.id).toBe('lemon-yellow');
    state.selection.set([]);
    expect(state.solo()).toBeNull();
  });

  it('shows hidden pigments only when asked to', () => {
    const state = setup();
    const defaults = state.visible().length;
    expect(defaults).toBeLessThan(state.allPigments.length);
    state.showHidden.set(true);
    expect(state.visible().length).toBe(state.allPigments.length);
  });

  it('applies the click rules, with ctrl/cmd making the anchor', () => {
    const state = setup();
    const green = state.allPigments.find((p) => p.id === 'viridian')!;
    state.pick(green);
    expect(state.selection()).toEqual(['lemon-yellow', 'viridian']);
    state.pick(green, { anchor: true });
    expect(state.selection()).toEqual(['viridian', 'lemon-yellow']);
    const blue = state.allPigments.find((p) => p.id === 'ultramarine-deep')!;
    state.pick(blue, { anchor: true });
    expect(state.selection()).toEqual(['ultramarine-deep', 'lemon-yellow']);
  });

  it('shift+click adds pigments, and every selected pigment gets a trail to every other', () => {
    const state = setup();
    const byId = (id: string) => state.allPigments.find((p) => p.id === id)!;
    state.pick(byId('viridian'), { additive: true });
    state.pick(byId('ultramarine-deep'), { additive: true });
    expect(state.selection()).toEqual([
      'lemon-yellow',
      'phthalo-blue-reddish',
      'viridian',
      'ultramarine-deep',
    ]);
    expect(state.pairs()).toHaveLength(6);
    expect(state.slots()).toHaveLength(5);
    // Every trail runs between exactly its two pigments.
    for (const { a, b, samples } of state.pairs()) {
      expect(samples[0].color.a).toBeCloseTo(a.oklab.a, 9);
      expect(samples[samples.length - 1].color.a).toBeCloseTo(b.oklab.a, 9);
    }
    state.pick(byId('viridian'), { additive: true });
    expect(state.pairs()).toHaveLength(3);
    // A plain click resets to the anchor and the clicked pigment.
    state.pick(byId('viridian'));
    expect(state.selection()).toEqual(['lemon-yellow', 'viridian']);
  });

  it('reuses cached trails when a pigment is added', () => {
    const state = setup();
    const before = state.pairs()[0].samples;
    state.pick(
      state.allPigments.find((p) => p.id === 'viridian')!,
      { additive: true },
    );
    expect(state.pairs()[0].samples).toBe(before);
  });

  it('clears the whole selection at once', () => {
    const state = setup();
    state.pick(
      state.allPigments.find((p) => p.id === 'viridian')!,
      { additive: true },
    );
    state.clearSelection();
    expect(state.selection()).toEqual([]);
    expect(state.pairs()).toEqual([]);
    expect(state.solo()).toBeNull();
    expect(state.slots().map((s) => s.id)).toEqual([null]);
  });

  it('leaves out the Shift and Ctrl help on touch devices and describes the 3D camera with fingers', () => {
    const state = setup();
    const text = () => state.help().join(' ');
    expect(state.touchOnly()).toBe(false); // no matchMedia in the test environment
    expect(text()).toContain('Shift+click');
    state.touchOnly.set(true);
    expect(text()).not.toMatch(/shift|ctrl/i);
    expect(text()).toContain('Click* a pigment');
    state.mode.set('3d');
    expect(text()).toContain('*pinch* to zoom, *two-finger drag* to pan');
    expect(text()).not.toMatch(/scroll|right-drag/);
    state.touchOnly.set(false);
    expect(text()).toContain('*scroll* to zoom, *right-drag* to pan');
    expect(text()).not.toMatch(/pinch|two-finger/);
  });

  it('keeps the dropdown rules: a taken pigment is disabled elsewhere, clearing the anchor promotes', () => {
    const state = setup();
    expect(state.isTaken('lemon-yellow', 1)).toBe(true);
    expect(state.isTaken('lemon-yellow', 0)).toBe(false);
    state.pickInSlot(0, null);
    expect(state.selection()).toEqual(['phthalo-blue-reddish']);
    expect(state.slots().map((s) => s.label)).toEqual(['Anchor', 'Mix with']);
  });

  it('samples the mixtures for the 3D point cloud alone, without the hull (and not in 2D)', () => {
    const state = setup();
    expect(state.showMixtureCloud()).toBe(false);
    state.showMixtureGamut.set(false);
    state.showMixtureCloud.set(true);
    expect(state.mixtureSamples()).toEqual([]); // 2D: the cloud toggle has no effect
    state.mode.set('3d');
    expect(state.mixtureSamples().length).toBeGreaterThan(5000);
    state.showMixtureCloud.set(false);
    expect(state.mixtureSamples()).toEqual([]);
  });

  it('spaces the transition by a/b distance in 2D and by full OKLab distance in 3D', () => {
    const state = setup();
    state.selection.set(['ivory-black', 'titanium-white']);
    const flat = state.pairs()[0].samples.length;
    state.mode.set('3d');
    const full = state.pairs()[0].samples.length;
    // Black and white are almost on top of each other on the a/b plane, but far apart in lightness.
    expect(flat).toBeLessThan(15);
    expect(full).toBeGreaterThan(60);
  });
});
