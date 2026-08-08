import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  PreloadAllModules,
  provideRouter,
  withInMemoryScrolling,
  withPreloading,
  withRouterConfig,
  withViewTransitions,
} from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { apiInterceptor } from './core/interceptors/api.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),

    provideRouter(
      routes,
      // Lazy chunks for routes the user has not reached yet are fetched once
      // the app is idle, so navigation feels instant without hurting TTI.
      withPreloading(PreloadAllModules),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withViewTransitions({ skipInitialTransition: true }),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),

    // `withFetch` is required for SSR request forwarding and gives us
    // priority hints in the browser.
    provideHttpClient(withFetch(), withInterceptors([apiInterceptor])),

    provideClientHydration(withEventReplay()),
  ],
};
