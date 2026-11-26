import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { oklabToHex, type Oklab } from '../../../core/color/color';
import { ExplorerState } from './explorer-state';
import type { ViewPreset } from './plot-3d-geometry';
import { ColorScene, type Hover, type PathView } from './plot-3d-scene';

/** Distance in OKLab below which a pigment's true color and its model output look the same. */
const TRUTH_MIN_DISTANCE = 0.004;

const distance = (a: Oklab, b: Oklab) => Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b);

/** The OKLab color cylinder in 3D: rotate it freely, or jump to a top, front or side view. */
@Component({
  selector: 'app-plot-3d',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plot-3d.html',
  styleUrl: './plot-3d.scss',
})
export class Plot3d {
  private readonly state = inject(ExplorerState);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private scene: ColorScene | null = null;
  /** Set once the WebGL scene exists; the effects below wait for it. */
  private readonly ready = signal(false);

  protected readonly unsupported = signal(false);
  protected readonly hover = signal<Hover | null>(null);
  protected readonly views: { id: ViewPreset; label: string; hint: string }[] = [
    { id: 'top', label: 'Top', hint: 'Look straight down: the a/b plane' },
    { id: 'front', label: 'Front', hint: 'Lightness against a' },
    { id: 'side', label: 'Side', hint: 'Lightness against b' },
    { id: 'reset', label: 'Reset', hint: 'Three-quarter view' },
  ];

  /** The mixing path (or the lone selected pigment) in the form the scene draws. */
  private readonly path = computed<PathView | null>(() => {
    const t = this.state.transition();
    if (t) {
      const { a, b, samples } = t;
      const end = (pigment: typeof a, lab: Oklab, anchor: boolean) => ({
        pigment,
        lab,
        hex: oklabToHex(lab),
        anchor,
        truth: distance(lab, pigment.oklab) > TRUTH_MIN_DISTANCE ? pigment.oklab : null,
      });
      return {
        dots: samples.slice(1, -1).map((s) => {
          const hex = oklabToHex(s.color);
          const tip = `${Math.round((1 - s.t) * 100)}% ${a.name} + ${Math.round(s.t * 100)}% ${b.name} · ${hex}`;
          return { lab: s.color, hex, tip };
        }),
        ends: [end(a, samples[0].color, true), end(b, samples[samples.length - 1].color, false)],
        linear: this.state.showLinear() ? [a.oklab, b.oklab] : null,
      };
    }
    const solo = this.state.solo();
    return solo
      ? {
          dots: [],
          ends: [{ pigment: solo, lab: solo.oklab, hex: solo.hex, anchor: true, truth: null }],
          linear: null,
        }
      : null;
  });

  constructor() {
    afterNextRender(() => {
      try {
        this.scene = new ColorScene(this.host().nativeElement, {
          onPick: (pigment, asAnchor) => this.state.pick(pigment, asAnchor),
          onHover: (hover) => this.hover.set(hover),
        });
        this.ready.set(true);
      } catch {
        this.unsupported.set(true);
      }
    });

    effect(() => {
      const pigments = this.state.visible();
      if (this.ready()) this.scene?.setPigments(pigments);
    });
    effect(() => {
      const path = this.path();
      if (this.ready()) this.scene?.setPath(path);
    });
    effect(() => {
      const samples = this.state.mixtureSamples();
      const show = { points: this.state.showMixtureCloud(), hull: this.state.showMixtureGamut() };
      if (this.ready()) this.scene?.setCloud(samples, show);
    });
    effect(() => {
      const show = this.state.showSrgb();
      if (this.ready()) this.scene?.setSrgbGamut(show);
    });

    inject(DestroyRef).onDestroy(() => this.scene?.dispose());
  }

  protected setView(preset: ViewPreset): void {
    this.scene?.setView(preset);
  }
}
