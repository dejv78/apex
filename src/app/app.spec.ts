import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('App routing', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('renders the explorer with the app name, pigment markers and a mixing transition at the root', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    const el = harness.routeNativeElement as HTMLElement;
    expect(el.textContent).toContain('Paxt');
    expect(el.querySelectorAll('circle.pigment').length).toBeGreaterThan(20);
    expect(el.querySelectorAll('circle.dot').length).toBe(59);
    expect(el.querySelectorAll('circle.end').length).toBe(2);
  });
});
