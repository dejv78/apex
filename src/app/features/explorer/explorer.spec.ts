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
    // One dropdown per selected pigment, plus an empty one to add the next.
    expect(labels()).toEqual(['Anchor', 'Mix with', 'Mix with']);
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
    // Start from the pre-selected pair [Lemon yellow, Phthalo blue reddish]; remove both.
    await click('Lemon yellow'); // anchor removed -> blue becomes the anchor, no pair left
    expect(dots()).toBe(0);
    expect(ends()).toBe(1);
    expect(labels()).toEqual(['Anchor', 'Mix with']);
    await click('Phthalo blue reddish'); // the only selected pigment is unselected
    expect(ends()).toBe(0);
    expect(labels()).toEqual(['Anchor']);

    await click('Lemon yellow'); // first click: anchor
    expect(ends()).toBe(1);
    expect(el.querySelectorAll('circle.anchor-ring').length).toBe(1);
    await click('Ultramarine deep'); // second click: mixed with the anchor
    expect(ends()).toBe(2);
    expect(dots()).toBeGreaterThan(10);
    expect(labels()).toEqual(['Anchor', 'Mix with', 'Mix with']);

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

  it('adds pigments on shift+click, with a trail and a dropdown for each', async () => {
    const { click, dots, ends, labels, el } = await setup();
    const pairDots = dots();
    await click('Viridian', { shiftKey: true }); // third pigment: trails to both others
    expect(ends()).toBe(3);
    expect(dots()).toBeGreaterThan(pairDots * 1.5);
    expect(labels()).toEqual(['Anchor', 'Mix with', 'Mix with', 'Mix with']);
    expect(el.querySelectorAll('circle.anchor-ring').length).toBe(1);

    await click('Viridian', { shiftKey: true }); // shift+click again removes it
    expect(ends()).toBe(2);
    expect(dots()).toBe(pairDots);

    await click('Viridian', { shiftKey: true });
    await click('Cobalt blue'); // plain click: back to the anchor and one partner
    expect(ends()).toBe(2);
  });

  it('stops adding pigments at the connection limit and says so', async () => {
    const { fixture, el, click, ends, labels } = await setup();
    const titles = () =>
      Array.from(el.querySelectorAll<SVGCircleElement>('circle.hit')).map((c) =>
        c.querySelector('title')!.textContent!.trim(),
      );
    for (const name of titles()) {
      if (ends() >= 20) break;
      if (
        !Array.from(el.querySelectorAll('circle.end title')).some((t) =>
          t.textContent!.includes(name),
        )
      )
        await click(name, { shiftKey: true });
    }
    expect(ends()).toBe(20); // 190 connections
    expect(el.textContent).toContain('Limit reached');
    expect(labels().filter((l) => l === 'Mix with')).toHaveLength(19); // no empty dropdown
    const extra = titles().find(
      (n) =>
        !Array.from(el.querySelectorAll('circle.end title')).some((t) =>
          t.textContent!.includes(n),
        ),
    )!;
    await click(extra, { shiftKey: true });
    expect(ends()).toBe(20);
    await click(extra); // a plain click still works: anchor + this pigment
    expect(ends()).toBe(2);
    await fixture.whenStable();
    expect(el.textContent).not.toContain('Limit reached');
  });

  it('clears the whole selection with the "Unselect all" button, which is hidden when empty', async () => {
    const { fixture, el, click, ends, dots, labels } = await setup();
    const button = () => el.querySelector<HTMLButtonElement>('button.unselect-all');
    expect(button()?.textContent).toContain('Unselect all');
    expect(el.querySelector('.panel-head h2')?.textContent).toContain('Mix pigments');
    expect(el.querySelector('.panel-head button.unselect-all')).not.toBeNull(); // same row
    await click('Viridian', { shiftKey: true });
    await click('Cobalt blue', { shiftKey: true });
    expect(ends()).toBe(4);

    button()!.click();
    await fixture.whenStable();
    expect(ends()).toBe(0);
    expect(dots()).toBe(0);
    expect(labels()).toEqual(['Anchor']);
    expect(button()).toBeNull();

    await click('Lemon yellow'); // selecting again brings the button back
    expect(ends()).toBe(1);
    expect(button()).not.toBeNull();
  });

  it('shows help under the plot, in the plot column, that follows what a click can do', async () => {
    const { fixture, el, click, ends } = await setup();
    /** The help as rendered: the browser collapses runs of whitespace. */
    const helpEl = () => el.querySelector<HTMLElement>('section.plot > p.help')!;
    const help = () => ({ textContent: helpEl().textContent!.replace(/\s+/g, ' ').trim() });
    expect(help().textContent).toContain('Shift+click adds a pigment');
    expect(el.querySelector('aside.panel')!.textContent).not.toContain('Shift+click');

    el.querySelector<HTMLButtonElement>('button.unselect-all')!.click();
    await fixture.whenStable();
    expect(help().textContent!.trim()).toBe('Click a pigment to select it as the anchor.');

    await click('Lemon yellow');
    expect(help().textContent).toContain('Click another pigment to mix it with the anchor.');
    expect(help().textContent).toContain('move the anchor');
    expect(help().textContent).not.toContain('Shift+click');

    await click('Viridian');
    expect(help().textContent).toContain('instead of the current partner');
    await click('Cobalt blue', { shiftKey: true });
    expect(ends()).toBe(3);
    expect(help().textContent).toContain('dropping the other partners');
  });

  it('adds the camera controls to the help line in 3D, and no sidebar hint or view-button text', async () => {
    const { fixture, el } = await setup();
    const help = () => el.querySelector('p.help')!.textContent!.replace(/\s+/g, ' ').trim();
    expect(help()).not.toContain('Drag to rotate');
    el.querySelector<HTMLElement>('mat-button-toggle[value="3d"] button')!.click();
    await fixture.whenStable();
    expect(help()).toContain('Drag to rotate, scroll to zoom, right-drag to pan.');
    expect(help()).toContain('Shift+click adds a pigment'); // the click help stays
    const actions = Array.from(el.querySelectorAll('p.help .action')).map((a) => a.textContent);
    expect(actions).toEqual(
      expect.arrayContaining(['Drag', 'scroll', 'right-drag', 'Shift+click']),
    );
    expect(help()).not.toContain('*');
    expect(el.textContent).not.toContain('view buttons');
    expect(el.querySelector('aside.panel')!.textContent).not.toContain('Drag to rotate');
  });

  it('hides the Shift and Ctrl help on touch devices, following the pointer media query', async () => {
    const listeners: ((e: { matches: boolean }) => void)[] = [];
    const fake = {
      matches: true,
      addEventListener: (_: string, l: (e: { matches: boolean }) => void) => listeners.push(l),
      removeEventListener: () => undefined,
    };
    const original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      query === '(pointer: coarse)' ? fake : original.call(window, query)) as typeof matchMedia;
    try {
      const { fixture, el } = await setup();
      const help = () => el.querySelector('p.help')!.textContent!.replace(/\s+/g, ' ');
      expect(help()).toContain('Click a pigment to mix it with the anchor');
      expect(help()).not.toMatch(/shift|ctrl/i);
      el.querySelector<HTMLElement>('mat-button-toggle[value="3d"] button')!.click();
      await fixture.whenStable();
      expect(help()).toContain('Drag to rotate, pinch to zoom, two-finger drag to pan.');
      expect(Array.from(el.querySelectorAll('p.help .action')).map((a) => a.textContent)).toEqual(
        expect.arrayContaining(['Drag', 'pinch', 'two-finger drag']),
      );

      listeners.forEach((l) => l({ matches: false })); // e.g. a keyboard and mouse get attached
      await fixture.whenStable();
      expect(help()).toContain('Shift+click');
      expect(help()).toContain('Drag to rotate, scroll to zoom, right-drag to pan.');
    } finally {
      window.matchMedia = original;
    }
  });

  it('drops the shift+click hint at the connection limit', async () => {
    const { el, click, ends } = await setup();
    const names = Array.from(el.querySelectorAll<SVGCircleElement>('circle.hit')).map((c) =>
      c.querySelector('title')!.textContent!.trim(),
    );
    for (const name of names) {
      if (ends() >= 20) break;
      await click(name, { shiftKey: true });
    }
    expect(ends()).toBe(20);
    expect(el.querySelector('p.help')!.textContent).not.toContain('Shift+click');
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

    await click('Phthalo blue reddish', { ctrlKey: true }); // partner -> anchor, roles swap
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

  it('shows the logo, the title and the view name with its color space in the toolbar', async () => {
    const { fixture, el } = await setup();
    expect(el.querySelector('.bar h1.title')!.textContent).toContain('Artists palette explorer');
    expect(el.querySelector('.bar img.logo')!.getAttribute('src')).toBe('logo.svg');

    const hint = () => el.querySelector('.bar .hint')!.textContent!.replace(/\s+/g, ' ');
    // The color space is named (pigment coordinates and plot are both OKLab); no jargon beyond that.
    expect(hint()).toContain('OKLab hue and chroma map');
    expect(hint()).toContain('Mixbox mixing');
    expect(hint()).not.toMatch(/anchored/i);

    el.querySelectorAll<HTMLButtonElement>('mat-button-toggle button')[1].click();
    await fixture.whenStable();
    expect(hint()).toContain('OKLab color cylinder');
  });
});
