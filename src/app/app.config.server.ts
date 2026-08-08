import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import {
  API_BASE_URL,
  SITE_URL,
  resolveServerApiBaseUrl,
  resolveServerSiteUrl,
} from './core/tokens/api-base-url.token';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),

    // Node cannot fetch a relative URL, so the server side always resolves an
    // absolute one. See the token for the precedence rules.
    { provide: API_BASE_URL, useFactory: resolveServerApiBaseUrl },

    // Canonical URLs must follow the deploy, not the hardcoded production domain.
    { provide: SITE_URL, useFactory: resolveServerSiteUrl },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
