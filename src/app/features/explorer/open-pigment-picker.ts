import type { Injector } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PigmentPicker } from './pigment-picker';

/**
 * Opens the "Add pigment..." dialog. Lives in its own file, loaded on demand, so the dialog code
 * is a lazy chunk. `injector` is the explorer's, which provides the shared `ExplorerState`.
 */
export function openPigmentPicker(injector: Injector): void {
  injector.get(MatDialog).open(PigmentPicker, {
    injector,
    width: '560px',
    maxWidth: 'calc(100vw - 24px)',
    autoFocus: 'input',
  });
}
