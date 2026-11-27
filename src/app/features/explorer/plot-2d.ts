import { ChangeDetectionStrategy, Component, ElementRef, computed, inject } from '@angular/core';
import { convexHull, type Point } from '../../../core/gamut/convex-hull';
import { srgbSurfaceSamples } from '../../../core/gamut/srgb-gamut';
import { oklabToHex, type Oklab } from '../../../core/color/color';
import { linearOklabCurve } from '../../../core/mixing/sampling';
import type { Pigment } from '../../../core/pigments/pigments';
import { ExplorerState } from './explorer-state';
import {
  TOUCH_MARKER_SCALE,
  TOUCH_PICK_RADIUS,
  nearestTarget,
  type PickTarget,
} from './pick-nearest';
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

interface End {
  pigment: Pigment;
  dot: { x: number; y: number; hex: string };
  truth: { x: number; y: number } | null;
}

/** The OKLab a/b plane as an SVG plot: pigments, mixing path, gamut outlines and axes. */
@Component({
  selector: 'app-plot-2d',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plot-2d.html',
  // Taps are handled here, not on the <svg>, because they pick the pigment nearest to the tap.
  host: { '(click)': 'pickNear($event)' },
  styleUrl: './plot-2d.scss',
})
export class Plot2d {
  protected readonly state = inject(ExplorerState);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly size = SIZE;
  protected readonly viewBox = VIEW_BOX;
  protected readonly rings = rings;
  protected readonly hueMarks = hueMarks;
  protected readonly aTicks = aTicks;
  protected readonly bTicks = bTicks;
  protected readonly axisColors = axisColors;

  /** Marker size factor: larger on touch devices, where a fingertip is far bigger than a mouse. */
  private readonly scale = computed(() => (this.state.touchOnly() ? TOUCH_MARKER_SCALE : 1));
  protected readonly markerR = computed(() => 7 * this.scale());
  protected readonly endR = computed(() => 8 * this.scale());
  protected readonly truthR = computed(() => 11 * this.scale());

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

  /**
   * The trails between every two selected pigments: all their dots on the a/b plane (the ends
   * excluded), a straight-line baseline per pair, and one end marker per selected pigment.
   */
  protected readonly transition = computed(() => {
    const pairs = this.state.pairs();
    if (!pairs.length) return null;
    const dots: { x: number; y: number; hex: string; tip: string }[] = [];
    const linear: string[] = [];
    const dotAt = (c: Oklab) => ({ ...toSvg(c.a, c.b), hex: oklabToHex(c) });
    const ends = new Map<string, End>();
    const end = (pigment: Pigment, c: Oklab) => {
      if (ends.has(pigment.id)) return;
      const dot = dotAt(c);
      const truth = toSvg(pigment.oklab.a, pigment.oklab.b);
      const gap = Math.hypot(truth.x - dot.x, truth.y - dot.y);
      ends.set(pigment.id, { pigment, dot, truth: gap > RING_MIN_DISTANCE ? truth : null });
    };
    for (const { a, b, samples } of pairs) {
      end(a, samples[0].color);
      end(b, samples[samples.length - 1].color);
      for (const s of samples.slice(1, -1)) {
        dots.push({
          ...dotAt(s.color),
          tip: `${Math.round((1 - s.t) * 100)}% ${a.name} + ${Math.round(s.t * 100)}% ${b.name} · ${oklabToHex(s.color)}`,
        });
      }
      if (this.state.showLinear()) {
        linear.push(
          linearOklabCurve(a, b, LINEAR_STEPS)
            .map((s) => toSvg(s.color.a, s.color.b))
            .map((p) => `${p.x},${p.y}`)
            .join(' '),
        );
      }
    }
    const list = [...ends.values()];
    return { dots, linear, ends: list };
  });

  /** The lone selected pigment, shown at its true color. */
  protected readonly solo = computed(() => {
    const pigment = this.state.solo();
    return pigment
      ? { pigment, ...toSvg(pigment.oklab.a, pigment.oklab.b), hex: pigment.hex }
      : null;
  });

  /** A click on a pigment's own marker. On touch devices `pickNear` handles every tap instead. */
  protected pick(pigment: Pigment): void {
    if (!this.state.touchOnly()) this.state.pick(pigment);
  }

  /**
   * Touch devices: a tap selects the pigment nearest to it within `TOUCH_PICK_RADIUS` screen
   * pixels, so a finger does not have to land exactly on a small marker. The candidates are every
   * visible pigment plus the selected ones (which may be hidden from the plot).
   */
  protected pickNear(event: MouseEvent): void {
    if (!this.state.touchOnly()) return;
    const ctm = this.host.nativeElement.querySelector('svg')?.getScreenCTM();
    if (!ctm) return;
    const targets: PickTarget<Pigment>[] = [];
    const add = (pigment: Pigment, x: number, y: number) =>
      targets.push({ x: ctm.a * x + ctm.e, y: ctm.d * y + ctm.f, item: pigment });
    for (const m of this.markers()) add(m.pigment, m.x, m.y);
    for (const end of this.transition()?.ends ?? []) add(end.pigment, end.dot.x, end.dot.y);
    const solo = this.solo();
    if (solo) add(solo.pigment, solo.x, solo.y);
    const hit = nearestTarget(targets, event.clientX, event.clientY, TOUCH_PICK_RADIUS);
    if (hit) this.state.pick(hit);
  }

  protected label(p: Pigment): string {
    return `${p.name} (${p.code})`;
  }
}
