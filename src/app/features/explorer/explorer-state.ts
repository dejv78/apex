import { Injectable, computed, signal } from '@angular/core';
import type { Oklab } from '../../../core/color/color';
import { AnchoredModel } from '../../../core/mixing/anchored-model';
import { MixboxModel } from '../../../core/mixing/mixbox-model';
import type { MixingModel } from '../../../core/mixing/mixing-model';
import {
  abDistance,
  evenlySpacedMixCurve,
  labDistance,
  samplePairMixtures,
} from '../../../core/mixing/sampling';
import { PIGMENTS, pigmentById, type Pigment } from '../../../core/pigments/pigments';
import { clickPigment, makeAnchor, setSlot, slotsFor } from './selection';

export type ViewMode = '2d' | '3d';

/** Ratio steps per pigment pair when sampling the mixture gamut. */
export const MIXTURE_STEPS = 8;
/**
 * OKLab distance on the a/b plane between neighboring dots of a transition. Close pigments get
 * few dots, distant pigments many (0.006 is 6 SVG units in the 2D plot).
 */
export const DOT_SPACING = 0.006;

/**
 * State shared by the 2D and 3D plots and the control panel: the pigment selection, the mixing
 * model and the view toggles. Provided by `Explorer`, so each explorer has its own.
 */
@Injectable()
export class ExplorerState {
  readonly allPigments = PIGMENTS;
  readonly mode = signal<ViewMode>('2d');

  private readonly rawModel: MixingModel = new MixboxModel();
  private readonly anchoredModel: MixingModel = new AnchoredModel(this.rawModel);
  /** Pin mixes to the pigments' true OKLab colors (the raw model clamps them to sRGB). */
  readonly anchored = signal(true);
  readonly model = computed<MixingModel>(() =>
    this.anchored() ? this.anchoredModel : this.rawModel,
  );

  readonly showHidden = signal(false);
  /** The hull around all mixtures: the outline in 2D, a translucent solid in 3D. */
  readonly showMixtureGamut = signal(true);
  readonly showLinear = signal(false);
  readonly showSrgb = signal(false);
  /** 3D only: every sampled mixture as a point, in its own color. */
  readonly showMixtureCloud = signal(false);

  /** Ids of the pigments to mix, anchor first (see `selection.ts` for the rules). */
  readonly selection = signal<string[]>(['lemon-yellow', 'phthalo-blue-reddish']);
  readonly slots = computed(() => slotsFor(this.selection()));

  readonly visible = computed(() =>
    this.showHidden() ? PIGMENTS : PIGMENTS.filter((p) => !p.hideByDefault),
  );

  /** The anchor and its mixing partner, once both are chosen. */
  readonly pair = computed(() => {
    const [a, b] = this.selection();
    return a && b ? ([pigmentById(a), pigmentById(b)] as const) : null;
  });

  /** The lone selected pigment (the anchor, nothing to mix with yet). */
  readonly solo = computed<Pigment | null>(() => {
    const [id, other] = this.selection();
    return id && !other ? pigmentById(id) : null;
  });

  /**
   * Mixes of the anchor and its partner, equally spaced along the path; ends included. The path is
   * measured on the a/b plane in 2D (what that plot shows) and in full OKLab in 3D, where a
   * difference in lightness is as visible as one in hue or chroma.
   */
  readonly transition = computed(() => {
    const pair = this.pair();
    if (!pair) return null;
    const [a, b] = pair;
    const distance = this.mode() === '3d' ? labDistance : abDistance;
    return {
      a,
      b,
      samples: evenlySpacedMixCurve(this.model(), a, b, DOT_SPACING, undefined, distance),
    };
  });

  /**
   * Every two-pigment mixture of the visible pigments. Computed only while something needs them:
   * the mixture gamut (its hull), or (in 3D) the point cloud, which works without the hull.
   */
  readonly mixtureSamples = computed<Oklab[]>(() => {
    const needed = this.showMixtureGamut() || (this.mode() === '3d' && this.showMixtureCloud());
    return needed ? samplePairMixtures(this.model(), this.visible(), MIXTURE_STEPS) : [];
  });

  /** A dropdown picked a pigment, or cleared its slot. */
  pickInSlot(index: number, id: string | null): void {
    this.selection.update((sel) => setSlot(sel, index, id));
  }

  /** Disables a dropdown option that is already selected in another dropdown. */
  isTaken(id: string, index: number): boolean {
    return this.selection().some((s, i) => s === id && i !== index);
  }

  /**
   * A pigment was clicked on a plot: anchor first, then the partner; clicking a selected one
   * removes it. With `asAnchor` (Ctrl/⌘+click) it becomes the anchor.
   */
  pick(pigment: Pigment, asAnchor: boolean): void {
    this.selection.update((sel) =>
      asAnchor ? makeAnchor(sel, pigment.id) : clickPigment(sel, pigment.id),
    );
  }
}
