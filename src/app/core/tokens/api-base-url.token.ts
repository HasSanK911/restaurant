import { InjectionToken, REQUEST, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Base URL every API call is built from.
 *
 * This exists because the base URL is not one value — it differs by *where the
 * code is running*, and the correct value is not knowable at build time:
 *
 * | Context                | Correct base                                  |
 * |------------------------|-----------------------------------------------|
 * | `ng serve` locally     | `http://localhost:3000` (JSON Server)         |
 * | Build-time prerender   | `http://localhost:3000` (JSON Server)         |
 * | Deployed browser       | `/.netlify/functions/api` (relative)          |
 * | Deployed SSR           | `https://<the host actually being served>/…`  |
 *
 * The browser can use a relative URL; Node and Deno cannot —
 * `fetch('/.netlify/functions/api/menu')` throws "Failed to parse URL", because
 * there is no ambient document origin to resolve against. So the server side
 * always resolves an absolute one. See `app.config.server.ts`.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  // Browser default. A relative base is deliberate: it keeps API calls
  // same-origin, so they need no CORS and inherit whatever host the visitor used.
  factory: () => environment.apiUrl,
});

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

/**
 * Reads an environment variable, treating Netlify's placeholder as absent.
 *
 * The Angular SSR edge function is generated with the build-time environment
 * baked in as string literals, and unset variables are written as the literal
 * string `"undefined"` — which is truthy, and would otherwise produce a base URL
 * of `undefined/.netlify/functions/api`.
 */
function envVar(name: string): string | undefined {
  const value = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env?.[name];
  return value && value !== 'undefined' ? value : undefined;
}

/**
 * Resolves the base URL for server-side rendering.
 *
 * Order matters:
 *  1. `SSR_API_BASE_URL` — explicit override. `scripts/build.mjs` sets it so the
 *     prerender pass talks to the JSON Server it just spawned, rather than to a
 *     deploy that does not exist yet.
 *  2. An already-absolute `environment.apiUrl` (local dev, the laravel config).
 *  3. The origin of the request actually being served. This is preferred over
 *     the baked-in `URL` variable because on a deploy preview `URL` holds the
 *     *production* domain — SSR would otherwise fetch the live site's API from
 *     a preview. `REQUEST` is null during prerendering, which is exactly why it
 *     sits below the override.
 *  4. Baked deploy variables, as a last resort. `DEPLOY_URL` first: it is the
 *     permalink for this specific deploy, whereas `URL` is the production alias.
 */
export function resolveServerApiBaseUrl(): string {
  const configured = environment.apiUrl;

  const override = envVar('SSR_API_BASE_URL');
  if (override) return trimTrailingSlash(override);

  if (/^https?:\/\//i.test(configured)) return trimTrailingSlash(configured);

  const request = inject(REQUEST, { optional: true });
  if (request) return trimTrailingSlash(new URL(request.url).origin) + configured;

  const origin = envVar('DEPLOY_URL') ?? envVar('DEPLOY_PRIME_URL') ?? envVar('URL');
  if (origin) return trimTrailingSlash(origin) + configured;

  // Failing loudly beats a silent fallback: the failure mode of getting this
  // wrong is 101 prerendered pages that look fine in a browser and are empty to
  // every crawler, which is precisely what the build-time assertion in
  // scripts/build.mjs exists to catch.
  throw new Error(
    `Cannot resolve an absolute SSR API base URL (environment.apiUrl="${configured}"). ` +
      'Set SSR_API_BASE_URL, or build via "npm run build:netlify".',
  );
}

/**
 * Absolute origin the site is served from, used for canonical URLs, Open Graph
 * and the JSON-LD `@id` values.
 *
 * Hardcoding the production domain is wrong on a branch deploy or preview:
 * every page would self-canonicalise to a domain that is not serving that build.
 * The browser can simply use its own origin.
 */
export const SITE_URL = new InjectionToken<string>('SITE_URL', {
  providedIn: 'root',
  factory: () =>
    typeof location !== 'undefined' && location.origin ? location.origin : environment.siteUrl,
});

/** Server-side counterpart of {@link SITE_URL}. */
export function resolveServerSiteUrl(): string {
  // Prefer the request being served, for the same reason as the API base.
  const request = inject(REQUEST, { optional: true });
  if (request) return trimTrailingSlash(new URL(request.url).origin);

  const configured = envVar('SITE_URL') ?? envVar('URL') ?? envVar('DEPLOY_PRIME_URL');
  if (configured && /^https?:\/\//i.test(configured)) return trimTrailingSlash(configured);

  return trimTrailingSlash(environment.siteUrl);
}
