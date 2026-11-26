import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('App routing', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('renders the explorer with the app name and pigment markers at the root', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    const el = harness.routeNativeElement as HTMLElement;
    expect(el.textContent).toContain('Paxt');
    expect(el.querySelectorAll('circle.pigment').length).toBeGreaterThan(20);
    expect(el.querySelector('circle.mix')).not.toBeNull();
  });
});
