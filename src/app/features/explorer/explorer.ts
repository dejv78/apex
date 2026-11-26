import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { convexHull, polygonArea, type Point } from '../../../core/gamut/convex-hull';
import { srgbSurfaceSamples } from '../../../core/gamut/srgb-gamut';
import { linearOklabCurve, mixCurve, samplePairMixtures } from '../../../core/mixing/sampling';
import { MixboxModel } from '../../../core/mixing/mixbox-model';
import type { MixingModel, MixPart } from '../../../core/mixing/mixing-model';
import { oklabToHex, oklabToOklch } from '../../../core/color/color';
import {
  PIGMENT_DATASET,
  PIGMENTS,
  pigmentById,
  type Pigment,
} from '../../../core/pigments/pigments';

interface Slot {
  pigmentId: string | null;
  weight: number;
}

/** Half-width of the plotted a/b plane (OKLab chroma of real pigments stays below ~0.25). */
const EXTENT = 0.3;
const SIZE = 600;
const scale = SIZE / 2 / EXTENT;

const MIXTURE_STEPS = 8;
const CURVE_STEPS = 20;

const toPolygon = (hull: readonly Point[]): string =>
  hull
    .map((p) => toSvg(p.x, p.y))
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

/** OKLab a/b plane to SVG coordinates (b points up). */
const toSvg = (a: number, b: number) => ({ x: SIZE / 2 + a * scale, y: SIZE / 2 - b * scale });

@Component({
  selector: 'app-explorer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatSelectModule,
    MatSliderModule,
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
  protected readonly allPigments = PIGMENTS;
  protected readonly source = PIGMENT_DATASET.source;
  protected readonly model: MixingModel = new MixboxModel();

  protected readonly showHidden = signal(false);
  protected readonly showHull = signal(true);
  protected readonly slots = signal<Slot[]>([
    { pigmentId: 'lemon-yellow', weight: 50 },
    { pigmentId: 'phthalo-blue-redish', weight: 50 },
    { pigmentId: null, weight: 0 },
  ]);

  protected readonly visible = computed(() =>
    this.showHidden() ? PIGMENTS : PIGMENTS.filter((p) => !p.hideByDefault),
  );

  protected readonly markers = computed(() =>
    this.visible().map((p) => ({ pigment: p, ...toSvg(p.oklab.a, p.oklab.b) })),
  );

  protected readonly showSrgb = signal(false);
  protected readonly showMixtures = signal(false);

  private readonly hull = computed(() =>
    convexHull(this.visible().map((p) => ({ x: p.oklab.a, y: p.oklab.b }))),
  );
  protected readonly hullPoints = computed(() => toPolygon(this.hull()));
  protected readonly hullArea = computed(() => polygonArea(this.hull()));

  private readonly srgbHull = computed(() =>
    convexHull(srgbSurfaceSamples().map((c) => ({ x: c.a, y: c.b }))),
  );
  protected readonly srgbPoints = computed(() => toPolygon(this.srgbHull()));
  protected readonly srgbArea = computed(() => polygonArea(this.srgbHull()));

  /** Hull of all two-pigment mixtures of the visible pigments; computed only while shown. */
  private readonly mixtureGamut = computed(() => {
    if (!this.showMixtures()) return null;
    const start = performance.now();
    const samples = samplePairMixtures(this.model, this.visible(), MIXTURE_STEPS);
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

  /** Ratio curve between the first two chosen pigments, against plain OKLab interpolation. */
  private readonly pair = computed(() => {
    const chosen = this.slots()
      .filter((s) => s.pigmentId !== null)
      .map((s) => pigmentById(s.pigmentId!));
    return chosen.length >= 2 ? ([chosen[0], chosen[1]] as const) : null;
  });
  protected readonly curve = computed(() => {
    const pair = this.pair();
    if (!pair) return null;
    const real = mixCurve(this.model, pair[0], pair[1], CURVE_STEPS);
    const linear = linearOklabCurve(pair[0], pair[1], CURVE_STEPS);
    return {
      realPoints: real
        .map((p) => toSvg(p.color.a, p.color.b))
        .map((p) => `${p.x},${p.y}`)
        .join(' '),
      linearPoints: linear
        .map((p) => toSvg(p.color.a, p.color.b))
        .map((p) => `${p.x},${p.y}`)
        .join(' '),
      strip: real.map((p) => ({ t: p.t, hex: oklabToHex(p.color) })),
    };
  });

  protected readonly rings = [0.1, 0.2, 0.3].map((c) => ({ c, r: c * scale }));
  protected readonly spokes = Array.from({ length: 12 }, (_, i) => {
    const rad = (i * 30 * Math.PI) / 180;
    const end = toSvg(EXTENT * Math.cos(rad), EXTENT * Math.sin(rad));
    return { deg: i * 30, ...end };
  });

  protected readonly parts = computed<MixPart[]>(() =>
    this.slots()
      .filter((s) => s.pigmentId !== null && s.weight > 0)
      .map((s) => ({ pigment: pigmentById(s.pigmentId!), weight: s.weight })),
  );

  protected readonly result = computed(() => {
    const parts = this.parts();
    if (parts.length === 0) return null;
    const lab = this.model.mix(parts);
    const lch = oklabToOklch(lab);
    return { lab, lch, hex: oklabToHex(lab), ...toSvg(lab.a, lab.b) };
  });

  protected readonly selectedMarkers = computed(() =>
    this.slots()
      .filter((s) => s.pigmentId !== null)
      .map((s) => pigmentById(s.pigmentId!))
      .map((p) => toSvg(p.oklab.a, p.oklab.b)),
  );

  protected setPigment(index: number, pigmentId: string | null): void {
    this.slots.update((s) =>
      s.map((slot, i) =>
        i === index
          ? { pigmentId, weight: pigmentId && slot.weight === 0 ? 50 : slot.weight }
          : slot,
      ),
    );
  }

  protected setWeight(index: number, weight: number): void {
    this.slots.update((s) => s.map((slot, i) => (i === index ? { ...slot, weight } : slot)));
  }

  /** Clicking a marker puts the pigment in the first empty slot, or replaces the last one. */
  protected pick(pigment: Pigment): void {
    const slots = this.slots();
    const empty = slots.findIndex((s) => s.pigmentId === null);
    this.setPigment(empty >= 0 ? empty : slots.length - 1, pigment.id);
  }

  protected label(p: Pigment): string {
    return `${p.name} (${p.code})`;
  }
}
