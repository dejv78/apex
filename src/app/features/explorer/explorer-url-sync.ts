import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/**
 * Reads and writes the explorer state in the address bar (ADR 0021). A service of its own, provided
 * by the app only (`app.config.ts`), so tests that create the explorer never touch the address of
 * the test page unless they ask for it.
 */
@Injectable()
export class ExplorerUrlSync {
  private readonly document = inject(DOCUMENT);

  /** The current query string, with its `?` (empty if there is none). */
  read(): string {
    return this.document.location.search;
  }

  /**
   * Replaces the query string of the current address without reloading and without adding a history
   * entry (a click on a pigment is not a page visit). The path, the hash and the history state
   * (which the router keeps its bookkeeping in) are left as they are.
   */
  write(query: string): void {
    const { location, defaultView } = this.document;
    const url = `${location.pathname}${query ? `?${query}` : ''}${location.hash}`;
    defaultView?.history.replaceState(defaultView.history.state, '', url);
  }

  /** The full address of the current mix, for copying. */
  href(): string {
    return this.document.location.href;
  }
}
