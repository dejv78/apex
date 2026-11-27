import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import type { Oklab } from '../../../core/color/color';
import { AnchoredModel } from '../../../core/mixing/anchored-model';
import { MixboxModel } from '../../../core/mixing/mixbox-model';
import type { MixingModel } from '../../../core/mixing/mixing-model';
import {
  type CurvePoint,
  abDistance,
  evenlySpacedMixCurve,
  labDistance,
  samplePairMixtures,
} from '../../../core/mixing/sampling';
import { PIGMENTS, pigmentById, type Pigment } from '../../../core/pigments/pigments';
import {
  MAX_CONNECTIONS,
  canAddPigment,
  selectionHelp,
  setSlot,
  slotsFor,
  togglePigment,
} from './selection';

export type ViewMode = '2d' | '3d';

/** Camera controls of the 3D view, appended to the help line there: mouse and touch versions. */
const CAMERA_HELP = '*Drag* to rotate, *scroll* to zoom, *right-drag* to pan.';
const CAMERA_HELP_TOUCH = '*Drag* to rotate, *pinch* to zoom, *two-finger drag* to pan.';

/** Ratio steps per pigment pair when sampling the mixture gamut. */
export const MIXTURE_STEPS = 8;
/**
 * OKLab distance on the a/b plane between neighboring dots of a transition. Close pigments get
 * few dots, distant pigments many (0.006 is 6 SVG units in the 2D plot).
 */
export const DOT_SPACING = 0.006;
/** Cached trails kept before the cache is emptied; bounds memory for long sessions. */
const TRAIL_CACHE_LIMIT = 5000;

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

  /** Ids of the pigments to mix, each with every other (see `selection.ts` for the rules). */
  readonly selection = signal<string[]>(['lemon-yellow', 'phthalo-blue-reddish']);
  readonly slots = computed(() => slotsFor(this.selection()));
  /** The selection cannot grow: one more pigment would exceed `MAX_CONNECTIONS` trails. */
  readonly atLimit = computed(() => !canAddPigment(this.selection()));
  readonly maxConnections = MAX_CONNECTIONS;
  /**
   * The main pointer is a finger: the 3D camera help then talks about pinching, not scrolling.
   * Follows the `(pointer: coarse)` media query; stays false where it does not exist (tests,
   * server).
   */
  readonly touchOnly = signal(false);

  /** What a click can do now (plus how to move the camera in 3D), for the help line under the plot. */
  readonly help = computed(() => {
    const lines = selectionHelp(this.selection());
    if (this.mode() !== '3d') return lines;
    return [...lines, this.touchOnly() ? CAMERA_HELP_TOUCH : CAMERA_HELP];
  });

  readonly visible = computed(() =>
    this.showHidden() ? PIGMENTS : PIGMENTS.filter((p) => !p.hideByDefault),
  );

  /** The lone selected pigment (nothing to mix with yet). */
  readonly solo = computed<Pigment | null>(() => {
    const [id, other] = this.selection();
    return id && !other ? pigmentById(id) : null;
  });

  /** Trails already computed, keyed by model, mode and pigment pair (see `pairs`). */
  private readonly trailCache = new Map<string, CurvePoint[]>();

  /**
   * A trail for every two selected pigments (N(N-1)/2), each with mixes equally spaced along the
   * path, ends included. `a` comes before `b` in the selection. The
   * path is measured on the a/b plane in 2D (what that plot shows) and in full OKLab in 3D, where a
   * difference in lightness is as visible as one in hue or chroma. Trails are cached per pair, so
   * adding a pigment only computes its own new trails.
   */
  readonly pairs = computed(() => {
    const ids = this.selection();
    const model = this.model();
    const mode = this.mode();
    const distance = mode === '3d' ? labDistance : abDistance;
    const prefix = `${this.anchored() ? 'anchored' : 'raw'}|${mode}|`;
    if (this.trailCache.size > TRAIL_CACHE_LIMIT) this.trailCache.clear();
    const pairs: { a: Pigment; b: Pigment; samples: CurvePoint[] }[] = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pigmentById(ids[i]);
        const b = pigmentById(ids[j]);
        const key = `${prefix}${a.id}|${b.id}`;
        let samples = this.trailCache.get(key);
        if (!samples) {
          samples = evenlySpacedMixCurve(model, a, b, DOT_SPACING, undefined, distance);
          this.trailCache.set(key, samples);
        }
        pairs.push({ a, b, samples });
      }
    }
    return pairs;
  });

  /**
   * Every two-pigment mixture of the visible pigments. Computed only while something needs them:
   * the mixture gamut (its hull), or (in 3D) the point cloud, which works without the hull.
   */
  readonly mixtureSamples = computed<Oklab[]>(() => {
    const needed = this.showMixtureGamut() || (this.mode() === '3d' && this.showMixtureCloud());
    return needed ? samplePairMixtures(this.model(), this.visible(), MIXTURE_STEPS) : [];
  });

  constructor() {
    const query = typeof matchMedia === 'function' ? matchMedia('(pointer: coarse)') : null;
    if (!query) return;
    this.touchOnly.set(query.matches);
    const onChange = (e: MediaQueryListEvent) => this.touchOnly.set(e.matches);
    query.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => query.removeEventListener('change', onChange));
  }

  /** A dropdown picked a pigment, or cleared its slot. */
  pickInSlot(index: number, id: string | null): void {
    this.selection.update((sel) => setSlot(sel, index, id));
  }

  /** Unselects every pigment (the "Unselect all" button). */
  clearSelection(): void {
    this.selection.set([]);
  }

  /** Disables a dropdown option that is already selected in another dropdown. */
  isTaken(id: string, index: number): boolean {
    return this.selection().some((s, i) => s === id && i !== index);
  }

  /** A pigment was clicked on a plot: it joins the selection, or leaves it if it was selected. */
  pick(pigment: Pigment): void {
    this.selection.update((sel) => togglePigment(sel, pigment.id));
  }
}
