import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  effect,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { hexToSrgb, readableTextColor } from '../../../core/color/color';
import { PIGMENT_DATASET, type Pigment } from '../../../core/pigments/pigments';
import { ExplorerState } from './explorer-state';
import { fromQuery, toQuery } from './explorer-url';
import { ExplorerUrlSync } from './explorer-url-sync';
import { helpParts } from './selection';
import { Plot2d } from './plot-2d';
import { Plot3d } from './plot-3d';

/** The explorer page: toolbar, the plot, and the control panel. */
@Component({
  selector: 'app-explorer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatExpansionModule,
    MatSlideToggleModule,
    MatToolbarModule,
    Plot2d,
    Plot3d,
  ],
  providers: [ExplorerState],
  templateUrl: './explorer.html',
  styleUrl: './explorer.scss',
})
export class Explorer {
  protected readonly state = inject(ExplorerState);
  private readonly injector = inject(Injector);
  /** Present in the app (not in every test): keeps the address in step with the mix. */
  protected readonly urlSync = inject(ExplorerUrlSync, { optional: true });
  protected readonly source = PIGMENT_DATASET.source;
  protected readonly licenseUrl = 'https://github.com/dejv78/apex/blob/master/LICENSE';

  protected readonly helpParts = helpParts;

  /** Feedback of the "Copy link" button: the link was copied, or copying failed. */
  protected readonly copyResult = signal<'copied' | 'failed' | null>(null);

  constructor() {
    const sync = this.urlSync;
    if (!sync) return;
    this.state.restore(fromQuery(sync.read()));
    effect(() => sync.write(toQuery(this.state.snapshot())));
  }

  /** Copies the address of the current mix (the address already carries it). */
  protected async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.urlSync!.href());
      this.copyResult.set('copied');
    } catch {
      this.copyResult.set('failed'); // no clipboard (insecure page) or permission refused
    }
    setTimeout(() => this.copyResult.set(null), 3000);
  }

  /** Black or white, whichever reads better on the pigment's color. */
  protected textColor(p: Pigment): string {
    return readableTextColor(hexToSrgb(p.hex));
  }

  /**
   * Opens the pigment list with search and filters ("Add pigment..."). The dialog and its form
   * controls load on first use, so they stay out of the initial bundle (budget in `angular.json`).
   */
  protected async openPicker(): Promise<void> {
    const { openPigmentPicker } = await import('./open-pigment-picker');
    // The explorer's injector, so the dialog shares this page's `ExplorerState`.
    openPigmentPicker(this.injector);
  }
}
