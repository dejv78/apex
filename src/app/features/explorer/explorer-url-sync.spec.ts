import { TestBed } from '@angular/core/testing';
import { Explorer } from './explorer';
import { ExplorerUrlSync } from './explorer-url-sync';

describe('Explorer address sync', () => {
  const start = (url: string) => history.replaceState(null, '', url);
  afterEach(() => history.replaceState(null, '', '/'));

  async function setup(url = '/') {
    start(url);
    TestBed.configureTestingModule({ providers: [ExplorerUrlSync] });
    const fixture = TestBed.createComponent(Explorer);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const chips = () =>
      Array.from(el.querySelectorAll('mat-chip-row')).map((c) =>
        c.textContent!.replace(/\s+/g, ' '),
      );
    const click = async (name: string) => {
      Array.from(el.querySelectorAll<SVGCircleElement>('circle.hit'))
        .find((c) => c.textContent?.includes(name))!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await fixture.whenStable();
    };
    return { fixture, el, chips, click };
  }

  it('shows the mix a link describes', async () => {
    const { chips, el } = await setup('/?p=viridian,cobalt-blue&view=3d&hidden=1');
    expect(chips()).toHaveLength(2);
    expect(chips()[0]).toContain('Viridian');
    expect(chips()[1]).toContain('Cobalt blue');
    expect(el.querySelector('app-plot-3d')).not.toBeNull();
    expect(el.querySelectorAll('mat-slide-toggle')[0].classList).toContain(
      'mat-mdc-slide-toggle-checked',
    );
  });

  it('opens the default mix for a plain address, and for a link it cannot make sense of', async () => {
    expect((await setup('/')).chips()).toHaveLength(2);
    TestBed.resetTestingModule();
    const { chips } = await setup('/?p=nonsense,viridian&view=up');
    expect(chips()).toHaveLength(1);
    expect(chips()[0]).toContain('Viridian');
  });

  it('keeps the address in step with the mix, without adding history entries', async () => {
    const { fixture, click } = await setup('/');
    const entries = history.length;
    expect(location.search).toBe('');
    await click('Viridian');
    expect(location.search).toBe('?p=lemon-yellow,phthalo-blue-reddish,viridian');
    await click('Viridian');
    expect(location.search).toBe(''); // back to the default mix: a clean address
    await click('Lemon yellow');
    expect(location.search).toBe('?p=phthalo-blue-reddish');
    await fixture.whenStable();
    expect(history.length).toBe(entries);
    expect(location.pathname).toBe('/');
  });

  it('keeps the hash and the history state of the address', async () => {
    const { click } = await setup('/');
    history.replaceState({ router: 7 }, '', '/#top');
    await click('Viridian');
    expect(location.hash).toBe('#top');
    expect(history.state).toEqual({ router: 7 });
  });

  it('copies the address with the "Copy link" button and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    try {
      const { fixture, el, click } = await setup('/');
      await click('Viridian');
      el.querySelector<HTMLButtonElement>('button.copy-link')!.click();
      await fixture.whenStable();
      expect(writeText).toHaveBeenCalledWith(location.href);
      expect(location.href).toContain('?p=lemon-yellow,phthalo-blue-reddish,viridian');
      const button = el.querySelector<HTMLButtonElement>('button.copy-link')!;
      expect(button.getAttribute('title')).toBe('Link copied'); // the icon turns into a tick
      expect(el.querySelector('[role=status]')!.textContent).toContain('Link copied');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('says so when the link cannot be copied', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
    try {
      const { fixture, el } = await setup('/');
      el.querySelector<HTMLButtonElement>('button.copy-link')!.click();
      await fixture.whenStable();
      expect(el.querySelector('[role=alert]')!.textContent).toContain('Could not copy');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('puts "Copy link" next to "Unselect all" in the header of "Mix pigments", as icons with labels', async () => {
    const { el } = await setup('/');
    const head = el.querySelector('.panel-head')!;
    expect(head.querySelector('h2')!.textContent).toContain('Mix pigments');
    const copy = head.querySelector<HTMLButtonElement>('button.copy-link')!;
    const unselect = head.querySelector<HTMLButtonElement>('button.unselect-all')!;
    expect(copy.getAttribute('aria-label')).toBe('Copy link to this mix');
    expect(copy.getAttribute('title')).toBe('Copy link to this mix');
    expect(copy.textContent!.trim()).toBe(''); // an icon only
    expect(copy.querySelector('svg')).not.toBeNull();
    expect(unselect.querySelector('svg')).not.toBeNull();
  });

  it('has no "Copy link" button where the address is not synced', async () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(Explorer);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button.copy-link')).toBeNull();
  });
});
