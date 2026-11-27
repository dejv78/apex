import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { ExplorerUrlSync } from './features/explorer/explorer-url-sync';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Keeps the address in step with the mix, so it can be shared (ADR 0021).
    ExplorerUrlSync,
    // Offline use and installability (ADR 0018). Production builds only: `ng serve` has no worker.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
