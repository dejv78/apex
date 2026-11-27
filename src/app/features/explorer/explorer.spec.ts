import { TestBed } from '@angular/core/testing';
import { Explorer } from './explorer';
import { ExplorerState } from './explorer-state';

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
    const chips = () => Array.from(el.querySelectorAll<HTMLElement>('mat-chip-row'));
    const chipTexts = () => chips().map((c) => c.textContent?.replace(/\s+/g, ' ').trim());
    return { fixture, el, click, dots, ends, chips, chipTexts, marker };
  }

  it('starts with a pre-selected pair, shown as a chip for each pigment', async () => {
    const { el, dots, ends, chipTexts } = await setup();
    expect(dots()).toBeGreaterThan(10);
    expect(ends()).toBe(2);
    expect(el.querySelector('.anchor-ring')).toBeNull(); // no anchor: all pigments are equal
    expect(chipTexts()).toEqual([
      expect.stringContaining('Lemon yellow'),
      expect.stringContaining('Phthalo blue reddish'),
    ]);
    expect(el.querySelector('mat-select')).toBeNull(); // chips replace the dropdowns
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

  it('adds a clicked pigment with a trail to each of the others, and removes it when clicked again', async () => {
    const { click, dots, ends, chipTexts, el } = await setup();
    const pairDots = dots();
    expect(ends()).toBe(2);

    await click('Viridian'); // a plain click adds: trails to both others
    expect(ends()).toBe(3);
    expect(dots()).toBeGreaterThan(pairDots * 1.5);
    expect(chipTexts()).toHaveLength(3);
    expect(chipTexts()[2]).toContain('Viridian'); // new pigments are appended

    await click('Cobalt blue');
    expect(ends()).toBe(4);

    await click('Viridian'); // clicking a selected pigment removes it, the others stay
    expect(ends()).toBe(3);
    const titles = Array.from(el.querySelectorAll('circle.end title')).map((t) => t.textContent);
    expect(titles.join(' ')).toContain('Lemon yellow');
    expect(titles.join(' ')).toContain('Cobalt blue');
    expect(titles.join(' ')).not.toContain('Viridian');

    await click('Lemon yellow'); // any pigment can go, including the first selected
    await click('Phthalo blue reddish');
    await click('Cobalt blue');
    expect(ends()).toBe(0);
    expect(dots()).toBe(0);
    expect(chipTexts()).toEqual([]);
    expect(el.textContent).toContain('No pigments selected');

    await click('Lemon yellow'); // a lone pigment is shown at its true color
    expect(ends()).toBe(1);
    expect(dots()).toBe(0);
    await click('Ultramarine deep');
    expect(ends()).toBe(2);
    expect(dots()).toBeGreaterThan(10);
  });

  it('shows each chip in the pigment color with its code, name and a readable text color', async () => {
    const { chips, fixture } = await setup();
    const [first, second] = chips();
    const state = fixture.debugElement.injector.get(ExplorerState);
    const [lemon, blue] = state.selected();
    expect(first.textContent).toContain(`${lemon.code} ${lemon.name}`);
    expect(second.textContent).toContain(`${blue.code} ${blue.name}`);
    const hexToRgb = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`;
    };
    expect(first.style.getPropertyValue('--mat-chip-elevated-container-color')).toBe(lemon.hex);
    expect(second.style.getPropertyValue('--mat-chip-elevated-container-color')).toBe(blue.hex);
    expect(hexToRgb(lemon.hex)).toMatch(/^rgb/);
    // Light yellow takes black text, the deep blue white text.
    expect(first.style.getPropertyValue('--mat-chip-label-text-color')).toBe('#000000');
    expect(second.style.getPropertyValue('--mat-chip-label-text-color')).toBe('#ffffff');
  });

  it('unselects a pigment with the cross on its chip', async () => {
    const { el, chips, chipTexts, ends, fixture } = await setup();
    expect(chips()).toHaveLength(2);
    chips()[0].querySelector<HTMLButtonElement>('button[matChipRemove]')!.click();
    await fixture.whenStable();
    expect(chipTexts()).toEqual([expect.stringContaining('Phthalo blue reddish')]);
    expect(ends()).toBe(1);
    expect(el.querySelector('mat-chip-row button[aria-label]')?.getAttribute('aria-label')).toMatch(
      /^Remove /,
    );
  });

  it('stops adding pigments at the connection limit and says so', async () => {
    const { fixture, el, click, ends, chipTexts } = await setup();
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
        await click(name);
    }
    expect(ends()).toBe(20); // 190 connections
    expect(el.textContent).toContain('Limit reached');
    expect(chipTexts()).toHaveLength(20);
    const extra = titles().find(
      (n) =>
        !Array.from(el.querySelectorAll('circle.end title')).some((t) =>
          t.textContent!.includes(n),
        ),
    )!;
    await click(extra); // refused: it would make 210 connections
    expect(ends()).toBe(20);
    await click('Lemon yellow'); // removing still works, and frees room
    expect(ends()).toBe(19);
    await fixture.whenStable();
    expect(el.textContent).not.toContain('Limit reached');
  });

  it('clears the whole selection with the "Unselect all" button, which is hidden when empty', async () => {
    const { fixture, el, click, ends, dots, chipTexts } = await setup();
    const button = () => el.querySelector<HTMLButtonElement>('button.unselect-all');
    expect(button()?.textContent).toContain('Unselect all');
    expect(el.querySelector('.panel-head h2')?.textContent).toContain('Mix pigments');
    expect(el.querySelector('.panel-head button.unselect-all')).not.toBeNull(); // same row
    await click('Viridian');
    await click('Cobalt blue');
    expect(ends()).toBe(4);

    button()!.click();
    await fixture.whenStable();
    expect(ends()).toBe(0);
    expect(dots()).toBe(0);
    expect(chipTexts()).toEqual([]);
    expect(el.textContent).toContain('No pigments selected');
    expect(button()).toBeNull();

    await click('Lemon yellow'); // selecting again brings the button back
    expect(ends()).toBe(1);
    expect(button()).not.toBeNull();
  });

  it('shows help under the plot, in the plot column, that follows what a click can do', async () => {
    const { fixture, el, click } = await setup();
    /** The help as rendered: the browser collapses runs of whitespace. */
    const help = () =>
      el
        .querySelector<HTMLElement>('section.plot > p.help')!
        .textContent!.replace(/\s+/g, ' ')
        .trim();
    expect(help()).toBe(
      'Click a pigment to add it to the mix. Click a selected pigment to remove it.',
    );
    expect(el.querySelector('aside.panel')!.textContent).not.toContain('Click a pigment');

    el.querySelector<HTMLButtonElement>('button.unselect-all')!.click();
    await fixture.whenStable();
    expect(help()).toBe('Click a pigment to select it.');

    await click('Lemon yellow');
    expect(help()).toBe(
      'Click another pigment to mix it with the selected one. Click the selected pigment to unselect it.',
    );

    await click('Viridian');
    expect(help()).toBe(
      'Click a pigment to add it to the mix. Click a selected pigment to remove it.',
    );
    expect(help()).not.toMatch(/shift|ctrl|anchor/i); // no modifier keys, no anchor, anywhere
  });

  it('adds the camera controls to the help line in 3D, and no sidebar hint or view-button text', async () => {
    const { fixture, el } = await setup();
    const help = () => el.querySelector('p.help')!.textContent!.replace(/\s+/g, ' ').trim();
    expect(help()).not.toContain('Drag to rotate');
    el.querySelector<HTMLElement>('mat-button-toggle[value="3d"] button')!.click();
    await fixture.whenStable();
    expect(help()).toContain('Drag to rotate, scroll to zoom, right-drag to pan.');
    expect(help()).toContain('Click a pigment to add it to the mix.'); // the click help stays
    const actions = Array.from(el.querySelectorAll('p.help .action')).map((a) => a.textContent);
    expect(actions).toEqual(expect.arrayContaining(['Click', 'Drag', 'scroll', 'right-drag']));
    expect(help()).not.toContain('*');
    expect(el.textContent).not.toContain('view buttons');
    expect(el.querySelector('aside.panel')!.textContent).not.toContain('Drag to rotate');
  });

  it('describes the 3D camera with fingers on touch devices, following the pointer media query', async () => {
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
      expect(help()).toContain('Click a pigment to add it to the mix.'); // same click help as a mouse
      expect(help()).not.toMatch(/shift|ctrl/i);
      el.querySelector<HTMLElement>('mat-button-toggle[value="3d"] button')!.click();
      await fixture.whenStable();
      expect(help()).toContain('Drag to rotate, pinch to zoom, two-finger drag to pan.');
      expect(Array.from(el.querySelectorAll('p.help .action')).map((a) => a.textContent)).toEqual(
        expect.arrayContaining(['Drag', 'pinch', 'two-finger drag']),
      );

      listeners.forEach((l) => l({ matches: false })); // e.g. a keyboard and mouse get attached
      await fixture.whenStable();
      expect(help()).toContain('Drag to rotate, scroll to zoom, right-drag to pan.');
    } finally {
      window.matchMedia = original;
    }
  });

  describe('touch devices', () => {
    /** Runs `body` with `(pointer: coarse)` matching, as on a phone. */
    async function withTouch(body: () => Promise<void>) {
      const original = window.matchMedia;
      window.matchMedia = ((query: string) =>
        query === '(pointer: coarse)'
          ? {
              matches: true,
              addEventListener: () => undefined,
              removeEventListener: () => undefined,
            }
          : original.call(window, query)) as typeof matchMedia;
      try {
        await body();
      } finally {
        window.matchMedia = original;
      }
    }
    /** Screen position of a pigment's marker, with the SVG shown 1:1 (jsdom has no layout). */
    function place(el: HTMLElement, name: string) {
      const svg = el.querySelector('svg')!;
      (svg as unknown as { getScreenCTM: () => unknown }).getScreenCTM = () => ({
        a: 1,
        d: 1,
        e: 0,
        f: 0,
      });
      const hit = Array.from(el.querySelectorAll('circle.hit')).find((c) =>
        c.textContent?.includes(name),
      )!;
      return { svg, x: +hit.getAttribute('cx')!, y: +hit.getAttribute('cy')! };
    }
    const tap = (target: Element, x: number, y: number) =>
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));

    it('draws the markers larger than for a mouse', async () => {
      const mouse = await setup();
      const radius = (el: HTMLElement) => +el.querySelector('circle.pigment')!.getAttribute('r')!;
      const endRadius = (el: HTMLElement) => +el.querySelector('circle.end')!.getAttribute('r')!;
      const [mouseR, mouseEnd] = [radius(mouse.el), endRadius(mouse.el)];
      expect(mouseR).toBe(7);
      TestBed.resetTestingModule();
      await withTouch(async () => {
        const touch = await setup();
        expect(radius(touch.el)).toBeCloseTo(mouseR * 1.6);
        expect(endRadius(touch.el)).toBeCloseTo(mouseEnd * 1.6);
      });
    });

    it('selects the pigment nearest to a tap, even beside the marker, and ignores a miss', async () => {
      await withTouch(async () => {
        const { fixture, el, ends } = await setup();
        const viridian = place(el, 'Viridian');
        tap(viridian.svg, viridian.x + 12, viridian.y - 9); // 15 px off the marker's center
        await fixture.whenStable();
        expect(ends()).toBe(3);

        const lemon = place(el, 'Lemon yellow'); // a selected pigment: a tap beside it removes it
        tap(lemon.svg, lemon.x - 10, lemon.y + 10);
        await fixture.whenStable();
        expect(ends()).toBe(2);

        tap(viridian.svg, -30, -30); // nowhere near a pigment: nothing happens
        await fixture.whenStable();
        expect(ends()).toBe(2);
      });
    });

    it('toggles once, not twice, when the tap lands on the marker itself', async () => {
      await withTouch(async () => {
        const { fixture, el, ends } = await setup();
        const viridian = place(el, 'Viridian');
        const hit = Array.from(el.querySelectorAll('circle.hit')).find((c) =>
          c.textContent?.includes('Viridian'),
        )!;
        tap(hit, viridian.x, viridian.y);
        await fixture.whenStable();
        expect(ends()).toBe(3);
      });
    });

    it('keeps a mouse to direct hits: a click beside a marker does nothing', async () => {
      const { fixture, el, ends } = await setup();
      const viridian = place(el, 'Viridian');
      tap(viridian.svg, viridian.x + 3, viridian.y); // on the plot, not on a marker's circle
      await fixture.whenStable();
      expect(ends()).toBe(2);
    });
  });

  it('drops the adding hint from the help at the connection limit', async () => {
    const { el, click, ends } = await setup();
    const selected = () =>
      Array.from(el.querySelectorAll('circle.end title')).map((t) => t.textContent!.trim());
    const names = Array.from(el.querySelectorAll<SVGCircleElement>('circle.hit')).map((c) =>
      c.querySelector('title')!.textContent!.trim(),
    );
    for (const name of names) {
      if (ends() >= 20) break;
      if (!selected().includes(name)) await click(name);
    }
    expect(ends()).toBe(20);
    const help = el.querySelector('p.help')!.textContent!.replace(/\s+/g, ' ').trim();
    expect(help).toBe('Click a selected pigment to remove it.');
  });

  it('draws the click targets above the path dots and end markers, so they never block a click', async () => {
    const { el } = await setup();
    const hits = Array.from(el.querySelectorAll('circle.hit'));
    const covering = [
      ...Array.from(el.querySelectorAll('circle.dot')),
      ...Array.from(el.querySelectorAll('circle.end')),
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
    expect(el.querySelector('.bar h1.title')!.textContent).toContain('Artists Palette Explorer');
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
