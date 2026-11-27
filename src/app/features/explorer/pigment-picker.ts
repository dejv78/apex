import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialogModule } from '@angular/material/dialog';
import {
  COLOR_FAMILIES,
  type FamilyId,
  type PigmentOrder,
  findPigments,
  matchesQuery,
  colorFamily,
} from '../../../core/pigments/catalog';
import { hexToSrgb, readableTextColor } from '../../../core/color/color';
import type { Pigment } from '../../../core/pigments/pigments';
import { ExplorerState } from './explorer-state';

/**
 * The "Add pigment..." dialog (ADR 0020): every available pigment in one list, with full-text
 * search, a color family filter and a switch between hue and alphabetical order. A click toggles
 * a pigment exactly like a click in the plot; the dialog stays open so several can be added.
 *
 * The search box and family filter are plain HTML, not `mat-form-field` and `mat-chip-listbox`:
 * those pull `@angular/forms` and the form-field code into the initial bundle (the chunk shared with
 * the explorer's own chips), which cost about 150 kB.
 */
@Component({
  selector: 'app-pigment-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatButtonToggleModule, MatDialogModule],
  templateUrl: './pigment-picker.html',
  styleUrl: './pigment-picker.scss',
})
export class PigmentPicker {
  protected readonly state = inject(ExplorerState);

  protected readonly query = signal('');
  protected readonly family = signal<FamilyId | 'all'>('all');
  protected readonly order = signal<PigmentOrder>('hue');

  protected readonly families = COLOR_FAMILIES;

  /** What the list shows: all pigments (hidden-from-plot ones too), filtered and ordered. */
  protected readonly results = computed(() =>
    findPigments(this.state.allPigments, {
      query: this.query(),
      family: this.family(),
      order: this.order(),
    }),
  );

  /** How many pigments each family has for the current search, shown on the filter chips. */
  protected readonly counts = computed(() => {
    const counts = new Map<FamilyId | 'all', number>();
    const query = this.query();
    for (const p of this.state.allPigments) {
      if (!matchesQuery(p, query)) continue;
      const f = colorFamily(p.code);
      counts.set(f, (counts.get(f) ?? 0) + 1);
      counts.set('all', (counts.get('all') ?? 0) + 1);
    }
    return counts;
  });

  private readonly selectedIds = computed(() => new Set(this.state.selection()));

  protected isSelected(p: Pigment): boolean {
    return this.selectedIds().has(p.id);
  }

  /** Adding is refused at the connection limit; removing never is. */
  protected isDisabled(p: Pigment): boolean {
    return this.state.atLimit() && !this.isSelected(p);
  }

  protected textColor(p: Pigment): string {
    return readableTextColor(hexToSrgb(p.hex));
  }
}
