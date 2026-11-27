import { TestBed } from '@angular/core/testing';
import { PIGMENTS } from '../../../core/pigments/pigments';
import { Explorer } from './explorer';

describe('"Add pigment..." dialog', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Explorer);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const addButton = () => el.querySelector<HTMLButtonElement>('button.add-pigment')!;
    /** The dialog lives in the overlay, outside the component's own element. */
    const dialog = () => document.querySelector('app-pigment-picker') as HTMLElement | null;
    const settle = async () => {
      await fixture.whenStable();
      await new Promise((r) => setTimeout(r));
      await fixture.whenStable();
    };
    const open = async () => {
      addButton().click();
      await vi.waitFor(() => expect(dialog()).not.toBeNull()); // it loads on first use
      await settle();
    };
    const rows = () => Array.from(dialog()!.querySelectorAll<HTMLButtonElement>('button.row'));
    const rowNames = () => rows().map((r) => r.querySelector('.name')!.textContent!.trim());
    const rowCodes = () => rows().map((r) => r.querySelector('.code')!.textContent!.trim());
    const type = async (text: string) => {
      const input = dialog()!.querySelector<HTMLInputElement>('input[type=search]')!;
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await settle();
    };
    const family = async (label: string) => {
      const button = Array.from(
        dialog()!.querySelectorAll<HTMLButtonElement>('button.family'),
      ).find((b) => b.textContent!.trim().startsWith(label))!;
      button.click();
      await settle();
    };
    const order = async (label: string) => {
      const button = Array.from(
        dialog()!.querySelectorAll<HTMLButtonElement>('mat-button-toggle button'),
      ).find((b) => b.textContent!.includes(label))!;
      button.click();
      await settle();
    };
    return {
      fixture,
      el,
      addButton,
      dialog,
      open,
      rows,
      rowNames,
      rowCodes,
      type,
      family,
      order,
      settle,
    };
  }

  it('has an "Add pigment…" button under the chips that opens the list', async () => {
    const { el, addButton, open, dialog } = await setup();
    const chips = el.querySelector('mat-chip-set')!;
    expect(addButton().textContent).toContain('Add pigment');
    expect(
      chips.compareDocumentPosition(addButton()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(dialog()).toBeNull();
    await open();
    expect(dialog()!.textContent).toContain('Add pigments');
  });

  it('lists every available pigment, hidden ones included, ordered by hue at first', async () => {
    const { open, rows, order, rowNames } = await setup();
    await open();
    expect(rows()).toHaveLength(PIGMENTS.length);
    const byHue = rowNames();
    await order('By name');
    const byName = rowNames();
    expect(byName).not.toEqual(byHue);
    expect(byName).toEqual(
      [...byName].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })),
    );
    await order('By hue');
    expect(rowNames()).toEqual(byHue); // switching back restores the hue order
  });

  it('searches the name and the code as full text', async () => {
    const { open, type, rowNames, rowCodes, rows, dialog } = await setup();
    await open();
    await type('cobalt');
    expect(rows().length).toBeGreaterThan(0);
    expect(rowNames().every((n) => /cobalt/i.test(n))).toBe(true);
    await type('pr 122');
    expect(rowCodes()).toContain('PR122');
    expect(rowCodes().every((c) => c.includes('PR122'))).toBe(true);
    await type('zzzz');
    expect(rows()).toHaveLength(0);
    expect(dialog()!.textContent).toContain('No pigments match');
    await type('');
    expect(rows()).toHaveLength(PIGMENTS.length);
  });

  it('filters by color family, and combines the filter with the search', async () => {
    const { open, family, rowCodes, type, rows } = await setup();
    await open();
    await family('Blue');
    expect(rowCodes().length).toBeGreaterThan(5);
    expect(rowCodes().every((c) => /^[PN]B\d/.test(c))).toBe(true);
    expect(rowCodes()).toContain('NB1'); // natural indigo counts as blue
    await family('Other');
    expect(rowCodes()).toContain('P-T'); // oddities land here
    expect(rowCodes()).toEqual(['P-T']);
    await family('All');
    expect(rows()).toHaveLength(PIGMENTS.length);
    await family('Red');
    await type('cobalt');
    expect(rows()).toHaveLength(0); // no red pigment is called cobalt
  });

  it('adds a pigment with a click, shows it as selected, and removes it with another click', async () => {
    const { fixture, el, open, rows, type, settle } = await setup();
    await open();
    await type('viridian');
    const [row] = rows();
    expect(row.getAttribute('aria-pressed')).toBe('false');
    row.click();
    await settle();
    expect(row.getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelectorAll('mat-chip-row')).toHaveLength(3); // behind the dialog, now selected
    expect(document.querySelector('app-pigment-picker')!.textContent).toContain('3 selected');
    row.click();
    await settle();
    expect(row.getAttribute('aria-pressed')).toBe('false');
    expect(el.querySelectorAll('mat-chip-row')).toHaveLength(2);
    await fixture.whenStable();
  });

  it('closes with "Done" and keeps the selection', async () => {
    const { el, open, rows, type, dialog, settle } = await setup();
    await open();
    await type('viridian');
    rows()[0].click();
    await settle();
    dialog()!.querySelector<HTMLButtonElement>('mat-dialog-actions button')!.click();
    await vi.waitFor(() => expect(dialog()).toBeNull());
    expect(el.querySelectorAll('mat-chip-row')).toHaveLength(3);
  });

  it('disables the button and the unselected rows at the connection limit', async () => {
    const { fixture, el, addButton, open, rows, settle } = await setup();
    const state = (await import('./explorer-state')).ExplorerState;
    fixture.debugElement.injector.get(state).selection.set(PIGMENTS.slice(0, 19).map((p) => p.id));
    await settle();
    expect(addButton().disabled).toBe(false); // room for a 20th
    await open();
    fixture.debugElement.injector.get(state).selection.update((s) => [...s, PIGMENTS[19].id]);
    await settle();
    expect(rows().filter((r) => r.disabled)).toHaveLength(PIGMENTS.length - 20);
    expect(rows().filter((r) => !r.disabled)).toHaveLength(20); // the selected ones can still go
    expect(el.querySelector('button.add-pigment')).not.toBeNull();
  });
});
