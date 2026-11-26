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
    expect(state.pair()?.map((p) => p.id)).toEqual(['lemon-yellow', 'phthalo-blue-reddish']);
    expect(state.showMixtureGamut()).toBe(true);
    expect(state.mixtureSamples().length).toBeGreaterThan(5000);
  });

  it('builds a transition with exact pigment ends and no mixture samples while the gamut is off', () => {
    const state = setup();
    const t = state.transition()!;
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
    expect(state.transition()).toBeNull();
    expect(state.pair()).toBeNull();
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
    state.pick(green, false);
    expect(state.selection()).toEqual(['lemon-yellow', 'viridian']);
    state.pick(green, true);
    expect(state.selection()).toEqual(['viridian', 'lemon-yellow']);
    const blue = state.allPigments.find((p) => p.id === 'ultramarine-deep')!;
    state.pick(blue, true);
    expect(state.selection()).toEqual(['ultramarine-deep', 'lemon-yellow']);
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
    const flat = state.transition()!.samples.length;
    state.mode.set('3d');
    const full = state.transition()!.samples.length;
    // Black and white are almost on top of each other on the a/b plane, but far apart in lightness.
    expect(flat).toBeLessThan(15);
    expect(full).toBeGreaterThan(60);
  });
});
