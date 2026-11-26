import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { convexHull, type Point } from '../../../core/gamut/convex-hull';
import { srgbSurfaceSamples } from '../../../core/gamut/srgb-gamut';
import { oklabToHex } from '../../../core/color/color';
import { linearOklabCurve } from '../../../core/mixing/sampling';
import type { Pigment } from '../../../core/pigments/pigments';
import { ExplorerState } from './explorer-state';
import {
  SIZE,
  VIEW_BOX,
  aTicks,
  axisColors,
  bTicks,
  hueMarks,
  rings,
  toSvg,
} from './plot-geometry';

/** Resolution of the straight-line baseline. */
const LINEAR_STEPS = 60;
/** Distance in SVG units below which a pigment's true color and its model output look the same. */
const RING_MIN_DISTANCE = 4;

const toPolygon = (hull: readonly Point[]): string =>
  hull
    .map((p) => toSvg(p.x, p.y))
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

/** The OKLab a/b plane as an SVG plot: pigments, mixing path, gamut outlines and axes. */
@Component({
  selector: 'app-plot-2d',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plot-2d.html',
  styleUrl: './plot-2d.scss',
})
export class Plot2d {
  protected readonly state = inject(ExplorerState);

  protected readonly size = SIZE;
  protected readonly viewBox = VIEW_BOX;
  protected readonly rings = rings;
  protected readonly hueMarks = hueMarks;
  protected readonly aTicks = aTicks;
  protected readonly bTicks = bTicks;
  protected readonly axisColors = axisColors;

  protected readonly markers = computed(() =>
    this.state.visible().map((p) => ({ pigment: p, ...toSvg(p.oklab.a, p.oklab.b) })),
  );

  private readonly srgbHull = computed(() =>
    convexHull(srgbSurfaceSamples().map((c) => ({ x: c.a, y: c.b }))),
  );
  protected readonly srgbPoints = computed(() => toPolygon(this.srgbHull()));

  /** Outline of all two-pigment mixtures of the visible pigments. */
  protected readonly mixturePoints = computed(() => {
    if (!this.state.showMixtureGamut()) return '';
    const samples = this.state.mixtureSamples();
    return samples.length ? toPolygon(convexHull(samples.map((c) => ({ x: c.a, y: c.b })))) : '';
  });

  /** Samples of mixing the anchor into its partner, as dots on the a/b plane, plus both ends. */
  protected readonly transition = computed(() => {
    const t = this.state.transition();
    if (!t) return null;
    const { a, b, samples } = t;
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

  /** The lone selected pigment, shown at its true color. */
  protected readonly solo = computed(() => {
    const pigment = this.state.solo();
    return pigment
      ? { pigment, ...toSvg(pigment.oklab.a, pigment.oklab.b), hex: pigment.hex }
      : null;
  });

  protected pick(pigment: Pigment, event: MouseEvent): void {
    this.state.pick(pigment, event.ctrlKey || event.metaKey);
  }

  protected label(p: Pigment): string {
    return `${p.name} (${p.code})`;
  }
}
