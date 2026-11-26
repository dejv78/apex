import { TestBed } from '@angular/core/testing';
import { Explorer } from './explorer';

describe('Explorer controls', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Explorer);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const flush = () => fixture.whenStable();
    /** The transparent click target of a pigment: the topmost element a user can hit. */
    const marker = (name: string) =>
      Array.from(el.querySelectorAll<SVGCircleElement>('circle.hit')).find((c) =>
        c.textContent?.includes(name),
      )!;
    const click = async (name: string, modifiers: MouseEventInit = {}) => {
      marker(name).dispatchEvent(new MouseEvent('click', { bubbles: true, ...modifiers }));
      await flush();
    };
    const dots = () => el.querySelectorAll('circle.dot').length;
    const ends = () => el.querySelectorAll('circle.end').length;
    const labels = () =>
      Array.from(el.querySelectorAll('mat-form-field mat-label')).map((l) => l.textContent?.trim());
    return { fixture, el, click, dots, ends, labels, marker };
  }

  it('starts with a pre-selected pair, an anchor ring and two dropdowns', async () => {
    const { el, dots, ends, labels } = await setup();
    expect(dots()).toBeGreaterThan(10);
    expect(ends()).toBe(2);
    expect(el.querySelectorAll('circle.anchor-ring').length).toBe(1);
    expect(labels()).toEqual(['Anchor', 'Mix with']);
  });

  it('shows only the basic controls, with the rest inside a collapsed "Advanced" accordion', async () => {
    const { el } = await setup();
    const panel = el.querySelector('mat-expansion-panel')!;
    expect(panel.textContent).toContain('Advanced');
    expect(panel.classList.contains('mat-expanded')).toBe(false);
    const toggleLabels = Array.from(el.querySelectorAll('mat-slide-toggle')).map((t) => ({
      text: t.textContent?.trim() ?? '',
      advanced: panel.contains(t),
    }));
    const visible = toggleLabels.filter((t) => !t.advanced).map((t) => t.text);
    expect(visible.length).toBe(2);
    expect(visible[0]).toContain('Mixture gamut');
    expect(visible[1]).toContain('Show all pigments');
    const advanced = toggleLabels.filter((t) => t.advanced).map((t) => t.text);
    expect(advanced.length).toBe(3);
    expect(el.textContent).not.toContain('Gamut area');
  });

  it('follows the click workflow: anchor, partner, swap partner, remove', async () => {
    const { click, dots, ends, labels, el } = await setup();
    // Start from the pre-selected pair [Lemon yellow, Phthalo blue redish]; remove both.
    await click('Lemon yellow'); // anchor removed -> blue becomes the anchor, no pair left
    expect(dots()).toBe(0);
    expect(ends()).toBe(1);
    expect(labels()).toEqual(['Anchor', 'Mix with']);
    await click('Phthalo blue redish'); // the only selected pigment is unselected
    expect(ends()).toBe(0);
    expect(labels()).toEqual(['Anchor']);

    await click('Lemon yellow'); // first click: anchor
    expect(ends()).toBe(1);
    expect(el.querySelectorAll('circle.anchor-ring').length).toBe(1);
    await click('Ultramarine deep'); // second click: mixed with the anchor
    expect(ends()).toBe(2);
    expect(dots()).toBeGreaterThan(10);
    expect(labels()).toEqual(['Anchor', 'Mix with']);

    await click('Cobalt blue'); // third click: replaces the partner, anchor unchanged
    expect(ends()).toBe(2);
    const titles = Array.from(el.querySelectorAll('circle.end title')).map((t) => t.textContent);
    expect(titles.join(' ')).toContain('Lemon yellow');
    expect(titles.join(' ')).toContain('Cobalt blue');
    expect(titles.join(' ')).not.toContain('Ultramarine');

    await click('Cobalt blue'); // unselect the partner: anchor stays
    expect(ends()).toBe(1);
    expect(dots()).toBe(0);
    expect(el.querySelector('circle.end title')?.textContent).toContain('Lemon yellow');
  });

  it('draws the click targets above the path dots and end markers, so they never block a click', async () => {
    const { el } = await setup();
    const hits = Array.from(el.querySelectorAll('circle.hit'));
    const covering = [
      ...Array.from(el.querySelectorAll('circle.dot')),
      ...Array.from(el.querySelectorAll('circle.end')),
      ...Array.from(el.querySelectorAll('circle.anchor-ring')),
    ];
    expect(hits.length).toBeGreaterThan(20);
    expect(covering.length).toBeGreaterThan(10);
    for (const hit of hits) {
      for (const other of covering) {
        // `other` must come before `hit` in document order, i.e. be painted beneath it.
        expect(hit.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
      }
    }
  });

  it('lets a click on a selected end marker remove it (for pigments hidden from the plot)', async () => {
    const { fixture, el, ends } = await setup();
    const end = el.querySelector<SVGCircleElement>('circle.end')!;
    end.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();
    expect(ends()).toBe(1);
  });

  it('makes a pigment the anchor on ctrl+click and swaps roles with the partner', async () => {
    const { click, el, ends } = await setup();
    const anchorTitle = () =>
      Array.from(el.querySelectorAll('circle.end title'))
        .map((t) => t.textContent ?? '')
        .find((t) => t.includes('(anchor)'));
    expect(anchorTitle()).toContain('Lemon yellow');

    await click('Phthalo blue redish', { ctrlKey: true }); // partner -> anchor, roles swap
    expect(ends()).toBe(2);
    expect(anchorTitle()).toContain('Phthalo blue');

    await click('Ultramarine deep', { ctrlKey: true }); // unselected -> replaces the anchor
    expect(ends()).toBe(2);
    expect(anchorTitle()).toContain('Ultramarine deep');
    const all = Array.from(el.querySelectorAll('circle.end title')).map((t) => t.textContent);
    expect(all.join(' ')).toContain('Lemon yellow'); // the former anchor is the partner now
    expect(all.join(' ')).not.toContain('Phthalo');

    await click('Lemon yellow', { metaKey: true }); // ⌘+click works like ctrl+click
    expect(anchorTitle()).toContain('Lemon yellow');
  });

  it('promotes the partner to anchor when the anchor is clicked', async () => {
    const { click, el, ends } = await setup();
    await click('Lemon yellow');
    expect(ends()).toBe(1);
    expect(el.querySelector('circle.end title')?.textContent).toContain('Phthalo blue');
    expect(el.querySelector('circle.end title')?.textContent).toContain('(anchor)');
  });

  it('switches between the 2D and 3D views, loading the 3D view on demand', async () => {
    const { fixture, el } = await setup();
    expect(el.querySelector('app-plot-2d')).not.toBeNull();
    expect(el.querySelector('app-plot-3d')).toBeNull();
    expect(el.textContent).not.toContain('Mixture point cloud');

    const toggles = Array.from(el.querySelectorAll<HTMLButtonElement>('mat-button-toggle button'));
    expect(toggles.map((t) => t.textContent?.trim())).toEqual(['2D', '3D']);
    toggles[1].click();
    await fixture.whenStable();
    await fixture.whenStable();

    expect(el.querySelector('app-plot-2d')).toBeNull();
    expect(el.querySelector('app-plot-3d')).not.toBeNull();
    // jsdom has no WebGL, so the 3D view must explain itself instead of failing silently.
    expect(el.querySelector('app-plot-3d')!.textContent).toContain('needs WebGL');

    // 3D-only control appears in the (collapsed) Advanced section.
    expect(el.querySelector('mat-expansion-panel')!.textContent).toContain('Mixture point cloud');

    // The shared selection survives the switch.
    toggles[0].click();
    await fixture.whenStable();
    expect(el.querySelector('app-plot-2d')).not.toBeNull();
    expect(el.querySelectorAll('circle.end').length).toBe(2);
  });
});
