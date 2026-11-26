import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { convexHull, type Point } from '../../../core/gamut/convex-hull';
import { srgbSurfaceSamples } from '../../../core/gamut/srgb-gamut';
import {
  evenlySpacedMixCurve,
  linearOklabCurve,
  samplePairMixtures,
} from '../../../core/mixing/sampling';
import { AnchoredModel } from '../../../core/mixing/anchored-model';
import { MixboxModel } from '../../../core/mixing/mixbox-model';
import type { MixingModel } from '../../../core/mixing/mixing-model';
import { oklabToHex } from '../../../core/color/color';
import {
  PIGMENT_DATASET,
  PIGMENTS,
  pigmentById,
  type Pigment,
} from '../../../core/pigments/pigments';
import {
  SCALE as scale,
  SIZE,
  VIEW_BOX,
  aTicks,
  axisColors,
  bTicks,
  hueMarks,
  rings,
  toSvg,
} from './plot-geometry';
import { clickPigment, makeAnchor, setSlot, slotsFor } from './selection';

const MIXTURE_STEPS = 8;
/**
 * Distance between neighboring dots of a transition, in SVG units (dots have radius 4.5, so
 * neighbors overlap slightly). Close pigments get few dots, distant pigments many.
 */
const DOT_SPACING = 6;
/** Resolution of the straight-line baseline. */
const LINEAR_STEPS = 60;
/** Distance in SVG units below which a pigment's true color and its model output look the same. */
const RING_MIN_DISTANCE = 4;

const toPolygon = (hull: readonly Point[]): string =>
  hull
    .map((p) => toSvg(p.x, p.y))
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

@Component({
  selector: 'app-explorer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatExpansionModule, MatSelectModule, MatSlideToggleModule, MatToolbarModule],
  templateUrl: './explorer.html',
  styleUrl: './explorer.scss',
})
export class Explorer {
  protected readonly size = SIZE;
  protected readonly viewBox = VIEW_BOX;
  protected readonly rings = rings;
  protected readonly hueMarks = hueMarks;
  protected readonly aTicks = aTicks;
  protected readonly bTicks = bTicks;
  protected readonly axisColors = axisColors;
  protected readonly allPigments = PIGMENTS;
  protected readonly source = PIGMENT_DATASET.source;
  private readonly rawModel: MixingModel = new MixboxModel();
  private readonly anchoredModel: MixingModel = new AnchoredModel(this.rawModel);
  /** Pin mixes to the pigments' true OKLab colors (the raw model clamps them to sRGB). */
  protected readonly anchored = signal(true);
  protected readonly model = computed<MixingModel>(() =>
    this.anchored() ? this.anchoredModel : this.rawModel,
  );

  protected readonly showHidden = signal(false);
  protected readonly showLinear = signal(false);
  /** Ids of the pigments to mix, anchor first (see `selection.ts` for the rules). */
  protected readonly selection = signal<string[]>(['lemon-yellow', 'phthalo-blue-redish']);
  protected readonly slots = computed(() => slotsFor(this.selection()));

  protected readonly visible = computed(() =>
    this.showHidden() ? PIGMENTS : PIGMENTS.filter((p) => !p.hideByDefault),
  );

  protected readonly markers = computed(() =>
    this.visible().map((p) => ({ pigment: p, ...toSvg(p.oklab.a, p.oklab.b) })),
  );

  protected readonly showSrgb = signal(false);
  protected readonly showMixtures = signal(true);

  private readonly srgbHull = computed(() =>
    convexHull(srgbSurfaceSamples().map((c) => ({ x: c.a, y: c.b }))),
  );
  protected readonly srgbPoints = computed(() => toPolygon(this.srgbHull()));

  /** Hull of all two-pigment mixtures of the visible pigments; computed only while shown. */
  protected readonly mixturePoints = computed(() => {
    if (!this.showMixtures()) return '';
    const samples = samplePairMixtures(this.model(), this.visible(), MIXTURE_STEPS);
    return toPolygon(convexHull(samples.map((c) => ({ x: c.a, y: c.b }))));
  });

  /** The anchor and its mixing partner, once both are chosen. */
  private readonly pair = computed(() => {
    const [a, b] = this.selection();
    return a && b ? ([pigmentById(a), pigmentById(b)] as const) : null;
  });

  /** The lone selected pigment (the anchor, nothing to mix with yet), shown at its true color. */
  protected readonly solo = computed(() => {
    const [id, other] = this.selection();
    if (!id || other) return null;
    const pigment = pigmentById(id);
    return { pigment, ...toSvg(pigment.oklab.a, pigment.oklab.b), hex: pigment.hex };
  });

  /** Samples of mixing A into B, as dots on the a/b plane, plus both end markers. */
  protected readonly transition = computed(() => {
    const pair = this.pair();
    if (!pair) return null;
    const [a, b] = pair;
    const samples = evenlySpacedMixCurve(this.model(), a, b, DOT_SPACING / scale);
    const dots = samples.map((s) => ({
      ...toSvg(s.color.a, s.color.b),
      hex: oklabToHex(s.color),
      tip: `${Math.round((1 - s.t) * 100)}% ${a.name} + ${Math.round(s.t * 100)}% ${b.name} · ${oklabToHex(s.color)}`,
    }));
    const end = (pigment: Pigment, dot: { x: number; y: number; hex: string }) => {
      const truth = toSvg(pigment.oklab.a, pigment.oklab.b);
      const gap = Math.hypot(truth.x - dot.x, truth.y - dot.y);
      return { pigment, dot, truth: gap > RING_MIN_DISTANCE ? truth : null };
    };
    const linear = linearOklabCurve(a, b, LINEAR_STEPS)
      .map((s) => toSvg(s.color.a, s.color.b))
      .map((p) => `${p.x},${p.y}`)
      .join(' ');
    return {
      dots: dots.slice(1, -1),
      from: end(a, dots[0]),
      to: end(b, dots[dots.length - 1]),
      linear,
    };
  });

  /** A dropdown picked a pigment, or cleared its slot. */
  protected pickInSlot(index: number, id: string | null): void {
    this.selection.update((sel) => setSlot(sel, index, id));
  }

  /** Disables a dropdown option that is already selected in another dropdown. */
  protected isTaken(id: string, index: number): boolean {
    return this.selection().some((s, i) => s === id && i !== index);
  }

  /**
   * Clicking a pigment on the plot: anchor first, then the partner; clicking a selected one removes
   * it. Ctrl+click (or ⌘+click on a Mac, where Ctrl+click opens the context menu) makes it the anchor.
   */
  protected pick(pigment: Pigment, event: MouseEvent): void {
    const asAnchor = event.ctrlKey || event.metaKey;
    this.selection.update((sel) =>
      asAnchor ? makeAnchor(sel, pigment.id) : clickPigment(sel, pigment.id),
    );
  }

  protected label(p: Pigment): string {
    return `${p.name} (${p.code})`;
  }
}
