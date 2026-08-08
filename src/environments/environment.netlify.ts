/**
 * Deployed demo on Netlify.
 *
 * `apiUrl` points at the Netlify Function's own path rather than a prettier
 * `/api`. That is deliberate: @netlify/angular-runtime registers the Angular
 * SSR edge function at `"/*"` and excludes only `/.netlify/*`, the static files
 * and the prerendered routes. A request to `/api/menu` would therefore be
 * intercepted by the edge function and rendered as an HTML 404 instead of
 * reaching the API. `/.netlify/functions/api` is the one prefix guaranteed to
 * get through.
 *
 * `siteUrl` is only a fallback: `SeoService` prefers the build-time `SITE_URL`
 * (set from Netlify's `$URL` in netlify.toml), so canonical tags follow the
 * deploy rather than pointing at production from a preview.
 */
export const environment = {
  production: true,
  apiUrl: '/.netlify/functions/api',
  siteUrl: 'https://salateenrestaurant.pk',
  useMockAuth: true,
  onlinePaymentEnabled: false,
  defaultLocale: 'en-PK',
  currency: 'PKR',
  requestTimeoutMs: 15000,
  retryCount: 1,
} as const;
