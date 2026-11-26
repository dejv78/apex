import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { convexHull, polygonArea } from '../../../core/gamut/convex-hull';
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

  private readonly hull = computed(() =>
    convexHull(this.visible().map((p) => ({ x: p.oklab.a, y: p.oklab.b }))),
  );
  protected readonly hullPoints = computed(() =>
    this.hull()
      .map((p) => toSvg(p.x, p.y))
      .map((p) => `${p.x},${p.y}`)
      .join(' '),
  );
  protected readonly hullArea = computed(() => polygonArea(this.hull()));

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
