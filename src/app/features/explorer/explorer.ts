import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { PIGMENT_DATASET, type Pigment } from '../../../core/pigments/pigments';
import { ExplorerState } from './explorer-state';
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
    MatExpansionModule,
    MatSelectModule,
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
  protected readonly source = PIGMENT_DATASET.source;

  protected readonly helpParts = helpParts;

  protected label(p: Pigment): string {
    return `${p.name} (${p.code})`;
  }
}
