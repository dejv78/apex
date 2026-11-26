import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { convexHull, polygonArea, type Point } from '../../../core/gamut/convex-hull';
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
  imports: [
    MatSelectModule,
    MatSlideToggleModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
  ],
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
  /** The two pigments of the transition; `null` means not chosen yet. */
  protected readonly pigmentA = signal<string | null>('lemon-yellow');
  protected readonly pigmentB = signal<string | null>('phthalo-blue-redish');
  /** Which end a clicked pigment goes to when both are already chosen. */
  private nextEnd: 'a' | 'b' = 'a';

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
  protected readonly srgbArea = computed(() => polygonArea(this.srgbHull()));

  /** Hull of all two-pigment mixtures of the visible pigments; computed only while shown. */
  private readonly mixtureGamut = computed(() => {
    if (!this.showMixtures()) return null;
    const start = performance.now();
    const samples = samplePairMixtures(this.model(), this.visible(), MIXTURE_STEPS);
    const hull = convexHull(samples.map((c) => ({ x: c.a, y: c.b })));
    return { hull, count: samples.length, ms: performance.now() - start };
  });
  protected readonly mixturePoints = computed(() => {
    const g = this.mixtureGamut();
    return g ? toPolygon(g.hull) : '';
  });
  protected readonly mixtureStats = computed(() => {
    const g = this.mixtureGamut();
    return g ? { area: polygonArea(g.hull), count: g.count, ms: g.ms } : null;
  });

  private readonly pair = computed(() => {
    const a = this.pigmentA();
    const b = this.pigmentB();
    return a && b ? ([pigmentById(a), pigmentById(b)] as const) : null;
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
      mixes: dots.length - 2,
      from: end(a, dots[0]),
      to: end(b, dots[dots.length - 1]),
      linear,
    };
  });

  protected setA(id: string | null): void {
    this.pigmentA.set(id);
  }

  protected setB(id: string | null): void {
    this.pigmentB.set(id);
  }

  /** Clicking a marker fills the first empty end, otherwise the ends take turns. */
  protected pick(pigment: Pigment): void {
    let end = this.nextEnd;
    if (this.pigmentA() === null) end = 'a';
    else if (this.pigmentB() === null) end = 'b';
    (end === 'a' ? this.pigmentA : this.pigmentB).set(pigment.id);
    this.nextEnd = end === 'a' ? 'b' : 'a';
  }

  protected label(p: Pigment): string {
    return `${p.name} (${p.code})`;
  }
}
